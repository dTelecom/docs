---
title: Examples
description: Open-source apps you can clone, run and take apart.
---

# Examples

All examples are in the [dTelecom GitHub organization](https://github.com/dTelecom).

## Example apps

| App | What it shows | Stack |
| --- | --- | --- |
| [dtelecom-meet](https://github.com/dTelecom/dtelecom-meet) | Video conferencing: pre-join screen, host controls, chat, participant count from webhooks | Next.js, React components |
| [dtelecom-live](https://github.com/dTelecom/dtelecom-live) | Livestreaming: host and watch-only viewers, chat, viewer count, OBS input | Next.js, React components |
| [conference-example](https://github.com/dTelecom/conference-example) | A smaller conference app | Next.js, React components |
| [spatial-audio](https://github.com/dTelecom/spatial-audio) | A meeting space where volume depends on distance | Next.js |
| [ai-tutor-demo](https://github.com/dTelecom/ai-tutor-demo) | A voice agent as a language tutor: partial transcripts, smart turn detection, SSML. It runs through the x402 gateway; it differs from Cloud only in how it pays. | Next.js, `@dtelecom/agents-js` |

## Code examples in the SDK repositories

| Repository | Examples |
| --- | --- |
| [agents-js](https://github.com/dTelecom/agents-js/tree/main/examples) | `basic-agent.ts`: a minimal voice agent with events and shutdown handling |
| [server-sdk-node](https://github.com/dTelecom/server-sdk-node/tree/main/examples) | `echo-bot.ts`, `receive-audio.ts` (save room audio to a file), `send-audio.ts` (play a file into a room) |

## Running an example with a dTelecom Cloud key

`dtelecom-meet`, `conference-example` and `dtelecom-live` run on dTelecom Cloud from their main branches. Set `DTELECOM_API_KEY`, `DTELECOM_API_SECRET` and `DTELECOM_CLOUD_URL` and follow each README.

Two things to know when you adapt them:

- A token's lifetime is a hard limit. Set a `ttl` that covers the session (up to 24 hours) or extend the token with `cloud.extendToken()`, or the participant is removed.
- The examples in `agents-js` and `server-sdk-node` need Node.js 22 or newer.

If you have your own app on the previous server SDK (3.x), see [Migrate from 3.x](migrate-from-3x.md).

## Build with an AI assistant

The docs are available in a form that coding assistants read well. See [Use the docs with AI](llm-resources.md).
