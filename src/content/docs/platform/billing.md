---
title: Billing and credits
description: One balance for everything, per-second billing, the same rates on every plan.
---

# Billing and credits

Everything in dTelecom Cloud is paid from one credit balance. Prices are shown in dollars first, with credits in brackets.

**1 credit = $0.001.**

## Rates

Rates are the same on every plan. Plans differ by included usage, limits and top-up discount.

### Rooms

| Media | Unit | Price |
| --- | --- | --- |
| No video published: audio only, or only watching | participant-minute | $0.0001 (0.1 cr) |
| Publishing video up to 1080p | participant-minute | $0.001 (1 cr) |
| Publishing 2K video | participant-minute | $0.002 (2 cr) |
| Publishing 4K video | participant-minute | $0.004 (4 cr) |
| Data messages | message | free |

### AI services

| Service | Unit | Price |
| --- | --- | --- |
| Speech-to-Text, streaming | minute | $0.004 (4 cr) |
| Speech-to-Text, files | minute of file | $0.002 (2 cr) |
| Text-to-Speech | 1,000 characters | $0.006 (6 cr) |
| Translation | 1,000 characters | $0.005 (5 cr) |
| Vision | snapshot | $0.001 (1 cr) |
| Moderation, audio | minute | $0.004 (4 cr) |
| Moderation, video | frame | $0.0005 (0.5 cr) |

The current rate table is also in the dashboard under **Billing**.

## How usage is measured

- **Per second, no minimum.** A 37-second call is billed as 37 seconds.
- **Rooms** are billed per connected participant, from the moment the node registers the join to the moment it registers the leave, in whole seconds. That includes connection setup and the time the node takes to notice a disconnect, so a session is billed a few seconds longer than the call felt.
- **Video** is billed only for video a participant publishes. Each second goes at the highest tier the participant publishes in that second, by the short side: up to 1080 is HD, up to 1440 is 2K, above is 4K. Screen sharing counts as video. Someone who only watches pays the audio rate.
- **Expired tokens.** A participant whose token expired and was not extended is removed 60 to 90 seconds after expiry. Billing runs until the actual removal.
- **Streaming Speech-to-Text** is billed for the time the stream is connected.
- **Text-to-Speech and Translation** are billed per character.
- **Prepaid sessions** (streaming speech) charge only what was used. The rest of the reservation is released when the session ends. If a speech session ended without a usage report, the whole reservation is charged when it expires.
- **Failed and rejected requests** are not charged.

### Worked examples

| Scenario | Usage | Cost |
| --- | --- | --- |
| 1:1 audio call, 10 minutes | 20 participant-minutes of audio | $0.002 |
| 4-person video call, 30 minutes, all four publishing video up to 1080p | 120 participant-minutes of video | $0.12 |
| Voice agent call, 5 minutes: audio room for 2, streaming STT, 3,000 characters of TTS | 10 audio minutes + 5 STT minutes + 3,000 characters | $0.001 + $0.02 + $0.018 = $0.039 |
| Transcribing a 1-hour recording | 60 file minutes | $0.12 |

## Two kinds of credits

| | Included credits | Purchased credits |
| --- | --- | --- |
| Come from | your plan, every cycle | top-ups |
| Spent | first | after included credits run out |
| Expire | at the end of the cycle | never |

## Plans

| | Free | Starter | Growth | Scale | Enterprise |
| --- | --- | --- | --- | --- | --- |
| Price per month | $0 | $49 | $199 | $499 | by agreement |
| Included usage per month | $10 (10,000 cr) | $60 (60,000 cr) | $250 (250,000 cr) | $700 (700,000 cr) | by agreement |
| Concurrent participants | 100 | 1,000 | 2,500 | 5,000 | by agreement |
| Requests per second | 5 | 20 | 50 | 100 | by agreement |
| Top-up discount | 0% | 5% | 10% | 15% | 25% |
| Card required | no | yes | yes | yes | - |

Annual billing costs 10 monthly payments for 12 months. On annual plans the included credits are still granted and expire month by month. Purchased credits are kept through any plan change, including a move to Free. Plans and limits apply to the whole organization and are shared by its projects. For custom limits, contract terms or bank transfer, contact `enterprise@dtelecom.org`.

## Top-ups

Buy extra credits any time in the dashboard under **Billing**, from $10 to $10,000 at a time. On paid plans a top-up discount gives you more credits per dollar; the rates themselves stay the same. The discount comes as extra credits: $10 on Starter buys $10.53 of credits.

**Auto top-up** (paid plans) recharges the balance when it drops below a threshold you set, up to a monthly maximum you choose. The threshold is $10 to $200, the amount $10 to $10,000, and the monthly maximum $10 to $20,000 and not less than the amount.

## When the balance reaches $0

New sessions and requests are rejected with `insufficient_balance` (402) until you top up. The same refusal comes earlier, when the free balance is smaller than the reservation of a new token or session; a token reserves its `ttl` at the audio rate. Running sessions are not cut off. With an active bandwidth add-on, rooms keep working at $0. Turn on auto top-up, or set a balance alert in **Settings**, to avoid an interruption.

## Bandwidth add-on

For steady, high WebRTC traffic you can reserve bandwidth for a fixed monthly price instead of paying per minute. Available on paid plans.

| Add-on | Reserved bandwidth | Price per month |
| --- | --- | --- |
| Basic | 250 Mbps | $400 |
| Plus | 1 Gbps | $1,540 |
| Max | 2.5 Gbps | $3,600 |

While an add-on is active, WebRTC is not billed per minute. Charging for traffic above the reserved bandwidth will come in the next release. AI services are always billed from credits.

## Track your spend

- **Overview** shows the balance and spend for the current cycle.
- **Sessions** shows the cost of every room session.
- **AI services** shows usage and spend per service and per API key.
- Translation, Vision and Moderation responses carry the charge of the request: `chargedMicrocredits` in the SDK, `charged_microcredits` over HTTP, a decimal string. 1,000 microcredits = 1 credit, 1,000,000 microcredits = $1. Transcription, WAV, rooms and speech sessions have no such field: see their cost in the dashboard.

Payments are processed by Stripe. Invoices are in the dashboard under **Billing**.
