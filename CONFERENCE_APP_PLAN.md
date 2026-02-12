# Conference App Implementation Plan

A full-featured Google Meet-style conference app built with Next.js and dTelecom. ~20 files, ~800 lines of code.

## File Structure

```
my-conference/
  app/
    page.tsx                          # Home page — create/join room
    prejoin/page.tsx                  # Pre-join page — camera/mic preview
    room/[roomName]/page.tsx          # Room page — the actual conference
    api/
      join/route.ts                   # Create token + resolve wsUrl
      create-room/route.ts            # Create a room (host only)
      kick/route.ts                   # Remove participant (host only)
      mute/route.ts                   # Mute participant track (host only)
      participants/route.ts           # List participants in a room
      rooms/route.ts                  # List active rooms
  components/
    ConferenceRoom.tsx                # Main room layout (grid + sidebar)
    CustomControlBar.tsx              # Extended control bar with host actions
    ParticipantListPanel.tsx          # Sidebar participant list
    ChatPanel.tsx                     # Sidebar chat panel
    ConnectionStateOverlay.tsx        # Reconnecting/error overlay
    ShareInviteButton.tsx             # Copy invite link button
  lib/
    types.ts                          # Shared types (Role, RoomMetadata)
    api.ts                            # Client-side fetch helpers
  .env.local                          # Environment variables
```

---

## Environment Variables

```bash
# .env.local
API_KEY=<your-api-key-from-cloud.dtelecom.org>
API_SECRET=<your-api-secret-from-cloud.dtelecom.org>
DTELECOM_API_HOST=https://<your-dtelecom-host>
SOLANA_CONTRACT_ADDRESS=E2FcHsC9STeB6FEtxBKGAwMTX7cbfYMyjSHKs4QbBAmh
SOLANA_NETWORK_HOST_HTTP=https://api.mainnet-beta.solana.com
SOLANA_REGISTRY_AUTHORITY=6KVRs6Yr2oYzddepFdtWrFmVq8sgELcXzbUy7apwuQX4
```

---

## Shared Types

```typescript
// lib/types.ts
export type Role = 'host' | 'guest';

export interface RoomMetadata {
  createdBy: string;
  topic?: string;
}

export interface ParticipantMeta {
  role: Role;
  avatarUrl?: string;
}

export interface JoinResponse {
  token: string;
  wsUrl: string;
}
```

```typescript
// lib/api.ts
import type { JoinResponse } from './types';

export async function joinRoom(room: string, identity: string, role: string): Promise<JoinResponse> {
  const res = await fetch('/api/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room, identity, role }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to join');
  return res.json();
}

export async function kickParticipant(room: string, identity: string): Promise<void> {
  const res = await fetch('/api/kick', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room, identity }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to kick');
}

export async function muteParticipant(room: string, identity: string, trackSid: string): Promise<void> {
  const res = await fetch('/api/mute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room, identity, trackSid }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to mute');
}
```

---

## API Routes

### 1. Join Room — `app/api/join/route.ts`

Creates a token with role metadata embedded, resolves wsUrl from Solana.

```typescript
import { AccessToken } from '@dtelecom/server-sdk-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { room, identity, role = 'guest' } = await req.json();

  if (!room || !identity) {
    return NextResponse.json({ error: 'room and identity are required' }, { status: 400 });
  }

  const metadata = JSON.stringify({ role });

  const at = new AccessToken(
    process.env.API_KEY!,
    process.env.API_SECRET!,
    { identity, name: identity, metadata }
  );
  at.addGrant({
    roomJoin: true,
    room,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true, // needed for chat
  });

  const token = at.toJwt();
  const clientIp = (req.headers.get('x-forwarded-for') ?? '127.0.0.1').split(',')[0].trim();
  const wsUrl = await at.getWsUrl(clientIp);

  return NextResponse.json({ token, wsUrl });
}
```

**SDK mapping:** `AccessToken` constructor, `.addGrant()`, `.toJwt()`, `.getWsUrl(clientIp)`

