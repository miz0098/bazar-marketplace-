import fs from 'node:fs';
import path from 'node:path';

export const ledgerPath = path.resolve('.github/autonomous/tasks.json');

export function readLedger() {
  return JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
}

export function writeLedger(ledger) {
  ledger.updated_at = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
}

export function validateLedger(ledger) {
  const errors = [];
  const allowedStatuses = new Set(['pending', 'in_progress', 'in_review', 'done', 'blocked']);
  const allowedReadiness = new Set(['demo', 'integration', 'production']);
  if (ledger.schema_version !== 1) errors.push('schema_version must be 1');
  if (!Array.isArray(ledger.tasks) || ledger.tasks.length === 0) errors.push('tasks must be a non-empty array');

  const ids = new Set();
  for (const task of ledger.tasks ?? []) {
    if (!/^[A-Z]+-[0-9]{3}$/.test(task.id ?? '')) errors.push(`invalid task id: ${task.id}`);
    if (ids.has(task.id)) errors.push(`duplicate task id: ${task.id}`);
    ids.add(task.id);
    if (!allowedStatuses.has(task.status)) errors.push(`${task.id}: invalid status`);
    if (!allowedReadiness.has(task.readiness)) errors.push(`${task.id}: invalid readiness`);
    if (!Array.isArray(task.depends_on)) errors.push(`${task.id}: depends_on must be an array`);
    if (!Array.isArray(task.allowed_paths) || task.allowed_paths.length === 0) errors.push(`${task.id}: allowed_paths required`);
    if (!Array.isArray(task.acceptance) || task.acceptance.length === 0) errors.push(`${task.id}: acceptance required`);
    if (task.status === 'in_review' && !Number.isInteger(task.pr)) errors.push(`${task.id}: in_review requires a PR number`);
  }

  for (const task of ledger.tasks ?? []) {
    for (const dependency of task.depends_on ?? []) {
      if (!ids.has(dependency)) errors.push(`${task.id}: unknown dependency ${dependency}`);
      if (dependency === task.id) errors.push(`${task.id}: cannot depend on itself`);
    }
  }

  const visiting = new Set();
  const visited = new Set();
  const byId = new Map((ledger.tasks ?? []).map((task) => [task.id, task]));
  function visit(id) {
    if (visiting.has(id)) { errors.push(`dependency cycle includes ${id}`); return; }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of byId.get(id)?.depends_on ?? []) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of ids) visit(id);
  return [...new Set(errors)];
}

export function effectiveDone(task, mergedPrs) {
  return task.status === 'done' || (task.status === 'in_review' && mergedPrs.has(task.pr));
}

export function selectTask(ledger, { mergedPrs = new Set(), openTaskIds = new Set() } = {}) {
  const byId = new Map(ledger.tasks.map((task) => [task.id, task]));
  return ledger.tasks.find((task) => task.status === 'pending'
    && !openTaskIds.has(task.id)
    && task.depends_on.every((id) => effectiveDone(byId.get(id), mergedPrs))) ?? null;
}
