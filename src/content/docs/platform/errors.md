---
title: Errors
description: Error types, codes and what to retry.
---

# Errors

## Error types

| Class | Thrown by | Fields |
| --- | --- | --- |
| `CloudApiError` | every `CloudClient` call, and `roomService()` calls when the cloud refuses the admin token | `status`, `code`, `retryAfter`, `id`, `detail` |
| `NodeApiError` | `cloud.roomService()` calls, when a node refuses | `apiUrl`, `status`, `code` |
| `RoomNotLiveError` | `cloud.roomService()` calls on a room nobody joined | - |

```typescript
import { CloudClient, CloudApiError } from '@dtelecom/server-sdk-js';

const cloud = new CloudClient();

try {
  await cloud.createToken({ room: 'demo', identity: 'user-1' });
} catch (err) {
  if (err instanceof CloudApiError) {
    console.error(err.status, err.code, err.retryAfter, err.id, err.detail);
  } else {
    throw err;
  }
}
```

- `status` - HTTP status.
- `code` - a stable, machine-readable code. Branch on this, not on the message.
- `retryAfter` - seconds to wait before retrying, on 429 and 503.
- `id` - the job or request the error belongs to, when there is one.
- `detail` - the body of the refusal on 422 `backend_rejected`, for example an SSML error. Needs `@dtelecom/server-sdk-js` 4.2.1 or newer.

The SDK also throws a plain `Error` before it sends anything, when an argument is invalid: a bad `ttl`, a malformed idempotency key, an empty id. Do not retry those.

## Codes

### Your request is wrong

| Status | `code` | Meaning | What to do |
| --- | --- | --- | --- |
| 400 | `invalid_body` | A required field is missing or has the wrong type, for example no `identity`. | Fix the request. |
| 400 | `invalid_idempotency_key` | The idempotency key is missing or malformed. | Translation, Vision, Moderation: 1-128 letters, digits, `_` or `-`. Transcription and WAV: 1-128 printable ASCII characters, no spaces. |
| 400 | `invalid_webhook_url` | A webhook URL is not HTTPS, points to localhost, a private or link-local address, or more than 5 were passed. | Fix the list. |
| 401 | `invalid_api_key` | Missing or wrong key or secret, a revoked key, an archived project, or a header that is not `Bearer key:secret`. | Check `DTELECOM_API_KEY`, `DTELECOM_API_SECRET` and `DTELECOM_CLOUD_URL`. |
| 404 | `not_found` | Unknown path. | Check the URL. |
| 404 | `session_not_found` | Unknown session. | Check the session id. |
| 404 | `request_not_found` | Unknown job or request, a deleted result, or a transcription or WAV job older than 24 hours. | Check the id. |
| 405 | `method_not_allowed` | Wrong HTTP method. | Check the method. |
| 408 | `body_timeout` | The request body arrived too slowly. | Send it again. |
| 409 | `idempotency_conflict` | The key was reused with different input. For a transcription job the key is tied to the file: the same key with another file is a conflict. | Use a new key for new work. |
| 409 | `session_not_extendable` | The token or speech session already ended. For a room token: the grace period after expiry is over. | Issue a new token or session. |
| 409 | `project_archived` | The project is archived. | Restore it, or use another project. |
| 409 | `job_not_complete` | The WAV audio was requested before the job finished. | Poll until `completed`. |
| 410 | `result_expired` | The stored result of a translation, vision or moderation request expired (kept for 24 hours). | Run the call again with a new key. |
| 413 | `body_too_large` | The request body is over the size limit. | Shrink the input. See [Limits](limits.md). |
| 415 | `unsupported_media_type` | Wrong content type, for example a transcription upload that is not multipart. | Fix the request format. |
| 422 | `invalid_fields` | A field is over a limit: text longer than 500 characters for translation, audio longer than 30 seconds for moderation. | Check the input against [Limits](limits.md). Not charged. |
| 422 | `backend_rejected` | Text-to-Speech refused the request: unknown voice, unsupported SSML, a malformed dictionary. For WAV jobs the answer carries `detail`, see below. | Check [SSML](../ai/ssml.md) and [voices](../ai/languages-and-voices.md). Not charged. |
| 422 | `translation_truncated` | The translation would be cut off. | Send a shorter text. |
| varies | `inference_rejected` | The model refused the input: unsupported language or pair, an image over 4 megapixels, a file that is not an image. The status comes from the model: 413, 415, 422, 429, 503 or 504, otherwise 502. | Change the input. Not charged. |
| varies | `upload_rejected` | A file upload was refused, for example `language=auto` on a transcription job. | Fix the file or the form fields. |

A WAV job with invalid SSML answers 422 `backend_rejected` with the reason in `detail`:

```json
{ "error": "backend_rejected", "detail": { "code": "UNSUPPORTED_TAG", "message": "Unsupported element: emphasis", "position": 13 } }
```

In the SDK this is `err.detail`.

### Balance and limits

