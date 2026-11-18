---
title: Tokens and permissions
description: Issue participant tokens, set roles and control how long a session lasts.
---

# Tokens and permissions

Every participant needs a token from your backend. The token names the room and the participant, sets what the participant may do, and expires on its own.

## Create a token

```typescript
import { CloudClient } from '@dtelecom/server-sdk-js';

const cloud = new CloudClient();

const { token, wsUrl, sessionId, expiresAt } = await cloud.createToken({
  room: 'daily-standup',
  identity: 'user-42',
});
```

Send `token` and `wsUrl` to the client. Keep `sessionId` if you plan to extend the session or link AI calls to it.

### Options

| Option | Type | Description |
| --- | --- | --- |
| `room` | string, required | Room name, 1 to 256 bytes. The room is created when the first participant joins. |
| `identity` | string, required | Unique within the room, 1 to 256 bytes. Use your own user id. A second connection with the same identity disconnects the first one. |
| `name` | string | Display name shown to other participants. |
| `metadata` | string | Any string up to 16 KiB, visible to other participants. Use JSON for structured data. |
| `ttl` | number or string | Token lifetime: seconds as a number, or `'90s'`, `'30m'`, `'12h'`, `'1d'`. From 1 minute to 24 hours, default 6 hours, which is the recommended value. A plain number is seconds. Rounded up to whole minutes: `'90s'` becomes 2 minutes. |
| `clientIp` | string | The participant's public IP. Used to pick the nearest node. Without it the node is picked near your server. |
| `webhookUrls` | string[] | Up to 5 HTTPS URLs that receive this participant's events. Localhost and private addresses are rejected. See [Webhooks](webhooks.md). |
| `grants` | object | Permission overrides, see below. |

### Result

| Field | Description |
| --- | --- |
| `token` | Pass to the client SDK. |
| `wsUrl` | Node address (`wss://...`) for the client SDK. |
| `sessionId` | Id of this participant session. |
| `expiresAt` | When the token expires. |

## Permissions

By default a participant can publish audio and video, subscribe to others and send data. Change that with `grants`.

| Grant | Default | Meaning |
| --- | --- | --- |
| `canPublish` | `true` | Publish audio and video. Without it a publish call fails at once: `PublishTrackError` in the browser client, an error in `@dtelecom/server-sdk-node`. Hide the microphone and camera buttons for such users. |
| `canSubscribe` | `true` | Receive other participants' tracks. |
| `canPublishData` | `true` | Send data messages. |
| `roomAdmin` | `false` | For trusted participants (hosts) only. The token gets admin rights for its room in the node's raw API: remove a participant, mute a track, change metadata. The client SDK has no methods for this. The usual way to manage a room is from your backend, see below. |

### Common roles

```typescript
import { CloudClient } from '@dtelecom/server-sdk-js';

const cloud = new CloudClient();
const room = 'town-hall';

// Viewer: watches and chats, cannot publish media
await cloud.createToken({ room, identity: 'viewer-7', grants: { canPublish: false } });

// Host: publishes media. Removing and muting others goes through your backend.
await cloud.createToken({ room, identity: 'host-1' });

// Listen-only bot: receives media, sends nothing
await cloud.createToken({
  room,
  identity: 'recorder',
  grants: { canPublish: false, canPublishData: false },
});
```

To let a host remove or mute someone, add an endpoint to your backend that checks who is asking and calls [`cloud.roomService()`](manage-rooms.md): `removeParticipant` or `mutePublishedTrack`. The host clicks a button in your UI, your backend makes the call.

## Pick the nearest node

Pass the participant's IP so the cloud can place them on a nearby node. Behind a proxy, use the forwarded address.

```typescript
import express from 'express';
import { CloudClient } from '@dtelecom/server-sdk-js';

const cloud = new CloudClient();
const app = express();

app.get('/token', async (req, res) => {
  const { token, wsUrl } = await cloud.createToken({
    room: 'support-call',
    identity: String(req.query.user),
    clientIp: req.ip,
  });
  res.json({ token, wsUrl });
});
```

## Which lifetime to choose

Use the default, 6 hours: leave `ttl` out, or pass `'6h'`. It fits participants of calls, bots and agents. For longer sessions, extend the token.

A short `ttl` makes sense in one case only: a token that may never be used. An unused token holds a concurrent participant slot until it expires.

## Extend a session

The token's lifetime is a hard limit. Extend the token before it expires, or the participant is removed from the room: 60 to 90 seconds after expiry (60 seconds of grace, then a check every 30 seconds). Billing runs until the actual removal.

```typescript
import { CloudClient } from '@dtelecom/server-sdk-js';

const cloud = new CloudClient();

async function keepAlive(sessionId: string) {
  const { token, expiresAt } = await cloud.extendToken(sessionId, '30m');
  return { token, expiresAt };
}
```

What to know about `extendToken`:

- It adds time to what is left: 30 minutes added to a session with 10 minutes left gives 40. A plain number is seconds, so `30` means 30 seconds, rounded up to 1 minute.
- It keeps the `name`, `metadata`, grants and `webhookUrls` of the original token.
- The current connection stays up. The client SDK does not pick the new token up by itself: send it to the client and use it for the next `room.connect()`.
- Automatic reconnection after a network drop uses the token the client connected with. While that token is valid, it works. If it has already expired, because the session was extended, the client gets `Disconnected`: ask your backend for the current token and call `room.connect()` again.
- After the grace period it fails with 409 `session_not_extendable`. It can also fail with 402 `insufficient_balance`.

To end a session at a set time, issue the token with that `ttl` and do not extend it, or call [`removeParticipant`](manage-rooms.md).

## Errors

`createToken` throws `CloudApiError`. The ones you should handle:

| Status | `code` | What to do |
| --- | --- | --- |
| 400 | `invalid_webhook_url` | Use HTTPS URLs, 5 at most, no localhost or private addresses. |
| 402 | `insufficient_balance` | Top up, or turn on auto top-up. |
| 403 | `room_participant_limit` | The room has 1,000 issued tokens. |
| 429 | `concurrency_limit` | A slot frees when a participant leaves or an unused token expires. Issue tokens right before joining; use a short `ttl` only for a token that may never be used. Or upgrade the plan. |
| 429 | `rate_limited` | Retry after `err.retryAfter` seconds (1). |
| 503 | `nodes_unavailable`, `registry_sync_pending` | Retry after `err.retryAfter` seconds (30). |

`extendToken` adds two more: 404 `session_not_found` and 409 `session_not_extendable`.

See [Errors](../platform/errors.md).
