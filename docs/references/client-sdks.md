---
title: Client SDKs
---

Client SDKs are used to add audio/video functionality to your apps. dTelecom provides official client SDKs for JavaScript and React.

## Installation

```bash
# Vanilla JS/TS — connect to rooms, manage tracks
npm install @dtelecom/livekit-client

# React components — pre-built UI for video conferencing
npm install @dtelecom/components-react @dtelecom/components-styles
```

## Packages

| Package | npm | Description |
| :------ | :-- | :---------- |
| `@dtelecom/livekit-client` | [npm](https://www.npmjs.com/package/@dtelecom/livekit-client) | Core client SDK: `Room`, `RoomEvent`, `Track`, `LocalParticipant`, `RemoteParticipant` |
| `@dtelecom/components-react` | [npm](https://www.npmjs.com/package/@dtelecom/components-react) | React components: `LiveKitRoom`, `VideoConference`, `GridLayout`, `ParticipantTile`, `ControlBar` |
| `@dtelecom/components-styles` | [npm](https://www.npmjs.com/package/@dtelecom/components-styles) | Default CSS styles for the React components |

## LiveKit API compatibility

dTelecom client SDKs are API-compatible forks of LiveKit's client SDKs. Component names like `LiveKitRoom` are kept intentionally to make migration easy. If you have an existing LiveKit app, you only need to:

1. Change the npm package (`livekit-client` → `@dtelecom/livekit-client`)
2. Replace the hardcoded server URL with the dynamic `wsUrl` from `getWsUrl()`

## Source code

| Platform | Repo | Links |
| :------- | :--- | :---- |
| Web (JS/TS) | [client-sdk-js](https://github.com/dTelecom/client-sdk-js) | [npm](https://www.npmjs.com/package/@dtelecom/livekit-client) |
| React | [components-react](https://github.com/dTelecom/components-js) | [npm](https://www.npmjs.com/package/@dtelecom/components-react) |

## LLM-friendly docs

For AI/LLM consumption, see [llms-full.txt](/llms-full.txt) which contains all documentation and a complete conference app example in a single file.
