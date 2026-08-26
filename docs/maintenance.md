# Maintenance Backlog · dsh-prompt-optimizer

Living list of agreed work, updated after each release. Items are prioritized
(P0 = release-blocking; P1 = quality/enhancement; P2 = nice-to-have).

## P0 · Release-blocking

- [ ] **Replace `YOUR_ORG`** with the real GitHub owner (`package.json`,
      `MARKET.md`, `CHANGELOG.md`) and add the remote repo.
- [ ] **Publish** `npm publish` + awesome-dsh-plugin PR (needs npm credentials).
- [ ] **Declare a supported DSH version matrix** in README and validate each.

## P1 · Quality / enhancement

- [x] **AbortController enhancement** (`lib/abort.js`, host `opts.signal`,
      client inline abort; unit + verify `abort:` group). — done in 0.1.0 style.
- [ ] **Multi-version compatibility pass**: run against 2–3 supported DSH
      versions; lock the contract (Slot/route/timer) with the `verify` suite.
- [ ] **Deep theme + responsive verification**: force dark theme, test narrow
      viewport column stacking, contrast of brand-colored controls.
- [ ] **Performance / capacity**: review the 256KB body cap and the 90s model
      timeout for large prompts; consider a size-aware guard.
- [ ] **Memory / perf**: ensure `state.listeners` never grows unbounded across
      long sessions (ticker + listeners lifecycle already paired; add a check).

## P2 · Nice-to-have

- [ ] True `AbortSignal.any`-based compose helper (optional; current manual
      propagation works) and an axios `CancelToken` backboard for old axios.
- [ ] `docs/adr/` snapshot into README for discoverability.
- [ ] Add a `CONTRIBUTING` snippet (code fence) test fixture + CI in a repo
      workflow (if hosted on a platform with CI).

## Ownership & review flow (per change)

1. Make the smallest change to the **market package** (`lib/`, `package.json`,
   docs) — it is the single source of truth; the dynamic plugin is only a
   verification vehicle.
2. Run `npm run lint && npm run build && npm run test` (verify + abort) → green.
3. Add/adjust an ADR or CHANGELOG entry for any non-obvious decision.
4. Open a PR; require a review; then release via `docs/release.md`.

## Team mapping (this project's working cohort)

| Role | Here |
|---|---|
| Architecture / contract | arch |
| Testing / quality | quality |
| Docs / release | process |
| Owner / release / review | captain (lead) |
