---
title: SSML and speech controls
description: Pauses, pronunciation, speed and volume in Text-to-Speech.
---

# SSML and speech controls

Plain text is enough for most speech. Use SSML when you need a pause in a specific place, a word pronounced a certain way, or a change of speed, volume, language or voice inside one utterance.

dTelecom supports a defined subset of SSML, named `dtelecom-ssml-v1`. You send one complete document at a time.

## Where it works

| Surface | How |
| --- | --- |
| WAV files | `cloud.wav.create({ text, inputFormat: 'ssml', ... })` |
| Streaming | a text message with `"input_format": "ssml"` |
| Voice agents | `agent.saySSML(ssml, displayText)`, `@dtelecom/agents-js`, Node.js 22+ |

```typescript
import { CloudClient } from '@dtelecom/server-sdk-js';

const cloud = new CloudClient();

const job = await cloud.wav.create({
  text: '<speak>Your code is <say-as interpret-as="characters">A7K2</say-as>.<break time="500ms"/>It expires in ten minutes.</speak>',
  inputFormat: 'ssml',
  voice: 'af_heart',
  idempotencyKey: 'otp-prompt-v1',
});
```

## Supported tags

| Tag | Attributes | What it does |
| --- | --- | --- |
| `<speak>` | - | Root element. Required. |
| `<p>`, `<s>` | - | Paragraph and sentence boundaries. |
| `<break>` | `time`, for example `400ms` or `2s` | A pause. Up to 5 seconds each, 30 seconds in total per document. |
| `<sub>` | `alias` | Speak the alias instead of the written text. |
| `<say-as>` | `interpret-as="characters"` | Spell out letter by letter. English and Arabic only. |
| `<prosody>` | `rate` as a percentage, for example `85%`; `volume` in decibels, for example `-3dB` | Speaking rate and volume. |
| `<lang>` | `xml:lang` | Switch language for the enclosed text. |
| `<voice>` | `name` | Switch voice for the enclosed text. |

### Examples

A pause:

```xml
<speak>Thanks for waiting.<break time="600ms"/>I found your order.</speak>
```

An abbreviation read in full:

```xml
<speak>Your <sub alias="estimated time of arrival">ETA</sub> is 3 pm.</speak>
```

Slower and quieter:

```xml
<speak><prosody rate="85%" volume="-3dB">Please listen carefully.</prosody></speak>
```

Two languages in one utterance:

```xml
<speak>The word for thank you is <lang xml:lang="es">gracias</lang>.</speak>
```

## Pronunciation dictionary

For names and terms that come up often, pass a dictionary instead of wrapping every occurrence in `<sub>`. It maps a language code to written forms and their spoken forms. Use the plain language code, `en`: a regional code such as `en-US` is rejected. The dictionary applies to SSML input only.

```typescript
import { CloudClient } from '@dtelecom/server-sdk-js';

const cloud = new CloudClient();

const job = await cloud.wav.create({
  text: '<speak>Welcome to dTelecom. Your SLA report is ready.</speak>',
  inputFormat: 'ssml',
  dictionary: {
    en: {
      dTelecom: 'dee telecom',
      SLA: 'service level agreement',
    },
  },
  idempotencyKey: 'welcome-sla-v1',
});
```

## Limits

| Limit | Value |
| --- | --- |
| Document size, source and expanded | 64 KiB |
| Rendered audio per document | 60 seconds |
| Nesting depth | 16 |
| Elements per document | 2,048 |
| Single `<break>` | 5 seconds |
| All explicit breaks in a document | 30 seconds |
| Effective speed | 0.75-1.5 |
| Volume | -12 dB to +6 dB |

Breaks are rounded to 20 ms.

## Rules to know

- **One engine per document.** You can change language and voice inside a document, but only among the voices of one engine. See [Languages and voices](languages-and-voices.md).
- **Complete documents only.** Streaming a document piece by piece is not supported.
- **Not supported:** pitch, `<emphasis>`, marks and word timings, external audio, full SSML conformance.
- **`<prosody>` takes numbers with units only.** `rate="85%"` and `volume="-3dB"` work. Named values such as `rate="slow"` or `volume="soft"` and bare numbers such as `rate="0.85"` are rejected.
- **A document that breaks a rule is rejected as a whole.** Nothing is synthesised and nothing is charged. A WAV job fails with status 422 and the code `backend_rejected`; the body names the problem in `detail`, for example `{"code":"UNSUPPORTED_TAG","message":"Unsupported element: emphasis","position":13}`. In a streaming session the same information arrives as an `error` message on the socket, not as a status.
- **`<prosody>` ranges.** `rate` is a percentage and the resulting speed stays within 75% to 150%. `volume` is plus or minus N dB and the result stays within -12 dB to +6 dB.
- **`<say-as>`** supports `interpret-as="characters"` only, for English and Arabic.
- **Billing counts what is spoken.** A `<sub>` alias is billed by the alias text. Tags themselves are free. There is no extra charge for SSML.

Handle a refused document in code:

```typescript
import { CloudApiError, CloudClient } from '@dtelecom/server-sdk-js';

const cloud = new CloudClient();

async function render(ssml: string, key: string) {
  try {
    return await cloud.wav.create({ text: ssml, inputFormat: 'ssml', idempotencyKey: key });
  } catch (e) {
    if (e instanceof CloudApiError && e.code === 'backend_rejected') {
      console.log(e.detail); // { code, message, position }
    }
    throw e;
  }
}
```

`CloudApiError.detail` needs `@dtelecom/server-sdk-js` 4.2.1 or newer.

## Speed without SSML

In plain-text mode, set `speed` on the WAV job or in the streaming config.

| Engine | Range | Default |
| --- | --- | --- |
| Kokoro | 0.5-2.0 | 1.0 |
| Supertonic | 0.75-1.5 | 1.0 |

## Audio watermark

You can mark generated speech with an inaudible watermark so that it can later be identified as synthetic.

- Off by default. Turn it on with `watermark: true` on a WAV job, in the streaming config, or on `DtelecomTTS`.
- No extra charge.
- It is a common service mark, not a signature of your account and not cryptographic proof.
- Very short clips, and audio that was later re-encoded or edited, may not remain detectable.

```typescript
import { CloudClient } from '@dtelecom/server-sdk-js';

const cloud = new CloudClient();

const job = await cloud.wav.create({
  text: 'This message was generated by an AI assistant.',
  watermark: true,
  idempotencyKey: 'disclosure-v1',
});
```

When the job completes, `job.result.watermark` confirms whether the file was marked.
