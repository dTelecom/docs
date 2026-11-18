---
title: Latency tips
description: Practical ways to make calls and voice agents feel instant.
---

# Latency tips

Most of the delay people notice comes from a few choices in your own code. This page lists them in the order they usually matter.

## For every room

**Send the participant's IP.** Pass `clientIp` to [`createToken`](../rooms/tokens.md) so the participant is placed on a nearby node. Behind a load balancer, use the forwarded client address, not the address of your own server.

**Create the token just before joining.** The node is chosen when the token is created. A token created minutes earlier, or on a different network, may point to a node that is no longer the best one. A token also takes a concurrent participant slot from the moment it is issued and holds it until it expires, even if nobody connects with it.

**Turn on `adaptiveStream` and `dynacast`.** Participants then send and receive only the video layers that are actually displayed. Less data means less congestion on weak connections.

**Join from a user gesture.** Browsers delay audio playback until the user interacts with the page. Start the call from a click or tap.

**Measure, do not guess.** The `participant_left` [webhook](../rooms/webhooks.md) carries `rttMs`, the participant's round-trip time to the node. The dashboard shows the average under **Overview**.

## For voice agents

A voice agent's response time is the sum of four steps. Shorten each one.

| Step | What decides it | What to do |
| --- | --- | --- |
| End of speech detected | turn detection | Turn on `smartTurn`. It ends the turn when the thought is complete instead of waiting for a long pause. |
| Transcript ready | Speech-to-Text | Send audio in 20-100 ms chunks as it arrives. Do not buffer seconds of audio. |
| First words from the LLM | your LLM provider | Pick a fast model, keep the prompt short, cap `maxTokens`, stream the response. |
| First audio | Text-to-Speech | Send text sentence by sentence. Do not wait for the full answer. |

`@dtelecom/agents-js` already does the right thing for chunking, streaming and sentence splitting. If you build your own pipeline, copy that behaviour.

### More gains

- **Start the agent early.** Joining a room from a server takes a few seconds. Start the agent when your backend issues the user's token, not on the `participant_joined` webhook.
- **Keep the agent close to its LLM.** Run the agent process in the same region as your LLM provider. The network hop to the LLM is paid on every turn.
- **Warm up.** Open the speech sessions and the LLM connection when the agent joins, not on the first user sentence. The agent framework does this at start.
- **Show partial transcripts.** With `partials: true` the user sees their words appear while speaking. The wait feels shorter even when it is not.
- **Let users interrupt.** Barge-in stops the agent as soon as the user speaks. A long answer that cannot be interrupted feels slower than it is.
- **Keep answers short.** Instruct the LLM to answer in one or two sentences. Spoken answers that take 20 seconds feel slow regardless of the response time.
- **Reuse connections.** One Text-to-Speech session per agent, kept open for the whole call, avoids a handshake per sentence.

### Read the agent's own numbers

The agent framework logs each phase of a turn:

| Log field | Meaning |
| --- | --- |
| `STT` | Server-side transcription time. |
| `Queue` | Final transcript received to the start of the response cycle. |
| `Prepare` | Warm-up, summary and memory lookup. |
| `LLM` | Request to the first complete sentence, including time to first token (`TTFT`). |
| `TTS` | First sentence to first audio. |
| `Overall` | The sum of the phases above, without the wait for the end of speech. |

If `LLM` dominates, change the model or the prompt. If `TTS` dominates, check that you are sending sentences rather than whole answers.

## For live captions

- Use `partials: true` and replace the caption in place as revisions arrive.
- Translate only final transcripts.
- Send captions as `RELIABLE` data messages: they are small, and a lost caption is worse than a late one.

## Audio formats

Resampling in the wrong place adds delay and hurts recognition.

| Direction | Format |
| --- | --- |
| To Speech-to-Text and audio moderation | PCM16 LE, mono, 16 kHz |
| From Text-to-Speech | PCM16 LE, mono, 48 kHz |

`@dtelecom/server-sdk-node` gives you room audio at 16 kHz directly: ask for it with `createStream(16000, 1)`. Publish Text-to-Speech audio with a 48 kHz `AudioSource` and skip resampling altogether.
