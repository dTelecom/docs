---
title: Languages and voices
description: What each speech and translation service supports, in one place.
---

# Languages and voices

## Speech-to-Text

Two recognition engines serve streaming Speech-to-Text. You do not have to pick one: the service routes each stream.

| Engine | Coverage | Used when |
| --- | --- | --- |
| Parakeet | 25 languages, detects the spoken language itself | preferred whenever the language is in its set |
| Whisper | about 100 languages | the language is outside Parakeet's set, or you ask for it |

Parakeet languages: `en` `ru` `bg` `hr` `cs` `da` `nl` `et` `fi` `fr` `de` `el` `hu` `it` `lv` `lt` `mt` `pl` `pt` `ro` `sk` `sl` `es` `sv` `uk`.

### Choosing the language

| `language` | Behaviour |
| --- | --- |
| `auto` | Recognise in the language spoken. Best for multilingual rooms. Transcripts carry `language: "auto"`, not the detected code: if you need the code in the result, set the language explicitly. |
| a code such as `en`, `es`, `ja` | Route the stream for that language. |

To force Whisper, add `"model": "whisper"` to the config message, or `forceWhisper: true` on `DtelecomSTT` from `@dtelecom/agents-js/providers` (Node.js 22+). Do this when a speaker mixes languages or uses a language Parakeet handles poorly.

You can change the language of an open stream by sending a new config message; buffers are cleared.

### Whisper language tiers

Accuracy varies by language. Coverage is not a uniform accuracy guarantee.

| Tier | Languages |
| --- | --- |
| High-resource | `en` `es` `fr` `de` `it` `pt` `zh` `ja` `ko` `nl` |
| Medium-resource | `ru` `pl` `cs` `tr` `ar` `hi` `sv` `id` `vi` `uk` `ro` `hu` `fi` `da` `no` `el` `he` `th` `bg` `hr` `sk` `ca` `sl` `lt` `lv` `et` `sr` `ms` `gl` `eu` |
| Long-tail | 60+ more, for example `af` `sq` `am` `hy` `az` `bn` |

### Smart turn detection

`smart_turn` (semantic end-of-turn detection) supports 23 languages:

`ar` `bn` `zh` `da` `nl` `de` `en` `fi` `fr` `hi` `id` `it` `ja` `ko` `mr` `no` `pl` `pt` `ru` `es` `tr` `uk` `vi`

For other languages the stream falls back to silence detection. The `ready` message tells you which one is active: `smart_turn: "active"` or `"acoustic_fallback"`.

### File transcription

File transcription uses Whisper. Pass the language code explicitly; the default is `en`.

## Text-to-Speech

Two engines cover 32 languages. The voice you choose selects the engine.

| Engine | Voices | Languages | Speed range |
| --- | --- | --- | --- |
| Kokoro | 54 named voices | 8 | 0.5-2.0 |
| Supertonic | 10 styles: `F1`-`F5`, `M1`-`M5` | 31 | 0.75-1.5 |

### Kokoro voices

The default voice is `af_heart`. In streaming, pass the voice together with its language code as `lang_code`.

| `lang_code` | Language | Voices |
| --- | --- | --- |
| `a` | American English | `af_alloy` `af_aoede` `af_bella` `af_heart` `af_jessica` `af_kore` `af_nicole` `af_nova` `af_river` `af_sarah` `af_sky` `am_adam` `am_echo` `am_eric` `am_fenrir` `am_liam` `am_michael` `am_onyx` `am_puck` `am_santa` |
| `b` | British English | `bf_alice` `bf_emma` `bf_isabella` `bf_lily` `bm_daniel` `bm_fable` `bm_george` `bm_lewis` |
| `e` | Spanish | `ef_dora` `em_alex` `em_santa` |
| `f` | French | `ff_siwis` |
| `h` | Hindi | `hf_alpha` `hf_beta` `hm_omega` `hm_psi` |
| `i` | Italian | `if_sara` `im_nicola` |
| `j` | Japanese | `jf_alpha` `jf_gongitsune` `jf_nezumi` `jf_tebukuro` `jm_kumo` |
| `p` | Portuguese (Brazil) | `pf_dora` `pm_alex` `pm_santa` |
| `z` | Mandarin | `zf_xiaobei` `zf_xiaoni` `zf_xiaoxiao` `zf_xiaoyi` `zm_yunjian` `zm_yunxi` `zm_yunxia` `zm_yunyang` |

In a voice name the first letter is the language and the second is `f` for a female or `m` for a male voice.

### Supertonic voices

Ten styles, `F1` to `F5` and `M1` to `M5`, each available in every Supertonic language. Pass the style as `voice` and the language as an ordinary code:

```json
{ "text": "Hola, ¿en qué puedo ayudarte?", "voice": "F1", "language": "es", "model": "supertonic" }
```

`model` is optional: a voice named `F1`-`F5` or `M1`-`M5` selects Supertonic by itself.

To get the list a server offers right now, send `{"type":"capabilities"}` on an open Text-to-Speech stream. The answer lists engines, voices, languages and the audio format.

Languages: `ar` `bg` `hr` `cs` `da` `nl` `en` `et` `fi` `fr` `de` `el` `hi` `hu` `id` `it` `ja` `ko` `lv` `lt` `pl` `pt` `ro` `ru` `sk` `sl` `es` `sv` `tr` `uk` `vi`

Supertonic does not cover Mandarin; use a Kokoro `z` voice.

### Which engine to pick

| You need | Use |
| --- | --- |
| English with the widest choice of voices | Kokoro |
| Mandarin or Japanese | Kokoro |
| German, Russian, Arabic, Polish and other languages Kokoro lacks | Supertonic |
| One voice that speaks many languages | Supertonic |

One request, and one SSML document, stays within one engine.

## Translation

45 language codes:

`ar` `bg` `bn` `cs` `da` `de` `el` `en` `es` `et` `fa` `fr` `gu` `he` `hi` `hu` `id` `it` `ja` `kk` `km` `ko` `lt` `lv` `mr` `ms` `my` `nl` `pl` `pt` `ro` `ru` `sk` `sv` `ta` `te` `th` `tl` `tr` `uk` `ur` `vi` `yue` `zh` `zh-Hant`

Aliases: `fil` is accepted for `tl`, `zh-hant` for `zh-Hant`.

### Language pairs

Not every pair is served directly. Two translation models share the work, and a pair must be covered by one of them. There is no automatic detour through English.

Pairs between these two groups are rejected, in both directions:

- `bn` `fa` `gu` `he` `kk` `km` `mr` `my` `ta` `te` `tl` `yue` `zh-Hant`
- `bg` `da` `el` `es` `et` `hu` `ja` `lt` `lv` `nl` `ro` `sk` `sv`

That is 338 of the 1,980 directed pairs. Every other pair is served.

- Pairs with English on one side always work.
- Simplified Chinese (`zh`), Traditional Chinese (`zh-Hant`) and Cantonese (`yue`) are separate codes.
- A pair that is not served fails with 422 and is not charged. To translate between two languages that have no direct pair, translate to English first and then to the target.

## Moderation

Audio moderation takes a `language` code and defaults to `en`.
