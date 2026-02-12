---
title: Server SDKs
---

Server SDKs enable you to generate access tokens, manage rooms, and interact with dTelecom's server APIs from your backend. They also provide the critical `getWsUrl()` method for discovering decentralized SFU nodes.

## Installation

```bash
npm install @dtelecom/server-sdk-js
```

## Exported classes

| Class | Purpose |
| :---- | :------ |
| `AccessToken` | Create JWT access tokens signed with Ed25519. Call `.toJwt()` for the token string and `.getWsUrl(clientIp)` to discover the best SFU node. |
| `RoomServiceClient` | Manage rooms and participants: create/list/delete rooms, update participants, send data messages. |
| `WebhookReceiver` | Validate and decode incoming webhook events from dTelecom. |
| `EgressClient` | Manage egress (recording/streaming) if enabled on your deployment. |
| `IngressClient` | Manage ingress (RTMP/WHIP input) if enabled on your deployment. |

## Quick example

```typescript
import { AccessToken, RoomServiceClient } from '@dtelecom/server-sdk-js';

// Create a token
const at = new AccessToken(process.env.API_KEY!, process.env.API_SECRET!, {
  identity: 'user-1',
});
at.addGrant({ roomJoin: true, room: 'my-room', canPublish: true, canSubscribe: true });

const token = at.toJwt();
const wsUrl = await at.getWsUrl('203.0.113.1'); // client IP for node selection

// Manage rooms
const roomService = new RoomServiceClient('https://your-dtelecom-host', process.env.API_KEY!, process.env.API_SECRET!);
const rooms = await roomService.listRooms();
```

## The `getWsUrl()` method

Unlike LiveKit, dTelecom does not use a fixed server URL. After creating an `AccessToken`, call `token.getWsUrl(clientIp)` to query the Solana node registry and get the WebSocket URL for the optimal SFU node. This is required — you cannot connect without it.

See [Architecture](/guides/architecture) for how node discovery works.

## Source code

| Platform | Repo | Links |
| :------- | :--- | :---- |
| Node.js | [server-sdk-js](https://github.com/dTelecom/server-sdk-js) | [npm](https://www.npmjs.com/package/@dtelecom/server-sdk-js) |

## Go SDK

A Go server SDK is also available at [github.com/dTelecom/server-sdk-go](https://github.com/dTelecom/server-sdk-go) for Go backends.

## LLM-friendly docs

For AI/LLM consumption, see [llms-full.txt](/llms-full.txt) which contains all documentation and a complete conference app example in a single file.
