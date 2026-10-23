---
title: Gateway communication and AI services
sidebar_label: AI services and x402
---

The [x402 gateway](https://x402.dtelecom.org/) provides one prepaid wallet-authenticated API for communication and AI workloads. Buy credits, then sign requests; inference endpoints spend credits rather than issuing a separate x402 payment challenge for every inference.

| Service | USD rate | Billing unit |
|---|---:|---|
| WebRTC | $0.001 | audio participant minute |
| Streaming STT | $0.004 | connected STT session minute |
| Streaming TTS | $0.006 | 1,000 spoken Unicode code points |
| File transcription + diarization | $0.003 | decoded minute, rounded once to started seconds |
| Text/SSML to WAV | $0.006 | 1,000 expanded spoken Unicode code points |
| Translation | $5 | million input Unicode code points |
| Vision | $0.002 | completed snapshot |
| Audio moderation | $0.004 | submitted audio minute |
| Image/frame moderation | $0.0005 | completed frame |

Minimum credit purchase is $0.10. Two audio participants, one STT session and 500 TTS characters/minute cost $0.009/minute excluding the LLM. This is a usage example, not a flat bundle price. WebRTC bandwidth subscriptions are separate. [Live pricing](https://x402.dtelecom.org/v1/pricing) is authoritative.

## Pick the integration

- **Live voice agents:** [agents-js](https://github.com/dTelecom/agents-js) with gateway tokens. Parakeet Ultra/Whisper STT takes 16 kHz mono PCM16; Kokoro/Supertonic TTS produces 48 kHz mono PCM16. Partials update temporary chat text; finals start LLM turns. Smart Turn independently judges pauses; check active/fallback readiness and supply continuous silence during Opus DTX (server-sdk-node 0.2.6+).
- **Speech controls:** complete-document SSML supports pauses, aliases/dictionaries, rate/volume and language/voice changes within one engine. Maximum rendered SSML document is 60 seconds. AudioSeal watermark is explicitly opt-in and off by default; check availability/activation. No price multiplier applies to these controls. See [speech contracts](https://x402.dtelecom.org/docs.md#streaming-speech-controls).
- **Translation:** TranslateGemma 4B + Hy-MT2 1.8B, 45 language/script entries, 500 code points per request. A pair must share an enabled model; no automatic pivot. Chinese zh, zh-Hant and yue are explicit routes. See [routing](https://x402.dtelecom.org/docs.md#expanded-translation-routes).
- **File transcription:** upload up to 256 MiB/two hours; resident Whisper plus optional anonymous file-local speaker labels. Explicit language defaults to en; auto is unsupported. Private isolated decoding precedes inference. Live partials/Smart Turn do not apply.
- **WAV jobs:** submit text or SSML, voice/language/speed and optional dictionary/watermark. Up to 64 KiB JSON and 10,000 source/expanded characters. Mono 48 kHz PCM16 output; 30-minute outer bound and separate 60-second SSML bound. Poll before private download.
- **Vision:** static JPEG/PNG/WebP up to 6 MiB/4 million pixels, optional question up to 4,000 code points, bounded 96-token answer. Not room observation or full-video/PDF processing.
- **Moderation:** raw PCM16 mono 16 kHz audio chunks up to 30 seconds, or images/frames with the same image limits. HTTP and ticket-authenticated WebSocket (one in-flight item). Combined policy verdicts, uncalibrated native scores. Clients own capture, frame sampling and actions; errors are not a pass.

## Jobs, retries and ownership

Use [x402-client](https://github.com/dTelecom/x402-client) for sessions, translation, uploaded inference and WAV/file jobs. The SDK does not automatically fund, retry or poll. Reuse idempotency keys after uncertain responses. File transcription returns the original job without comparing another upload; new media/options need a new key. WAV and other inference reject changed input under the same key.

Results and WAV artifacts are wallet-private and retained for 24 hours. Bounded capacity can return 429; respect Retry-After. Completed work is charged once; deleting results does not refund it. Cancelled/failed batch work releases its reservation; cancellation can race with completion. Failed/cancelled file jobs can retain status-only tombstones after media removal.

The gateway [server-status endpoint](https://x402.dtelecom.org/v1/servers/status) is a session-server registry, not full model health. File capacity means preparation slots, not simultaneous model jobs; vision/moderation do not appear there.

See the [complete API reference](https://x402.dtelecom.org/docs.md) and [OpenAPI specification](https://x402.dtelecom.org/openapi.json) for exact request fields, multipart uploads, errors and WebSocket messages. The legacy x402stt clients/MCP and AgentKit session actions have narrower contracts; do not assume every gateway feature is exposed by every SDK.
