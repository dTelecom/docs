---
title: Manage rooms
description: List, remove and mute participants, update room metadata and send data from your backend.
---

# Manage rooms

`cloud.roomService()` controls live rooms from your backend. Calls go straight to the nodes hosting the room, authorised with a short-lived admin token the cloud mints for your project.

```typescript
import { CloudClient } from '@dtelecom/server-sdk-js';

const cloud = new CloudClient();
const rooms = cloud.roomService();
```

## List participants

```typescript
import { CloudClient } from '@dtelecom/server-sdk-js';

const rooms = new CloudClient().roomService();

const participants = await rooms.listParticipants('daily-standup');
for (const p of participants) {
  console.log(p.identity, p.name);
}
```

Returns an empty list when nobody has joined.

## Remove a participant

```typescript
import { CloudClient } from '@dtelecom/server-sdk-js';

const rooms = new CloudClient().roomService();

await rooms.removeParticipant('daily-standup', 'user-42');
```

The participant is disconnected at once and its client receives `Disconnected` with the reason `PARTICIPANT_REMOVED`. Their token stays valid until it expires, so a removed user can join again with it. To keep someone out, refuse them a new token on your backend and remove them again if they return. Joining again with the same token is billed as a new connection.

## Mute a track

```typescript
import { CloudClient } from '@dtelecom/server-sdk-js';

const rooms = new CloudClient().roomService();

async function muteTrack(room: string, identity: string, trackSid: string) {
  await rooms.mutePublishedTrack(room, identity, trackSid, true);
}
```

## Update room metadata

Metadata is a string every participant can read. Use it for shared state such as a topic or a layout.

```typescript
import { CloudClient } from '@dtelecom/server-sdk-js';

const rooms = new CloudClient().roomService();

await rooms.updateRoomMetadata('daily-standup', JSON.stringify({ topic: 'Sprint 12' }));
```

## Send data to the room

```typescript
import { CloudClient, DataPacket_Kind } from '@dtelecom/server-sdk-js';

const rooms = new CloudClient().roomService();

const payload = new TextEncoder().encode(JSON.stringify({ type: 'notice', text: 'Recording started' }));
await rooms.sendData('daily-standup', payload, DataPacket_Kind.RELIABLE, { topic: 'system' });
```

## End a room

```typescript
import { CloudClient } from '@dtelecom/server-sdk-js';

const rooms = new CloudClient().roomService();

await rooms.deleteRoom('daily-standup');
```

Disconnects everyone with the reason `ROOM_DELETED`. Participants whose tokens are still valid can join again. Returns quietly if the room is not live.

## Errors

| Error | When |
| --- | --- |
| `RoomNotLiveError` | Nobody has joined the room yet. `listParticipants` and `deleteRoom` return quietly instead. |
| `NodeApiError` | A node refused the call. `code` says why, for example `not_found`. |
| `CloudApiError` | The cloud refused to mint the admin token. |

## Good to know

- There is no `createRoom` and no `listRooms`. Rooms exist from the first join.
- An empty room closes 20 seconds after the last participant leaves. A room nobody joined closes 5 minutes after its first token was issued.
- For a session with a time limit you do not need `removeParticipant`: issue the token with that `ttl` and do not extend it. The participant is removed about 1 to 1.5 minutes after expiry. See [Tokens](tokens.md#extend-a-session).
- Room management is available from the server SDKs for JavaScript and Go.
- Room-level settings such as an empty-room timeout are not configurable per room.
- A room's participants can sit on more than one node. The SDK sends each call to every node hosting the room.
