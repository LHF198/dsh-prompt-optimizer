/**
 * timed-abort-controller — incremental enhancement over the native
 * AbortController for frontend request handling.
 *
 * Adds, without touching the native API:
 *   - one-shot / resettable timeout,
 *   - reason-bearing cancel ('timeout' | 'cancel' | custom),
 *   - a factory that composes an external signal and returns a stable
 *     { signal, cancel, timeout, dispose } handle,
 *   - standardized DOMException reasons (AbortError / TimeoutError).
 *
 * Backward compatible: `signal` is a standard AbortSignal accepted by
 * fetch / axios (>= 0.22). No prototype is patched.
 */

/** Map a string/object reason to a canonical DOMException. */
function normalizeReason(reason) {
  if (reason && typeof reason === 'object') return reason;          // already an error/object
  const isTimeout = reason === 'timeout';
  return new DOMException(
    isTimeout ? 'The operation timed out.' : 'The operation was aborted.',
    isTimeout ? 'TimeoutError' : 'AbortError',
  );
}

/** Native AbortController subclass with timeout + resettable timer. */
export class TimedAbortController extends AbortController {
  constructor(timeoutMs) {
    super();
    this._timer = null;
    if (typeof timeoutMs === 'number' && timeoutMs > 0) this.timeout(timeoutMs);
  }

  /** Set / reset the timeout; on expiry cancels with a TimeoutError. */
  timeout(ms) {
    this._clear();
    if (typeof ms !== 'number' || ms <= 0) return this;
    this._timer = setTimeout(() => {
      this._timer = null;
      this.cancel('timeout');
    }, ms);
    return this;
  }

  /** Cancel with a reason: 'cancel' (default), 'timeout', or a custom object. Idempotent. */
  cancel(reason = 'cancel') {
    this._clear();
    if (this.signal.aborted) return this;
    this.abort(normalizeReason(reason));
    return this;
  }

  /** Clear the timer without cancelling (call on request settle). */
  dispose() {
    this._clear();
    return this;
  }

  _clear() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }
}

/**
 * Compose an external signal with the controller's own timeout, returning a
 * stable handle. Works without AbortSignal.any (manual propagation).
 */
export function createTimedController({ timeoutMs, signal: external } = {}) {
  const inner = new TimedAbortController();
  let timer = null;

  const clearTimer = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
  const setTimer = (ms) => {
    clearTimer();
    if (typeof ms === 'number' && ms > 0) {
      timer = setTimeout(() => inner.cancel('timeout'), ms);
    }
  };

  const onExternalAbort = () => {
    inner.cancel((external && external.reason) || 'cancel');
  };
  if (external) {
    if (external.aborted) onExternalAbort();
    else external.addEventListener('abort', onExternalAbort, { once: true });
  }

  const handle = {
    get signal() {
      return inner.signal;
    },
    cancel(reason) {
      inner.cancel(reason);
      return handle;
    },
    timeout(ms) {
      setTimer(ms);
      return handle;
    },
    dispose() {
      clearTimer();
      if (external) external.removeEventListener('abort', onExternalAbort);
      return handle;
    },
  };

  if (typeof timeoutMs === 'number') setTimer(timeoutMs);
  return handle;
}

/** Whether an unknown error is a timeout (best-effort, browser-tolerant). */
export function isTimeoutError(err) {
  if (!err) return false;
  if (err.name === 'TimeoutError') return true;
  return !!(err.cause && err.cause.name === 'TimeoutError');
}

/** Whether an unknown error is an abort / cancel. */
export function isAbortError(err) {
  return !!err && (err.name === 'AbortError' || (err.cause && err.cause.name === 'AbortError'));
}
