# ADR0021 — Approved HALF_UP precision and snapshot v2

Status: implemented; validation evidence in [F22.1](../F22_1_FINANCIAL_PRECISION.md). Authority: explicit Phase F22.1 approval. Supersedes ADR0020's pending percentage-total/commission rounding mode, preserves all other financial/legal/provider gates.

Use one existing commerce engine, exact BigInt rational HALF_UP for non-negative minor-unit results. Parent percentage discount is rounded once, capped and allocated through unchanged stable largest remainder. Commission is rounded once per seller's discounted merchandise subtotal, excluding shipping. No line-commission rounding before aggregation. Record policy, calculation version and basis.

New quotes always produce `commerce-v2-half-up`; no exact-only configuration is exposed for creating new commerce quotes. Historical immutable v1 reads retain recorded values and reviewed quotes are revalidated under their original policy. Existing JSONB storage needs no SQL migration; migrations0001–0018 remain unchanged. Portable clients explicitly validate v1/v2 and v2 required policy/basis metadata. No UI changes or live provider activation.

Refunds continue to use frozen net/discount/quantity facts; partial-unit penny attribution, entitlement, verified refund finality and legal fee/retention/settlement decisions remain separate. No recalculation of history, payout or refund execution is introduced.
