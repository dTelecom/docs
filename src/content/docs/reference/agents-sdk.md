---
title: Agents SDK reference
description: VoiceAgent, providers and plugin interfaces of @dtelecom/agents-js.
---

# Agents SDK reference

Package: `@dtelecom/agents-js` 0.8.1. Node.js 22 or newer. Peer dependencies: `@dtelecom/server-sdk-node` 0.3.0 or newer, `@dtelecom/server-sdk-js` 4.1.0 or newer. For a walkthrough see [Build a voice agent](../guides/voice-agent.md).

```shell
npm install @dtelecom/agents-js @dtelecom/server-sdk-js @dtelecom/server-sdk-node
```

## VoiceAgent

```typescript
import { VoiceAgent } from '@dtelecom/agents-js';
import type { LLMPlugin, STTPlugin, TTSPlugin } from '@dtelecom/agents-js';

function build(stt: STTPlugin, llm: LLMPlugin, tts: TTSPlugin) {
  return new VoiceAgent({ stt, llm, tts, instructions: 'Be helpful and concise.' });
}
```

### Constructor options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `stt` | `STTPlugin` | required | Speech-to-Text provider. |
| `llm` | `LLMPlugin` | required | Language model provider. |
| `tts` | `TTSPlugin` | none | Text-to-Speech provider. Text-only when omitted. |
| `instructions` | string | required | System prompt. |
| `respondMode` | `'always'` or `'addressed'` | `'always'` | When to answer. |
| `agentName` | string | `'assistant'` | Name for `'addressed'` mode. |
| `nameVariants` | string[] | `[]` | Extra names the agent answers to. |
| `onDataMessage` | function | none | `(payload, participantIdentity, topic)` for data messages. |
| `tools` | `ToolDefinition[]` | none | Function definitions for LLM tool calling. |
| `memory` | `{ enabled, dbPath?, scope? }` | none | Persistent memory across sessions, see [Memory](#memory). |
| `maxContextTokens` | number | 5000 | Context size before older turns are summarised. |

### Methods

| Method | Description |
| --- | --- |
| `start({ room, identity?, name?, cloud, ttl? })` | Joins the room and starts listening. The agent creates its own token and extends it by `ttl` before it expires: 10 minutes before, or at half of the lifetime for short tokens. A failed extension is retried every 15 seconds and reported as an `error` event. `ttl` defaults to 6 hours, 24 at most. Instead of `cloud` you can pass `apiKey` and `apiSecret`, or a ready `token` and `wsUrl`. |
| `stop()` | Leaves the room and closes speech sessions. The agent also stops by itself when the last other participant leaves. |
| `say(text)` | Speaks text without calling the LLM. Can be interrupted. |
| `saySSML(ssml, displayText)` | Speaks one SSML document. |
| `setSTTLanguage(language, { forceWhisper? })` | Changes the recognition language on all active streams. |
| `running` | `true` while the agent is in a room. |
| `room` | The underlying `Room` from `@dtelecom/server-sdk-node`. |

### Events

| Event | Payload |
| --- | --- |
| `connected` | - |
| `disconnected` | reason: `agent_stopped` after `stop()`, or the reason from the node: `participant_removed`, `duplicate_identity`, `room_deleted`, `server_shutdown`, `server_initiated` |
| `transcription` | `{ text, isFinal, speaker, utteranceId? }` |
| `transcription_partial` | `{ text, utteranceId, revision, windowStartSeconds, speaker }` |
| `partial_end` | `{ utteranceId, reason, speaker }` |
| `stt_ready` | `{ clientId?, language?, smartTurn?, speaker }` |
| `response` | string |
| `sentence` | `text, raw`: one sentence has been played |
| `toolCall` | `{ id, name, arguments }`: the LLM called a tool; `arguments` is a JSON string |
| `agentState` | `'idle'` \| `'listening'` \| `'thinking'` \| `'speaking'` |
| `error` | `Error`: provider and pipeline errors, and a failed token extension |

## Providers

Import from `@dtelecom/agents-js/providers`.

### DtelecomSTT

| Option | Default | Description |
| --- | --- | --- |
| `cloud` | - | `CloudClient`. Each stream gets its own Speech-to-Text session. |
| `language` | `'auto'` | Language code, or `'auto'` to detect. |
| `forceWhisper` | `false` | Always use Whisper. |
| `partials` | off | Provisional transcripts. |
| `smartTurn` | off | Semantic end-of-turn detection. |
| `cloudSession` | `{ minutes: 10, extendWhenMinutesLeft: 2 }` | Reservation size and when to extend. |

A session key works for one connection. After a disconnect the provider opens a new session, with a pause of 1 to 30 seconds, and keeps up to 5 seconds of audio meanwhile. Call `setWebRTCSessionId(sessionId)` to link sessions to a room participant; `VoiceAgent` does it for you.

### DtelecomTTS

| Option | Default | Description |
| --- | --- | --- |
| `cloud` | - | `CloudClient`. Opens and extends one Text-to-Speech session. |
| `voices` | required | Voice per language: `{ en: { voice: 'af_heart', langCode: 'a' } }`. |
| `defaultLanguage` | the first language in `voices` | Language for untagged text. |
| `speed` | 1.0 | Speaking rate. |
| `watermark` | `false` | Audio watermark. |
| `cloudSession` | `{ characters: 2000, extendWhenCharactersLeft: 500 }` | Reservation size and when to extend. |

After a disconnect the provider opens a new session on the next text. Methods: `synthesize(text, signal?)` and `synthesizeSSML(ssml, signal?)` yield PCM16 mono 48 kHz buffers; `warmup()` connects in advance; `close()` ends the session.

Both providers work outside a voice agent, as plain streaming clients for [Speech-to-Text](../ai/speech-to-text.md) and [Text-to-Speech](../ai/text-to-speech.md).

With the x402 gateway instead of Cloud, pass `serverUrl` and `sessionKey`, and `getSessionKey` to supply a new key after a disconnect.

### LLM providers

| Class | Options |
| --- | --- |
| `OpenAILLM` | `apiKey`, `model`, `maxTokens` (512), `temperature` (0.7), `responseFormat` |
| `OpenRouterLLM` | `apiKey`, `model`, `maxTokens`, `temperature`, `reasoningEffort`, `providerRouting` |

### Third-party speech providers

`DeepgramSTT`, `DeepgramTTS` and `CartesiaTTS` are included for teams that already use those services. They need their own API keys and are billed by those vendors.

## Plugin interfaces

Implement these to connect any model or service.

```typescript
import type { LLMChatOptions, LLMChunk, Message } from '@dtelecom/agents-js';

interface MyLLM {
  chat(messages: Message[], signal?: AbortSignal, options?: LLMChatOptions): AsyncGenerator<LLMChunk>;
  warmup?(systemPrompt: string): Promise<void>;
}

interface MyTTS {
  synthesize(text: string, signal?: AbortSignal): AsyncGenerator<Buffer>;
  warmup?(): Promise<void>;
}
```

- `LLMPlugin.chat` yields the answer as it is generated. Honour `signal`: it fires when the user interrupts. The third parameter, `options`, carries `{ tools, plainText }`: this is how your own LLM receives the tool definitions.
- `TTSPlugin.synthesize` yields PCM16 mono 48 kHz audio.
- `STTPlugin.createStream` returns a stream with `sendAudio(pcm16)`, a `transcription` event and `close()`. Extend `BaseSTTStream` to get the event plumbing.

## Tool calling

Pass OpenAI-style function definitions in `tools`. The agent does not run functions. When the LLM calls a tool, the agent emits a `toolCall` event with `{ id, name, arguments }`, and your app runs the function. To answer the user, call `agent.say(text)`: the text is added to the conversation context. A tool result cannot be fed back into the same LLM turn.

```typescript
import type { ToolDefinition } from '@dtelecom/agents-js';

const tools: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'get_order_status',
      description: 'Look up the status of an order by its number.',
      parameters: {
        type: 'object',
        properties: { orderNumber: { type: 'string' } },
        required: ['orderNumber'],
      },
    },
  },
];
```

Handle the call:

```typescript
import type { VoiceAgent } from '@dtelecom/agents-js';

declare function getOrderStatus(orderNumber: string): Promise<string>;

function handleTools(agent: VoiceAgent) {
  agent.on('toolCall', async (call) => {
    if (call.name !== 'get_order_status') return;
    const { orderNumber } = JSON.parse(call.arguments);
    const status = await getOrderStatus(orderNumber);
    await agent.say(`Your order ${orderNumber} is ${status}.`);
  });
}
```

## Memory

`memory: { enabled: true }` keeps what the agent learned between sessions. At the end of a session the LLM writes a short summary of the conversation.

- The database is a local file, `./data/memory.db` by default (`dbPath`). Create the folder yourself.
- It needs three more packages: `better-sqlite3`, `sqlite-vec` and `@huggingface/transformers`. Embeddings are computed in the agent's process.

## Logging

```typescript
import { setLogLevel } from '@dtelecom/agents-js';

setLogLevel('info');
```

At `info` level the agent logs the latency of each phase of a turn. See [Latency tips](../guides/latency.md).
