import assert from 'node:assert/strict';
import test from 'node:test';
import { selectTask, validateLedger } from './lib.mjs';

const base = {
  schema_version: 1,
  updated_at: '2026-10-23',
  tasks: [
    { id: 'OPS-001', title: 'Foundation task', status: 'done', readiness: 'integration', depends_on: [], allowed_paths: ['docs/'], acceptance: ['passes'], pr: null, blocker: null },
    { id: 'APP-001', title: 'Application task', status: 'pending', readiness: 'demo', depends_on: ['OPS-001'], allowed_paths: ['apps/'], acceptance: ['passes'], pr: null, blocker: null }
  ]
};

test('validates a dependency ordered ledger', () => assert.deepEqual(validateLedger(base), []));
test('selects the first dependency-ready task', () => assert.equal(selectTask(base)?.id, 'APP-001'));
test('does not duplicate a task with an open PR', () => assert.equal(selectTask(base, { openTaskIds: new Set(['APP-001']) }), null));
test('treats a merged in-review dependency as complete', () => {
  const ledger = structuredClone(base);
  ledger.tasks[0].status = 'in_review';
  ledger.tasks[0].pr = 6;
  assert.equal(selectTask(ledger, { mergedPrs: new Set([6]) })?.id, 'APP-001');
});
