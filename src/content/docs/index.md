---
title: dTelecom Cloud
description: Real-time voice, video and speech AI behind one API key and one bill.
---

# dTelecom Cloud

dTelecom Cloud gives your app real-time rooms and speech AI through one API. You create a project, get an API key, and call everything from your backend. All usage draws from one credit balance.

## Get started

<div class="cards c3">
<a class="card" href="quickstart.md"><span class="card-preview"><code><i>// your backend</i>
<b>const</b> { token, wsUrl } =
  <b>await</b> cloud.createToken({
    room: <u>'quickstart'</u>,
    identity: <u>'user-42'</u>,
  });</code></span><strong>Quickstart</strong><span class="card-text">From a new API key to two browser tabs talking in a room, in 5 minutes.</span></a>
<a class="card" href="guides/voice-agent.md"><span class="card-preview"><code><b>const</b> agent = <b>new</b> VoiceAgent({
  stt, <i>// dTelecom speech</i>
  llm, <i>// your model</i>
  tts, <i>// dTelecom voice</i>
  instructions: <u>'Be concise.'</u>,
});</code></span><strong>Build a voice agent</strong><span class="card-text">An agent that listens, thinks with your LLM and answers by voice.</span></a>
<a class="card" href="reference/llm-resources.md"><span class="card-preview"><code>&gt; add live captions to my room
<i>&#9679; read llms-full.txt</i>
<i>&#9679; read guides/live-captions</i>
&#9998; wrote captions-bot.ts</code></span><strong>Use the docs with AI</strong><span class="card-text">Give Claude, ChatGPT or Cursor the whole documentation in one file.</span></a>
</div>
<div class="cards c2">
<a class="card" href="concepts/how-it-works.md"><span class="ic" data-ic="flow"></span><strong>How dTelecom Cloud works</strong><span class="card-text">Keys, tokens, nodes and sessions in one diagram.</span></a>
<a class="card" href="reference/server-sdk.md"><span class="ic" data-ic="doc"></span><strong>Server SDK reference</strong><span class="card-text">Every method of the server SDK and its HTTP equivalent.</span></a>
</div>

## What you can build

<div class="cards c4">
<a class="card" href="guides/video-conference-react.md"><span class="ic" data-ic="video"></span><strong>Video conference</strong><span class="card-text">A meeting app with ready React components.</span></a>
<a class="card" href="guides/livestreaming.md"><span class="ic" data-ic="broadcast"></span><strong>Livestreaming</strong><span class="card-text">One host, up to 1,000 viewers, chat, OBS input.</span></a>
<a class="card" href="guides/live-captions.md"><span class="ic" data-ic="captions"></span><strong>Live captions</strong><span class="card-text">Captions and translated captions for any room.</span></a>
<a class="card" href="guides/server-side-media.md"><span class="ic" data-ic="bot"></span><strong>Server-side bots</strong><span class="card-text">Bots that listen, speak and send data in a room.</span></a>
</div>

## Services and prices

Pay per second of actual use, from one balance. The Free plan includes $10 of usage every month.

<div class="cards c4">
<a class="card" href="rooms/overview.md"><span class="ic" data-ic="room"></span><strong>Rooms</strong><span class="card-text">Voice and video calls over WebRTC.</span><span class="price">$0.0001 / min audio</span></a>
<a class="card" href="ai/speech-to-text.md"><span class="ic" data-ic="mic"></span><strong>Speech-to-Text</strong><span class="card-text">Live transcripts from an audio stream.</span><span class="price">$0.004 / min</span></a>
<a class="card" href="ai/transcription.md"><span class="ic" data-ic="file"></span><strong>File transcription</strong><span class="card-text">Recordings to text with speaker labels.</span><span class="price">$0.002 / min</span></a>
<a class="card" href="ai/text-to-speech.md"><span class="ic" data-ic="speaker"></span><strong>Text-to-Speech</strong><span class="card-text">Streaming speech and WAV files, 32 languages.</span><span class="price">$0.006 / 1K chars</span></a>
<a class="card" href="ai/translation.md"><span class="ic" data-ic="translate"></span><strong>Translation</strong><span class="card-text">Chat and captions in 45 languages.</span><span class="price">$0.005 / 1K chars</span></a>
<a class="card" href="ai/vision.md"><span class="ic" data-ic="eye"></span><strong>Vision</strong><span class="card-text">Questions about a camera frame or a screen.</span><span class="price">$0.001 / snapshot</span></a>
<a class="card" href="ai/moderation.md"><span class="ic" data-ic="shield"></span><strong>Moderation</strong><span class="card-text">Safety checks on voice and video.</span><span class="price">$0.004 / min audio</span></a>
<a class="card" href="platform/billing.md"><span class="ic" data-ic="card"></span><strong>Billing and plans</strong><span class="card-text">All rates, plans, credits and top-ups.</span><span class="price">Free plan, no card</span></a>
</div>

## SDKs

<div class="sdks">
<div><span class="sdk-group">Server SDKs</span>
<a href="reference/server-sdk.md"><span class="ic" data-ic="js"></span>JavaScript and TypeScript</a>
<a href="reference/sdks.md"><span class="ic" data-ic="go"></span>Go</a>
<a href="reference/http-api.md"><span class="ic" data-ic="http"></span>HTTP API for other languages</a></div>
<div><span class="sdk-group">Agents and bots</span>
<a href="reference/agents-sdk.md"><span class="ic" data-ic="spark"></span>Agents SDK</a>
<a href="guides/server-side-media.md"><span class="ic" data-ic="bot"></span>Node.js media SDK</a></div>
<div><span class="sdk-group">Client SDKs</span>
<a href="rooms/connect.md"><span class="ic" data-ic="web"></span>Web</a>
<a href="guides/video-conference-react.md"><span class="ic" data-ic="react"></span>React components</a>
<a href="reference/sdks.md"><span class="ic" data-ic="phone"></span>React Native</a></div>
</div>

## Run in production

<div class="cards c4">
<a class="card" href="platform/limits.md"><span class="ic" data-ic="gauge"></span><strong>Limits</strong><span class="card-text">Plan limits and the limits of every service.</span></a>
<a class="card" href="platform/errors.md"><span class="ic" data-ic="alert"></span><strong>Errors</strong><span class="card-text">Every error code and what to retry.</span></a>
<a class="card" href="platform/security.md"><span class="ic" data-ic="lock"></span><strong>Security and data</strong><span class="card-text">What is stored, where and for how long.</span></a>
<a class="card" href="platform/faq.md"><span class="ic" data-ic="help"></span><strong>FAQ</strong><span class="card-text">Answers to the questions developers ask first.</span></a>
</div>
