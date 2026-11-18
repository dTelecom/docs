---
title: Authentication
description: API keys for your backend, participant tokens for your users.
---

# Authentication

dTelecom Cloud uses two kinds of credentials. Do not mix them up.

| Credential | Who holds it | Lifetime | Used for |
| --- | --- | --- | --- |
| API key and secret | your backend only | until you revoke it | every server SDK call |
| Participant token | one user or agent | up to 24 hours per token; extend it before it expires, or the participant is removed | joining one room |

## API keys

Create keys in the dashboard under **API keys**. The secret is shown once, at creation.

Configure the server SDK with environment variables:

```shell
export DTELECOM_API_KEY="dtk_live_..."
export DTELECOM_API_SECRET="..."
export DTELECOM_CLOUD_URL="https://cloud.dtelecom.org"
```

```typescript
import { CloudClient } from '@dtelecom/server-sdk-js';

const cloud = new CloudClient();
```

Or pass them explicitly:

```typescript
import { CloudClient } from '@dtelecom/server-sdk-js';

const cloud = new CloudClient({
  apiKey: process.env.DTELECOM_API_KEY,
  apiSecret: process.env.DTELECOM_API_SECRET,
  baseUrl: 'https://cloud.dtelecom.org',
});
```

### Keep the secret safe

- Use `CloudClient` only on a server. It holds the API secret.
- Do not commit keys to a repository. Use your platform's secret store.
- Use one key per environment or service. The dashboard shows last use and 30-day spend per key.
- If a key leaks, revoke it in the dashboard and create a new one. Revoking takes effect from the next request: every call with that key gets 401. Participant tokens that were already issued stay valid until they expire, and running sessions continue.

## Participant tokens

A participant token lets one user join one room. Your backend creates it with `cloud.createToken()` and sends `token` and `wsUrl` to the client. See [Tokens and permissions](../rooms/tokens.md).

A token carries no API secret, so it is safe to send to a browser or a mobile app.

## Other short-lived credentials

Some services hand out their own scoped credentials. None of them contains your API secret.

| Credential | From | Lifetime | Safe for the client |
| --- | --- | --- | --- |
| Speech session key | `cloud.stt.createSession()`, `cloud.tts.createSession()` | the prepaid session, one connection | yes |
| Moderation stream ticket | `cloud.moderation.streamTicket()` | 10 minutes | yes |
| Room admin token | `cloud.adminToken()` | 10 minutes | no, server only |

A speech session key works for one connection. A second connection with the same key gets `session_key_used` and is closed with code 1008. After any disconnect, create a new session.
