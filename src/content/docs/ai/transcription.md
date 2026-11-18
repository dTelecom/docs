---
title: File transcription
description: Transcribe audio and video files with speaker labels and timestamps.
---

# File transcription

Upload a recording and get the text, timestamped segments and speaker labels.

**Price:** $0.002 per minute of the file (2 cr). Speaker labels are included.

## Transcribe a file

```typescript
import fs from 'fs';
import { CloudClient } from '@dtelecom/server-sdk-js';

const cloud = new CloudClient();

async function transcribe(path: string) {
  let job = await cloud.transcriptions.create({
    file: await fs.promises.readFile(path),
    filename: 'call.mp3',
    language: 'en',
    idempotencyKey: 'call-2026-11-10',
  });

  while (!['completed', 'failed', 'cancelled'].includes(job.status)) {
    await new Promise((r) => setTimeout(r, 2000));
    job = await cloud.transcriptions.get(job.id);
  }

  if (job.status !== 'completed') throw new Error(job.error ?? job.status);

  console.log(job.result?.text);
  for (const s of job.result?.segments ?? []) {
    console.log(`[${s.start.toFixed(1)}-${s.end.toFixed(1)}] ${s.speaker ?? '-'}: ${s.text}`);
  }
}

transcribe('call.mp3');
```

## Options

| Option | Description |
| --- | --- |
| `file` | A `Blob` or bytes such as a Node `Buffer`. Up to 256 MiB and 2 hours. |
| `idempotencyKey` | Required. 1-128 printable ASCII characters. Reuse it to retry the same upload. The key is tied to the file: the same key with another file fails with 409 `idempotency_conflict`. |
| `filename` | Helps detect the container format. |
| `language` | Language code such as `en`. The default is `en`. Automatic detection is not available for files: `auto` is rejected with 400 `upload_rejected`, so set the language yourself. |
| `diarize` | Speaker labels. On by default; pass `false` to turn off. |

Supported formats: WAV, FLAC, MP3, MP4 and MOV, Matroska and WebM, Ogg, AAC. For video files the first audio stream is used.

## Job statuses

| Status | Meaning |
| --- | --- |
| `uploading`, `queued`, `running` | In progress. Keep polling. |
| `completed` | `result` is ready. |
| `failed` | `error` says why. |
| `cancelled`, `deleted` | You cancelled or deleted the job. |

## Result

```typescript
import type { TranscriptionResult } from '@dtelecom/server-sdk-js';

function summary(result: TranscriptionResult) {
  result.text; // full transcript
  result.language; // language code
  result.segments; // [{ start, end, speaker, text }], times in seconds
  result.speakerSegments; // [{ start, end, speaker }], speaker is 'speaker_1', 'speaker_2', ...
  result.speakerLabels; // a note about the labels, not a list
  result.media.durationSeconds; // length of the audio
}
```

## Cancel or delete

```typescript
import { CloudClient } from '@dtelecom/server-sdk-js';

const cloud = new CloudClient();

await cloud.transcriptions.delete('job-id');
```

Cancels a job that has not finished, or deletes a finished result. A finished job keeps its charge.

## Good to know

- Billing is per minute of the decoded audio, rounded up to the next second, once per file.
- Speaker labels are anonymous and local to the file: `speaker_1`, `speaker_2` and so on. They are not matched across files.
- With `diarize: false` the `speaker` of every segment is `null`.
- `create` answers with status 202 and a job in `running` state. The result appears when `status` becomes `completed`.
- Results are kept for 24 hours. Save what you need.
- A failed upload is not retried by the SDK. After a temporary failure (429, 502, 503, 504) and after any `failed` job except `upload_rejected` and `preparation_rejected`, call `create` again with the same `idempotencyKey`. After those two the same key returns the same refusal: fix the file and use a new key.
- Overlapping voices are not separated.
- The uploaded file is deleted after processing. Only the result is kept, for 24 hours.
- Limits: up to 2 hours and 256 MiB per file. Formats: wav, flac, mp3, mp4, m4a, mov, mkv, webm, ogg, aac. The file must contain audio.
- A changed file or changed options need a new key.
