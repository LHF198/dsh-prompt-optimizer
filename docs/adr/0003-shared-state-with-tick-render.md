# ADR-0003 — Shared module-level state with a React tick re-render

- **Status**: Accepted
- **Date**: 2026-08-25
- **Deciders**: maintainer

## Context

The plugin has **four entry points** that must all reflect one state machine
(idle → running → success | error | cancelled):

- the composer button (`conversation.input.left`),
- the session header action (`conversation.session.header.actions`),
- the `/optimize` slash command (`inputTriggers`),
- the original-vs-result comparison bar (`conversation.input.dock`).

If each entry point held its own component-local state, the controls would
drift (for example, the button shows a spinner while the comparison bar still
renders stale content), and coordination would be duplicated.

Additionally, the shared state lives in a **module-level mutable object**, which
React cannot observe directly — so components need an explicit trigger to
re-render. React bails out of a re-render when the new hook value is
`Object.is`-equal to the current one, so a trigger that does not change its
identity would fail to re-render.

## Decision

Keep **one module-level `state` singleton** and have components subscribe to it:

- A `listen()` hook captures `useState` (a tick counter) and registers its
  setter in `state.listeners`, then returns the shared `state`.
- `state.emit()` invokes every subscribed setter, forcing each subscribed
  component to re-render from the same source.
- The tick value is advanced on each emit; because React cannot see the shared
  module state, the tick is the thing that prevents a bail-out so every emit
  produces a render.
- Stale-result protection uses an incrementing `state.request` sequence — a late
  response whose sequence no longer matches is dropped.

## Consequences

- **Positive**: single source of truth; all controls stay in sync from one
  state machine; the stale-result guard (sequence) and the changed-draft guard
  (`lastDraft !== original`) are centralized; cancel/timeout transitions are
  handled in one place.
- **Negative**: the module-level `state` is mutable and shared, so subscribers
  must unsubscribe on unmount (the `listen` effect returns a disposer) and each
  entry point must use `listen()` + `syncFrom(props)` rather than local state —
  otherwise it will not reflect the shared machine.

## Related

- [CONTRIBUTING.md](../../CONTRIBUTING.md) — "share state through the
  module-level singleton ... do not fork per-entry-point state".