### 2. Create Room — `app/api/create-room/route.ts`

Creates a room with metadata. Only hosts call this.

```typescript
import { RoomServiceClient } from '@dtelecom/server-sdk-js';
import { NextRequest, NextResponse } from 'next/server';

const roomService = new RoomServiceClient(
  process.env.DTELECOM_API_HOST!,
  process.env.API_KEY!,
  process.env.API_SECRET!
);

export async function POST(req: NextRequest) {
  const { roomName, identity, topic } = await req.json();

  if (!roomName || !identity) {
    return NextResponse.json({ error: 'roomName and identity are required' }, { status: 400 });
  }

  const room = await roomService.createRoom({
    name: roomName,
    emptyTimeout: 600,
    maxParticipants: 50,
    metadata: JSON.stringify({ createdBy: identity, topic: topic || '' }),
  });

  return NextResponse.json({ name: room.name, sid: room.sid });
}
```

**SDK mapping:** `RoomServiceClient.createRoom()`

### 3. Kick Participant — `app/api/kick/route.ts`

Removes a participant. Backend verifies the caller is the host.

```typescript
import { RoomServiceClient } from '@dtelecom/server-sdk-js';
import { NextRequest, NextResponse } from 'next/server';

const roomService = new RoomServiceClient(
  process.env.DTELECOM_API_HOST!,
  process.env.API_KEY!,
  process.env.API_SECRET!
);

export async function POST(req: NextRequest) {
  const { room, identity, callerIdentity } = await req.json();

  if (!room || !identity || !callerIdentity) {
    return NextResponse.json({ error: 'room, identity, and callerIdentity are required' }, { status: 400 });
  }

  // Verify the caller is a host by checking their metadata on the server
  const caller = await roomService.getParticipant(room, callerIdentity);
  const callerMeta = JSON.parse(caller.metadata || '{}');

  if (callerMeta.role !== 'host') {
    return NextResponse.json({ error: 'Only hosts can kick participants' }, { status: 403 });
  }

  await roomService.removeParticipant(room, identity);
  return NextResponse.json({ success: true });
}
```

**SDK mapping:** `RoomServiceClient.getParticipant()`, `.removeParticipant()`

### 4. Mute Participant — `app/api/mute/route.ts`

Mutes a participant's track. Backend verifies the caller is the host.

```typescript
import { RoomServiceClient } from '@dtelecom/server-sdk-js';
import { NextRequest, NextResponse } from 'next/server';

const roomService = new RoomServiceClient(
  process.env.DTELECOM_API_HOST!,
  process.env.API_KEY!,
  process.env.API_SECRET!
);

export async function POST(req: NextRequest) {
  const { room, identity, trackSid, callerIdentity } = await req.json();

  if (!room || !identity || !trackSid || !callerIdentity) {
    return NextResponse.json({ error: 'room, identity, trackSid, and callerIdentity are required' }, { status: 400 });
  }

  // Verify the caller is a host
  const caller = await roomService.getParticipant(room, callerIdentity);
  const callerMeta = JSON.parse(caller.metadata || '{}');

  if (callerMeta.role !== 'host') {
    return NextResponse.json({ error: 'Only hosts can mute participants' }, { status: 403 });
  }

  await roomService.mutePublishedTrack(room, identity, trackSid, true);
  return NextResponse.json({ success: true });
}
```

**SDK mapping:** `RoomServiceClient.getParticipant()`, `.mutePublishedTrack()`

### 5. List Participants — `app/api/participants/route.ts`

```typescript
import { RoomServiceClient } from '@dtelecom/server-sdk-js';
import { NextRequest, NextResponse } from 'next/server';

const roomService = new RoomServiceClient(
  process.env.DTELECOM_API_HOST!,
  process.env.API_KEY!,
  process.env.API_SECRET!
);

export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get('room');
  if (!room) {
    return NextResponse.json({ error: 'room is required' }, { status: 400 });
  }

  const participants = await roomService.listParticipants(room);
  return NextResponse.json(participants.map(p => ({
    identity: p.identity,
    name: p.name,
    metadata: p.metadata,
    joinedAt: p.joinedAt,
  })));
}
```

