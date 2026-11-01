# BAZAR storefront

The ordinary routes use the server-backed F24 catalog, authentication, cart, checkout and account. There is no client-only demo fallback or checkout stop.

Use Node24, Docker/Compose and OpenSSL. From the repository root run `npm run simulation:start`; it starts PostgreSQL, API, gateway and Next, installs missing API/storefront dependencies, and exposes port3000. In Codespaces use the forwarded port's HTTPS URL. Do not run an additional Next server.

Phone OTP123456 is verified only in the explicitly isolated backend process. Production rejects fixed-code authentication. See [Codespaces setup](../../docs/CODESPACES.md) and [cleanup report](../../docs/REMOVE_DEMO_FLOWS.md).

Unit: npm test in this directory. Application E2E: npm test in tests/e2e or npm run simulation:test at root. Declined/unknown payment and forwarding checks have separate root scripts. Historical fixture services live under tests/fixtures and are not imported by the application. Historical first-phase UI specifications are retained separately from the current application contract; API, PostgreSQL and F15–F24 security regressions remain enabled.

The runner is isolated and disposable: data survives navigation, refresh and logout/login during the run, and is removed when it stops. No real SMS, payment credentials, bank charges or carrier dispatches are used.
