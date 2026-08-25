# Contributing to dsh-prompt-optimizer

Thanks for your interest in contributing. This is a small DSH market plugin;
keep changes focused and documented. There is a short review checklist at the
end that applies to every pull request.

## Development environment

- **Runtime**: Node.js ≥ 20 (the host half is ESM; verified on Node v26.3.0).
- **Package manager**: pnpm is recommended. There is **no `packageManager` pin
  yet** — if that matters for your environment, match the maintainer's version.
- **Dependencies**: the package has **zero runtime dependencies**. `@deepseek-ai/*`
  core packages are `peerDependencies` only and are provided by the DSH runtime
  — never add them to `dependencies` (shipping a hoisted core copy shadows the
  host and is a market-checker failure).
- **Clone and run**: the package is a hand-written bundle with **no build step**.
  Clone it, add the loader row to your DSH web profile, reload the GUI, and the
  composer/header/slash entry points appear. There is no `pnpm build`.

```bash
git clone https://github.com/YOUR_ORG/dsh-prompt-optimizer.git
cd dsh-prompt-optimizer
node --check lib/index.js    # host half syntax sanity
node --check lib/client.js   # client bundle syntax sanity
```

> The maintainers are adding `package.json.scripts` (build / lint / test) in an
> engineering pass. Until those land, `node --check` + manual browser
> verification are the gate. When the scripts are added, use them.

## Commit conventions

Use [Conventional Commits](https://www.conventionalcommits.org/) with a short
`type: subject` line:

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation only (this repo's docs: README, MARKET, CONTRIBUTING,
  CHANGELOG, `docs/adr/*`)
- `refactor:` code change that is neither a fix nor a feature
- `test:` tests
- `chore:` tooling / package / repo housekeeping

Keep the type lowercase and the subject under ~72 characters. Reference the
related issue in the body when there is one.

## Code style

The project is intentionally **plain JavaScript with no compile/transpile**
(no TypeScript, no JSX, no bundler), because the market package ships the built
artifacts directly. Follow these rules:

**Host half (`lib/index.js`)**
- Plain ESM: `export const name`, `export const inject`, `export function apply`.
- Read optional services with `ctx.get('service')` and guard for `undefined`;
  declare a service in `inject` only when it is a hard dependency.
- Register every side effect (routes, listeners, timers) inside `ctx.effect(...)`
  or `ctx.on(...)` and return a disposer, so stop/update/undefine cleans up.
- Keep the `webServer` route loopback-only and unchanged unless you have a
  reason; privacy is a design constraint (see the README).

**Client half (`lib/client.js`)**
- Write inside the `window.__ModuleLoader__.load({ id, factory })` shape.
- Do **not** use JSX, TypeScript, or module-scope `import`/`require` beyond
  `require("react")`. Build elements with `react.createElement`.
- Register UI only through the official `slots` API
  (`ctx.slots.inject(...)` → `slots.register(...)`).
- Wrap the `/optimize` slash source and any other registration in `ctx.effect`
  (see [ADR-0002](./docs/adr/0002-wrap-slash-source-in-ctx-effect.md));
  re-registering a slash source outside `ctx.effect` throws "already registered".
- Share state through the module-level singleton and re-render via the React
  tick subscription (see [ADR-0003](./docs/adr/0003-shared-state-with-tick-render.md));
  do not fork per-entry-point state or the controls will drift.
- Keep locale strings in the `zh`/`en` maps and always localize user-facing
  strings through `ctx.locale.bind(NS)`.

**Docs / decisions**
- Record intentional architecture decisions in `docs/adr/` (see the index and
  [how to add an ADR](./docs/adr/README.md)).
- The client bundle has **no revision/version marker** today; if you touch the
  client, bump the loader entry revision so running pages pick up the new bundle.

## Testing requirements

- **Every change must pass**: `node --check lib/index.js` and
  `node --check lib/client.js`.
- **No automated suite exists yet** (there is no `test/` and no `test` script).
  Verify behavior manually against a running DSH **web** profile:
  - composer button (`优化` / spinner / cancel / `已取消优化` toast);
  - session header action;
  - `/optimize` slash command (and `/optimize <text>`);
  - the original-vs-result dock (adopt / discard / close);
  - the **changed-draft guard** (edit while in flight disables adopt);
  - the **stale-result guard** (cancel then a late response is dropped);
  - locale: run the UI in both `zh` and `en`.
- If the maintainers add a `test/` harness, add/adjust tests in it and run the
  project's configured test command before submitting.
- Keep `@deepseek-ai/*` out of `dependencies` and keep peer ranges aligned with
  the DSH versions you actually support.

## Pull request conventions

- One logical change per PR (repo housekeeping / docs / feature / fix). Do not
  mix a fix with a feature unless it is genuinely one change.
- Run `node --check` on both halves and, where relevant, verify in the browser.
  State in the PR description what you verified and on which DSH version.
- Do **not** bump `version` or edit `package.json`/`lib/*`/`test/*` just to touch
  docs; those are owned by the maintainers (a split-ownership pass is in flight).
- Update `CHANGELOG.md` (Unreleased) and, when a behavior choice changes,
  add/replace an ADR.
- Keep the diff small; do not commit generated or local files (see `.gitignore`,
  which already ignores `node_modules/`, build outputs, logs, `.env`, editor
  files).

## Issue template

Use concise issues. For a bug, include: what you expected, what happened, the
DSH version (`dsh --version` or the installed `@deepseek-ai/*` versions),
and a minimal repro. For a feature, state the motivation and the intended
behavior so reviewers can tell whether it belongs in this plugin.

## Review checklist (applies to every PR)

- [ ] `node --check` passes on `lib/index.js` and `lib/client.js`.
- [ ] No JSX / TypeScript / module-scope `import` added to the client bundle.
- [ ] UI registered via `slots`; slash source wrapped in `ctx.effect`.
- [ ] Side effects are reversible (disposer returned / under `ctx.effect`).
- [ ] Locale strings added to both `zh` and `en`.
- [ ] `@deepseek-ai/*` stays in `peerDependencies` (never `dependencies`).
- [ ] Changelog updated; ADR added/updated if a decision changed.
