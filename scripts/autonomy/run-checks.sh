#!/usr/bin/env bash
set -euo pipefail

node scripts/autonomy/validate-ledger.mjs

for directory in apps/storefront apps/api packages/contracts packages/database; do
  if [[ -f "$directory/package-lock.json" ]]; then
    npm --prefix "$directory" ci
    npm --prefix "$directory" run lint --if-present
    npm --prefix "$directory" run typecheck --if-present
    npm --prefix "$directory" run test --if-present
    npm --prefix "$directory" run build --if-present
    npm --prefix "$directory" audit --omit=dev
  fi
done

git diff --check
