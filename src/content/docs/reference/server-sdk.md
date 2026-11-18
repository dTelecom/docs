---
title: Server SDK reference
description: Every method of @dtelecom/server-sdk-js 4.x on one page.
---

# Server SDK reference

Package: `@dtelecom/server-sdk-js` 4.2.1 or newer. Node.js 18 or newer. The source is on GitHub, in the default branch `v4`.

Go has its own server SDK, `dTelecom/server-sdk-go` v1.1.2, package `github.com/dtelecom/server-sdk-go/cloud`. From other languages, use the [HTTP API](http-api.md) that this SDK wraps and the OpenAPI specification at `https://cloud.dtelecom.org/v1/openapi.json`.

```shell
npm install @dtelecom/server-sdk-js
```

## CloudClient

```typescript
import { CloudClient } from '@dtelecom/server-sdk-js';

const cloud = new CloudClient({
  apiKey: process.env.DTELECOM_API_KEY,
  apiSecret: process.env.DTELECOM_API_SECRET,
  baseUrl: 'https://cloud.dtelecom.org',
});
```

| Option | Environment variable | Description |
| --- | --- | --- |
| `apiKey` | `DTELECOM_API_KEY` | API key of the project. |
| `apiSecret` | `DTELECOM_API_SECRET` | Secret of that key. |
| `baseUrl` | `DTELECOM_CLOUD_URL` | Cloud origin, `https://cloud.dtelecom.org`. |
| `fetch` | - | Custom fetch implementation. Defaults to the global `fetch`. |

## Rooms

| Method | Returns | Description |
| --- | --- | --- |
| `cloud.createToken(options)` | `{ token, wsUrl, sessionId, expiresAt }` | Creates a participant session. [Guide](../rooms/tokens.md) |
| `cloud.extendToken(sessionId, additional)` | `{ token, wsUrl, expiresAt }` | Adds time to a session. `additional` is seconds or a string such as `'30m'`. Call it before `expiresAt`: a participant whose token expired is removed about a minute later, and after that the call throws 409 `session_not_extendable`. Keeps the name, metadata, grants and webhook URLs. |
| `cloud.adminToken(room)` | `{ token, apiUrls, expiresAt }` | 10-minute room admin token and the nodes hosting the room. Used internally by `roomService()`. |
| `cloud.roomService()` | `RoomServiceClient` | Room administration. [Guide](../rooms/manage-rooms.md) |

### RoomServiceClient

| Method | Description |
| --- | --- |
| `listParticipants(room)` | Participants currently in the room. |
| `getParticipant(room, identity)` | One participant. |
| `removeParticipant(room, identity)` | Disconnects a participant. |
| `updateParticipant(room, identity, metadata?, permission?, name?)` | Changes a participant's metadata, permissions or name. Returns the updated participant. |
| `updateSubscriptions(room, identity, trackSids, subscribe)` | Subscribes or unsubscribes a participant. |
| `mutePublishedTrack(room, identity, trackSid, muted)` | Mutes or unmutes a track. |
| `updateRoomMetadata(room, metadata)` | Sets the room's metadata string. Returns the updated room. |
| `sendData(room, data, kind, options)` | Sends a data message to the room. |
| `deleteRoom(room)` | Disconnects everyone and ends the room. |

## Speech-to-Text

| Method | Returns | Description |
| --- | --- | --- |
| `cloud.stt.createSession({ duration, language?, webrtcSessionId? })` | `{ sessionId, token, serverUrl, streamUrl, expiresAt }` | Prepaid streaming session. Connect to `streamUrl`. The key works for one connection: after a disconnect, create a new session. [Guide](../ai/speech-to-text.md) |
| `cloud.stt.extend(sessionId, additional)` | `{ token, expiresAt }` | Adds time. Send the new token to the open socket as `{"type":"extend","session_key": token}`; the server answers `{"type":"extended","expires_in":N}`. |
| `cloud.transcriptions.create({ file, idempotencyKey, filename?, language?, diarize? })` | `TranscriptionJob` | Uploads a file and starts a job. [Guide](../ai/transcription.md) |
| `cloud.transcriptions.get(jobId)` | `TranscriptionJob` | Job status and result. |
| `cloud.transcriptions.delete(jobId)` | `TranscriptionJob` | Cancels or deletes a job. |

## Text-to-Speech

