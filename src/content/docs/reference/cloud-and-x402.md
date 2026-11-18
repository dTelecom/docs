---
title: dTelecom Cloud and the x402 gateway
description: Two ways to reach the same services, and which one is for you.
---

# dTelecom Cloud and the x402 gateway

The same rooms and AI services can be reached in two ways. They differ in who the customer is and how payment works.

| | dTelecom Cloud | x402 gateway |
| --- | --- | --- |
| Built for | developers and companies building apps | autonomous AI agents that pay for themselves |
| Sign-up | account in the dashboard | none; a crypto wallet is the identity |
| Authentication | API key and secret | wallet signature on each request |
| Payment | card, plans with included usage, top-ups, invoices | prepaid credits bought with USDC |
| Dashboard, usage reports, team billing | yes | no |
| SDK | `@dtelecom/server-sdk-js` (`CloudClient`) | `@dtelecom/x402-client` |
| Base URL | `https://cloud.dtelecom.org` | `https://x402.dtelecom.org` |
| Rates | same | same |

## Which one to use

Use **dTelecom Cloud** if you are building a product: you get a dashboard, per-key usage, invoices and plan limits you can raise. This documentation covers dTelecom Cloud.

Use the **x402 gateway** if the caller is an AI agent with its own wallet that should buy what it needs without a human creating an account. Its documentation is at [x402.dtelecom.org](https://x402.dtelecom.org).

## What is shared

- The rooms, the nodes and the client SDKs.
- The speech servers and their WebSocket protocol.
- The models, languages, voices and limits of the AI services.
- `@dtelecom/agents-js` works with both: pass `cloud` for dTelecom Cloud, or `serverUrl` and `sessionKey` from the gateway. A speech session key works for one connection, so with the gateway also pass `getSessionKey`: without it a provider reports an `error` after a disconnect and does not reconnect.

## What is not interchangeable

- Credentials. A dashboard API key does not work on the gateway, and a wallet does not work on the Cloud API.
- Balances. Credits bought in the dashboard and credits bought through the gateway are separate.
- SDKs. `CloudClient` talks only to the Cloud API; `@dtelecom/x402-client` talks only to the gateway.

If you find a tutorial or a package README that mentions wallets, USDC or `x402`, it describes the gateway. What it says about models, languages, voices and limits still applies to dTelecom Cloud; the authentication and payment parts do not. The stream messages `session_extended` and `session_expiring` do not exist in Cloud.
