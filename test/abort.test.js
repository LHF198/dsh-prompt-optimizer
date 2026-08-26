/**
 * Unit tests for lib/abort.js using node:test + mock timers (no framework).
 * Run: node --test test/abort.test.js
 */
import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import {
  TimedAbortController,
  createTimedController,
  isTimeoutError,
  isAbortError,
} from '../lib/abort.js'

test('timeout aborts with TimeoutError reason', () => {
  mock.timers.enable({ apis: ['setTimeout'] })
  try {
    const c = new TimedAbortController(100)
    assert.equal(c.signal.aborted, false)
    mock.timers.tick(100)
    assert.equal(c.signal.aborted, true)
    assert.equal(c.signal.reason.name, 'TimeoutError')
    assert.ok(isTimeoutError(c.signal.reason))
  } finally {
    mock.timers.reset()
  }
})

test('default cancel aborts with AbortError', () => {
  mock.timers.enable({ apis: ['setTimeout'] })
  try {
    const c = new TimedAbortController()
    c.cancel()
    assert.equal(c.signal.aborted, true)
    assert.equal(c.signal.reason.name, 'AbortError')
    assert.ok(isAbortError(c.signal.reason))
  } finally {
    mock.timers.reset()
  }
})

test('resetting timeout postpones expiry', () => {
  mock.timers.enable({ apis: ['setTimeout'] })
  try {
    const c = new TimedAbortController(50)
    c.timeout(100) // reset to 100ms
    mock.timers.tick(75) // before 100ms → not aborted
    assert.equal(c.signal.aborted, false)
    mock.timers.tick(30) // now past 100ms
    assert.equal(c.signal.aborted, true)
  } finally {
    mock.timers.reset()
  }
})

test('cancel is idempotent and raises timer', () => {
  mock.timers.enable({ apis: ['setTimeout'] })
  try {
    const c = new TimedAbortController(1000000)
    c.cancel('cancel')
    const reason = c.signal.reason
    c.cancel('timeout') // no-op, keeps first reason
    assert.equal(c.signal.reason, reason)
    assert.equal(c.signal.reason.name, 'AbortError')
    mock.timers.tick(2000000) // timer should be cleared → no double abort
    assert.equal(c.signal.reason, reason)
  } finally {
    mock.timers.reset()
  }
})

test('dispose clears timer without cancelling', () => {
  mock.timers.enable({ apis: ['setTimeout'] })
  try {
    const c = new TimedAbortController(100)
    c.dispose()
    mock.timers.tick(200)
    assert.equal(c.signal.aborted, false)
  } finally {
    mock.timers.reset()
  }
})

test('createTimedController propagates external abort', () => {
  mock.timers.enable({ apis: ['setTimeout'] })
  try {
    const external = new AbortController()
    const h = createTimedController({ signal: external.signal })
    external.abort(new DOMException('cancel', 'AbortError'))
    assert.equal(h.signal.aborted, true)
    assert.equal(h.signal.reason.name, 'AbortError')
  } finally {
    mock.timers.reset()
  }
})

test('createTimedController dispose stops propagation and cleans timer', () => {
  mock.timers.enable({ apis: ['setTimeout'] })
  try {
    const h = createTimedController({ timeoutMs: 100 })
    h.dispose()
    mock.timers.tick(200)
    assert.equal(h.signal.aborted, false)
  } finally {
    mock.timers.reset()
  }
})

test('isTimeoutError / isAbortError tolerate non-DOMException', () => {
  assert.equal(isTimeoutError(new Error('x')), false)
  assert.equal(isAbortError(null), false)
  assert.equal(isTimeoutError({ name: 'TimeoutError' }), true)
  assert.equal(isAbortError({ name: 'AbortError' }), true)
})