**SDK mapping:** `RoomServiceClient.listParticipants()`

### 6. List Rooms — `app/api/rooms/route.ts`

```typescript
import { RoomServiceClient } from '@dtelecom/server-sdk-js';
import { NextResponse } from 'next/server';

const roomService = new RoomServiceClient(
  process.env.DTELECOM_API_HOST!,
  process.env.API_KEY!,
  process.env.API_SECRET!
);

export async function GET() {
  const rooms = await roomService.listRooms();
  return NextResponse.json(rooms.map(r => ({
    name: r.name,
    sid: r.sid,
    numParticipants: r.numParticipants,
    metadata: r.metadata,
  })));
}
```

**SDK mapping:** `RoomServiceClient.listRooms()`

---

## Pages

### 1. Home Page — `app/page.tsx`

Simple form to create or join a room. Links to the pre-join page.

```tsx
'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Home() {
  const router = useRouter();
  const [roomName, setRoomName] = useState('');
  const [identity, setIdentity] = useState('');

  function handleJoin(asHost: boolean) {
    if (!roomName || !identity) return;
    const params = new URLSearchParams({ identity, role: asHost ? 'host' : 'guest' });
    router.push(`/prejoin?room=${encodeURIComponent(roomName)}&${params}`);
  }

  return (
    <main style={{ padding: 40, maxWidth: 400, margin: '0 auto' }}>
      <h1>Conference</h1>
      <input
        placeholder="Room name"
        value={roomName}
        onChange={(e) => setRoomName(e.target.value)}
        style={{ display: 'block', width: '100%', marginBottom: 12, padding: 8 }}
      />
      <input
        placeholder="Your name"
        value={identity}
        onChange={(e) => setIdentity(e.target.value)}
        style={{ display: 'block', width: '100%', marginBottom: 12, padding: 8 }}
      />
      <button onClick={() => handleJoin(true)} disabled={!roomName || !identity}>
        Create Room (Host)
      </button>{' '}
      <button onClick={() => handleJoin(false)} disabled={!roomName || !identity}>
        Join Room (Guest)
      </button>
    </main>
  );
}
```

### 2. Pre-join Page — `app/prejoin/page.tsx`

Uses `<PreJoin>` to preview camera/mic and select devices before joining.

```tsx
'use client';
import { PreJoin, LocalUserChoices } from '@dtelecom/components-react';
import '@dtelecom/components-styles';
import { useRouter, useSearchParams } from 'next/navigation';
import { joinRoom } from '@/lib/api';
import { useState } from 'react';

export default function PreJoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const room = searchParams.get('room') || '';
  const identity = searchParams.get('identity') || '';
  const role = searchParams.get('role') || 'guest';
  const [error, setError] = useState('');

  async function handleSubmit(choices: LocalUserChoices) {
    try {
      const { token, wsUrl } = await joinRoom(room, choices.username || identity, role);
      const params = new URLSearchParams({
        token,
        wsUrl,
        audioEnabled: String(choices.audioEnabled),
        videoEnabled: String(choices.videoEnabled),
      });
      router.push(`/room/${encodeURIComponent(room)}?${params}`);
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div style={{ height: '100vh' }}>
      {error && <div style={{ color: 'red', padding: 16 }}>{error}</div>}
      <PreJoin
        onSubmit={handleSubmit}
        onError={(err) => setError(err.message)}
        defaults={{ username: identity, videoEnabled: true, audioEnabled: true }}
      />
    </div>
  );
}
```

**Component mapping:** `<PreJoin>` from `@dtelecom/components-react`, `LocalUserChoices` interface

### 3. Room Page — `app/room/[roomName]/page.tsx`

Connects to the room and renders the conference UI.

