---
title: Server-side media
description: Join a room from Node.js, receive participants' audio as PCM and publish audio back.
---

# Server-side media

Sometimes your backend has to be in the room itself: to feed speech into Speech-to-Text, to play generated audio, to record, or to run a custom AI pipeline. `@dtelecom/server-sdk-node` is a WebRTC participant for Node.js that gives you raw audio in both directions.

If you want a ready voice agent, use [Build a voice agent](voice-agent.md) instead. It is built on this package.

## Install

```shell
npm install @dtelecom/server-sdk-node @dtelecom/server-sdk-js
```

You need Node.js 22 or newer. There is nothing native to build. Use `@dtelecom/server-sdk-node` 0.3.2 or newer.

## Join a room

The bot joins like any participant, with a token from `CloudClient`.

```typescript
import { CloudClient } from '@dtelecom/server-sdk-js';
import { Room } from '@dtelecom/server-sdk-node';

const cloud = new CloudClient();

const { token, wsUrl } = await cloud.createToken({ room: 'support-call', identity: 'bot' });

const room = new Room();
await room.connect(wsUrl, token, { autoSubscribe: true });

room.on('participantConnected', (participant) => console.log('joined:', participant.identity));
room.on('disconnected', (reason) => console.log('disconnected:', reason));
```

`room.connect` takes a few seconds. Start the bot before the user needs it.

### When the bot is disconnected

`disconnected` tells you why:

| Reason | Meaning |
| --- | --- |
| `client_initiated` | Your code called `room.disconnect()`. |
| `participant_removed` | Your backend removed the bot, or its token expired and was not extended. |
| `duplicate_identity` | Another participant joined with the same identity. |
| `room_deleted` | The room was ended with `deleteRoom`. |
| `server_shutdown`, `server_initiated` | The node ended the session. Get a new token and connect again. |

The bot's token lasts 6 hours by default. Extend it before it expires:

```typescript
import { CloudClient } from '@dtelecom/server-sdk-js';

const cloud = new CloudClient();

async function keepAlive(sessionId: string) {
  // call this before expiresAt, for example from a timer
  const { expiresAt } = await cloud.extendToken(sessionId, '6h');
  return expiresAt;
}
```

A bot whose token expired is removed 60 to 90 seconds later. After that, `extendToken` fails with 409 `session_not_extendable`.

## Receive audio

Each remote audio track can be read as a stream of PCM16 frames at the sample rate you ask for. 16 kHz mono is what Speech-to-Text and audio moderation expect.

```typescript
import { Room } from '@dtelecom/server-sdk-node';

function listen(room: Room) {
  room.on('trackSubscribed', async (track, publication, participant) => {
    const stream = track.createStream(16000, 1); // 16 kHz, mono
    for await (const frame of stream) {
      // frame.data is an Int16Array of PCM16 samples
      handleAudio(participant.identity, Buffer.from(frame.data.buffer, frame.data.byteOffset, frame.data.byteLength));
    }
  });
}

function handleAudio(identity: string, pcm16: Buffer) {
  // send to Speech-to-Text, moderation, a recorder...
}
```

The stream keeps time during silence: when a participant stops talking, you receive zero-filled frames instead of a gap. Turn detection depends on this.

## Publish audio

Create an `AudioSource`, publish it as a track and push PCM16 frames into it. Text-to-Speech returns 48 kHz mono, so create the source at 48 kHz.

```typescript
import { AudioFrame, AudioSource, LocalAudioTrack, Room } from '@dtelecom/server-sdk-node';

async function publishVoice(room: Room) {
  const source = new AudioSource(48000, 1);
  const track = LocalAudioTrack.createAudioTrack('bot-voice', source);
  await room.localParticipant.publishTrack(track);

  // call this with PCM16 mono 48 kHz, for example from Text-to-Speech
  return async function play(pcm: Buffer) {
    const samples = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.byteLength / 2);
    const FRAME = 960; // 20 ms at 48 kHz
    let next = Date.now();
    for (let i = 0; i < samples.length; i += FRAME) {
      const chunk = samples.subarray(i, i + FRAME);
      await source.captureFrame(new AudioFrame(chunk, 48000, 1, chunk.length));
      next += 20;
      const wait = next - Date.now();
      if (wait > 0) await new Promise((done) => setTimeout(done, wait)); // keep real-time pace
    }
  };
}
```

