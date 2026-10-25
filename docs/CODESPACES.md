# BAZAR development in GitHub Codespaces

The repository includes `.devcontainer/devcontainer.json` so Phase E1 can continue without installing dependencies on the local Mac. The container uses the same Node.js 24 line as GitHub CI, installs the storefront and Playwright lockfiles, installs Chromium plus its Linux dependencies, and forwards the Next.js port `3000`.

## Create the Codespace

1. Push and select the working branch (`codex/phase-e1-profile`) on GitHub.
2. Choose **Code → Codespaces → Create codespace on codex/phase-e1-profile**.
3. Wait for the `postCreateCommand` to finish. It runs deterministic `npm ci` installs from both lockfiles and prepares Chromium for the browser suite.

No repository secret is required for the current mock-only storefront. Do not add credentials to `.devcontainer`, `.env.example`, repository files, terminal output, or Codespaces dotfiles. Future integration secrets belong in Codespaces secrets only after their use is approved.

If dependency setup was interrupted, rerun it from the repository root:

```sh
npm --prefix apps/storefront ci
npm --prefix tests/e2e ci
cd tests/e2e
npx playwright install --with-deps chromium
cd ../..
```

## Run the storefront

Create the untracked local environment file and start Next.js on the forwarded interface:

```sh
cp apps/storefront/.env.example apps/storefront/.env.local
npm --prefix apps/storefront run dev -- --hostname 0.0.0.0
```

Open the forwarded **BAZAR storefront** port when Codespaces reports port `3000`. The current configuration uses deterministic mock data and does not contact Shopify or a production BAZAR backend.

## Run checks

From the repository root:

```sh
npm --prefix apps/storefront run test
npm --prefix apps/storefront run lint
npm --prefix apps/storefront run typecheck
npm --prefix apps/storefront run build
npm --prefix apps/storefront audit --audit-level=high
node scripts/autonomy/validate-ledger.mjs
node --test scripts/autonomy/*.test.mjs
git diff --check
```

After the production build, run the desktop and mobile Playwright suite:

```sh
npm --prefix tests/e2e test
```

Playwright starts the built storefront itself. Stop a manually running development server first if it already occupies port `3000`.

## Resume safely

- Keep Phase E1 work on `codex/phase-e1-profile` until its review is complete.
- Commit and push frequently so the Codespace can be rebuilt without losing source changes.
- Do not merge into `vps-migration`, modify `main`, or deploy from the Codespace without explicit approval.
- Generated `node_modules`, `.next`, Playwright reports, and `.env.local` remain ignored and must not be committed.
