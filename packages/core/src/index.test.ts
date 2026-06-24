import assert from 'node:assert/strict';
import test from 'node:test';
import { applyCheck } from './index.js';

test('opens an incident only after the failure threshold', () => {
  const first = applyCheck({ lastStatus: 'up', consecutiveFailures: 0, failureThreshold: 2 }, false);
  assert.deepEqual(first, { status: 'up', consecutiveFailures: 1, event: 'none' });
  const second = applyCheck({ lastStatus: first.status, consecutiveFailures: 1, failureThreshold: 2 }, false);
  assert.deepEqual(second, { status: 'down', consecutiveFailures: 2, event: 'opened' });
});

test('resolves an incident on recovery', () => {
  assert.deepEqual(applyCheck({ lastStatus: 'down', consecutiveFailures: 4, failureThreshold: 2 }, true), {
    status: 'up', consecutiveFailures: 0, event: 'resolved'
  });
});
