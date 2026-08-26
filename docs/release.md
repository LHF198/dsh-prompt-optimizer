# Release & Maintenance SOP · dsh-prompt-optimizer

This is the release-runbook for maintainers. Steps marked **[needs-owner]**
require you to supply the real GitHub `owner`/repo and npm credentials.

## Pre-release gate (must all pass)

1. **Quality** — `npm run lint` && `npm run build` && `npm run test`
   (`verify.js` 21 checks + `abort.test.js` 8) → all green.
2. **Descriptor** — `package.json`: no `dependencies`; peerDeps
   cordis/dsh-llm/react; `files` ships `lib/`, `cordis.patch.yml`, README,
   LICENSE, CHANGELOG, CONTRIBUTING, `docs/adr/`; `exports` correct;
   `cordis.patch.yml` id unique.
3. **Contract** — client bundle has no `import`/JSX; all `var(--dsw-alias-*)`
   are valid theme tokens; the three seats are registered; the error boundary is
   an ancestor of each guarded component.
4. **Docs / governance** — README/MARKET/CHANGELOG/CONTRIBUTING/ADR consistent
   with the actual `scripts` and build story; `LICENSE` Apache-2.0;
   privacy/loopback statements accurate.

## Release steps

1. **Owner metadata** — already points at `LHF198` (package.json
   `repository`/`homepage`/`bugs` + `MARKET.md` + `CHANGELOG.md`). Confirm the
   remote repo exists under `LHF198` before publishing.
2. **Version + tag** — set `version` (semver), ensure `CHANGELOG` entry, then
   `git tag vX.Y.Z && git push origin vX.Y.Z`.
3. **Dry run** — `npm pack --dry-run` (verify `files` list) then
   `npm publish --dry-run`.
4. **Publish npm** — `npm publish` (registry-verified). Verify:
   `npm view dsh-prompt-optimizer`.
5. **Registry entry** — submit the awesome-dsh-plugin PR with the
   `RegistryPlugin` fields (name/owner/url/category/description/npm/stars/
   install/added) from `MARKET.md`.
6. **Post-release validation** (below) and update the release notes.

## Post-release validation (acceptance)

| Layer | Action | Pass |
|---|---|---|
| Installer | Install in a clean DSH profile; run dshmarket `check`/`verify` (live/inert/broken) | no red; live |
| E2E | Trigger all three seats; empty-input disabled; loading; compare bar; ×/cancel/close; adopt; repeated cycles; light+dark theme | all pass |
| Contract | Verify against the declared supported DSH version matrix (see README) | no regression |
| Regression | `node test/verify.js` (21) + scripted browser regression | all green |

## Rollback

npm versions are effectively immutable, so **rollback = ship a `patch`** plus a
git tag revert:

- Revert source: `git revert <bad-commit>` or `git reset --hard <prev-tag>`;
  re-tag and publish a patch (`vX.Y.Z+1`).
- Update the awesome-dsh-plugin entry to point at the fixed version.

## Incident triggers for rollback

- Any acceptance item above fails.
- Installed package throws `ERR_MODULE_NOT_FOUND` (files missing `lib/`).
- Contract break after a DSH update (use a declared-version matrix and the
  contract tests before declaring a version compatible).
