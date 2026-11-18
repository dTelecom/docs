---
title: Speech-to-Text (streaming)
description: Live transcripts from an audio stream over a WebSocket.
---

# Speech-to-Text (streaming)

Streaming Speech-to-Text turns live audio into text while people speak. Use it for captions and for voice agents.

For recordings, use [File transcription](transcription.md): it is half the price and adds speaker labels.

**Price:** $0.004 per minute (4 cr), billed per second the stream is connected.

## How it works

1. Your backend opens a prepaid session with `cloud.stt.createSession()`.
2. You connect a WebSocket to the returned `streamUrl` and send the session key.
3. You send audio as binary messages and receive transcripts as JSON.

In JavaScript you do not have to write this yourself: `DtelecomSTT` does all three steps. From other languages, use the WebSocket protocol described below.

![Your backend opens a prepaid session through the Cloud API (1), connects a WebSocket to the speech server (2) and sends the config with the session key (3). After the ready message it streams audio (4) and receives transcripts until it closes the socket (5).](../assets/diagrams/stt-session.svg)

## Quick start with DtelecomSTT

`DtelecomSTT` from `@dtelecom/agents-js/providers` is the streaming client. It works in any Node.js app, with or without a voice agent. It opens the session, runs the protocol, extends the session before it runs out, and opens a new session after a dropped connection. It needs Node.js 22 or newer.

```shell
npm install @dtelecom/agents-js @dtelecom/server-sdk-js @dtelecom/server-sdk-node
```

Audio must be **PCM16 little-endian, mono, 16 kHz**. This example streams a raw PCM file in real time:

```typescript
import fs from 'fs';
import { CloudClient } from '@dtelecom/server-sdk-js';
import { DtelecomSTT } from '@dtelecom/agents-js/providers';

const cloud = new CloudClient();
const stt = new DtelecomSTT({ cloud, language: 'en' });

async function transcribe(pcmFile: string) {
  const pcm = fs.readFileSync(pcmFile); // PCM16 LE, mono, 16 kHz
  const stream = stt.createStream();

  stream.on('transcription', (result) => {
    if (result.isFinal) console.log(result.text);
  });
  stream.on('error', (err) => console.error('stt:', err.message));

  const CHUNK = 3200; // 100 ms of audio every 100 ms
  for (let offset = 0; offset < pcm.length; offset += CHUNK) {
    stream.sendAudio(pcm.subarray(offset, offset + CHUNK));
    await new Promise((done) => setTimeout(done, 100));
  }
  await new Promise((done) => setTimeout(done, 1500)); // wait for the last transcript
  await stream.close(); // billing stops when the stream closes
}

transcribe('speech-16k.pcm');
```

| Option | Description |
| --- | --- |
| `cloud` | The `CloudClient`. Each stream gets its own session. |
| `language` | Language code, or `auto`. Default `auto`. |
| `partials` | `true` to receive `transcription_partial` events while the person is speaking. |
| `smartTurn` | `true` to let the service decide when the speaker has finished a turn. |
| `forceWhisper` | `true` to use Whisper even for a language Parakeet supports. |
| `cloudSession` | `{ minutes, extendWhenMinutesLeft }`: how much time each session holds (default 10) and when it is extended (default 2). |

Call `stt.setWebRTCSessionId(sessionId)` before `createStream()` to link the usage to a room participant.

After a dropped connection the client opens a new session by itself, with a pause of 1 to 30 seconds, and keeps up to 5 seconds of audio meanwhile.

## The WebSocket protocol

The rest of this page describes the protocol itself. Use it from Python, Go or any other language, or when you need full control.

## 1. Open a session

```typescript
import { CloudClient } from '@dtelecom/server-sdk-js';

const cloud = new CloudClient();

const session = await cloud.stt.createSession({
  duration: '30m', // prepaid time; unused time is released when the session ends
  language: 'en',
});
// session.streamUrl, session.token, session.sessionId, session.expiresAt
```

