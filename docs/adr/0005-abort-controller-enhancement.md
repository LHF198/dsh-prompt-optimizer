# ADR-0005 · AbortController enhancement for request control

**Status**: Accepted

## Context

The client's optimization request is a single `fetch` to the loopback route
`/api/prompt-optimizer/optimize`; the host streams the model via `llm.stream`.
Prior behavior only **logically** dropped a late response (a request-generation
counter) and relied on a client timer to flip the UI to an error. A hung model
would keep the network request open and leave state ambiguous, and there was no
way to distinguish a real timeout from a user cancel.

## Decision

Add an incremental, backward-compatible enhancement over the native
`AbortController` (exported from `lib/abort.js`, which is published with the
package):

- `TimedAbortController` — extends `AbortController`; adds a reset-able
  `timeout(ms)`, reason-bearing `cancel(reason)` (`'cancel'` → `AbortError`,
  `'timeout'` → `TimeoutError`), and `dispose()`; idempotent.
- `createTimedController({ timeoutMs, signal })` — composes an external signal
  (works without `AbortSignal.any`) and returns `{ signal, cancel, timeout,
  dispose }`.
- `isTimeoutError` / `isAbortError` — best-effort error classification.

Integration:

- **Host** (`lib/index.js`): creates a `TimedAbortController` (90s), passes
  `opts.signal` to `llm.stream`, and `dispose()`es it in `finally`. Also fixes
  `maxTokens` to `4096` (was the drift-causing `1200`).
- **Client** (`lib/client.js`): inlines a real `AbortController` + `abortCtrl()`
  so cancel/timeout/session-change aborts the in-flight fetch, while the
  authoritative error text still comes from the generation-guarded logic timer
  (which also works where `AbortController`/`setTimeout` are unavailable, e.g.
  the constrained dynamic-plugin runtime).
- **Tests** (`test/abort.test.js`): fake-timer unit tests for timeout/cancel /
  reset / dispose / compose / idempotency; `test/verify.js` gains an `abort:`
  group (module, host-signal, client-inline, tests).

## Consequences

- No prototype monkey-patching; native `AbortController`/`AbortSignal` behavior
  is untouched, so axios/fetch/other code and test stubs are unaffected.
- Timeout/cancel now actually abort the network request, avoiding leaked
  connections and leaving no ambiguous "optimizing…" state.
- Cost: a second abort module (`lib/abort.js`) that the hand-written client
  bundle duplicates inline (the bundle cannot `import` an ESM module). This is
  an accepted, documented duplication; the canonical source is `lib/abort.js`.
- In restricted runtimes without `AbortController`/`setTimeout` and without
  `React.Component`, we degrade to the generation-guard (logic-drop) path; true
  abort and the error boundary remain market-package (browser) capabilities.