| Method | Returns | Description |
| --- | --- | --- |
| `cloud.tts.createSession({ maxCharacters, voice?, language?, webrtcSessionId? })` | `{ sessionId, token, serverUrl, streamUrl, expiresAt }` | Prepaid streaming session. Connect to `streamUrl`. The key works for one connection. [Guide](../ai/text-to-speech.md) |
| `cloud.tts.extend(sessionId, additionalCharacters)` | `{ token, maxCharacters, expiresAt }` | Adds characters and 30 minutes. Send the new token to the open socket the same way as for Speech-to-Text. |
| `cloud.wav.create({ text, idempotencyKey, voice?, language?, speed?, inputFormat?, dictionary?, watermark? })` | `WavJob` | Starts a WAV synthesis job. |
| `cloud.wav.get(jobId)` | `WavJob` | Job status and metadata. |
| `cloud.wav.download(jobId)` | `Response` | The finished WAV file. |
| `cloud.wav.delete(jobId)` | `WavJob` | Cancels or deletes a job. |

The SDK has no client for the streaming protocols. For streaming from JavaScript use `DtelecomSTT` and `DtelecomTTS` from `@dtelecom/agents-js/providers`; they work without a voice agent too.

## Translation

| Method | Returns | Description |
| --- | --- | --- |
| `cloud.translate({ q, target, source?, idempotencyKey })` | `Translation` | Translates up to 500 characters. [Guide](../ai/translation.md) |
| `cloud.getTranslation(requestId)` | `Translation` | Polls or re-reads a result. |

## Vision

| Method | Returns | Description |
| --- | --- | --- |
| `cloud.vision.snapshot({ image, idempotencyKey, question?, source?, webrtcSessionId? })` | `VisionSnapshot` | Answers a question about an image. [Guide](../ai/vision.md) |
| `cloud.vision.get(requestId)` | `VisionSnapshot` | Polls or re-reads a result. |

## Moderation

| Method | Returns | Description |
| --- | --- | --- |
| `cloud.moderation.audio({ audio, idempotencyKey, language?, webrtcSessionId? })` | `Moderation` | Moderates up to 30 seconds of audio. [Guide](../ai/moderation.md) |
| `cloud.moderation.videoFrame({ image, idempotencyKey, webrtcSessionId? })` | `Moderation` | Moderates one frame. |
| `cloud.moderation.get(requestId)` | `Moderation` | Polls or re-reads a result. |
| `cloud.moderation.streamTicket()` | `ModerationStreamTicket` | 10-minute ticket for one moderation WebSocket. |
| `cloud.moderation.stream({ socketFactory? })` | `ModerationStream` | Gets a ticket and opens the stream. |

### ModerationStream

| Method | Description |
| --- | --- |
| `ModerationStream.connect(ticket, factory?)` | Opens a stream with a ticket. Use it on your backend. |
| `stream.sendAudio(idempotencyKey, pcm, language?)` | Moderates an audio chunk. |
| `stream.sendVideoFrame(idempotencyKey, image)` | Moderates a frame. |
| `stream.close()` | Closes the stream. |

## Webhooks

| Class | Description |
| --- | --- |
| `new WebhookReceiver()` | Verifies and decodes webhook deliveries. [Guide](../rooms/webhooks.md) |
| `receiver.receive(rawBody, authorizationHeader)` | Returns the decoded event, or throws if the delivery is not genuine. |

## Shared types

| Type | Shape |
| --- | --- |
| `MediaInput` | `Blob` or `Uint8Array` (a Node `Buffer` works). |
| Request (`Translation`, `VisionSnapshot`, `Moderation`) | `{ id, kind, status, chargedMicrocredits, result? }`, `status` is `'running'` or `'completed'`. A failed request throws `CloudApiError`. |
| Job (`TranscriptionJob`, `WavJob`) | `{ id, status, result?, error? }`, `status` is `'uploading'`, `'queued'`, `'running'`, `'completed'`, `'failed'`, `'cancelled'` or `'deleted'`. |
| Durations | A number of seconds, or a string with a unit: `'90s'`, `'30m'`, `'12h'`, `'1d'`. From 1 minute to 24 hours, rounded up to whole minutes: `'90s'` becomes 2 minutes. `ttl` in `createToken` defaults to 6 hours. |

Responses are camelCase and use `Date` for times. Charges are microcredits as decimal strings.

## Errors

`CloudApiError`, `NodeApiError` and `RoomNotLiveError`. See [Errors](../platform/errors.md).

`CloudApiError` fields: `status`, `code`, `retryAfter`, `id`, `detail`. `detail` is set on 422 `backend_rejected`; for SSML it is `{ code, message, position }`.
