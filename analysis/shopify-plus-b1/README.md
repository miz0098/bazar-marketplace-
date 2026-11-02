# Phase B1 — isolated local technical proofs

This directory is detached from all application/package/workflow entrypoints. It has no dependencies beyond Node 24/Python 3 standard libraries. No network server, credentials, account provisioning, SMS/email delivery, Shopify operations, card processing, orders or carrier operations exist here. Nothing is deployed.

## Commands

```sh
node --test analysis/shopify-plus-b1/oidc-contract.test.mjs
node --check analysis/shopify-plus-b1/oidc-contract.mjs
node --check analysis/shopify-plus-b1/oidc-contract.test.mjs
python analysis/shopify-plus-b1/validate.py
python analysis/shopify-plus-b1/recovery_inventory.py
python analysis/shopify-plus-b1/recovery_inventory.py --matrix
```

`oidc-contract.mjs` is a **non-production** narrow RS256 claim/configuration experiment. It verifies locally generated in-memory signatures and rejects missing/unverified email, algorithm/key/signature/issuer/audience/nonce/time errors and unverified Plus prerequisites. It returns `sessionIssued: false` even for a valid protocol fixture. The example email is the [published OIDC example claim value](https://openid.net/specs/openid-connect-basic-1_0-22.html), not a generated customer address or identity workaround. It is never provisioned or transmitted. No phone OTP is generated/sent or validated for a real customer.

Limitations: this is not a full OIDC implementation, real inbox verification, live JWKS/discovery, refresh/logout flow, OTP engine, replay store, distributed lock, key rotation or account-linking service. Nonce mismatch rejection is not a proof of atomic transaction replay prevention. A signed verification claim cannot prove its issuer actually verified the inbox. Use maintained audited provider/library code for future authentication; do not promote this experiment to production.

`recovery_inventory.py` reads pinned Git objects and PNG bytes, prints JSON/Markdown and never edits source. The checked-in recovery inventory and root recovery matrix are exact reproducible outputs. It records all 71 changed theme files plus 33 image hashes; source contents were inspected for direct Liquid/asset/template dependencies and unsafe runtime assumptions. Dependency extraction is partial static analysis, not Theme Check or a browser test.

`meest-spec-evidence.json` records the read-only public Swagger fetch and documented methods. No carrier endpoint operation was exercised. The fetched vendor document itself remains outside Git.

`validate.py` checks deliverables/links, source inventory/matrix reproducibility, source blobs, PNG base-byte identity, base ancestry and additive allowed change scope. It invokes no network service or merchant tool.

Actual B1 result: 26 contract tests passed; local syntax/documentation/evidence validation passed. Shopify CLI absent; extension scaffold/build/preview and Theme Check unavailable. Merchant Plus, OIDC/SMS/email facilities, Shopify Customer Account API, PSP/carrier integrations and Flutter checkout continuity were not accessed/tested. See [feasibility validation](../../SHOPIFY_PLUS_FEASIBILITY.md) and [B2 gates](../../PHASE_B2_IMPLEMENTATION_PLAN.md). No full implementation begins from these proof files.
