---
title: Use the docs with AI
description: Give Claude, ChatGPT, Cursor or Copilot the full dTelecom Cloud documentation.
---

# Use the docs with AI

Coding assistants write better dTelecom integrations when they read the current docs instead of guessing. Two plain-text files contain everything on this site.

| File | Contents | Use it for |
| --- | --- | --- |
| [`https://docs.dtelecom.org/llms.txt`](https://docs.dtelecom.org/llms.txt) | An index: every page with a one-line summary | Letting an assistant find the right page |
| [`https://docs.dtelecom.org/llms-full.txt`](https://docs.dtelecom.org/llms-full.txt) | Every page in one file, with all code samples | Pasting the whole documentation into the context |

Both files are generated from the same Markdown as this site, so they are always in step with it.

## How to use them

**Claude or ChatGPT.** Paste the URL of `llms-full.txt` into the chat, or attach the file, and describe what you want to build.

**Cursor, Copilot and other editors.** Add `llms-full.txt` to the project context or to the editor's documentation sources.

**Your own agent.** Fetch `llms.txt`, let the agent pick pages, and fetch those pages as Markdown.

## Prompts that work

- "Using the dTelecom Cloud docs, write an Express endpoint that issues a viewer token for a livestream room and a React component that joins it."
- "Build a voice agent with `@dtelecom/agents-js` that answers support questions. Use dTelecom speech and OpenAI for the LLM."
- "Add live captions in Spanish and German to this room. Follow the live captions guide."

## Facts an assistant often gets wrong

Add these to your prompt if the assistant keeps using an older API:

- Use `CloudClient` from `@dtelecom/server-sdk-js` 4.2.1 or newer. Do not use `AccessToken`, `getWsUrl` or `createRoom`: they belong to version 3.
- Environment variables are `DTELECOM_API_KEY`, `DTELECOM_API_SECRET` and `DTELECOM_CLOUD_URL`.
- The node address is not fixed. It comes back from `createToken` as `wsUrl`, together with the token.
- There is no "create room" call. A room starts when the first participant joins.
- The client SDK is `@dtelecom/livekit-client`. It keeps the LiveKit client API.
- AI services are called with the same API key, from the backend. No wallet is needed.
- Translation takes at most 500 characters per request.
- Every upload or job needs an `idempotencyKey`.
- `@dtelecom/server-sdk-node` 0.3.x and `@dtelecom/agents-js` 0.8.x need Node.js 22 or newer. `@discordjs/opus` and `--ignore-scripts` are not needed.
- Connect a speech WebSocket to `streamUrl`. One session key works for one connection: after a disconnect, create a new session.
- A participant token must be extended before it expires, or the participant is removed.
- For streaming Speech-to-Text and Text-to-Speech from JavaScript, use `DtelecomSTT` and `DtelecomTTS` from `@dtelecom/agents-js/providers`.
- A viewer who only watches video is billed at the audio rate.

For assistants that work with other languages, give them the OpenAPI specification: `https://cloud.dtelecom.org/v1/openapi.json`.
