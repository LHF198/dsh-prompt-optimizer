# ADR-0004 — Community release via npm + the awesome-dsh-plugin registry

- **Status**: Accepted
- **Date**: 2026-08-25
- **Deciders**: maintainer

## Context

The plugin was verified end-to-end as a dynamic Cordis plugin and is ready to be
packaged for the community. The DSH ecosystem distribution path is:

1. publish the package to **npm** (a `registry-verified` name is protected), then
2. list it in the **awesome-dsh-plugin** registry (not by PRing the `dshmarket`
   repo itself).

The `dshmarket` checker (`check.ts`, `compatibility.ts`, `verify.ts`) imposes
hard constraints that shaped the package:

- `@deepseek-ai/*` core packages must stay in `peerDependencies` — shipping a
  hoisted core copy shadows the host (the `dsh-excel-chat` failure mode).
- The loader entry `id`/`name` must be unique (`dsh-prompt-optimizer`); a
  duplicate id bricks the next boot.
- The peer range must be honest for the supported DSH versions (`belowMin` is a
  hard risk).
- No install-time build scripts (pnpm ≥ 10 blocks them by default).
- This is a Web-profile plugin (client `platform: web`); it must not be installed
  into a CLI/terminal profile.

## Decision

Release to the community via **npm + the awesome-dsh-plugin registry**, while:

- keeping `@deepseek-ai/*` as peers and the loader id unique;
- publishing the hand-built `lib/` (never a source-only checkout that requires a
  build step, which causes `ERR_MODULE_NOT_FOUND`);
- keeping peer ranges aligned with the supported DSH versions;
- pointing the repository metadata (repository / homepage / bugs and the
  registry entry) at the `LHF198` owner **before** the first release;
- maintaining a `CHANGELOG.md` and using SemVer (current version `0.1.0`).

## Consequences

- **Positive**: discoverable and installable through the DSH market; the npm
  name is protected; the checker's hard failures are avoided by the package's
  current shape.
- **Negative**: requires a real public GitHub repository/owner, an npm publish
  token, and version/release discipline; the hand-written bundle must be kept
  in sync with its source; the supported-version range needs ongoing upkeep as
  DSH evolves.
