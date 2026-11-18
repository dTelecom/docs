---
title: Content moderation
description: Check voice and video in rooms and livestreams for unsafe content.
---

# Content moderation

Moderation checks an audio chunk or a video frame and returns `pass` or `flag`. What you do with a flag, such as muting, removing or alerting a moderator, is up to your app.

| | Audio | Video |
| --- | --- | --- |
| Input | up to 30 seconds of speech | one frame |
| Price | $0.004 per minute (4 cr) | $0.0005 per frame (0.5 cr) |

## Moderate audio

Audio must be **PCM16 little-endian, mono, 16 kHz**, raw samples without a WAV header, up to 30 seconds per call.

```typescript
import fs from 'fs';
import { CloudClient } from '@dtelecom/server-sdk-js';

const cloud = new CloudClient();

const r = await cloud.moderation.audio({
  audio: fs.readFileSync('chunk-16k.pcm'),
  language: 'en',
  idempotencyKey: 'room-12-user-42-chunk-7',
});

console.log(r.result?.decision); // 'pass' or 'flag'
console.log(r.result?.transcript); // what was said
```

## Moderate a video frame

```typescript
import fs from 'fs';
import { CloudClient } from '@dtelecom/server-sdk-js';

const cloud = new CloudClient();

const r = await cloud.moderation.videoFrame({
  image: fs.readFileSync('frame.jpg'),
  idempotencyKey: 'room-12-user-42-frame-7',
});

console.log(r.result?.decision);
```

Images follow the same limits as [Vision](vision.md): JPEG, PNG or WebP, up to 6 MiB and 4 million pixels.

## Act on a flag

```typescript
import { CloudClient } from '@dtelecom/server-sdk-js';

const cloud = new CloudClient();
const rooms = cloud.roomService();

async function checkFrame(room: string, identity: string, frame: Uint8Array, n: number) {
  const r = await cloud.moderation.videoFrame({
    image: frame,
    idempotencyKey: `${room}-${identity}-frame-${n}`,
  });
  if (r.status === 'completed' && r.result?.decision === 'flag') {
    await rooms.removeParticipant(room, identity);
  }
}
```

An error is not a `pass`. If a call fails, decide explicitly what your app does: retry, or hold the content for review. After 429, 502, 503 or 504 a retry with the same `idempotencyKey` runs the request again. A 4xx refusal, such as 422, comes back again for the same key.

## Continuous moderation over a WebSocket

For a steady flow of chunks and frames, open a stream instead of making one HTTP call per item. Items go one at a time and each is billed like the HTTP call.

```typescript
import { CloudClient } from '@dtelecom/server-sdk-js';

const cloud = new CloudClient();

async function run(chunks: Uint8Array[]) {
  const stream = await cloud.moderation.stream();
  for (let i = 0; i < chunks.length; i++) {
    const r = await stream.sendAudio(`live-1-chunk-${i}`, chunks[i], 'en');
    if (r.result?.decision === 'flag') console.log('flagged chunk', i);
  }
  stream.close();
}
```

Node 22 has a global `WebSocket`. On older Node pass a factory:

```typescript
import WebSocket from 'ws';
import { CloudClient } from '@dtelecom/server-sdk-js';

const cloud = new CloudClient();

const stream = await cloud.moderation.stream({
  socketFactory: (url) => new WebSocket(url) as any,
});
```

## Moderation runs on your backend

Do not moderate from the browser. A decision made on the user's device can be bypassed. The flow:

1. **Your backend gets the media.** A bot on [`@dtelecom/server-sdk-node`](../guides/server-side-media.md) or a Go bot subscribes to the tracks, or your app uploads frames and audio to your own server.
2. **Your backend sends it to moderation**: `moderation.audio`, `moderation.videoFrame`, or a `moderation.stream()` opened on the server.
3. **Your backend acts on a `flag`**: `roomService().mutePublishedTrack`, `removeParticipant`, or a notice to your moderators.

## Result

| Field | Description |
| --- | --- |
| `result.decision` | `'pass'` or `'flag'`. |
| `result.policy` | `'text_safety'` for audio, `'visual_safety'` for video. |
| `result.evaluatedCategories` | Categories the policy covers. |
| `result.transcript`, `result.language` | Audio only. |
| `result.evidence` | Model and score behind the decision. |
| `chargedMicrocredits` | Charge for this request. |

## How much to sample

- **Audio:** send speech in chunks of up to 30 seconds. Skip silence to save cost.
- **Video:** one frame every 5 seconds (12 frames per minute) is a reasonable default; that costs $0.006 per participant-minute. Sample more often for higher-risk streams.
- Results are kept for 24 hours.