```tsx
'use client';
import { LiveKitRoom } from '@dtelecom/components-react';
import '@dtelecom/components-styles';
import { useRouter, useSearchParams } from 'next/navigation';
import ConferenceRoom from '@/components/ConferenceRoom';

export default function RoomPage({ params }: { params: { roomName: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const wsUrl = searchParams.get('wsUrl') || '';
  const audioEnabled = searchParams.get('audioEnabled') === 'true';
  const videoEnabled = searchParams.get('videoEnabled') === 'true';

  if (!token || !wsUrl) {
    router.push('/');
    return null;
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={wsUrl}
      connect={true}
      audio={audioEnabled}
      video={videoEnabled}
      onDisconnected={() => router.push('/')}
      onError={(err) => console.error('Room error:', err)}
      onMediaDeviceFailure={(failure) => {
        console.error('Media device failure:', failure);
        alert('Could not access camera or microphone. Please check permissions.');
      }}
    >
      <ConferenceRoom roomName={params.roomName} />
    </LiveKitRoom>
  );
}
```

**Component mapping:** `<LiveKitRoom>` with `audio`, `video`, `onError`, `onMediaDeviceFailure` props

---

## Components

### 1. ConferenceRoom — `components/ConferenceRoom.tsx`

Main layout: video grid + optional sidebar (participants or chat).

```tsx
'use client';
import {
  GridLayout,
  ParticipantTile,
  useTracks,
  RoomAudioRenderer,
} from '@dtelecom/components-react';
import { Track } from '@dtelecom/livekit-client';
import { useState } from 'react';
import CustomControlBar from './CustomControlBar';
import ParticipantListPanel from './ParticipantListPanel';
import ChatPanel from './ChatPanel';
import ConnectionStateOverlay from './ConnectionStateOverlay';

type SidebarTab = 'none' | 'participants' | 'chat';

export default function ConferenceRoom({ roomName }: { roomName: string }) {
  const [sidebar, setSidebar] = useState<SidebarTab>('none');
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <ConnectionStateOverlay />
        <div style={{ flex: 1 }}>
          <GridLayout tracks={tracks}>
            <ParticipantTile />
          </GridLayout>
        </div>
        <RoomAudioRenderer />
        <CustomControlBar
          roomName={roomName}
          onToggleParticipants={() => setSidebar(s => s === 'participants' ? 'none' : 'participants')}
          onToggleChat={() => setSidebar(s => s === 'chat' ? 'none' : 'chat')}
        />
      </div>

      {sidebar === 'participants' && (
        <ParticipantListPanel roomName={roomName} onClose={() => setSidebar('none')} />
      )}
      {sidebar === 'chat' && (
        <ChatPanel onClose={() => setSidebar('none')} />
      )}
    </div>
  );
}
```

### 2. CustomControlBar — `components/CustomControlBar.tsx`

Extends `<ControlBar>` with buttons for participant list, chat, and share invite.

```tsx
'use client';
import { ControlBar } from '@dtelecom/components-react';
import ShareInviteButton from './ShareInviteButton';

interface Props {
  roomName: string;
  onToggleParticipants: () => void;
  onToggleChat: () => void;
}

export default function CustomControlBar({ roomName, onToggleParticipants, onToggleChat }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 8 }}>
      <ControlBar />
      <button onClick={onToggleParticipants} title="Participants">
        Participants
      </button>
      <button onClick={onToggleChat} title="Chat">
        Chat
      </button>
      <ShareInviteButton roomName={roomName} />
    </div>
  );
}
```

### 3. ParticipantListPanel — `components/ParticipantListPanel.tsx`

Lists all participants. Hosts see kick/mute buttons.

