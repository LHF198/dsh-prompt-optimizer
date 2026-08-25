# ADR-0001 — Use `conversation.input.dock` instead of an overlay modal for the result

- **Status**: Accepted
- **Date**: 2026-08-25
- **Deciders**: maintainer (verified end-to-end as a dynamic Cordis plugin)

## Context

The optimized result originally opened in a **modal overlay**. Two problems
surfaced during dynamic-plugin verification:

1. The dynamic client runner does not commit **root-scope** `shell.overlay`
   entries — the component renders but the element is never inserted, so the
   result never became visible.
2. When an overlay *did* render, it sat below DSH's own `shell.overlay` layer
   (for example the update-checker banner at `z-index: 9998`), leaving
   unresponsive areas where the overlay's controls could not be clicked.

Frame-level overlays compete for stacking order and can be covered or
intercepted by other frame-level UI.

## Decision

Present the original-vs-result comparison in an **inline, additive bar** mounted
in the session-scope `conversation.input.dock` seat (the area above the
composer), instead of an overlay modal.

- The dock seat lives in the **normal document flow**, so no frame-level overlay
  can cover or intercept its buttons.
- Layout uses a two-column grid (`原始输入` / `优化结果`) that collapses to a
  single column under 640px via `@media(max-width:640px)`.
- The bar is session-scoped and rendered through `slots.register` on
  `conversation.input.dock`.

## Consequences

- **Positive**: the comparison bar is always reachable and clickable; it is
  additive and never fights the host's overlay stack; narrower reuse of the
  existing slot keeps the plugin free of DOM hacking.
- **Negative**: it occupies composer-adjacent space (rather than being a
  transient modal) and is scoped to the session — it does not render as a
  full-screen overlay. The user dismisses it with 放弃 / close.

## Alternatives considered

- `conversation.input.overlay` modal — rejected (dynamic runner does not commit
  it; overlay stacking makes controls unresponsive).
- Root-scope `shell.overlay` — rejected (dynamic runner does not commit
  root-scope overlay entries).
