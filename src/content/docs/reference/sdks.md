---
title: SDKs and packages
description: Which package to install for your backend and your app.
---

# SDKs and packages

## Backend

| Package | Use it for |
| --- | --- |
| [`@dtelecom/server-sdk-js`](https://www.npmjs.com/package/@dtelecom/server-sdk-js) 4.2.3, Node.js 18+ | Tokens, room management, webhooks and all AI services. Start here. [Reference](server-sdk.md) |
| [`dTelecom/server-sdk-go`](https://github.com/dTelecom/server-sdk-go) v1.1.2 | The same for Go, in the package `github.com/dtelecom/server-sdk-go/cloud`: tokens, extension, room management and AI services. Install with `go get github.com/dtelecom/server-sdk-go@v1.1.2`. |
| [`@dtelecom/agents-js`](https://www.npmjs.com/package/@dtelecom/agents-js) 0.8.1, Node.js 22+ | A framework for AI voice agents that join rooms. Its `DtelecomSTT` and `DtelecomTTS` are also the streaming speech clients for JavaScript. [Guide](../guides/voice-agent.md), [reference](agents-sdk.md) |
| [`@dtelecom/server-sdk-node`](https://www.npmjs.com/package/@dtelecom/server-sdk-node) 0.3.2, Node.js 22+ | A WebRTC participant for Node.js, for bots that publish and receive media. A bot can send data whether or not it publishes a track. [Guide](../guides/server-side-media.md) |

### Python and other languages

Server SDKs exist for JavaScript and Go. For other languages use the [HTTP API](http-api.md): every operation is one HTTPS request, the reference has ready examples in curl and Python, and the OpenAPI specification is at `https://cloud.dtelecom.org/v1/openapi.json`.

Room management (`roomService()`) is available through the JavaScript and Go SDKs.

For AI agents that pay with a crypto wallet instead of an API key, see [dTelecom Cloud and the x402 gateway](cloud-and-x402.md).

## Client

| Platform | Package |
| --- | --- |
| Web (JavaScript, TypeScript) | [`@dtelecom/livekit-client`](https://www.npmjs.com/package/@dtelecom/livekit-client) |
| React | [`@dtelecom/components-react`](https://www.npmjs.com/package/@dtelecom/components-react) with [`@dtelecom/components-styles`](https://www.npmjs.com/package/@dtelecom/components-styles) |
| React Native | [`@dtelecom/react-native`](https://www.npmjs.com/package/@dtelecom/react-native). Not tested with dTelecom Cloud yet; it should work. |
| Unity (WebGL) | [`@dtelecom/livekit-unity`](https://www.npmjs.com/package/@dtelecom/livekit-unity). An old package, not tested with Cloud; it needs an update. |

All client SDKs connect with the same two values from your backend: `token` and `wsUrl`. See [Connect from your app](../rooms/connect.md) and [Video conference with React](../guides/video-conference-react.md).

There are no native Swift or Kotlin SDKs, and the original LiveKit SDKs for iOS, Android and Flutter do not work with dTelecom nodes. Build mobile apps with React Native, or embed the web client in a web view.

In a page without a bundler, load `@dtelecom/livekit-client` 1.12.25 or newer with a script tag. The global is `LivekitClient`:

```html
<script src="https://unpkg.com/@dtelecom/livekit-client@1.12.26/dist/livekit-client.umd.js"></script>
<script>
  const { Room, RoomEvent } = LivekitClient;
</script>
```

## Coming from LiveKit

The client SDKs keep the LiveKit client API: `Room`, `RoomEvent`, `Track`, `room.connect(url, token)`. In most apps you change the package name in your imports and get `token` and `wsUrl` from `cloud.createToken()` instead of signing tokens yourself.

| LiveKit | dTelecom Cloud |
| --- | --- |
| `livekit-client` | `@dtelecom/livekit-client` |
| `@livekit/components-react` | `@dtelecom/components-react` |
| `AccessToken` signed on your server | `cloud.createToken()` |
| A fixed server URL | `wsUrl` returned with each token |
| `RoomServiceClient(host, key, secret)` | `cloud.roomService()` |

Differences to plan for:

- There is no `createRoom` or `listRooms`. Rooms exist from the first join.
- The node address comes with each token. Do not hard-code it.
- Egress and Ingress clients are not part of the SDK. Record with a bot (`@dtelecom/server-sdk-node` subscribes to audio and saves it) or in the client; Egress is coming soon. OBS input works over WHIP with a publish-only token from `createToken`, see [Livestreaming](../guides/livestreaming.md#broadcast-from-obs).
- A token's lifetime is a hard limit: extend it before it expires, or the participant is removed.

## Coming from server SDK 3.x

See [Migrate from 3.x](migrate-from-3x.md).

## Source code and examples

All packages are open source in the [dTelecom GitHub organization](https://github.com/dTelecom). The code of `@dtelecom/server-sdk-js` 4.x is in the `v4` branch, which is the default branch. Runnable apps are listed in [Examples](examples.md).
