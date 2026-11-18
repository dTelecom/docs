---
title: Video conference with React
description: A complete call UI in a few lines with the React components.
---

# Video conference with React

`@dtelecom/components-react` gives you a ready call interface: participant grid, control bar, screen share and chat. You can ship it as is or build your own layout from the smaller components and hooks.

The component names keep their LiveKit names, such as `LiveKitRoom`, so existing LiveKit React code moves over with a package rename.

## Install

```shell
npm install @dtelecom/components-react @dtelecom/components-styles @dtelecom/livekit-client
```

## The whole call in one component

```tsx
import '@dtelecom/components-styles';
import { LiveKitRoom, VideoConference } from '@dtelecom/components-react';

export function Call({ token, wsUrl, onLeave }: { token: string; wsUrl: string; onLeave: () => void }) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={wsUrl}
      connect={true}
      audio={true}
      video={true}
      onDisconnected={onLeave}
      data-lk-theme="default"
      style={{ height: '100vh' }}
    >
      <VideoConference />
    </LiveKitRoom>
  );
}
```

`token` and `wsUrl` come from your backend's [`createToken`](../rooms/tokens.md). Fetch them before you render the component.

A token lasts 6 hours by default. For longer calls your backend extends it with [`extendToken`](../rooms/tokens.md#extend-a-session) before it expires; the name and metadata are kept. A participant whose token expired is removed about a minute later, and `onDisconnected` fires.

## Fetch the token

```tsx
import { useEffect, useState } from 'react';

export function useSession(room: string, user: string) {
  const [session, setSession] = useState<{ token: string; wsUrl: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/token?room=${encodeURIComponent(room)}&user=${encodeURIComponent(user)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setSession(data);
      });
    return () => {
      cancelled = true;
    };
  }, [room, user]);

  return session;
}
```

Every token takes a concurrent participant slot from the moment it is issued, and an unused token holds the slot until it expires. In development React StrictMode runs `useEffect` twice, so this hook issues two tokens. Abort the extra request, or fetch the token on a user action such as a **Join** button.

## Build your own layout

Use the smaller pieces when the default UI does not fit.

```tsx
import '@dtelecom/components-styles';
import {
  ControlBar,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
} from '@dtelecom/components-react';
import { Track } from '@dtelecom/livekit-client';

function Stage() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  return (
    <GridLayout tracks={tracks} style={{ height: 'calc(100vh - 80px)' }}>
      <ParticipantTile />
    </GridLayout>
  );
}

export function CustomCall({ token, wsUrl }: { token: string; wsUrl: string }) {
  return (
    <LiveKitRoom token={token} serverUrl={wsUrl} connect={true} audio={true} video={true} data-lk-theme="default">
      <Stage />
      <RoomAudioRenderer />
      <ControlBar />
    </LiveKitRoom>
  );
}
```

`RoomAudioRenderer` plays everyone's audio. Without it, or without `VideoConference`, the call is silent.

## Chat

```tsx
import { Chat, LiveKitRoom } from '@dtelecom/components-react';

export function CallWithChat({ token, wsUrl }: { token: string; wsUrl: string }) {
  return (
    <LiveKitRoom token={token} serverUrl={wsUrl} connect={true} data-lk-theme="default">
      <Chat />
    </LiveKitRoom>
  );
}
```

The participant's token needs `canPublishData`, which is on by default. For a custom chat UI use the `useChat` hook; see [Data messages and chat](../rooms/data.md).

## Handle device errors

```tsx
import { LiveKitRoom, VideoConference } from '@dtelecom/components-react';

export function SafeCall({ token, wsUrl }: { token: string; wsUrl: string }) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={wsUrl}
      connect={true}
      audio={true}
      video={true}
      onError={(err) => console.error('room error', err)}
      onMediaDeviceFailure={(failure) => console.error('camera or microphone unavailable', failure)}
    >
      <VideoConference />
    </LiveKitRoom>
  );
}
```

## Next.js notes

- Components that use the room must be client components: put `'use client'` at the top of the file.
- Create tokens in a route handler or a server action, never in a client component. The API secret must stay on the server.

## Example apps

- [dtelecom-meet](https://github.com/dTelecom/dtelecom-meet): a Google Meet style app with a pre-join screen, host controls and chat.
- [conference-example](https://github.com/dTelecom/conference-example): a smaller conference app.

See [Examples](../reference/examples.md) for what to change when you run them with a dTelecom Cloud key.
