---
title: FAQ and troubleshooting
description: Short answers to the questions developers ask most.
---

# FAQ and troubleshooting

## Getting started

**Do I need a credit card to try it?**
No. The Free plan includes $10 of usage every month and needs no card.

**Which SDK do I install?**
| For | Package | Needs |
| --- | --- | --- |
| Your backend | `@dtelecom/server-sdk-js` 4.2.x, or `dTelecom/server-sdk-go` for Go | Node.js 18+ |
| Bots and server-side media | `@dtelecom/server-sdk-node` 0.3.x | Node.js 22+ |
| Voice agents | `@dtelecom/agents-js` 0.8.x | Node.js 22+ |
| Your app | `@dtelecom/livekit-client` | a browser |

See [SDKs and packages](../reference/sdks.md).

**I do not use Node.js. Can I still use dTelecom Cloud?**
Yes. Go has its own server SDK: `go get github.com/dtelecom/server-sdk-go@v1.1.2`, package `cloud`. For other languages every server-side operation is a plain HTTPS call: see the [HTTP API reference](../reference/http-api.md) and the OpenAPI specification at `https://cloud.dtelecom.org/v1/openapi.json`.

**I am coming from LiveKit. How much changes?**
On the client, the package name. On the server, token creation: you call `cloud.createToken()` and get the token together with the node address. See [SDKs and packages](../reference/sdks.md#coming-from-livekit).

**`npm install` fails.**
`@dtelecom/server-sdk-node` 0.3.x and `@dtelecom/agents-js` 0.8.x have nothing native to build and need no workarounds. They need Node.js 22 or newer: check `node --version`.

**Where is the "create room" call?**
There is none. A room starts when its first participant joins and ends when the last one leaves.

## Connecting

**`createToken` fails with 401.**
The key, the secret or `DTELECOM_CLOUD_URL` is wrong. Check for stray spaces or quotes in the environment variables, and that the key has not been revoked.

**`createToken` fails with 402 `insufficient_balance`.**
The balance is at $0, or it is smaller than the reservation the new token needs. Top up, or turn on auto top-up under **Billing**.

**`createToken` fails with 429 `concurrency_limit`.**
All concurrent participant slots of your plan are in use. Every issued token takes a slot from the moment it is issued, and an unused token holds it until it expires. Issue tokens right before joining, call `room.disconnect()` when a user leaves, or upgrade.

**`createToken` fails with 503.**
Two codes. `nodes_unavailable`: no node can take the participant at this moment. `registry_sync_pending`: a new project is not registered on the nodes yet, which usually takes up to a minute. In both cases retry after the number of seconds in `err.retryAfter` (30).

**The client connects, but there is no audio.**
Browsers block audio until the user interacts with the page. Join from a click handler. In React, make sure `RoomAudioRenderer` or `VideoConference` is rendered.

**Participants far from each other have a noticeable delay.**
Pass `clientIp` when you create each token, so every participant is placed on a node near them. See [Latency tips](../guides/latency.md).

**A participant was disconnected after a few hours.**
Its token expired and was not extended. The cloud removes such a participant 60 to 90 seconds after expiry; the client gets the reason `PARTICIPANT_REMOVED`, and `@dtelecom/server-sdk-node` reports `participant_removed`. Extend the token with `extendToken` before it expires. `@dtelecom/agents-js` extends the agent's own token by itself.

**The connection fails on a corporate network.**
The client needs TCP 443 at least. See [Firewalls and corporate networks](../rooms/connect.md#firewalls-and-corporate-networks).

**Can I hard-code the node address?**
No. Use the `wsUrl` returned with each token. It can differ from one participant to the next.

## Rooms

**How many people fit in one room?**
Up to 1,000 participants, on every plan. The number you can have at the same time across all rooms is your plan's concurrent participants limit.

**How do I make someone a viewer?**
Issue their token with `grants: { canPublish: false }`. See [Tokens and permissions](../rooms/tokens.md).

**How do I know when someone joins or leaves?**
In the client, listen to `RoomEvent.ParticipantConnected` and `ParticipantDisconnected`. On the backend, use [webhooks](../rooms/webhooks.md).

**My webhooks do not arrive during local development.**
Localhost and private addresses are rejected when the token is issued, with 400 `invalid_webhook_url`, and only HTTPS is allowed. Expose your local server with a tunnel and use the tunnel's HTTPS URL in `webhookUrls`.

**Can I record a room?**
Record with a bot: join it with [server-side media](../guides/server-side-media.md), subscribe to the tracks and save the audio. Or record in the client. Egress is coming soon.

**Can I broadcast from OBS?**
Yes, over WHIP. Your server checks the stream key, issues a publish-only token with `grants: { canSubscribe: false }` and redirects OBS with HTTP 307 to the node's `/whip?access_token=...`. The `ttl` must cover the whole broadcast, up to 24 hours, or the token has to be extended. See [Livestreaming](../guides/livestreaming.md#broadcast-from-obs).

**Which mobile SDKs are there?**
dTelecom has client SDKs for the web and for React Native. React Native has not been tested with dTelecom Cloud yet; it should work. The Unity SDK is old and has not been tested with Cloud. The original LiveKit SDKs for iOS, Android and Flutter do not work with dTelecom nodes.

## AI services

**Translation fails with 422.**
The text is longer than 500 characters, or the language pair is not served. Split long text into parts, and prefer pairs with English on one side. See [Translation](../ai/translation.md).

**A call fails with 409.**
Three causes. `idempotency_conflict`: you reused an `idempotencyKey` with different input, or a transcription key with another file; use a new key for new work. `session_not_extendable`: you tried to extend a token or a speech session after it ended. `job_not_complete`: you asked for WAV audio before the job finished.

**A call returns `status: 'running'`.**
The work is not finished. Call again with the same key, or poll the matching `get` method.

**My Speech-to-Text stream closes right after connecting.**
The first message must be the config with the session key, sent within 10 seconds. A session key works for one connection: a second connection with the same key gets `{"type":"error","error":"session_key_used"}` and is closed with code 1008. After any disconnect, create a new session. `DtelecomSTT` and `DtelecomTTS` from `@dtelecom/agents-js/providers` do this by themselves.

**Speech-to-Text returns nothing.**
Check the audio format: PCM16 little-endian, mono, 16 kHz, sent as binary messages. Audio at another sample rate is not resampled and will not be recognised.

**Which languages are supported?**
See [Languages and voices](../ai/languages-and-voices.md).

**Can I use my own LLM?**
Yes, any model. dTelecom provides rooms and speech; you connect the LLM with your own key and pay its provider directly. See [Build a voice agent](../guides/voice-agent.md).

**Does dTelecom host my agent?**
No. The agent process runs on your infrastructure, as a long-lived Node.js process. Serverless functions do not fit.

**Is my audio used to train models?**
No. Audio, video, text and images are used only to produce your result and are not kept after processing. Results are deleted after 24 hours. See [Security and data](security.md).

## Billing

**How is a call billed?**
Per connected participant, per second. A participant who publishes video pays the video rate for that time; everyone else, including people who only watch, pays the audio rate. See [Billing and credits](billing.md).

**Why was I charged a little more time than my call lasted?**
Billing follows the time a participant is connected to the node, which includes joining and leaving. On very short sessions this is a few seconds per participant.

**Do unused credits roll over?**
Credits included in your plan expire at the end of the cycle. Credits you buy as a top-up never expire.

**Is there a discount for volume?**
Rates are the same on every plan. Paid plans get a top-up discount: Starter 5%, Growth 10%, Scale 15%, Enterprise 25%. It comes as extra credits. For steady WebRTC traffic the bandwidth add-on replaces per-minute billing with a fixed price.

**A room shows $0 in the dashboard.**
If your organization has a bandwidth add-on, WebRTC is not billed per minute. Otherwise very short audio sessions can cost less than a hundredth of a cent.

**How do I see what a single request cost?**
For Translation, Vision and Moderation, read `chargedMicrocredits` in the response: 1,000,000 microcredits = $1. For rooms, speech sessions, transcription and WAV, see the cost in the dashboard.

**Can I pay by invoice or bank transfer?**
On Enterprise terms, yes. Contact `enterprise@dtelecom.org`.

## Still stuck

Check the service status at [status.dtelecom.org](https://status.dtelecom.org).

Email `support@dtelecom.org` with the error `code`, the request or session `id`, the time of the call and your project id from **Settings**.
