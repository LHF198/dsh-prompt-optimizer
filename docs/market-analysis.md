# Market Analysis & Optimization Suggestions

Snapshot: 2026-08-26 · based on the local awesome-dsh-plugin catalog
(`data/plugins/`, 2232 entries) and the published npm package
`@joe0001/dsh-prompt-optimizer@0.1.0`.

## 1. Market overview

- DSH plugin ecosystem: **2232 plugins** in the awesome-dsh-plugin catalog.
- Largest categories: `ui` 351, `tools` 290, `dev` 189, `session` 149,
  `workflow` 128, `usage` 121.
- `dsh-prompt-optimizer` sits in `ui` — the most crowded category.
- **Prompt optimization is a red ocean**, not a blue one.

## 2. Direct competitors (≥10)

| Competitor | Profile (from catalog entries) | Threat |
|---|---|---|
| `SongMiao-tech/dsh-prompt-optimizer` | composer button + before/after dialog + one-click replace (near-identical) | High |
| `winditer/dsh-prompt-optimizer` | ✨/Alt+O + SSE streaming + reasoning-first + any OpenAI-compatible endpoint | High |
| `Y1X1n/dsh-prompt-optimizer` | SSE streaming + session-context-aware (template/intent) + memory chain + undo + model fallback | High |
| `seven282/oss-prompt-optimizer` | 3 output styles + persona profiling + self-iterating learning + /template 21 sub-scenes + auto zh/en | High |
| `zzy-dsh-prompt-optimizer` | optimize + cancel + undo | Medium |
| `wmengxiang/dsh-prompt-optimizer` | icon button + active model | Medium |
| `LCQ-1024/dsh-prompt-enhancer` | enhance button → agent-ready | Medium |
| `jinhuoooo/dsh-prompt-polish` | polish rules (de-AI) + free GLM + offline fallback | Medium |

Our position: **minimal, robust, engineered** (compare-confirm + input
protection + timeout/error boundary + theme tokens + verify gate + ADRs), with
stronger privacy (loopback-only, no session reads, official `llm` only) and
documentation, but **narrower feature breadth** than streaming/context/template
competitors.

## 3. Positioning

> "Send-before optimization with confirm-before-apply, official-model-only,
> privacy-preserving" — the steady/simple/clean pick.

Differentiators to lead with: **稳 (stable/engineered) · 简 (one-click,
confirm-then-adopt) · 净 (no session reads, no third-party endpoints)**.

## 4. Optimization suggestions (by priority)

### P0 — low cost, quick wins
1. **Output style selection** (general / professional / concise / coding) —
   system-prompt suffix + a small menu.
2. **Output language** (follow-input / zh / en) — system-prompt line.
3. **Undo after adopt** — keep `original`, restore on demand.
4. **Retry on error** — explicit retry affordance (reuses `start()`).

### P1 — medium cost, core experience
5. **SSE streaming progress** — keep the confirm-then-adopt main flow; stream
   only as progress preview.
6. **Optional shortcut** — e.g. `Mod+Shift+O`, with DSH conflict checks.

### P2 — differentiation, long-term
7. **Polish vs optimize dual modes** (de-AI polish like `jinhuoooo`).
8. **Command/tool integration** via a stable mechanism (avoid slash lifecycle
   pitfalls).
9. **Explicitly-authorized context enhancement** — off by default (privacy).

### Explicitly out of scope
- Third-party OpenAI-compatible endpoints (would break the official-only
  privacy story).
- Default session-history reads (conflicts with "no history").
- Chasing full parity with competitors.

## 5. Maintenance

- Keep the **verify gate** green on every change (21 checks + 8 abort tests).
- Follow `docs/release.md` for releases (dry-run → publish → validate →
  rollback via patch).
- Keep the **DSH version matrix** honest in README and re-verify on updates.
- Track npm downloads / GitHub issues / market installs to steer feature
  priority.
- Single-author sustainability: docs/ADR/SOP already enable handover;
  welcome contributors via `CONTRIBUTING.md`.
