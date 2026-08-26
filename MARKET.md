# Market release notes — dsh-prompt-optimizer

This package is intended for **community release** to npm and the
**awesome-dsh-plugin** registry. Everything below follows the DSH plugin market
conventions (see the `dshmarket` checker: `check.ts`, `compatibility.ts`,
`verify.ts`).

> **Status marker**: the repository metadata still carries `YOUR_ORG`
> placeholders (`package.json` repository / homepage / bugs, and the registry
> entry below). This is a **blocking pre-publish item** — must be replaced with
> the real owner before any release.

## Before publishing

- [ ] **Replace the `YOUR_ORG` placeholders** in `package.json` with the real
      repository/owner (repository / homepage / bugs), and update the
      `awesome-dsh-plugin` entry below to match.
- [ ] Confirm the **build story matches the actual package**. This is a
      hand-written bundle — there is **no compile/transpile step**. The package
      ships three scripts (run with `npm run <script>` or `pnpm run <script>`):
      `lint` = `node --check` on both halves, `build` = lint + confirm
      `lib/client.js` exists, `test` = `node test/verify.js`. Always ship the
      built `lib/` — never a source-only checkout that requires a build step
      (a missing `lib/` kills the whole profile with `ERR_MODULE_NOT_FOUND`).
- [ ] Confirm `@deepseek-ai/*` stays out of `dependencies`
      (peerDependencies only) — shipping a hoisted core copy shadows the host
      (the dsh-excel-chat failure mode the market checker names).
- [ ] Pick a unique loader entry `id`/`name` (`dsh-prompt-optimizer`) — a
      duplicate id bricks the next boot (checker #98 duplicate-id boot failure).
- [ ] Keep the peer range honest for the DSH versions you support; a too-low
      minimum (`belowMin`) is a hard risk. Current ranges: `@deepseek-ai/cordis
      ^4.0.1`, `@deepseek-ai/dsh-llm ^0.1.1-rc.2`, `react ^18.3.1` (optional).
- [ ] No install-time build scripts (pnpm >= 10 blocks them by default).
- [ ] This is a Web-profile plugin (client `platform: web`) — do not install
      it into a CLI/terminal profile.
- [ ] Release to npm (`registry-verified` protects the name), then list the
      package in the **awesome-dsh-plugin** registry — not by PRing the
      dshmarket repo itself.
- [ ] Walk the project docs before release: [README.md](./README.md),
      [CONTRIBUTING.md](./CONTRIBUTING.md), [CHANGELOG.md](./CHANGELOG.md) and
      [docs/adr](./docs/adr/) — confirm the supported-version claim and the
      choices recorded in the ADRs are still accurate.

## awesome-dsh-plugin registry entry

Add an entry with the `RegistryPlugin` fields (name / owner / url / category /
description / npm / stars / install / added). Example (owner still placeholder):

```yaml
- name: dsh-prompt-optimizer
  owner: YOUR_ORG
  url: https://github.com/YOUR_ORG/dsh-prompt-optimizer
  category: chat
  description: >-
    Improve the current chat draft before sending with the session's model and
    a confirm-before-apply original/result comparison. Loopback-only, no
    storage, no third-party calls.
  npm: dsh-prompt-optimizer
  stars: 0
  install: dsh-prompt-optimizer
  added: "2026-01-01"
```

## Verified behavior (transcript summary)

End-to-end verification was performed with the identical client/host logic as
a dynamic Cordis plugin in this DSH instance:

- Entry points: `conversation.input.left` button, `conversation.session.header.actions`
  header action, and a `/optimize` slash command — all share one module-level
  state machine (idle → running → success | error | cancelled).
- Running state: both buttons show a spinner + "优化中…" and act as Cancel
  while the request is in flight; cancelling shows a transient "已取消优化"
  toast; failures render an inline error banner; the stale-result guard drops
  late responses after cancel.
- Result presentation: an inline comparison bar in `conversation.input.dock`
  (original vs optimized, adopt/discard). The dock seat is additive and lives
  in the normal document flow, so no frame-level overlay can intercept its
  buttons — this replaced the earlier modal, which was rendered below DSH's
  `shell.overlay` layer (e.g. the update-checker banner, z-index 9998) and had
  unresponsive areas. (See [ADR-0001](./docs/adr/0001-use-input-dock-instead-of-overlay-modal.md).)
- Adopt writes the draft back via `inputActions.setDraft`; editing during the
  request disables adopt and shows the changed-draft warning.
- Known environment limits: the dynamic client runner does not commit
  root-scope `shell.overlay` entries (component renders but the element is
  never inserted), which is why the comparison uses the session-scope dock;
  the slash source must be wrapped in `ctx.effect` or re-registration fails
  with "already registered" (see [ADR-0002](./docs/adr/0002-wrap-slash-source-in-ctx-effect.md)).
