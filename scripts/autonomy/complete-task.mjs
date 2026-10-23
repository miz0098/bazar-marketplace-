#!/usr/bin/env node
import { readLedger, writeLedger } from './lib.mjs';

const taskId = process.env.TASK_ID;
const ledger = readLedger();
const task = ledger.tasks.find((candidate) => candidate.id === taskId);
if (!task) throw new Error(`Unknown task ${taskId}`);
if (task.status === 'done') {
  console.log(`${taskId} is already marked done on this task branch.`);
  process.exit(0);
}
if (!['pending', 'in_progress'].includes(task.status)) throw new Error(`${taskId} cannot transition from ${task.status} to done`);
task.status = 'done';
task.blocker = task.blocker || null;
writeLedger(ledger);
console.log(`${taskId} marked done on the task branch; it becomes authoritative only when the PR merges.`);