| Status | `code` | Meaning | What to do |
| --- | --- | --- | --- |
| 402 | `insufficient_balance` | The balance is at $0, or the free balance is smaller than the reservation of the new token or session. A token reserves its `ttl` at the audio rate. | Top up or turn on auto top-up. |
| 403 | `room_participant_limit` | The room already has 1,000 issued tokens. | Use another room. |
| 429 | `concurrency_limit` | The concurrent participants limit is reached. | A slot frees when a participant leaves or an unused token expires. Or upgrade. |
| 429 | `rate_limited` | Too many requests per second. Always with `Retry-After: 1`. | Retry after `retryAfter` seconds. |
| 429 | `inference_capacity` | More than 4 requests at once to transcription, WAV, vision and moderation. | Wait for one to finish. |
| 429 | `workload_busy` | Vision or moderation is busy. | Retry shortly. |

### Temporary failures

| Status | `code` | Meaning | What to do |
| --- | --- | --- | --- |
| 500 | `internal_error` | Something failed on our side. | Retry later. |
| 502 | `backend_unavailable`, `inference_backend_failure` | A backend failed. | Retry with the same idempotency key. |
| 503 | `nodes_unavailable` | No node can take the participant right now. | Retry after `retryAfter` seconds (30). |
| 503 | `registry_sync_pending` | The key of a new project is not registered on the nodes yet. This usually takes up to a minute. | Retry after `retryAfter` seconds (30). |
| 503 | `no_servers_available` | No speech server has free capacity for a new session. | Retry shortly. |
| 503 | `service_unavailable` | The service is temporarily unavailable. | Retry shortly. |
| 504 | `inference_backend_timeout`, `inference_deadline_exceeded` | A backend timed out. | Retry with the same idempotency key. |

A request that is still being processed is not an error: it answers HTTP 202 with `status: "running"` and `Retry-After: 1`.

### Errors from room management

`roomService()` calls throw `RoomNotLiveError` when nobody is in the room, for example `removeParticipant` on an empty room. `listParticipants` returns an empty list instead, and `deleteRoom` does nothing.

## Retrying safely

The SDK never retries by itself. Use this rule:

| Situation | Retry? |
| --- | --- |
| Network error, 429, 502, 503, 504 | Yes, with backoff, after `retryAfter` when it is set. Keep the same `idempotencyKey`: after a temporary failure the key is released and the request runs again, so you are not charged twice. |
| `status: 'running'` on a request | Call again with the same key, or poll the `get` method. |
| 400, 401, 402, 409, 413, 422 | No. Fix the cause first. A 4xx refusal is stored under the key: the same key returns the same refusal, so after fixing the input use a new key. |
| A plain `Error` from the SDK | No. The arguments are invalid. |

For file jobs every failure releases the key except `upload_rejected` and `preparation_rejected`.

```typescript
import { CloudClient, CloudApiError } from '@dtelecom/server-sdk-js';

const cloud = new CloudClient();

function retryable(err: unknown): boolean {
  if (err instanceof CloudApiError) return [429, 502, 503, 504].includes(err.status);
  return err instanceof TypeError; // fetch reports a network failure as TypeError
}

async function withRetry<T>(call: () => Promise<T>, attempts = 4): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await call();
    } catch (err) {
      if (!retryable(err) || i === attempts - 1) throw err;
      const wait = err instanceof CloudApiError && err.retryAfter ? err.retryAfter * 1000 : 500 * 2 ** i;
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

const r = await withRetry(() =>
  cloud.translate({ q: 'Hello', target: 'fr', idempotencyKey: 'msg-1-fr' }),
);
```

## Errors on speech streams

Streaming Speech-to-Text and Text-to-Speech report errors as a JSON message on the WebSocket, not as an HTTP status.

**Speech-to-Text** sends `{"type":"error","error":"<code>"}`:

| `error` | Meaning |
| --- | --- |
| `session_key_used` | A second connection with a key that was already used. The socket closes with code 1008. |
| `auth_failed`, `auth_required` | Wrong or missing session key. Close code 1008. |
| `session_expired` | The session ran out of time. The socket closes. |
| `server_full` | The speech server has no capacity. Create a new session. |
| `initialization_timeout`, `initialization_failed`, `invalid_config`, `extend_failed`, `queue_full` | The config, the extension or the audio queue failed. |

**Text-to-Speech** sends `{"type":"error","message":"..."}`. Most errors have only the text. A code comes with `session_key_used`, `character_limit_exceeded` and SSML errors, which carry `code`, `message` and `position`.

A session key works for one connection. After any disconnect, create a new session.

To extend, send `{"type":"extend","session_key":"..."}`; the server answers `{"type":"extended","expires_in":N}`.

**The moderation WebSocket** can report `invalid_protocol_or_authentication`, `await_previous_result`, `inference_unavailable`, `result_expired` and `invalid_api_key`.

## Failed jobs and requests

File jobs (transcription and WAV) that fail after they were accepted do not throw. They finish with `status: 'failed'` and an `error` string. Always check `status` before reading `result`.

Job errors: `upload_rejected`, `upload_or_admission_failed`, `preparation_rejected`, `preparation_or_admission_failed`, `job_deadline_exceeded`, `upload_interrupted`, `backend_result_unavailable`, `worker_busy`, `invalid_backend_result`, `backend_processing_failed`.

Translation, Vision and Moderation requests that fail answer with an error status, and the SDK throws `CloudApiError`.

## Getting help

When you contact `support@dtelecom.org`, include the `code`, the `id` from the error and the time of the call.