```tsx
'use client';
import {
  useParticipants,
  useLocalParticipant,
} from '@dtelecom/components-react';
import type { ParticipantMeta } from '@/lib/types';
import { kickParticipant, muteParticipant } from '@/lib/api';

interface Props {
  roomName: string;
  onClose: () => void;
}

export default function ParticipantListPanel({ roomName, onClose }: Props) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const localMeta: ParticipantMeta = JSON.parse(localParticipant.metadata || '{}');
  const isHost = localMeta.role === 'host';

  async function handleKick(identity: string) {
    if (!confirm(`Kick ${identity}?`)) return;
    await kickParticipant(roomName, identity);
  }

  async function handleMute(identity: string, trackSid: string) {
    await muteParticipant(roomName, identity, trackSid);
  }

  return (
    <div style={{ width: 280, borderLeft: '1px solid #333', padding: 16, overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <strong>Participants ({participants.length})</strong>
        <button onClick={onClose}>Close</button>
      </div>
      {participants.map((p) => {
        const meta: ParticipantMeta = JSON.parse(p.metadata || '{}');
        const audioTrack = p.getTrackPublications().find(
          (t) => t.source === 'microphone'
        );
        return (
          <div key={p.identity} style={{ padding: '8px 0', borderBottom: '1px solid #222' }}>
            <span>{p.name || p.identity}</span>
            {meta.role === 'host' && <span style={{ marginLeft: 8, fontSize: 12 }}>(Host)</span>}
            {isHost && p.identity !== localParticipant.identity && (
              <span style={{ float: 'right' }}>
                {audioTrack && (
                  <button onClick={() => handleMute(p.identity, audioTrack.trackSid)} style={{ marginRight: 4 }}>
                    Mute
                  </button>
                )}
                <button onClick={() => handleKick(p.identity)}>Kick</button>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

**Hook mapping:** `useParticipants()`, `useLocalParticipant()` from `@dtelecom/components-react`

### 4. ChatPanel — `components/ChatPanel.tsx`

Uses the built-in `<Chat>` component.

```tsx
'use client';
import { Chat } from '@dtelecom/components-react';

interface Props {
  onClose: () => void;
}

export default function ChatPanel({ onClose }: Props) {
  return (
    <div style={{ width: 320, borderLeft: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: 16 }}>
        <strong>Chat</strong>
        <button onClick={onClose}>Close</button>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Chat />
      </div>
    </div>
  );
}
```

**Component mapping:** `<Chat>` from `@dtelecom/components-react` (requires `canPublishData: true` in token grant)

For custom chat UI, use the `useChat` hook:

```tsx
import { useChat } from '@dtelecom/components-react';

function CustomChat() {
  const { chatMessages, send } = useChat();

  return (
    <div>
      {chatMessages.map((msg) => (
        <div key={msg.timestamp}>
          <strong>{msg.from?.name}: </strong>{msg.message}
        </div>
      ))}
      <form onSubmit={(e) => { e.preventDefault(); send(inputValue); }}>
        <input ... />
      </form>
    </div>
  );
}
```

### 5. ConnectionStateOverlay — `components/ConnectionStateOverlay.tsx`

Shows overlay during reconnection.

```tsx
'use client';
import { useConnectionState } from '@dtelecom/components-react';
import { ConnectionState } from '@dtelecom/livekit-client';

export default function ConnectionStateOverlay() {
  const state = useConnectionState();

  if (state === ConnectionState.Reconnecting) {
    return (
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)', zIndex: 100, color: 'white',
      }}>
        Reconnecting...
      </div>
    );
  }

  return null;
}
```

### 6. ShareInviteButton — `components/ShareInviteButton.tsx`

Copies a join link to clipboard.

```tsx
'use client';
import { useState } from 'react';

