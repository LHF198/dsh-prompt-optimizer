# Changelog

All notable changes to dsh-prompt-optimizer are recorded here.
Format follows [Keep a Changelog](https://keepachangelog.com/); this project
adheres to [Semantic Versioning](https://semver.org/). See the
[releases page][releases] for tagged versions.

## [Unreleased]

## [0.2.2] - 2026-08-29

### Fixed

- Client bundle now registers under the fully-qualified package name
  `@joe0001/dsh-prompt-optimizer` (`window.__ModuleLoader__.load` id and the
  module export name). After the package was renamed from the unscoped
  `dsh-prompt-optimizer`, the client side kept the old unscoped id while the
  loader requires the full package name — this surfaced as
  `loaded without registering ... via ModuleLoader.load` on clean installs.
  README loader example updated to match.

## [0.2.1] - 2026-08-29

### Fixed

- Bundle patch row `name` now carries the `@joe0001/` scope prefix, matching
  package.json `name`. The patch layer treats `name` as both matching key and
  anti-squat protection, so the unscoped `dsh-prompt-optimizer` made the row
  unresolvable after any clean reinstall (the loader cannot fix it from the
  profile layer). This fixes installs from npm / the market for everyone.

## [0.2.0] - 2026-08-26

### Engineering / hardening

- Hardened the client: functional-tick re-render (avoids `setState` bail-out),
  90s request timeout with per-session reset and generation guard, an error
  boundary per seat, and `--dsw-alias-*` theme tokens.
- Added AbortController enhancement (`lib/abort.js`): `TimedAbortController`
  and `createTimedController` for timeout / cancel / composed signals; the host
  passes `opts.signal` to `llm.stream`, and the client inlines a real
  `AbortController` so cancel/timeout aborts the in-flight fetch.
- Added `test/abort.test.js` (fake timers) and an `abort:` group in
  `test/verify.js`; `npm run test` now runs verify (21 checks) + abort (8).
- Added release SOP and maintenance backlog (`docs/release.md`,
  `docs/maintenance.md`); recorded the change decision as ADR-0005.
- Added `SECURITY.md` (privacy & loopback-only notes) and submitted the
  package to the awesome-dsh-plugin registry (PR #3358, pending merge).
- Added competitor-informed features (see `docs/market-analysis.md`):
  output **style** (general / professional / concise / coding), output
  **language** (auto / zh / en), **undo** after adopt, and **retry** on
  error; the host composes the system prompt from the selection
  (`buildSystem`).
- UI: the optimize control is now an **icon-only ✨ button** next to the model
  selector (`conversation.input.right`), with compact style/language selects,
  an undo icon after adopt, and a retry icon on error; the header action is
  icon-only too (market-aligned, see `docs/market-analysis.md`).

## [0.1.0] - 2026-08-25

Initial release of the prompt-optimizer market package.

### Added

- **Host half** (`lib/index.js`): a loopback-only HTTP route
  (`/api/prompt-optimizer/optimize`) that runs the optimization through DSH's
  official `llm` service using the session's current default model
  (`agentDefaultModel`); no storage, no session writes, no third-party calls.
- **Client half** (`lib/client.js`): a `window.__ModuleLoader__` browser bundle
  with three official entry points that share one module-level state machine —
  - a 优化 / Optimize button in the composer tool row
    (`conversation.input.left`);
  - a 优化 action in the session header
    (`conversation.session.header.actions`);
  - an `/optimize` slash command (`inputTriggers`, when available).
- **Confirm-before-apply comparison bar** in `conversation.input.dock` showing
  原始输入 / 优化结果 side by side, with 采用优化结果 / 放弃, and a stacking
  layout on narrow windows (see [ADR-0001](./docs/adr/0001-use-input-dock-instead-of-overlay-modal.md)).
- **Cancellable requests** — an in-flight request shows a spinner + 取消, and
  cancelling discards a late result via a request-sequence guard.
- **Changed-draft guard** — editing while the request is in flight disables
  adopt and warns, so a late result never clobbers new content.
- **Localized & accessible UI** — zh / en locale strings through the DSH locale
  service, aria-labels, keyboard-operable buttons.
- **Safe degradation** — missing model, model error, empty result and request
  failure surface a friendly message and never lose the draft.
- **Market package files** — `cordis.patch.yml` patch layer,
  `dsh.bundle`/`dsh.client` manifest, `README.md`, `MARKET.md`,
  Apache-2.0 `LICENSE`, `.gitignore`.

[Unreleased]: https://github.com/LHF198/dsh-prompt-optimizer/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/LHF198/dsh-prompt-optimizer/releases/tag/v0.1.0
[releases]: https://github.com/LHF198/dsh-prompt-optimizer/releases

<!--
The links above point at the `LHF198` owner; create the remote repo and tag the
first release before publishing (see docs/release.md).
-->
