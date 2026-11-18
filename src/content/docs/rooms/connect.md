---
title: Connect from your app
description: Join a room, publish your camera and microphone, and render other participants.
---

# Connect from your app

The client SDK joins a room with the `token` and `wsUrl` your backend returned from [`createToken`](tokens.md).

## Install

```shell
npm install @dtelecom/livekit-client
```

For React components see [SDKs and packages](../reference/sdks.md). The React Native package has not been tested with dTelecom Cloud yet; it should work. The Unity package is old and has not been tested with Cloud. The original LiveKit SDKs for iOS, Android and Flutter do not work with dTelecom nodes.

Without a bundler, load the browser build with a script tag. The global is `LivekitClient`. With a top-level `await`, the second tag must be a module:

```html
<script src="https://unpkg.com/@dtelecom/livekit-client@1.12.26/dist/livekit-client.umd.js"></script>
<script type="module">
  const { Room, RoomEvent } = LivekitClient;
  const { token, wsUrl } = await (await fetch('/api/token')).json(); // from your backend
  const room = new Room();
  await room.connect(wsUrl, token);
</script>
```

The global needs version 1.12.25 or newer.

## Connect and publish

```typescript
import { DisconnectReason, Room, RoomEvent, Track } from '@dtelecom/livekit-client';

async function join(wsUrl: string, token: string) {
  const room = new Room({
    adaptiveStream: true, // match subscribed video quality to the element size
    dynacast: true, // stop sending layers nobody watches
  });

  room.on(RoomEvent.TrackSubscribed, (track) => {
    if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
      document.body.appendChild(track.attach());
    }
  });

  room.on(RoomEvent.TrackUnsubscribed, (track) => {
    track.detach().forEach((el) => el.remove());
  });

  room.on(RoomEvent.Disconnected, (reason) => {
    if (reason === DisconnectReason.PARTICIPANT_REMOVED) {
      console.log('removed by the backend, or the token expired');
    } else {
      console.log('left the room', reason);
    }
  });

  await room.connect(wsUrl, token);
  await room.localParticipant.enableCameraAndMicrophone();
  return room;
}
```

`adaptiveStream` and `dynacast` keep bandwidth in line with what participants actually watch.

### Why a participant was disconnected

`RoomEvent.Disconnected` passes a `DisconnectReason`:

| Reason | Meaning |
| --- | --- |
| `CLIENT_INITIATED` | Your code called `room.disconnect()`. |
| `PARTICIPANT_REMOVED` | Your backend removed the participant, or the token expired and was not extended. |
| `DUPLICATE_IDENTITY` | Another client joined with the same identity. |
| `ROOM_DELETED` | Your backend ended the room. |
| `SERVER_SHUTDOWN` | The node ended the session. Ask your backend for a new token and connect again. |

## Audio only

```typescript
import { Room } from '@dtelecom/livekit-client';

async function joinAudioOnly(wsUrl: string, token: string) {
  const room = new Room();
  await room.connect(wsUrl, token);
  await room.localParticipant.setMicrophoneEnabled(true);
  return room;
}
```

An audio-only participant is billed at the audio rate.

## Watch without publishing

Issue the token with `grants: { canPublish: false }` and skip the publish step. The participant still receives audio and video and is billed at the audio rate.

Check permissions before you publish: `room.localParticipant.permissions`. Without `canPublish` a publish call throws `PublishTrackError` at once. This needs `@dtelecom/livekit-client` 1.12.26 or newer.

## Mute, unmute, leave

```typescript
import type { Room } from '@dtelecom/livekit-client';

async function controls(room: Room) {
  await room.localParticipant.setMicrophoneEnabled(false); // mute
  await room.localParticipant.setCameraEnabled(false); // camera off
  await room.localParticipant.setScreenShareEnabled(true); // share screen
  await room.disconnect(); // leave; billing for this participant stops
}
```

## Publish your own track

A browser app can publish a track it generates. Pass any `MediaStreamTrack`. For bots and agents that run on a server, use [`@dtelecom/server-sdk-node`](../guides/server-side-media.md) instead.

```typescript
import { Room, Track } from '@dtelecom/livekit-client';

async function publishGenerated(room: Room, audioTrack: MediaStreamTrack) {
  await room.localParticipant.publishTrack(audioTrack, {
    source: Track.Source.Microphone,
    name: 'agent-voice',
  });
}
```

## Events worth handling

| Event | When |
| --- | --- |
| `RoomEvent.ParticipantConnected` | Someone joined. |
| `RoomEvent.ParticipantDisconnected` | Someone left. |
| `RoomEvent.TrackSubscribed` | A remote track is ready to render. |
| `RoomEvent.TrackUnsubscribed` | A remote track went away. |
| `RoomEvent.ActiveSpeakersChanged` | The list of people speaking changed. |
| `RoomEvent.Disconnected` | You left or were removed. The argument says why. |

## Tips

- Call `room.disconnect()` when the user leaves the page. A participant that stays connected keeps being billed until it is removed. If its token expires and is not extended, that happens about 1 to 1.5 minutes after expiry.
- Browsers block audio until the user interacts with the page. Join from a click or tap handler.
- A participant removed by your backend receives `RoomEvent.Disconnected`.
- One identity, one connection. When a second client joins with the same identity, the first one is disconnected with the reason `DUPLICATE_IDENTITY`.

## Firewalls and corporate networks

The client needs outbound connections to the node. The ports are the same on every node.

| What | Protocol and port | Purpose |
| --- | --- | --- |
| Signalling | TCP 443 (WSS) | Connecting to the room by `wsUrl`. |
| Media | UDP 38000-65500 | The main path for audio and video. |
| Media over TCP | TCP 7881 | Fallback when UDP is closed. |
| TURN | UDP 443 and TLS 443 | Relay for strict networks. On every node, always on. |

If a network allows only TCP 443, the client still connects: signalling goes over 443 and media goes through TURN over TLS on 443, which looks like ordinary HTTPS traffic. Delay through TURN is slightly higher. For the best quality, open UDP 38000-65500.
