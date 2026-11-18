---
title: How dTelecom Cloud works
description: Projects, keys, rooms, sessions and credits in one page.
---

# How dTelecom Cloud works

Your backend holds the API key. The client never sees it: it receives a short-lived token and connects straight to a media node.

![The client asks your backend to join (1). The backend calls the Cloud API with its key (2) and passes the token to the client (3). The client then connects to the nearest media node and exchanges audio, video and data there (4). AI services are called through the same Cloud API.](../assets/diagrams/how-it-works.svg)

## Organization, projects and keys

- An **organization** has one plan, one credit balance and one invoice.
- A **project** groups rooms, usage and API keys. Projects share the organization's balance and limits.
- An **API key** belongs to one project. Every key has full access to its project. Create a separate key per environment or service so you can see spend per key and revoke one without touching the others.

## Rooms, participants and sessions

- A **room** is a named place where participants exchange audio, video and data. You do not create rooms: a room starts when its first participant joins and ends when the last one leaves.
- A **participant** is one connection to a room: a person in a browser, a mobile user, or an AI agent. Each has an `identity` that is unique within the room.
- A **session** is one participant's connection, from the token your backend issued until the participant leaves, is removed or its token expires. Extend the token before it expires, or the participant is removed about 1 to 1.5 minutes after expiry. Sessions are what you extend and what webhooks report.
- **Concurrent participants** is the plan limit on rooms. A slot is taken from the moment a token is issued, whether the participant has connected or not, and is freed when the participant leaves or the token expires. An unused token holds its slot until it expires. Only room participants count, AI calls do not.

## Nodes

Media flows through dTelecom nodes. When your backend asks for a token, the cloud picks a node for that participant and returns its address as `wsUrl`. Pass the participant's public IP as `clientIp` to get the nearest node. Without `clientIp` the node is chosen by the address of the caller, so it will be near your server, not near the user. Participants of one room can sit on different nodes; this is transparent to your code.

## Server SDK and client SDKs

| | Server SDK | Client SDK |
| --- | --- | --- |
| Runs in | your backend | browser, React Native app, server-side bot or agent |
| Holds | API key and secret | a participant token |
| Does | issues tokens, manages rooms, calls AI services, verifies webhooks | joins rooms, publishes and receives media |
| Package | `@dtelecom/server-sdk-js`, `dTelecom/server-sdk-go` | `@dtelecom/livekit-client` and others, see [SDKs](../reference/sdks.md) |

dTelecom client SDKs exist for the web and for React Native; React Native has not been tested with dTelecom Cloud yet. The original LiveKit SDKs for iOS, Android and Flutter do not work with dTelecom nodes.

## AI services

Speech-to-Text, Text-to-Speech, Translation, Vision and Moderation are called from your backend with the same `CloudClient`. They run on dTelecom's own infrastructure. You can use them on their own, or link a call to a room participant with `webrtcSessionId` so the usage is attributed to that session in the dashboard.

## Credits

All usage is paid from credits. 1 credit = $0.001.

- Your plan includes a monthly amount of credits. Included credits are spent first and expire at the end of the cycle.
- Credits you buy as a top-up are spent after the included ones and do not expire.
- Billing is per second of actual use, with no minimum per session.

API responses report charges in **microcredits**: 1 credit = 1,000 microcredits, so 1,000,000 microcredits = $1.

See [Billing and credits](../platform/billing.md) for rates.
