---
title: Build a voice agent
description: An AI agent that joins a room, listens, thinks with your LLM and answers by voice.
---

# Build a voice agent

A voice agent is a room participant that runs on your server. It hears the other participants, sends their speech to Speech-to-Text, passes the text to an LLM and speaks the answer through Text-to-Speech.

`@dtelecom/agents-js` runs this whole pipeline for you:

![The participant speaks (1). The agent sends the audio to Speech-to-Text and gets a transcript (2), passes the text to your LLM (3), sends the answer sentence by sentence to Text-to-Speech (4) and publishes the audio back to the room (5). Speech-to-Text and Text-to-Speech run on dTelecom; the LLM is your own provider.](../assets/diagrams/voice-agent.svg)

The agent starts speaking the first sentence while the LLM is still writing the rest. That keeps the time to first audio low.

## What you need

- A dTelecom Cloud API key. See the [Quickstart](../quickstart.md).
- An API key for an LLM. This guide uses OpenAI; any OpenAI-compatible model works through OpenRouter.
- Node.js 22 or newer.

## 1. Install

```shell
npm install @dtelecom/agents-js @dtelecom/server-sdk-js @dtelecom/server-sdk-node
npm pkg set type=module
```

There is nothing native to build. The second command makes the project an ES module, which the example needs for its top-level `await`. As an alternative, name the file `agent.mts`.

This guide uses `@dtelecom/agents-js` 0.8.1 and `@dtelecom/server-sdk-node` 0.3.2.

```shell
export DTELECOM_API_KEY="dtk_live_..."
export DTELECOM_API_SECRET="..."
export DTELECOM_CLOUD_URL="https://cloud.dtelecom.org"
export OPENAI_API_KEY="sk-..."
```

## 2. Write the agent

Create `agent.ts`:

```typescript
import { CloudClient } from '@dtelecom/server-sdk-js';
import { VoiceAgent } from '@dtelecom/agents-js';
import { DtelecomSTT, DtelecomTTS, OpenAILLM } from '@dtelecom/agents-js/providers';

const cloud = new CloudClient(); // reads the DTELECOM_* variables

const agent = new VoiceAgent({
  stt: new DtelecomSTT({ cloud, language: 'en', partials: true, smartTurn: true }),
  llm: new OpenAILLM({ apiKey: process.env.OPENAI_API_KEY!, model: 'gpt-4o-mini', maxTokens: 200 }),
  tts: new DtelecomTTS({ cloud, voices: { en: { voice: 'af_heart', langCode: 'a' } } }),
  instructions: 'You are a friendly support assistant. Answer in one or two short sentences.',
});

agent.on('connected', () => console.log('agent joined the room'));
agent.on('transcription', ({ text, isFinal, speaker }) => {
  if (isFinal) console.log(`[${speaker}] ${text}`);
});
agent.on('response', (text) => console.log(`[agent] ${text}`));
agent.on('error', (err) => console.error(err));

await agent.start({ room: 'voice-demo', identity: 'assistant', name: 'Assistant', cloud });
await agent.say('Hi! How can I help you today?');

process.on('SIGINT', async () => {
  await agent.stop();
  process.exit(0);
});
```

```shell
npx tsx agent.ts
```

One `CloudClient` is shared by the agent and both speech providers. The agent gets its own room token; the providers open their speech sessions, link them to the agent's room session and extend them before they run out.

The agent also extends its own room token: 10 minutes before it expires, or at half of its lifetime for short tokens. So it stays in the room until you call `stop()`. A failed extension is retried every 15 seconds and reported as an `error` event.

## 3. Talk to it

A person joins the same room with a token from your backend, exactly as in the [Quickstart](../quickstart.md):

```typescript
import { CloudClient } from '@dtelecom/server-sdk-js';

const cloud = new CloudClient();

const { token, wsUrl } = await cloud.createToken({ room: 'voice-demo', identity: 'user-42' });
```

Open the Quickstart page with the room name `voice-demo`, click **Join room** and speak. The agent answers by voice.

## How it behaves

| Situation | What the agent does |
| --- | --- |
| The user finishes a sentence | Speech-to-Text sends a final transcript; the LLM turn starts. |
| The user interrupts the agent | The agent stops speaking at once (barge-in) and listens. |
| Several people are in the room | With `respondMode: 'always'` it answers everyone. With `'addressed'` it answers only when called by name. |
| The LLM is slow | Nothing is spoken until the first sentence is ready; partial transcripts keep the UI alive. |
| A speech connection drops | A session key works for one connection, so the provider opens a new session by itself. Speech-to-Text retries after 1 to 30 seconds and keeps up to 5 seconds of audio meanwhile. |
| The last other participant leaves | The agent stops by itself. |

## Configuration

| Option | Default | Description |
| --- | --- | --- |
| `stt` | required | Speech-to-Text provider. |
| `llm` | required | Language model provider. |
| `tts` | none | Text-to-Speech provider. Without it the agent answers in text only. |
| `instructions` | required | System prompt for the LLM. |
| `respondMode` | `'always'` | `'always'` for 1:1 calls, `'addressed'` for group rooms. |
| `agentName` | `'assistant'` | Name the agent responds to in `'addressed'` mode. |
| `nameVariants` | `[]` | Other names it responds to, such as `['bot', 'ai']`. |
| `onDataMessage` | none | Called for data messages from participants. |
| `tools` | none | Function definitions for LLM tool calling. |
| `maxContextTokens` | 5000 | Conversation length before older turns are summarised. |

### Start options

| Option | Description |
| --- | --- |
| `room` | Room to join. |
| `identity`, `name` | How the agent appears to others. |
| `cloud` | The `CloudClient`. The agent creates its own token. |
| `ttl` | Lifetime of each token the agent gets. Default 6 hours, at most 24. The agent extends its token before it expires, so it stays in the room until `stop()`. |

