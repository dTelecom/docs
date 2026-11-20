---
title: Limits
description: Plan limits and per-request limits in one place.
---

# Limits

## Plan limits

Plan limits apply to the whole organization and are shared by all its projects.

| | Free | Starter | Growth | Scale | Enterprise |
| --- | --- | --- | --- | --- | --- |
| Concurrent participants | 100 | 1,000 | 2,500 | 5,000 | by agreement |
| Requests per second | 5 | 20 | 50 | 100 | by agreement |

Your current limits are in the dashboard under **Settings > Quota and limits**. For higher limits, upgrade the plan or contact `enterprise@dtelecom.org`.

### Concurrent participants

Every issued token counts as one concurrent participant from the moment it is issued, whether the participant has connected or not, until the participant leaves or the token expires. An unused token holds its slot until it expires. Only rooms count: AI calls do not.

When the limit is reached, `createToken` fails with `concurrency_limit` (429) and the attempt appears in **Sessions** as rejected. Participants already connected are not affected.

### Request rate

The limit is counted per organization and covers every `/v1` call, including polling for results. Over the limit a call fails with 429 `rate_limited` and `Retry-After: 1`.

### AI capacity

- File transcription, WAV, Vision and Moderation: at most 4 requests at the same time per organization. A fifth fails with 429 `inference_capacity`.
- Streaming Speech-to-Text and Text-to-Speech have no plan limit. They are limited by the capacity of the speech servers: when there is none, creating a session fails with 503 `no_servers_available`.

## Rooms

| Limit | Value |
| --- | --- |
| Participants per room | 1,000 issued tokens, on every plan. Over it: 403 `room_participant_limit` |
| Room name and identity | 1 to 256 bytes each |
| Participant metadata | 16 KiB |
| Token lifetime (`ttl`) | 1 minute to 24 hours, default 6 hours, rounded up to whole minutes (`'90s'` is 2 minutes); a plain number is seconds |
| After expiry without an extension | the participant is removed in 60 to 90 seconds; a later extension fails with 409 `session_not_extendable` |
| Webhook URLs per token | 5, HTTPS only, no localhost or private addresses |
| Data message | no explicit limit; the transport caps one message at about 64 KiB |
| Empty room | closes 20 seconds after the last participant leaves, or 5 minutes after creation if nobody joined |
| Room admin token lifetime | 10 minutes |

## Speech-to-Text

| Limit | Value |
| --- | --- |
| Streaming audio format | PCM16 LE, mono, 16 kHz |
| Streaming session length | up to 24 hours per reservation, extendable |
| Streaming connection | closes after 6 hours, or after 5 minutes without audio |
| Session key | works for one connection |
| First message after connecting | within 10 seconds |
| File size | 256 MiB |
| File duration | 2 hours |
| File audio | 8-192 kHz, 1-8 channels |

## Text-to-Speech

| Limit | Value |
| --- | --- |
| Streaming output format | PCM16 LE, mono, 48 kHz, 20 ms frames |
| Streaming session | up to 10,000,000 characters; 30 minutes, each extension adds 30 minutes |
| Session key | works for one connection |
| WAV text length | 10,000 characters |
| WAV request body | 64 KiB |
| WAV output | 48 kHz mono PCM16, at most 1,800 seconds of audio |
| SSML document | 60 seconds of audio, 64 KiB; see [SSML](../ai/ssml.md#limits) |
| Speed | Kokoro 0.5-2.0, Supertonic 0.75-1.5 |

## Translation

| Limit | Value |
| --- | --- |
| Text per request | 500 characters (Unicode code points) |
| Request body | 64 KiB |

## Vision and video moderation

| Limit | Value |
| --- | --- |
| Image formats | JPEG, PNG, WebP |
| Image size | 6 MiB and 4 million pixels |
| Question length (Vision) | 4,000 characters |
| Answer length (Vision) | about 96 tokens |

## Audio moderation

| Limit | Value |
| --- | --- |
| Audio format | raw PCM16 LE, mono, 16 kHz, no WAV header |
| Audio per call | 30 seconds (960,000 bytes) |
| Stream ticket lifetime | 10 minutes |
| Items in flight per stream | 1 |

## Results and idempotency

| Limit | Value |
| --- | --- |
| Result retention (jobs and requests) | 24 hours |
| Uploaded files | deleted after processing |
| Retry after a temporary failure (429, 502, 503, 504) | the same key runs the request again |
| Retry after a 4xx refusal | the same key returns the same refusal |
| Key of a transcription job | tied to the file |
| Idempotency key, Translation, Vision, Moderation | 1-128 letters, digits, `_` or `-` |
| Idempotency key, file transcription and WAV | 1-128 printable ASCII characters, no spaces |
