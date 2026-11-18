---
title: Quickstart
description: From a new API key to a live room and your first speech AI call.
---

# Quickstart

In this guide you will:

1. Create an API key.
2. Run a small backend that issues participant tokens.
3. Join a room from two browser tabs.
4. Make your first AI call.

You need Node.js 22 or newer. The whole thing costs a fraction of a cent and fits in the Free plan.

## 1. Create an API key

1. Sign in to the [dTelecom Cloud dashboard](https://cloud.dtelecom.org).
2. Open **API keys** and click **Create a key**.
3. Copy the key and the secret. The secret is shown once.

## 2. Set up the project

```shell
mkdir dtelecom-quickstart && cd dtelecom-quickstart
npm init -y
npm install @dtelecom/server-sdk-js @dtelecom/livekit-client express
```

Put your credentials in the environment. The SDK reads these variables by default.

```shell
export DTELECOM_API_KEY="dtk_live_..."
export DTELECOM_API_SECRET="..."
export DTELECOM_CLOUD_URL="https://cloud.dtelecom.org"
```

> Keep the secret on the server. Never ship it in a browser or a mobile app.

## 3. Issue participant tokens

Create `server.js`. It serves one page and one endpoint that returns a token for a room.

```javascript
const path = require('path');
const express = require('express');
const { CloudClient } = require('@dtelecom/server-sdk-js');

const cloud = new CloudClient(); // reads DTELECOM_API_KEY, DTELECOM_API_SECRET, DTELECOM_CLOUD_URL
const app = express();

app.use(express.static(__dirname));
// serve the browser build of the client SDK
app.use('/sdk', express.static(path.join(__dirname, 'node_modules/@dtelecom/livekit-client/dist')));

app.get('/token', async (req, res) => {
  try {
    const { token, wsUrl } = await cloud.createToken({
      room: 'quickstart',
      identity: `user-${Math.floor(Math.random() * 10000)}`,
    });
    res.json({ token, wsUrl });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.code || err.message });
  }
});

app.listen(3000, () => console.log('Open http://localhost:3000'));
```

`createToken` checks your balance and limits, picks a node for the participant and returns two values the client needs: `token` and `wsUrl`. The room is created when the first participant joins.

Every token takes one of your plan's concurrent participant slots from the moment it is issued until the participant leaves or the token expires. The Free plan has 10. A token lasts 6 hours by default, and that is the lifetime we recommend. A token that nobody uses holds its slot until it expires, so issue tokens right before joining.

## 4. Join the room from the browser

Create `index.html` next to `server.js`.

```html
<!DOCTYPE html>
<html>
  <body>
    <button id="join">Join room</button>
    <div id="videos"></div>

    <script type="module">
      import { Room, RoomEvent, Track } from '/sdk/livekit-client.esm.mjs';

      document.getElementById('join').onclick = async () => {
        const { token, wsUrl } = await (await fetch('/token')).json();

        const room = new Room({ adaptiveStream: true, dynacast: true });

        // show other participants' audio and video
        room.on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
            document.getElementById('videos').appendChild(track.attach());
          }
        });

        await room.connect(wsUrl, token);
        await room.localParticipant.enableCameraAndMicrophone();
      };
    </script>
  </body>
</html>
```

Run it:

```shell
node server.js
```

Open `http://localhost:3000` in two tabs and click **Join room** in each. You should see and hear yourself across the tabs. In the dashboard, the room appears under **Sessions** as live.

## 5. Make your first AI call

The same `CloudClient` calls the AI services. Create `ai.js`:

```javascript
const fs = require('fs');
const { CloudClient } = require('@dtelecom/server-sdk-js');

const cloud = new CloudClient();

async function main() {
  // Translate a sentence
  const translation = await cloud.translate({
    q: 'Hello from dTelecom Cloud',
    target: 'es',
    idempotencyKey: 'quickstart-translate-1',
  });
  // a long request can come back as 'running': poll until it is completed
  let done = translation;
  while (done.status === 'running') {
    await new Promise((r) => setTimeout(r, 1000));
    done = await cloud.getTranslation(done.id);
  }
  console.log(done.result?.translatedText);

  // Turn text into a WAV file
  let job = await cloud.wav.create({
    text: 'Hello from dTelecom Cloud',
    idempotencyKey: 'quickstart-wav-1',
  });
  while (!['completed', 'failed', 'cancelled'].includes(job.status)) {
    await new Promise((r) => setTimeout(r, 1000));
    job = await cloud.wav.get(job.id);
  }
  if (job.status !== 'completed') {
    throw new Error(`WAV job ${job.status}: ${job.error}`);
  }
  const audio = await cloud.wav.download(job.id);
  fs.writeFileSync('hello.wav', Buffer.from(await audio.arrayBuffer()));
  console.log('Saved hello.wav');
}

main().catch((err) => console.error(err.status, err.code || err.message));
```

```shell
node ai.js
```

Both calls show up in the dashboard under **AI services** within a minute.

## What you just used

| Step | API | Billed as |
| --- | --- | --- |
| Token for a participant | `cloud.createToken()` | free |
| Two tabs in a room | client SDK | participant-minutes, per second |
| Translation | `cloud.translate()` | per character |
| WAV file | `cloud.wav.create()` | per character |

## Next steps

- [Build a voice agent](guides/voice-agent.md): add an AI participant that talks.
- [Tokens and permissions](rooms/tokens.md): viewers, hosts, token lifetime.
- [Connect from your app](rooms/connect.md): web, React and React Native.
- [AI services overview](ai/overview.md): pick the right service and call pattern.
- [HTTP API reference](reference/http-api.md): the same calls from Python or curl.
- [Errors](platform/errors.md): what to retry and how.
- [FAQ and troubleshooting](platform/faq.md).