`AudioSource` encodes and sends what it gets at once. It does not pace the audio. Feed it 20 ms frames in real time, as above: a long buffer pushed in one call leaves as a burst and is not played correctly.

## Send and receive data

```typescript
import { DataPacket_Kind, Room } from '@dtelecom/server-sdk-node';

async function chat(room: Room) {
  room.on('dataReceived', (data, participant, kind, topic) => {
    console.log(topic, new TextDecoder().decode(data));
  });

  await room.localParticipant.publishData(new TextEncoder().encode('hello'), {
    kind: DataPacket_Kind.RELIABLE,
    topic: 'chat',
  });
}
```

`publishData()` works whether or not the bot has published a track. The first call opens the data channel and waits for it: 15 seconds by default, or `timeoutMs` in the options.

The call rejects when the message cannot be sent: the token has no `canPublishData`, the channel is closed, or it did not open in time. Nothing is dropped silently. The token's permissions are in `room.localParticipant.permissions`.

To reach one participant, pass `destinationSids: [participant.sid]`. The sender does not receive its own message.

Your backend can also send data without being in the room:

```typescript
import { CloudClient, DataPacket_Kind } from '@dtelecom/server-sdk-js';

const rooms = new CloudClient().roomService();

async function notify(roomName: string, text: string) {
  const payload = new TextEncoder().encode(text);
  await rooms.sendData(roomName, payload, DataPacket_Kind.RELIABLE, { topic: 'system' });
}
```

Such a message has no sender participant on the receiving side.

## Put it together: transcribe a room

This bot joins a room and prints what every participant says. It opens one Speech-to-Text stream per participant, so each transcript is attributed to its speaker.

```shell
npm install @dtelecom/agents-js
```

`DtelecomSTT` from `@dtelecom/agents-js/providers` is the streaming Speech-to-Text client. It works without a voice agent. It runs the protocol, extends the session, and opens a new session after a dropped connection.

```typescript
import { CloudClient } from '@dtelecom/server-sdk-js';
import { DtelecomSTT } from '@dtelecom/agents-js/providers';
import { Room } from '@dtelecom/server-sdk-node';

const cloud = new CloudClient();
const stt = new DtelecomSTT({ cloud, language: 'en' });

async function main(roomName: string) {
  const { token, wsUrl, sessionId } = await cloud.createToken({
    room: roomName,
    identity: 'transcriber',
    grants: { canPublish: false }, // listen only
  });
  stt.setWebRTCSessionId(sessionId); // attribute the usage to this room session

  const room = new Room();
  await room.connect(wsUrl, token, { autoSubscribe: true });

  room.on('trackSubscribed', async (track, publication, participant) => {
    const stream = stt.createStream();
    stream.on('error', (err) => console.error('stt:', err.message));
    stream.on('transcription', (result) => {
      if (result.isFinal) console.log(`[${participant.identity}] ${result.text}`);
    });

    for await (const frame of track.createStream(16000, 1)) {
      stream.sendAudio(Buffer.from(frame.data.buffer, frame.data.byteOffset, frame.data.byteLength));
    }
    await stream.close(); // the participant left: stop paying for this stream
  });
}

main('support-call');
```

From another language, speak the WebSocket protocol yourself: see [Speech-to-Text](../ai/speech-to-text.md#the-websocket-protocol).

## Good to know

- The bot is a participant: it takes a concurrent participant slot from the moment its token is issued and is billed per minute like anyone else. A listen-only bot in an audio room costs $0.0001 per minute.
- Issue the bot's token with only the grants it needs. A recorder or a transcriber does not need `canPublish`.
- With `canPublish: false`, `publishTrack()` rejects at once with "Participant lacks canPublish".
- `track.createStream(16000, 1)` delivers 20 ms frames: an `Int16Array` of 320 samples each.
- One Speech-to-Text stream per participant keeps speakers apart.
- A bot needs a long-lived process with outbound UDP, or TCP as a fallback. Serverless functions do not fit.
- Video is not exposed as raw frames. To analyse video, capture frames in the client and send them to [Vision](../ai/vision.md) or [Moderation](../ai/moderation.md) through your backend.
