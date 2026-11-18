---
title: Security and data
description: What dTelecom Cloud processes, what it keeps and how access is controlled.
---

# Security and data

## What happens to your media

| Data | Where it is processed | Kept after processing |
| --- | --- | --- |
| Live audio and video in rooms | dTelecom nodes | no; media is forwarded, not recorded |
| Audio sent to streaming Speech-to-Text | dTelecom speech servers | no |
| Text sent to streaming Text-to-Speech | dTelecom speech servers | no |
| Files uploaded for transcription | dTelecom infrastructure | the uploaded file is not kept; the result is available for 24 hours |
| Images sent to Vision and Moderation | dTelecom infrastructure | the image is not kept; the result is available for 24 hours |
| Text sent to Translation | dTelecom infrastructure | the result is available for 24 hours |
| WAV files you generate | dTelecom infrastructure | 24 hours |

- Speech-to-Text, Text-to-Speech, Translation, Vision and Moderation run on dTelecom's own models and equipment. Your media is not sent to third-party AI vendors. The one exception is the LLM of a voice agent: you choose it and call it from your own agent, dTelecom does not.
- Media passes only through servers that dTelecom rents and operates itself. Audio of streaming speech sessions is not recorded.
- Your audio, video, text and images are not used to train models.
- Results of jobs and requests are private to your project and are deleted after 24 hours. You can delete transcription and WAV jobs earlier.
- dTelecom does not record rooms. If you need recordings or transcripts, capture them in your own app and store them yourself.

## What the dashboard stores

The dashboard keeps usage metadata only: session ids, room names, participant counts, durations, request counts, languages, costs and errors.

It does not store or display transcripts, the text you sent to Text-to-Speech, audio, video or images. Do not put personal data in room names, participant identities or metadata, since those do appear in usage reports.

## How long data is kept

| Data | Kept for |
| --- | --- |
| Results: transcripts, WAV files, vision and moderation answers | 24 hours |
| Uploaded files | deleted after processing |
| Session and usage metadata | 90 days |
| Logs | 60 days |
| Backups | made daily, kept for 30 days |
| Billing records | as long as the law requires |

## Where data is processed

| Part | What it handles | Where | Provider | Type |
| --- | --- | --- | --- | --- |
| Media nodes | audio, video and data of rooms | Turkey (Istanbul), India (Panvel), Brazil (Sao Paulo) | Ultahost | rented dedicated servers |
| Media nodes | audio, video and data of rooms | Russia (Saint Petersburg) | Veesp | rented dedicated servers |
| Media nodes | audio, video and data of rooms | Ireland (Dublin) | MacStadium | rented dedicated servers |
| Media nodes | audio, video and data of rooms | UAE (Dubai), Singapore, Japan (Tokyo) | i3D.net | rented dedicated servers |
| Media nodes | audio, video and data of rooms | Germany (Falkenstein), Finland (Helsinki) | Hetzner | rented dedicated servers |
| Media nodes | audio, video and data of rooms | USA (New York, Los Angeles) | dedicated.com | rented dedicated servers |
| Speech servers | streaming Speech-to-Text and Text-to-Speech, translation | Ireland (Dublin) | MacStadium | rented dedicated servers |
| AI processing | WAV, file transcription, vision, moderation | Cyprus | dTelecom | own equipment |
| Media preparation | decoding of uploaded files | USA (Ashburn) | Advanced Hosting | VPS |
| Cloud | API, dashboard, account data, session metadata, billing | USA (Ashburn) | Advanced Hosting | VPS |

A participant is placed on a media node by IP address, so pass `clientIp` to `createToken`. A project cannot be pinned to a region.

## Deleting your account

To delete your account, write to `support@dtelecom.org`. Until then the account itself (organization, users, projects, keys) is kept. Usage records are deleted after 90 days and AI results after 24 hours for everyone, whether or not an account is deleted. Billing records are kept as long as the law requires.

## Encryption

- All API calls use HTTPS. All WebSocket connections use WSS.
- Media in rooms is encrypted in transit with DTLS-SRTP between the participant and the node. The node decrypts media to forward it, so by default the encryption is not end to end.
- For media the node must not read, the client SDK supports end-to-end encryption with keys your app manages: the `e2ee` room option and `room.setE2EEEnabled()`.
- API keys are stored as hashes. Data is separated by organization.

## Credentials

| Credential | Scope | Lifetime | Contains the API secret |
| --- | --- | --- | --- |
| API key and secret | one project, full access | until revoked | yes |
| Participant token | one participant in one room | up to 24 hours, extendable | no |
| Speech session key | one connection to one speech server | the prepaid session | no |
| Moderation stream ticket | one WebSocket | 10 minutes | no |
| Room admin token | one room | 10 minutes | no |

A speech session key can be handed to a browser: it is limited to one session on one speech server, expires, and works for one connection. A second connection gets `session_key_used`.

Rules that prevent most incidents:

- Keep the API secret on your server. Never ship it in a browser, a mobile app or a public repository.
- Create one key per environment and per service. Revoke a single key without touching the rest.
- Decide a participant's role on your backend and encode it in the token's grants. Do not trust a role sent by the client.
- Use the default token lifetime, 6 hours, and extend the token for longer sessions. Expiry is a hard limit: a participant whose token was not extended is removed 60 to 90 seconds after it expires.
- Revoking an API key stops every call with it from the next request. Participant tokens already issued stay valid until they expire.
- A project can be archived: its keys are revoked and live sessions end, while usage history stays readable.

## Webhooks

Every webhook delivery is signed by the node that sent it. `WebhookReceiver` verifies that the sender is a registered dTelecom node, checks the signature and the body hash, and rejects anything else. Always verify before acting on an event. See [Webhooks](../rooms/webhooks.md).

## Content safety

[Content moderation](../ai/moderation.md) flags unsafe audio and video. dTelecom returns a verdict; your app decides what to do with it. Moderation never mutes or removes a participant by itself.

Generated speech can carry an inaudible [watermark](../ai/ssml.md#audio-watermark) that identifies it as synthetic.

## Service providers

dTelecom Cloud uses these providers for the account and billing side of the service. None of them receives your media.

| Provider | Purpose |
| --- | --- |
| Privy | sign-in to the dashboard |
| Stripe | payments and invoices |
| Resend | account and billing emails |
| Rybbit | privacy-friendly analytics of the dashboard, without session replay |

## Your responsibilities

- Tell your users when a call is transcribed, analysed by AI or moderated, and obtain consent where the law requires it.
- Store transcripts and recordings you create in line with your own retention policy.
- Report a suspected key leak to `support@dtelecom.org` and revoke the key at once.

For the contract terms, see the Terms of Service, the Privacy Policy and the Data Processing Agreement linked from the dashboard.
