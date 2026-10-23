#!/usr/bin/env node
import fs from 'node:fs';
import { readLedger } from './lib.mjs';

const taskId = process.env.TASK_ID;
const outputPath = process.env.PROMPT_PATH;
const task = readLedger().tasks.find((candidate) => candidate.id === taskId);
if (!task || !outputPath) throw new Error('TASK_ID and PROMPT_PATH must identify a ledger task and output file.');

const prompt = `You are implementing BAZAR autonomous backlog task ${task.id}: ${task.title}.

Read AGENTS.md, MIGRATION_PLAN.md, ARCHITECTURE.md, docs/AUTONOMOUS_ROADMAP.md, docs/DEFINITION_OF_DONE.md, docs/AUTONOMOUS_OPERATIONS.md, docs/APPROVED_SCREENS_AUDIT.md, apps/storefront/MIGRATION_PROGRESS.md and .github/autonomous/tasks.json before editing.

Acceptance criteria:
${task.acceptance.map((item) => `- ${item}`).join('\n')}

You may edit only these path prefixes:
${task.allowed_paths.map((item) => `- ${item}`).join('\n')}

Rules:
- Work only on the already-created task branch. Never merge, deploy, change DNS, or modify main.
- Preserve the approved Ukrainian BAZAR UI from bazar-latest-shopify commit 105d10f; do not redesign.
- Do not modify or delete legacy Shopify files unless this task explicitly allows their path.
- Do not invent credentials, external API behavior, business/legal decisions, successful payments, OTP delivery, messages, or orders.
- Keep demo, integration and production readiness labels truthful.
- Use typed contracts, deterministic tests and small focused changes.
- Run the relevant checks available without secrets. If an external decision or credential blocks part of the task, document the blocker and complete all independent work.
- Update only this task's ledger entry to done when its implementation and local checks are complete. Do not change unrelated task status.
`;
fs.writeFileSync(outputPath, prompt);
