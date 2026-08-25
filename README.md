# dsh-prompt-optimizer (提示词优化)

Improve the current chat draft before sending. One click optimizes the draft
with the session's currently selected model, then shows an
**original-vs-result comparison** so you decide before anything is applied.

在发送前优化当前聊天输入。一键用当前对话选中的模型优化草稿，并以
**原文 / 优化结果对比** 的方式呈现，由你确认后再采用。

## Features

- **Official entry point** — a compact button in the composer tool row
  (`conversation.input.left`), no DOM hacking, no replacement of shipped UI.
- **Confirm before apply** — the result opens in a comparison dialog
  (`conversation.input.overlay`) with 原始输入 / 优化结果 side by side;
  choose 采用优化结果 or 放弃. Narrow windows stack the columns vertically.
- **Never overwrites your typing** — if you keep editing while the request is
  in flight, the dialog warns you and disables "use optimized", so a late
  result can never clobber new content.
- **Cancellable** — the button becomes 取消 while the request runs; cancelling
  discards the late result.
- **Uses your current model** — optimization goes through the official `llm`
  service with the session's default model selection
  (`agentDefaultModel`). No extra credentials, no separate provider config.
- **Privacy by construction** — only the text you actively submit from the
  composer is sent to the model; nothing is stored, no session history is
  read, no third-party service is called, and the HTTP route is loopback-only.
- **Accessible & localized** — aria-labels, keyboard-operable buttons, Esc /
  放弃 to close; UI text follows the DSH locale (zh / en).
- **Safe degradation** — missing model, model error, empty result and request
  failure all surface a friendly message and never lose your draft.

## Install

From the DSH market (once listed), from a Git URL, or locally:

```bash
# local / workspace install
git clone https://github.com/YOUR_ORG/dsh-prompt-optimizer.git
cd dsh-prompt-optimizer
pnpm install
pnpm build
```

Then add the loader row (or use the market's install flow):

```yaml
plugins:
  - id: dsh-prompt-optimizer
    name: dsh-prompt-optimizer
    config: {}
```

After enabling, reload the Web GUI. A 优化 / Optimize button appears at the
left end of the composer tool row.

## Usage

1. Type a draft in the chat composer.
2. Click 优化 (or the 取消 button while it runs).
3. Review 原始输入 vs 优化结果.
4. Click 采用优化结果 to replace the draft, or 放弃 to keep your text.

## Compatibility

- Requires a DSH release that mounts the `llm`, `agentDefaultModel` and
  `webServer` host services, the `slots` / `locale` client services, and the
  `conversation.input.left` / `conversation.input.overlay` slots
  (verified against DSH `0.1.1-rc.2`, cordis `4.0.1`).
- `@deepseek-ai/*` core packages are **peerDependencies only** — the plugin
  never ships its own copy and never shadows the host version.
- The client bundle is a standard `window.__ModuleLoader__` loader entry with
  an explicit `dsh.client.inject` list; no install-time build scripts.
- The host route is loopback-only and fenced like other DSH web plugins.

## Privacy

- Only the submitted draft text is processed.
- The optimization prompt is fixed and public (see `lib/index.js`).
- No content is persisted, logged as a session event, or sent anywhere other
  than the currently selected model through DSH's own `llm` service.

## Development

The package ships a hand-built bundle (`lib/client.js`) and a hand-written
host entry (`lib/index.js`); there is no compile step, so cloning and enabling
is all that is needed to try it.

```bash
node --check lib/index.js   # syntax sanity for the host half
node --check lib/client.js  # syntax sanity for the client bundle
```

Keep the client bundle free of JSX/TypeScript/`import` and always register UI
through the official `slots` API. When changing the client, bump the loader
entry revision so running pages pick up the new bundle.

## License

Apache-2.0 — see [LICENSE](./LICENSE).
