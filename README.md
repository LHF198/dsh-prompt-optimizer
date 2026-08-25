# dsh-prompt-optimizer (提示词优化)

Improve the current chat draft before sending. One click optimizes the draft
with the session's currently selected model, then shows an
**original-vs-result comparison** so you decide before anything is applied.

在发送前优化当前聊天输入。一键用当前对话选中的模型优化草稿，并以
**原文 / 优化结果对比** 的方式呈现，由你确认后再采用。

## Features

- **Official entry points** — the UI is mounted through official `slots`
  (no DOM hacking, no replacement of shipped UI):
  - a button in the composer tool row (`conversation.input.left`);
  - an action in the session header (`conversation.session.header.actions`);
  - an `/optimize` slash command (`inputTriggers`, when available).
- **Confirm before apply** — the result opens in an inline comparison bar
  mounted in `conversation.input.dock`, showing 原始输入 / 优化结果 side by
  side; choose 采用优化结果 or 放弃. Narrow windows stack the columns vertically.
- **Never overwrites your typing** — if you keep editing while the request is
  in flight, the bar warns you and disables "use optimized", so a late result
  can never clobber new content.
- **Cancellable** — the button becomes 取消 while the request runs; cancelling
  discards the late result.
- **Uses your current model** — optimization goes through the official `llm`
  service with the session's default model selection (`agentDefaultModel`). No
  extra credentials, no separate provider config.
- **Privacy by construction** — only the text you actively submit from the
  composer is sent to the model; nothing is stored, no session history is
  read, no third-party service is called, and the HTTP route is loopback-only.
- **Accessible & localized** — aria-labels, keyboard-operable buttons, Esc /
  放弃 to close; UI text follows the DSH locale (zh / en).
- **Safe degradation** — missing model, model error, empty result and request
  failure all surface a friendly message and never lose your draft.
- **Shared state machine** — every entry point (button, header action, slash
  command, comparison bar) reads one module-level state singleton, so all
  controls stay in sync (running spinner, error banner, cancelled toast).

## Install

From the DSH market (once listed) or from a Git URL:

```bash
git clone https://github.com/YOUR_ORG/dsh-prompt-optimizer.git
cd dsh-prompt-optimizer
```

Then add the loader row (or use the market's install flow):

```yaml
plugins:
  - id: dsh-prompt-optimizer
    name: dsh-prompt-optimizer
    config: {}
```

After enabling, reload the Web GUI. A 优化 / Optimize action appears at the left
end of the composer tool row, in the session header, and as `/optimize`.

> ⚠️ **工程化说明（待维护者补齐）**：当前包为**手写 bundle、无编译步骤**——缺省
> 情况下克隆即用，开发校验用下面的 `node --check`，**无需 `pnpm build`**。
> 工程化阶段将由维护者在 `package.json` 补充 build / lint / test 脚本；脚本落地后，
> 请以**实际脚本名**更新本节的构建与校验命令，并同步 `MARKET.md` 的发布前检查。
> （本项目面向 npm 发布前，仓库 URL 中的 `YOUR_ORG` 为占位符，需替换为真实 owner。）

## Usage

1. Type a draft in the chat composer.
2. Click 优化 (or the 取消 button while it runs).
3. Review 原始输入 vs 优化结果.
4. Click 采用优化结果 to replace the draft, or 放弃 to keep your text.

You can also press `/optimize` in the composer, or use the header action.

## Compatibility

- Requires a DSH release that mounts the host services `webServer`, `llm` and
  `agentDefaultModel`, the client services `slots`, `locale` and `timer`, and
  the client slots `conversation.input.left`, `conversation.session.header.actions`
  and `conversation.input.dock`. The `/optimize` command additionally needs the
  optional `inputTriggers` service (the plugin degrades gracefully without it).
  Verified against DSH `0.1.1-rc.2`, cordis `4.0.1`.
- `@deepseek-ai/*` core packages are **peerDependencies only** — the plugin
  never ships its own copy and never shadows the host version.
- The client bundle is a standard `window.__ModuleLoader__` loader entry with
  an explicit `dsh.client.inject` list (`slots`, `locale`, `timer`); no
  install-time build scripts.
- The host route is loopback-only and fenced like other DSH web plugins.
- Local dev toolchain (for contributors): Node.js ≥ 20 (ESM host; verified on
  Node v26.3.0) and pnpm (recommended; no `packageManager` pin yet).

## Privacy

- Only the submitted draft text is processed.
- The optimization prompt is fixed and public (see `lib/index.js`).
- No content is persisted, logged as a session event, or sent anywhere other
  than the currently selected model through DSH's own `llm` service.

## Development

The package ships a hand-built bundle (`lib/client.js`) and a hand-written host
entry (`lib/index.js`); there is no compile step, so cloning and enabling is all
that is needed to try it.

```bash
node --check lib/index.js   # syntax sanity for the host half
node --check lib/client.js  # syntax sanity for the client bundle
```

Keep the client bundle free of JSX/TypeScript/`import` and always register UI
through the official `slots` API. When changing the client, bump the loader
entry revision so running pages pick up the new bundle.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the contribution workflow, commit
conventions and testing requirements. Architecture decisions are recorded under
[docs/adr](./docs/adr/) (start at the index).

## License

Apache-2.0 — see [LICENSE](./LICENSE).
