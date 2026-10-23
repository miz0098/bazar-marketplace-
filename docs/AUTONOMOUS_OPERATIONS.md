# BAZAR autonomous operations

## What is installed

The repository contains two independent automation layers:

1. `.github/workflows/ci.yml` validates every PR to `vps-migration` with clean installs, ledger tests, lint, typecheck, unit tests, production build, dependency audit and Playwright browser tests.
2. `.github/workflows/autonomous-next-task.yml` can be manually dispatched or scheduled. It reconciles merged task PRs, selects one dependency-ready ledger task, creates a short-lived branch, runs the official OpenAI Codex GitHub Action, validates changed paths and local checks, then opens a PR to `vps-migration`.

The workflow does not run continuously by itself. Scheduled execution requires GitHub Actions to be enabled, a usable runner, repository secrets and sufficient token permissions. A disabled repository, exhausted billing/quota, unavailable runner or missing credential stops it.

## Authoritative state

`.github/autonomous/tasks.json` is the persistent backlog/status ledger. `scripts/autonomy/validate-ledger.mjs` rejects duplicate IDs, missing dependencies, cycles, invalid states and malformed task metadata.

Status meanings:

- `pending`: eligible after all dependencies are effective `done`.
- `in_progress`: reserved for an active manually tracked branch.
- `in_review`: PR exists; `pr` must be set. The selector will not duplicate it.
- `done`: merged implementation exists on `vps-migration`.
- `blocked`: no safe independent progress remains; `blocker` identifies the missing decision/credential/owner.

The task PR changes its own status to `done`, but that value only reaches the authoritative base when the PR merges. If an older `in_review` PR has merged, the next task branch reconciles it to `done`. Open `codex/auto-<TASK_ID>-*` PRs are excluded from selection.

## Agent loop

1. Trigger on the configured schedule or `workflow_dispatch`.
2. Check out `vps-migration` and validate the ledger.
3. Query GitHub for merged ledger PRs and open autonomous task PRs.
4. Reconcile merged `in_review` entries on the new task branch.
5. Select the first `pending` task whose dependencies are effectively complete.
6. Create `codex/auto-<task-id>-<run-id>` from current `vps-migration`.
7. Install existing dependencies before the Codex security boundary is applied.
8. Run `openai/codex-action` with workspace-only permissions and a generated prompt containing exact acceptance criteria and allowed paths.
9. Reject an empty diff or any path outside the task allow-list.
10. Run ledger validation, package checks, production audits and `git diff --check`.
11. Mark the selected task `done` on the task branch, commit and push.
12. Open a focused PR to `vps-migration`. CI and review determine whether it may merge.
13. On failure, create or update a GitHub issue titled `[autonomous:blocker] <TASK_ID>` with the run URL. Later runs skip a task with an open task PR; operators may set a truly blocked ledger entry to `blocked` in a reviewed PR so independent work can continue.

The scheduler has a concurrency group, so two loops cannot create competing tasks simultaneously. Every run handles at most one task. Failed runs are safe to rerun because branch names include the run ID, existing task PRs are detected, ledger changes are reviewed and side-effecting production credentials are unavailable.

## One-time authorization

Repository administrators must deliberately configure:

