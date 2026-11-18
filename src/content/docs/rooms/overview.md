---
title: Rooms overview
description: Real-time audio, video and data between people and agents.
---

# Rooms overview

A room connects participants over WebRTC. Each participant can publish audio, video and data, and subscribe to what others publish. The same rooms work for a two-person call, a livestream with viewers, or a user talking to a voice agent.

## The flow

1. Your backend calls [`cloud.createToken()`](tokens.md) for a room name and a participant identity.
2. You send the returned `token` and `wsUrl` to the client.
3. The client SDK [connects](connect.md) with those two values and publishes or subscribes.
4. Your backend [extends the token](tokens.md#extend-a-session) before it expires. A participant whose token expired is removed from the room.
5. Your backend can [manage the room](manage-rooms.md) and receive [webhooks](webhooks.md).

There is no "create room" call. A room exists from the first join until the last participant leaves.

## Pages in this section

| Page | What it covers |
| --- | --- |
| [Tokens and permissions](tokens.md) | Issuing tokens, viewer and host roles, lifetime, extending a session |
| [Connect from your app](connect.md) | Joining, publishing and subscribing with the client SDK |
| [Manage rooms](manage-rooms.md) | Listing, removing and muting participants, room metadata, server-sent data |
| [Data messages and chat](data.md) | Chat, reactions and shared state through the room |
| [Webhooks](webhooks.md) | Participant and track events on your backend |

Ready-made recipes: [Video conference with React](../guides/video-conference-react.md), [Livestreaming](../guides/livestreaming.md), [Server-side media](../guides/server-side-media.md).

## How rooms are billed

Rooms are billed per participant, per second connected. The rate depends on what the participant publishes.

| Media | Per participant-minute |
| --- | --- |
| Publishes no video: audio only, or only watching | $0.0001 (0.1 cr) |
| Publishes video up to 1080p | $0.001 (1 cr) |
| Publishes 2K video | $0.002 (2 cr) |
| Publishes 4K video | $0.004 (4 cr) |
| Data messages | free |

The video rate applies only while a participant publishes video. Each second is billed at the highest tier of the video it publishes, by the short side of the largest layer: up to 1080 is HD, up to 1440 is 2K, above that is 4K. Screen sharing counts as video. The rest of the time is billed at the audio rate, and someone who only watches pays the audio rate.

Example: two people on a 10-minute audio call use 20 participant-minutes, which costs $0.002.

## Limits that apply to rooms

- **Concurrent participants**: each issued token counts from the moment it is issued, connected or not, until the participant leaves or the token expires. Only rooms count. The limit depends on your plan and is shared by all projects in the organization. When it is reached, `createToken` fails with `concurrency_limit` (429).
- **Participants per room**: up to 1,000 on every plan, counting issued tokens. Over the cap `createToken` fails with `room_participant_limit` (403).

See [Limits](../platform/limits.md).
