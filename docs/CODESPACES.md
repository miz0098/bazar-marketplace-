# BAZAR in Codespaces

Use Node24, Docker/Compose and OpenSSL. The devcontainer installs API, storefront and browser-test dependencies and provides Docker-in-Docker. Rebuild the devcontainer after pulling changes to its configuration.

From the repository root run:

```sh
npm run simulation:start
```

This single command starts PostgreSQL, migrates/seeds the isolated database, builds and starts the Next storefront and starts its API/gateway. Missing API/storefront node_modules are installed automatically. Do not start an additional Next server.

Open port3000 from the Codespaces Ports panel. The launcher derives the exact HTTPS origin from CODESPACE_NAME and GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN. Codespaces terminates HTTPS; a constrained HTTP bridge on port3000 forwards to the private, certificate-verified HTTPS gateway. Secure/HttpOnly/SameSite cookies, exact Origin/CSRF checks and gateway authorization remain enabled. Arbitrary forwarded hosts are rejected; forwarded metadata is not used as customer identity.

Register or log in by phone using OTP **123456**. New accounts collect their profile through the ordinary registration form. After server verification the browser opens the account. The fixed code requires NODE_ENV=test and explicit isolated-composition flags; production rejects it.

Outside Codespaces the same command serves https://127.0.0.1:3000 and prints the local certificate path. Trust that exact certificate for a manual local browser; do not disable TLS validation.

Use invented personal data. No real SMS, bank transactions, card credentials or shipments are used. Successful operations are stored in PostgreSQL throughout the run, including refresh and logout/login. Ctrl+C removes that run's disposable database. This does not provide persistence across stopping/restarting the runtime.

Checks: npm run simulation:test, npm run simulation:test:declined, npm run simulation:test:unknown, npm run simulation:test:codespaces. The last command tests the Codespaces forwarding contract locally; it is not a claim that a separate real Codespace was provisioned during verification.
