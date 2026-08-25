# ADR-0002 — Wrap the `/optimize` slash source in `ctx.effect`

- **Status**: Accepted
- **Date**: 2026-08-25
- **Deciders**: maintainer (caught during multi-round dynamic-plugin repair)

## Context

The `/optimize` slash command is registered through the `inputTriggers`
service (`registerSource`). During re-registration (plugin update, hot reload,
or apply re-running) the slash source threw
**`already registered`**, because a prior registration was left on the runtime
and not scoped to the current Cordis fiber.

In DSH's Cordis model, work that must be torn down on stop / update / undefine
belongs inside a fiber-scoped lifecycle. Leaking a registration outside that
lifecycle accumulates duplicate handlers.

## Decision

Register the slash source — and every other client registration and side effect
(the CSS `<style>` element, each `slots.inject`, the slash source) — **inside the
`ctx.effect` generator**, and yield disposers so the runtime can clean them up.
The slash source is guarded by `ctx.get('inputTriggers')` and degrades gracefully
when that optional service is absent.

## Consequences

- **Positive**: the plugin can be stopped, updated, or undefined cleanly; the
  slash command re-registers without the `already registered` error.
- **Negative**: every registration must be wrapped in `ctx.effect`; forgetting
  to yield a disposer leaks a handler, so this is a review-checklist item.

## Related

- [CONTRIBUTING.md](../../CONTRIBUTING.md) — "every side effect is reversible".
