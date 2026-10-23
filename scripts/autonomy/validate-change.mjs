#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readLedger } from './lib.mjs';

const taskId = process.env.TASK_ID;
const base = process.env.BASE_REF ?? 'origin/vps-migration';
const task = readLedger().tasks.find((candidate) => candidate.id === taskId);
if (!task) throw new Error(`Unknown task ${taskId}`);

const committed = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], { encoding: 'utf8' });
const working = execFileSync('git', ['diff', '--name-only', 'HEAD'], { encoding: 'utf8' });
const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { encoding: 'utf8' });
const files = [...new Set(`${committed}\n${working}\n${untracked}`.split('\n').filter(Boolean))];
const allowed = [...task.allowed_paths, '.github/autonomous/tasks.json'];
const violations = files.filter((file) => !allowed.some((prefix) => file === prefix || file.startsWith(prefix)));
if (!files.length) throw new Error('Task produced no changes.');
if (violations.length) throw new Error(`Out-of-scope changes for ${taskId}:\n${violations.join('\n')}`);
console.log(`Validated ${files.length} changed paths for ${taskId}.`);
