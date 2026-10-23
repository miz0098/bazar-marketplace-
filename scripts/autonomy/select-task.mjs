#!/usr/bin/env node
import fs from 'node:fs';
import { readLedger, selectTask, validateLedger, writeLedger } from './lib.mjs';

const ledger = readLedger();
const errors = validateLedger(ledger);
if (errors.length) throw new Error(errors.join('\n'));

const mergedPrs = new Set((process.env.MERGED_PRS ?? '').split(',').filter(Boolean).map(Number));
const openTaskIds = new Set((process.env.OPEN_TASK_IDS ?? '').split(',').filter(Boolean));

if (process.argv.includes('--reconcile')) {
  for (const task of ledger.tasks) {
    if (task.status === 'in_review' && mergedPrs.has(task.pr)) task.status = 'done';
  }
  writeLedger(ledger);
}

const task = selectTask(ledger, { mergedPrs, openTaskIds });
const output = process.env.GITHUB_OUTPUT;
const values = task
  ? { has_task: 'true', task_id: task.id, task_title: task.title }
  : { has_task: 'false', task_id: '', task_title: '' };

if (output) fs.appendFileSync(output, Object.entries(values).map(([key, value]) => `${key}=${value}\n`).join(''));
console.log(task ? JSON.stringify(task, null, 2) : 'No dependency-ready task is available.');
