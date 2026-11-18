---
title: Vision
description: Ask a question about a camera frame or a shared screen and get text back.
---

# Vision

Send an image and a question; get a short answer as text. Use it to let an agent see a participant's camera or shared screen.

**Price:** $0.001 per snapshot (1 cr).

## Ask about an image

```typescript
import fs from 'fs';
import { CloudClient } from '@dtelecom/server-sdk-js';

const cloud = new CloudClient();

const snapshot = await cloud.vision.snapshot({
  image: fs.readFileSync('frame.jpg'),
  question: 'How many people are in the room?',
  source: 'camera',
  idempotencyKey: 'room-12-frame-1001',
});

console.log(snapshot.result?.answer);
```

| Option | Description |
| --- | --- |
| `image` | A `Blob` or bytes. JPEG, PNG or WebP, up to 6 MiB and 4 million pixels. |
| `question` | Up to 4,000 characters. Without it you get a brief description. |
| `source` | `'camera'` (default) or `'screen'`. |
| `idempotencyKey` | Required. 1-128 letters, digits, `_` or `-`. |
| `webrtcSessionId` | Links the snapshot to a room participant. |

## When the answer is not ready

A request that fails is thrown by the SDK as `CloudApiError`. After 429, 502, 503 or 504 a retry with the same `idempotencyKey` runs the request again; a 4xx refusal is returned again for the same key.

If `status` is `'running'`, call `snapshot` again with the same key, or poll:

```typescript
import { CloudClient } from '@dtelecom/server-sdk-js';

const cloud = new CloudClient();

async function wait(requestId: string) {
  let r = await cloud.vision.get(requestId);
  while (r.status === 'running') {
    await new Promise((res) => setTimeout(res, 500));
    r = await cloud.vision.get(requestId);
  }
  return r.result?.answer;
}
```

## Result

| Field | Description |
| --- | --- |
| `result.answer` | The answer as text. |
| `result.outputTokenLimitReached` | `true` if the answer was cut at the length limit. |
| `result.usage.completedSnapshots` | Snapshots billed. |
| `chargedMicrocredits` | Charge for this request. |

## Tips

- Answers are short by design, about a sentence or two. Ask specific questions: "Is a document visible on the screen?" works better than "Describe everything".
- To get structured output, ask for it: "Answer with JSON: {\"people\": number}".
- Capture frames in your client and send them through your backend. Sample on events or every few seconds, not every frame.
- Downscale large frames before sending. Images over 4 million pixels are rejected.
- Results are kept for 24 hours.