## Events

| Event | Payload | Use it for |
| --- | --- | --- |
| `connected` | - | The agent is in the room. |
| `transcription` | `{ text, isFinal, speaker }` | Logs and transcripts. Only finals start an LLM turn. |
| `transcription_partial` | `{ text, utteranceId, revision, speaker }` | Live text while the user is speaking. Replace the previous partial, do not append. |
| `partial_end` | `{ utteranceId, reason, speaker }` | Clear the provisional text. |
| `response` | `string` | The agent's full answer as text. |
| `sentence` | `text, raw` | One sentence has been played. |
| `toolCall` | `{ id, name, arguments }` | The LLM called a tool. `arguments` is a JSON string. Your app runs the function. |
| `agentState` | `'idle'`, `'listening'`, `'thinking'` or `'speaking'` | Show what the agent is doing. A turn goes listening, thinking, speaking, idle. |
| `stt_ready` | `{ clientId, language, smartTurn, speaker }` | A participant's speech stream is open. `smartTurn` is `active` or `acoustic_fallback`. |
| `error` | `Error` | Provider and pipeline errors, including `insufficient_balance` and a failed token extension. |
| `disconnected` | reason | The agent left the room: `agent_stopped` after `stop()`, or the reason from the node, such as `participant_removed` or `room_deleted`. |

## Turn detection

Two independent options on `DtelecomSTT` decide how natural the conversation feels:

- **`partials: true`** sends provisional text while the user is still speaking. Use it to show live captions and to let the agent notice an interruption sooner.
- **`smartTurn: true`** lets the service judge whether the speaker has finished a thought, instead of waiting for a fixed pause. It supports 23 languages; for others it falls back to silence detection. See [Languages and voices](../ai/languages-and-voices.md).

Both are off unless you turn them on.

## Greetings and announcements

`agent.say(text)` speaks without calling the LLM. Use it for a greeting or a notice. The user can interrupt it like any other speech.

For pauses and pronunciation control, send SSML:

```typescript
import type { VoiceAgent } from '@dtelecom/agents-js';

async function greet(agent: VoiceAgent) {
  await agent.saySSML(
    '<speak>Hello.<break time="400ms"/>Welcome back.</speak>',
    'Hello. Welcome back.', // plain text for the transcript and the LLM context
  );
}
```

See [SSML](../ai/ssml.md).

## Other languages and voices

`voices` maps a language to a voice. The agent uses the entry for the language of each reply.

```typescript
import { CloudClient } from '@dtelecom/server-sdk-js';
import { DtelecomSTT, DtelecomTTS } from '@dtelecom/agents-js/providers';

const cloud = new CloudClient();

const stt = new DtelecomSTT({ cloud, language: 'auto' }); // detect the spoken language
const tts = new DtelecomTTS({
  cloud,
  defaultLanguage: 'en',
  voices: {
    en: { voice: 'af_heart', langCode: 'a' },
    es: { voice: 'ef_dora', langCode: 'e' },
    fr: { voice: 'ff_siwis', langCode: 'f' },
  },
});
```

The full list is in [Languages and voices](../ai/languages-and-voices.md).

## Use another LLM

```typescript
import { OpenRouterLLM } from '@dtelecom/agents-js/providers';

const llm = new OpenRouterLLM({
  apiKey: process.env.OPENROUTER_API_KEY!,
  model: 'openai/gpt-4o',
  maxTokens: 200,
});
```

To connect a model the package has no provider for, implement `LLMPlugin`: one `chat(messages, signal)` method that yields tokens. You pay the LLM provider directly. dTelecom adds no markup and no charge for the LLM step.

Third-party speech providers (Deepgram, Cartesia) are also included, if you want to mix them with dTelecom rooms.

## Speech sessions and cost

The providers manage prepaid speech sessions for you:

| | What is opened | Reservation | Extended when |
| --- | --- | --- | --- |
| Speech-to-Text | one session per participant the agent hears | 10 minutes | fewer than 2 minutes remain |
| Text-to-Speech | one session for the agent's voice | 2,000 characters | fewer than 500 characters remain |

You pay for what is used, not for the reservation. Change the sizes with `cloudSession` on either provider.

**Typical cost of a 1:1 voice call**, per minute:

| Item | Usage per minute | Cost |
| --- | --- | --- |
| Room audio, 2 participants | 2 participant-minutes | $0.0002 |
| Speech-to-Text | 1 connected minute | $0.004 |
| Text-to-Speech | about 367 characters | $0.0022 |
| **Total without the LLM** | | **about $0.0064** |

## Run it in production

- **One process per conversation is not required.** One Node.js process can run several agents; start a new `VoiceAgent` per room.
- **Start the agent from the endpoint that issues the user's token.** Joining a room from a server takes a few seconds. If you wait for the `participant_joined` [webhook](../rooms/webhooks.md), the user spends those seconds in an empty room.
- **Stop it if the user never arrives.** The agent stops by itself when the last other participant leaves. An agent that nobody joined keeps extending its token and stays in the room, and that is billed. Call `agent.stop()` after a timeout.
- **Handle `error`.** A refused speech session and a failed token extension, for example on `insufficient_balance`, arrive as `error` events.
- **Host it yourself.** The agent process runs on your infrastructure. It needs a long-lived Node.js 22 process with outbound UDP, or TCP as a fallback, for the whole conversation. Serverless functions do not fit.
- **One Speech-to-Text session per participant.** In a room of 10 people the agent opens 10 sessions.

## Next

- [Server-side media](server-side-media.md): build your own pipeline without the framework.
- [Latency tips](latency.md): make the agent feel instant.
- [Agents SDK reference](../reference/agents-sdk.md).
