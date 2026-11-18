---
title: Translation
description: Translate chat messages and captions between languages.
---

# Translation

Translate short texts such as chat messages, captions and transcript segments.

**Price:** $0.005 per 1,000 characters (5 cr), billed per character of the source text.

## Translate a text

```typescript
import { CloudClient } from '@dtelecom/server-sdk-js';

const cloud = new CloudClient();

const r = await cloud.translate({
  q: 'Where is the nearest station?',
  target: 'es',
  idempotencyKey: 'msg-8841-es',
});

console.log(r.result?.translatedText); // ¿Dónde está la estación más cercana?
console.log(r.result?.detectedLanguage?.language); // en
```

| Option | Description |
| --- | --- |
| `q` | Text to translate, up to 500 characters per request. |
| `target` | Target language code. |
| `source` | Source language code. Detected automatically when omitted. |
| `idempotencyKey` | Required. 1-128 letters, digits, `_` or `-`. |

## Longer texts

One request takes up to 500 characters, counted as Unicode code points. Split longer text at sentence boundaries and send the parts one by one, each with its own key.

```typescript
import { CloudClient } from '@dtelecom/server-sdk-js';

const cloud = new CloudClient();

function split(text: string, max = 500): string[] {
  const parts: string[] = [];
  let current = '';
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if (current && [...(current + ' ' + sentence)].length > max) {
      parts.push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current) parts.push(current);
  return parts;
}

async function translateLong(id: string, text: string, target: string) {
  const out: string[] = [];
  const parts = split(text);
  for (let i = 0; i < parts.length; i++) {
    const r = await cloud.translate({ q: parts[i], target, idempotencyKey: `${id}-${target}-${i}` });
    out.push(r.result?.translatedText ?? '');
  }
  return out.join(' ');
}
```

A request over the limit fails with 422 and is not charged.

## When the answer is not ready

Most requests complete in one call. If `status` is `'running'`, call `translate` again with the same key, or poll:

```typescript
import { CloudClient } from '@dtelecom/server-sdk-js';

const cloud = new CloudClient();

async function wait(requestId: string) {
  let r = await cloud.getTranslation(requestId);
  while (r.status === 'running') {
    await new Promise((res) => setTimeout(res, 500));
    r = await cloud.getTranslation(requestId);
  }
  return r;
}
```

Reading a stored result does not charge again. Results are kept for 24 hours.

## Languages

45 language codes are supported, including `en`, `es`, `fr`, `de`, `it`, `pt`, `ru`, `uk`, `pl`, `tr`, `ar`, `hi`, `ja`, `ko`, `zh`, `zh-Hant` and `yue`. The full list and the rules for language pairs are in [Languages and voices](languages-and-voices.md#translation).

Not every pair is served directly, and there is no automatic detour through English. A pair or a language that is not served fails with 422 and is not charged. The SDK throws `CloudApiError` with `code: 'inference_rejected'`, `status: 422` and the `id` of the request; the HTTP body carries `status: "failed"`, `error: "inference_rejected"` and `charged_microcredits: "0"`. The same key returns the same refusal.

A pair is served when one model covers both sides. Pairs between these two groups are rejected, in both directions:

- `bn` `fa` `gu` `he` `kk` `km` `mr` `my` `ta` `te` `tl` `yue` `zh-Hant`
- `bg` `da` `el` `es` `et` `hu` `ja` `lt` `lv` `nl` `ro` `sk` `sv`

That is 338 of the 1,980 directed pairs. Every other pair is served, for example `en`-`de`, `ru`-`en`, `de`-`fr`, `es`-`ja`, `uk`-`pl`, `en`-`zh-Hant` and `en`-`yue`. For a rejected pair, translate to English first and then to the target.

## Errors you will meet

| Status | `code` | Cause |
| --- | --- | --- |
| 400 | `invalid_idempotency_key` | The key is missing or has characters outside letters, digits, `_` and `-`. Over HTTP only: the SDK rejects a malformed key with a plain `Error` before it sends the request. |
| 409 | `idempotency_conflict` | The key was already used with a different text or language. |
| 422 | `invalid_fields` | The text is longer than 500 characters. |
| 422 | `inference_rejected` | The language or the pair is not served. |
| 422 | `translation_truncated` | The translation was cut off. |
| 429, 502, 503, 504 | varies | Temporary failure. A retry with the same key runs the request again. |

## Result

| Field | Description |
| --- | --- |
| `result.translatedText` | The translation. |
| `result.source`, `result.target` | Language codes used. With automatic detection `source` is `"auto"`. |
| `result.detectedLanguage` | `{ language, confidence }` when the source was detected. The detected code is `result.detectedLanguage.language`. |
| `result.usage.characters` | Characters billed. |
| `chargedMicrocredits` | Charge for this request. |