1. Enable GitHub Actions and allow the official actions used by the workflows. GitHub scheduled and manual-dispatch workflows must exist on the repository's default branch. Because this setup PR targets `vps-migration` and may not modify `main`, an administrator must either make `vps-migration` the default development branch or separately approve placing these workflow files on the default branch. Until then, the checked-in scripts can be run by an authorized runner, but the GitHub schedule is not active.
2. Add repository secret `OPENAI_API_KEY` with access to the Responses API. It is consumed by `openai/codex-action` through its credential proxy and must never be echoed or committed.
3. Prefer a GitHub App installation token or fine-grained PAT stored as `AUTONOMY_GITHUB_TOKEN` with only this repository's **Contents: read/write**, **Pull requests: read/write**, **Issues: read/write**, and **Metadata: read**. The workflow falls back to `GITHUB_TOKEN`, but PR-created workflows may require a maintainer to approve CI and some branch policies may prevent writes.
4. Configure branch protection/ruleset for `vps-migration`: require the CI checks, require the chosen number of approving reviews, dismiss stale approvals, require resolved conversations, block force pushes/deletion and optionally require signed commits.
5. If auto-merge is desired, enable repository auto-merge and set repository variable `AUTONOMY_AUTO_MERGE=true`. The workflow may only request auto-merge; GitHub merges only after branch protection, required reviews and checks succeed. Default is off.
6. Configure Actions billing/quota and choose GitHub-hosted or an approved hardened self-hosted runner. A self-hosted runner needs outbound HTTPS to GitHub, npm and the OpenAI Responses API; it must not expose production networks or credentials to arbitrary PR code.
7. Protect any future staging/production secrets with GitHub Environments and required human reviewers. They are intentionally not used by the autonomous task workflow.

No OpenAI account credential other than the supported action input is assumed. No undocumented Codex callback, task API or desktop-session control is used.

Supported integration references:

- OpenAI Codex Action: <https://github.com/openai/codex-action>
- GitHub workflow triggers: <https://docs.github.com/actions/using-workflows/triggering-a-workflow>
- GitHub protected branches: <https://docs.github.com/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches>
- GitHub auto-merge: <https://docs.github.com/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request>

## Auto-merge policy

Auto-merge is disabled unless `AUTONOMY_AUTO_MERGE` equals `true`. Even then, the workflow only enables GitHub auto-merge on its own PR when:

- the PR targets `vps-migration`, never `main`;
- branch protection/rulesets require all CI checks and reviews;
- the repository permits auto-merge;
- the task is not production deployment, DNS, irreversible data migration, real payment/SMS enablement or release authorization.

If any condition is unavailable, the PR remains open. The workflow never calls an immediate merge command and never deploys.

## Failure and retry handling

- **Codex/action failure:** no PR is opened; the run logs retain the non-secret error and a blocker issue links to the run.
- **Out-of-scope edit:** `validate-change.mjs` fails and lists paths. Review the task allow-list; do not broaden it merely to make a run pass.
- **Tests/build/audit fail:** leave the branch unmerged, attach the exact command failure to the blocker issue, and rerun after a focused correction.
- **Missing credential/decision:** never substitute a fake production value. Record the exact owner/action, set the ledger task `blocked` through review, then continue another dependency-ready task.
- **Open duplicate PR:** selection excludes the task. Close or merge the existing PR before retrying.
- **Base moved/conflict:** close the stale PR if appropriate and rerun from current `vps-migration`; never force-push over reviewed unrelated work.
- **Rate limit/quota/runner outage:** rerun the same workflow after capacity returns. No product state was changed.
- **Partial external side effect:** autonomous tasks are not given production provider credentials. Future staging integrations must use idempotency keys and reconciliation before any retry.

## Progress review and resumption

Operators inspect the ledger, open `codex/auto-*` PRs, blocker issues and required CI checks. To resume after intervention:

1. Resolve the named decision/credential or merge/close the blocking PR.
2. Update a `blocked` ledger entry to `pending` in a reviewed PR.
3. Dispatch `Autonomous next task` or wait for the schedule.

Do not edit workflow-run artifacts as state; only merged ledger changes and GitHub PR/issue state persist.

## Genuine autonomy and remaining human responsibility

Once configured, the system can select a known task, generate a scoped implementation, run local checks, open a PR, observe normal branch protection and proceed on later scheduled runs after merges. It can record technical failures and work on independent dependency-ready tasks.

It cannot approve its own reviews, bypass branch protection, obtain business decisions, create provider accounts, accept legal terms, supply production secrets, guarantee runner availability, merge `main`, deploy production, change DNS or truthfully validate live payment/SMS/order behavior without authorized environments. Those remain explicit human responsibilities.
