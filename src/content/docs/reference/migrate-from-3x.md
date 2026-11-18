---
title: Migrate from server SDK 3.x
description: Move from self-signed tokens to CloudClient.
---

# Migrate from server SDK 3.x

Version 4 of `@dtelecom/server-sdk-js` is for projects created in dTelecom Cloud, which have an API key and a secret from the dashboard. If your project holds a Solana keypair and signs tokens itself, stay on 3.x.

## What changes

In 3.x your server signed tokens and resolved node addresses itself. In 4.x one client, `CloudClient`, does both through the cloud and also gives you the AI services.

| 3.x | 4.x |
| --- | --- |
| `new AccessToken(apiKey, apiSecret, { identity, ttl, webHookURL })`, `addGrant`, `toJwt()` | `cloud.createToken({ room, identity, ttl, webhookUrls, grants })` |
| `at.getWsUrl(clientIp)` | `wsUrl` from `createToken({ clientIp })` |
| `at.getApiUrl()` and `new RoomServiceClient(apiUrl, apiKey, apiSecret)` | `cloud.roomService()` |
| `svc.createRoom(...)`, `svc.listRooms()` | removed; rooms exist from the first join |
| `EgressClient`, `IngressClient` | removed |
| `new WebhookReceiver(apiKey, apiSecret)` | `new WebhookReceiver()` (arguments are still accepted) |
| `API_KEY`, `API_SECRET` | `DTELECOM_API_KEY`, `DTELECOM_API_SECRET`, `DTELECOM_CLOUD_URL` |

Three behaviours are new:

- **A token's lifetime is a hard limit.** A participant whose token expired and was not extended is removed 60 to 90 seconds later, and the time until removal is billed. Extend with `cloud.extendToken(sessionId, '30m')` before `expiresAt`. `ttl` is from 1 minute to 24 hours, 6 hours by default.
- **Webhooks are set only in the token**, with `webhookUrls`. There is no project-wide setting.
- **Room events** `room_started` and `room_finished` are not delivered. Use the participant events.

## Before and after

**3.x**

```javascript
const { AccessToken } = require('@dtelecom/server-sdk-js');

async function issue(clientIp) {
  const at = new AccessToken(process.env.API_KEY, process.env.API_SECRET, { identity: 'user-42' });
  at.addGrant({ roomJoin: true, room: 'daily-standup' });
  const token = at.toJwt();
  const wsUrl = await at.getWsUrl(clientIp);
  return { token, wsUrl };
}
```

**4.x**

```typescript
import { CloudClient } from '@dtelecom/server-sdk-js';

const cloud = new CloudClient();

async function issue(clientIp: string) {
  const { token, wsUrl } = await cloud.createToken({
    room: 'daily-standup',
    identity: 'user-42',
    clientIp,
  });
  return { token, wsUrl };
}
```

## Steps

1. Create a project and an API key in the [dashboard](https://cloud.dtelecom.org).
2. Upgrade the package: `npm install @dtelecom/server-sdk-js@latest`.
3. Replace the environment variables with `DTELECOM_API_KEY`, `DTELECOM_API_SECRET` and `DTELECOM_CLOUD_URL`.
4. Replace `AccessToken` code with `cloud.createToken()`.
5. Replace `RoomServiceClient` construction with `cloud.roomService()` and remove calls to `createRoom` and `listRooms`.
6. Client apps need no change: they still connect with `token` and `wsUrl`.

## New error handling

Token creation can now fail for account reasons. Handle these where you issue tokens:

| Status | `code` | Meaning |
| --- | --- | --- |
| 402 | `insufficient_balance` | The balance does not cover the new token. |
| 403 | `room_participant_limit` | The room has 1,000 issued tokens. |
| 429 | `concurrency_limit` | The concurrent participants limit of the plan. It counts issued tokens from the moment they are issued, not connections. An unused token holds its slot until it expires. |
| 429 | `rate_limited` | Too many requests per second. Comes with `Retry-After: 1`. |

See [Errors](../platform/errors.md).