| Option | Description |
| --- | --- |
| `duration` | Prepaid time: seconds as a number, or `'30m'`, `'2h'`. Rounded up to whole minutes, at most 24 hours. |
| `language` | Language code such as `en`, or `auto` to detect the spoken language. Default `en`. See [Languages and voices](languages-and-voices.md). |
| `webrtcSessionId` | Links this stream to a room participant. See [Link AI usage to a room](overview.md#link-ai-usage-to-a-room). |

## 2. Connect and stream

Audio must be **PCM16 little-endian, mono, 16 kHz**. The server does not resample. Send chunks of 20 to 100 ms (320 to 3,200 bytes).

This example streams a raw PCM file in real time. It uses the `ws` package.

```typescript
import fs from 'fs';
import WebSocket from 'ws';
import { CloudClient } from '@dtelecom/server-sdk-js';

const cloud = new CloudClient();

async function transcribe(pcmFile: string) {
  const pcm = fs.readFileSync(pcmFile); // PCM16 LE, mono, 16 kHz
  const session = await cloud.stt.createSession({ duration: '10m', language: 'en' });
  const ws = new WebSocket(session.streamUrl); // the full WebSocket address

  ws.on('open', () => {
    // the first message must arrive within 10 seconds
    ws.send(JSON.stringify({ type: 'config', language: 'en', session_key: session.token }));
  });
  // without this handler a failed connection crashes the process
  ws.on('error', (err) => console.error('stt socket:', err.message));

  ws.on('message', (data, isBinary) => {
    if (isBinary) return;
    const msg = JSON.parse(data.toString());

    if (msg.type === 'ready') {
      // 100 ms of audio every 100 ms
      const CHUNK = 3200;
      let offset = 0;
      const timer = setInterval(() => {
        if (offset >= pcm.length) {
          clearInterval(timer);
          setTimeout(() => ws.close(), 1500); // wait for the last transcript
          return;
        }
        ws.send(pcm.subarray(offset, offset + CHUNK));
        offset += CHUNK;
      }, 100);
    }

    if (msg.type === 'transcription' && msg.is_final) {
      console.log(msg.text);
    }

    if (msg.type === 'error') {
      console.error(msg.error, msg.message);
      ws.close();
    }
  });
}

transcribe('speech-16k.pcm');
```

Close the socket when you are done. Billing stops when the socket closes.

Over HTTP the same address is the `stream_url` field of the session response. A session key works for one connection: after any disconnect, create a new session.

## Messages

### You send

| Message | Purpose |
| --- | --- |
| `{"type":"config","language":"en","session_key":"..."}` | Required first message. Optional fields: `"partials": true`, `"smart_turn": true`, `"model": "whisper"`. |
| `{"type":"config","language":"es"}` | Sent later: changes the language of the open stream. Buffers are cleared. |
| binary | PCM16 audio. |
| `{"type":"flush"}` | Finish the current utterance now. |
| `{"type":"reset"}` | Drop buffered audio and start clean. |
| `{"type":"ping"}` | Keepalive. The server answers `pong`. |
| `{"type":"extend","session_key":"..."}` | Apply a new key after extending the session. |

### You receive

| `type` | Fields | Meaning |
| --- | --- | --- |
| `ready` | `client_id`, `language`, `smart_turn` | The stream accepts audio. Sent again after you change the language. `smart_turn` is present only when you asked for it: `active` or `acoustic_fallback`. |
| `transcription` | `text`, `language`, `is_final`, `latency_ms`, `timestamp` | A transcript of an utterance. One long turn may arrive as several finals, one per sentence. |
| `transcription_partial` | `text`, `utterance_id`, `revision`, `replace_previous`, `window_start_seconds` | An interim result. Only with `"partials": true`. Replace the previous revision of the same `utterance_id`. |
| `partial_end` | `utterance_id`, `reason` | The interim text is over: `finalizing`, `discarded`, `replaced` or `reconfigured`. |
| `vad_event` | `event`: `speech_start` or `speech_end`, `timestamp` | Speech activity. |
| `pong` | `timestamp` | Answer to `ping`. |
| `extended` | `expires_in`, seconds | The new key was applied. |
| `error` | `error`, `message` | `error` is the code: see the table below. |

A final transcript looks like this:

```json
{ "type": "transcription", "text": "Good morning.", "language": "en", "is_final": true, "latency_ms": 148.8, "timestamp": 1794767413.54 }
```

With `language: "auto"` the speech is recognised in the language spoken, but the `language` field of a transcript is `auto`, not the detected code. If you need the language code in the result, set the language explicitly.

### When the server closes the socket

| Situation | What you see |
| --- | --- |
| No config message within 10 seconds | The socket closes with code 1000 and no message. |
| Wrong session key | `{"type":"error","error":"auth_failed"}`, then close code 1008. |
| A second connection with a key that was already used | `{"type":"error","error":"session_key_used"}`, then close code 1008. |
| The session ran out of time | `{"type":"error","error":"session_expired"}`, then the socket closes. |
| The speech server has no free capacity | `{"type":"error","error":"server_full"}`. Create a new session. |
| 5 minutes without audio, or 6 hours of connection | The socket closes with code 1000 and no message. |

Other error codes: `auth_required`, `initialization_timeout`, `initialization_failed`, `extend_failed`, `invalid_config`, `queue_full`.

## Extend a running session

There is no warning message before a session ends. Extend on your own timer, before `expiresAt`: add time from your backend and send the new key to the open socket. The server answers `{"type":"extended","expires_in":N}`. After the session has ended, `stt.extend` fails with 409 `session_not_extendable`.

```typescript
import type WebSocket from 'ws';
import { CloudClient } from '@dtelecom/server-sdk-js';

const cloud = new CloudClient();

async function extend(ws: WebSocket, sessionId: string) {
  const { token } = await cloud.stt.extend(sessionId, '10m');
  ws.send(JSON.stringify({ type: 'extend', session_key: token }));
}
```

## Recognition engines

Two engines serve streaming recognition: Parakeet for 25 languages and Whisper for about 100. The service picks one from the session language; you do not have to choose. To force Whisper, add `"model": "whisper"` to the config message. Details and language lists are in [Languages and voices](languages-and-voices.md).

## Turn detection for voice agents

Add `"smart_turn": true` to the config message to let the service decide when the speaker has finished a turn, instead of waiting for a fixed pause. It works in 23 languages and falls back to silence detection in the others; check `smart_turn` in the `ready` message to see which is active.

Combine it with `"partials": true` to show text while the user is still speaking. Only a `transcription` with `is_final: true` should start an LLM turn.

## Getting audio from a room

To transcribe people in a room, your backend joins the room and reads each participant's audio as 16 kHz PCM. See [Server-side media](../guides/server-side-media.md) for a complete transcriber, and [Live captions and translation](../guides/live-captions.md) for captions.

## Tips

- Prepay a little more than you expect to need. You are charged for the connected time, not the reservation.
- Send audio at real-time pace. Sending a file faster than real time does not make transcription cheaper or faster.
- If your audio is 48 kHz from WebRTC, downsample to 16 kHz before sending.
- A session key works for one connection. After any disconnect, create a new session and connect with its key. `DtelecomSTT` does this for you.
- `flush` and `reset` do not answer with a message of their own. `reset` keeps the socket open.