export default function ShareInviteButton({ roomName }: { roomName: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const url = `${window.location.origin}/prejoin?room=${encodeURIComponent(roomName)}&role=guest`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button onClick={handleCopy}>
      {copied ? 'Copied!' : 'Share Invite'}
    </button>
  );
}
```

---

## Role/Permissions Pattern

The host controls pattern flows through three layers:

### 1. Token creation (server-side) — embed role in metadata

```typescript
const metadata = JSON.stringify({ role: 'host' }); // or 'guest'
const at = new AccessToken(apiKey, apiSecret, { identity, name, metadata });
```

### 2. Client reads role from metadata

```tsx
const { localParticipant } = useLocalParticipant();
const meta = JSON.parse(localParticipant.metadata || '{}');
const isHost = meta.role === 'host';
// Use isHost to conditionally render kick/mute buttons
```

### 3. Backend verifies before privileged actions

```typescript
// In your API route (e.g. /api/kick)
const caller = await roomService.getParticipant(room, callerIdentity);
const callerMeta = JSON.parse(caller.metadata || '{}');
if (callerMeta.role !== 'host') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
// Only then call roomService.removeParticipant(...)
```

**Security note:** Never trust the client-side role check alone. The client uses it for UI (showing/hiding buttons), but the backend must verify the caller's role before executing any privileged action.

---

## Error Handling Strategy

| Scenario | Where | Handling |
|:---------|:------|:---------|
| Device permission denied | PreJoin `onError` | Show error message, allow retry |
| Camera/mic not available | `onMediaDeviceFailure` on LiveKitRoom | Alert user, continue with available devices |
| Connection failed | `onError` on LiveKitRoom | Show error, offer retry or redirect home |
| WebSocket disconnected | `onDisconnected` on LiveKitRoom | Redirect to home page |
| Reconnecting | `useConnectionState()` | Show overlay (ConnectionStateOverlay) |
| API route error (kick/mute) | try/catch in fetch helper | Show toast/alert with error message |
| Token fetch failed | try/catch in prejoin submit | Show error on pre-join page |
| Unauthorized action (not host) | Backend returns 403 | Show "permission denied" message |

---

## Feature-to-SDK Mapping

| Feature | SDK / Component | Import From |
|:--------|:---------------|:------------|
| Token creation | `AccessToken` | `@dtelecom/server-sdk-js` |
| WebSocket URL resolution | `AccessToken.getWsUrl()` | `@dtelecom/server-sdk-js` |
| Room connection | `<LiveKitRoom>` | `@dtelecom/components-react` |
| Video grid | `<GridLayout>` + `<ParticipantTile>` | `@dtelecom/components-react` |
| Control bar (mic/cam/screen/leave) | `<ControlBar>` | `@dtelecom/components-react` |
| Audio playback | `<RoomAudioRenderer>` | `@dtelecom/components-react` |
| Pre-join camera/mic preview | `<PreJoin>` | `@dtelecom/components-react` |
| Chat messages | `<Chat>` or `useChat` | `@dtelecom/components-react` |
| Participant list (client-side) | `useParticipants()` | `@dtelecom/components-react` |
| Local participant info | `useLocalParticipant()` | `@dtelecom/components-react` |
| Remote participants only | `useRemoteParticipants()` | `@dtelecom/components-react` |
| Room context access | `useRoomContext()` | `@dtelecom/components-react` |
| Connection state | `useConnectionState()` | `@dtelecom/components-react` |
| Track listing | `useTracks()` | `@dtelecom/components-react` |
| Kick participant | `RoomServiceClient.removeParticipant()` | `@dtelecom/server-sdk-js` |
| Mute participant | `RoomServiceClient.mutePublishedTrack()` | `@dtelecom/server-sdk-js` |
| Create/list rooms | `RoomServiceClient.createRoom()` / `.listRooms()` | `@dtelecom/server-sdk-js` |

---

## State Management

This app uses **no external state management libraries**. All state comes from:

1. **LiveKitRoom context** — `<LiveKitRoom>` provides a React context that all hooks read from (`useParticipants`, `useLocalParticipant`, `useConnectionState`, `useTracks`, `useChat`, etc.)
2. **React useState** — for local UI state (sidebar toggle, form inputs, error messages)
3. **URL search params** — for passing token/wsUrl/settings between pages

There is no need for Redux, Zustand, or other state libraries because the room state is fully managed by the LiveKit React context.

---

## Install & Run

```bash
npx create-next-app@latest my-conference --app --typescript
cd my-conference
npm install @dtelecom/server-sdk-js @dtelecom/livekit-client @dtelecom/components-react @dtelecom/components-styles
```

Create `.env.local` with the variables above, then:

```bash
npm run dev
```

Open `http://localhost:3000`, create a room as host, then open another tab and join as guest.
