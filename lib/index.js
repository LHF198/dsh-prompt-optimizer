/**
 * dsh-prompt-optimizer — host half.
 *
 * Exposes one loopback-only HTTP route that runs the prompt optimization
 * against the session's current default model through the official `llm`
 * service. The browser half talks to this route with a plain same-origin
 * fetch, so no private RPC surface is needed and the data never leaves DSH.
 *
 * Privacy: the route only receives the text the user actively submitted from
 * the composer, streams it to the currently selected model, and keeps nothing
 * (no storage, no session writes, no third-party calls).
 */
export const name = 'dsh-prompt-optimizer'

/** Hard dependency: the web route carrier. `llm`/`agentDefaultModel` are read optionally per request. */
export const inject = ['webServer']

const API_PATH = '/api/prompt-optimizer/optimize'
const MAX_JSON_BODY_BYTES = 256 * 1024

const OPTIMIZER_SYSTEM =
  '你是一个提示词优化器。请将用户提供的原始输入改写成清晰、具体、可执行的提示词。' +
  '补充目标、必要的上下文、约束条件和期望输出格式，但不得虚构事实、背景、数据或用户未表达的要求。' +
  '保留用户明确指定的语言和目标。只输出优化后的提示词，不要解释修改过程，不要加引号。'

function userMessage(text) {
  return {
    id: 'prompt-optimizer-input',
    role: 'user',
    content: [{ type: 'text', text }],
    source: { kind: 'user' },
  }
}

/** Loopback-only gate, mirroring the shared fence used by other DSH web plugins. */
function isLoopbackRequest(request) {
  const address = request.socket.remoteAddress
  if (address !== '127.0.0.1' && address !== '::1' && address !== '::ffff:127.0.0.1') return false
  const host = request.headers.host
  if (typeof host !== 'string') return false
  let hostUrl
  try {
    hostUrl = new URL('http://' + host)
  } catch {
    return false
  }
  if (hostUrl.hostname !== '127.0.0.1' && hostUrl.hostname !== 'localhost' && hostUrl.hostname !== '[::1]') return false
  if (request.headers['sec-fetch-site'] === 'cross-site') return false
  const origin = request.headers.origin
  if (origin === undefined) return true
  try {
    return new URL(origin).host === hostUrl.host
  } catch {
    return false
  }
}

async function readJsonBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > MAX_JSON_BODY_BYTES) return undefined
    chunks.push(buffer)
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    return typeof parsed === 'object' && parsed !== null ? parsed : undefined
  } catch {
    return undefined
  }
}

function writeJson(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'referrer-policy': 'no-referrer',
  })
  res.end(JSON.stringify(body))
}

function writeError(res, status, message) {
  writeJson(res, status, { ok: false, message })
}

function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: API_PATH,
    handler: async (req, res) => {
      if (!isLoopbackRequest(req)) return writeError(res, 403, 'forbidden: loopback-only')
      if (req.method !== 'POST') return writeError(res, 405, 'method not allowed')
      const body = await readJsonBody(req)
      if (body === undefined) return writeError(res, 400, 'invalid JSON body')

      const text = typeof body.text === 'string' ? body.text.trim() : ''
      if (text === '') return writeJson(res, 200, { ok: false, message: '请输入要优化的内容。' })

      const llm = ctx.get('llm')
      const modelService = ctx.get('agentDefaultModel')
      if (llm === undefined || modelService === undefined) {
        return writeJson(res, 200, { ok: false, message: '当前没有可用的模型。' })
      }
      const pick = modelService.currentSelection()
      if (pick === undefined || typeof pick.provider !== 'string' || typeof pick.model !== 'string') {
        return writeJson(res, 200, { ok: false, message: '当前没有可用的模型。' })
      }

      const opts = {
        provider: pick.provider,
        model: pick.model,
        messages: [userMessage(text)],
        system: OPTIMIZER_SYSTEM,
        maxTokens: 1200,
      }
      if (pick.reasoningEffort !== undefined) opts.reasoningEffort = pick.reasoningEffort

      let out = ''
      try {
        for await (const chunk of llm.stream(opts)) {
          if (chunk.type === 'text-delta') out += chunk.text
          if (chunk.type === 'finish' && chunk.reason) {
            if (chunk.reason.kind === 'error' || chunk.reason.kind === 'aborted') {
              return writeJson(res, 200, { ok: false, message: '模型暂时无法完成优化，请稍后重试。' })
            }
            if (chunk.reason.kind === 'max-tokens') {
              return writeJson(res, 200, { ok: false, message: '模型输出被截断，请缩短输入后重试。' })
            }
          }
        }
      } catch (error) {
        console.error('[dsh-prompt-optimizer] optimize request failed', error)
        return writeJson(res, 200, { ok: false, message: '优化请求失败，请检查模型配置后重试。' })
      }

      out = out.trim()
      if (out === '') return writeJson(res, 200, { ok: false, message: '模型没有返回有效的优化结果。' })
      return writeJson(res, 200, { ok: true, text: out })
    },
  }))
}

export { apply }
