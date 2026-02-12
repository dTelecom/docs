# Conference App Implementation Plan

A full-featured Google Meet-style conference app built with Next.js and dTelecom, using `@dtelecom/server-sdk-js@^3.0.3`.

## About dTelecom

dTelecom is a **decentralized real-time communication platform** for video, audio, and data. Instead of centralized servers, it uses a network of independent SFU (Selective Forwarding Unit) nodes registered on the Solana blockchain. Your app discovers the optimal node automatically via the SDK — no fixed server URL needed.

### Documentation & Resources

| Resource | URL |
|:---------|:----|
| Full docs (single file, for LLMs) | https://docs.dtelecom.org/llms-full.txt |
| Docs overview + page index | https://docs.dtelecom.org/llms.txt |
| LLM system prompt | https://docs.dtelecom.org/prompt.txt |
| Docs site (HTML) | https://docs.dtelecom.org |
| API keys / dashboard | https://cloud.dtelecom.org |
| Server SDK (npm) | https://www.npmjs.com/package/@dtelecom/server-sdk-js |
| Server SDK (GitHub) | https://github.com/dTelecom/server-sdk-js |
| Client SDK (npm) | https://www.npmjs.com/package/@dtelecom/livekit-client |
| React components (npm) | https://www.npmjs.com/package/@dtelecom/components-react |
| Client SDK (GitHub) | https://github.com/dTelecom/client-sdk-js |
| React components (GitHub) | https://github.com/dTelecom/components-js |

### SDK Packages

| Package | Purpose |
|:--------|:--------|
| `@dtelecom/server-sdk-js` | Server-side: create tokens, get WebSocket/API URLs, manage rooms (CommonJS) |
| `@dtelecom/livekit-client` | Client-side: connect to rooms, manage tracks (vanilla JS/TS) |
| `@dtelecom/components-react` | React components: `LiveKitRoom`, `VideoConference`, `PreJoin`, `Chat`, etc. |
| `@dtelecom/components-styles` | Default CSS styles for the React components |

> **For AI coding assistants:** Paste `https://docs.dtelecom.org/llms-full.txt` into your context for complete API reference, or use `https://docs.dtelecom.org/prompt.txt` as a system prompt.

---

## File Structure

```
my-conference/
  app/
    page.tsx                          # Home page — create/join room (shows participant count)
    prejoin/page.tsx                  # Pre-join page — camera/mic preview
    room/[roomName]/page.tsx          # Room page — the actual conference
    api/
      join/route.ts                   # Create token + resolve wsUrl (includes webHookURL)
      create-room/route.ts            # Create a room (host only)
      kick/route.ts                   # Remove participant (host only)
      mute/route.ts                   # Mute participant track (host only)
      webhook/route.ts                # Receive webhook events from SFU nodes
      room-count/route.ts             # GET participant count for a room
      participants/route.ts           # List participants (local-only read)
      rooms/route.ts                  # List active rooms (local-only read)
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
    room-service.ts                   # Server-side RoomServiceClient (cached getApiUrl())
    participant-count.ts              # In-memory participant count store (survives HMR)
  .env.local                          # Environment variables
```

---

## Architecture Notes

dTelecom runs on multiple independent SFU nodes. This affects how server APIs behave:

- **Write operations** (RemoveParticipant, MutePublishedTrack, UpdateParticipant, SendData, CreateRoom, DeleteRoom) are **broadcast via P2P** across all nodes — call any node and the action reaches the correct target.
- **Read operations** (ListRooms, ListParticipants, GetParticipant) are **local to a single node's in-memory store**. They return only what that specific node knows about.

**Key implication for host controls:** Do NOT use `getParticipant()` to verify a caller's role before kick/mute. The caller may be on a different node, causing a 404. Instead, pass `callerRole` from the client (the role was embedded in the JWT by your server, so it is trustworthy).

---

## Environment Variables

```bash
# .env.local
API_KEY=<your-api-key-from-cloud.dtelecom.org>
API_SECRET=<your-api-secret-from-cloud.dtelecom.org>
SOLANA_CONTRACT_ADDRESS=E2FcHsC9STeB6FEtxBKGAwMTX7cbfYMyjSHKs4QbBAmh
SOLANA_NETWORK_HOST_HTTP=https://api.mainnet-beta.solana.com
SOLANA_REGISTRY_AUTHORITY=6KVRs6Yr2oYzddepFdtWrFmVq8sgELcXzbUy7apwuQX4
WEBHOOK_URL=https://your-public-url.com/api/webhook
```

No `DTELECOM_API_HOST` needed — use `getApiUrl()` to discover the API endpoint automatically.

`WEBHOOK_URL` is embedded in every access token so SFU nodes know where to send events. During development, use [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-local-tunnel/) to expose localhost (see [Webhooks](#webhooks--participant-count) below).

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

export async function kickParticipant(room: string, identity: string, callerRole: string): Promise<void> {
  const res = await fetch('/api/kick', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room, identity, callerRole }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to kick');
}

export async function muteParticipant(room: string, identity: string, trackSid: string, callerRole: string): Promise<void> {
  const res = await fetch('/api/mute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room, identity, trackSid, callerRole }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to mute');
}
```

```typescript
// lib/room-service.ts
import { AccessToken, RoomServiceClient } from '@dtelecom/server-sdk-js';

let client: RoomServiceClient | null = null;
let clientPromise: Promise<RoomServiceClient> | null = null;

export async function getRoomService(): Promise<RoomServiceClient> {
  if (client) return client;
  if (clientPromise) return clientPromise;

  clientPromise = (async () => {
    const at = new AccessToken(process.env.API_KEY!, process.env.API_SECRET!, { identity: 'server' });
    const apiUrl = await at.getApiUrl();
    client = new RoomServiceClient(apiUrl, process.env.API_KEY!, process.env.API_SECRET!);
    return client;
  })();

  return clientPromise;
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
    { identity, name: identity, metadata, webHookURL: process.env.WEBHOOK_URL }
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
import { NextRequest, NextResponse } from 'next/server';
import { getRoomService } from '@/lib/room-service';

export async function POST(req: NextRequest) {
  const { roomName, identity, topic } = await req.json();

  if (!roomName || !identity) {
    return NextResponse.json({ error: 'roomName and identity are required' }, { status: 400 });
  }

  const roomService = await getRoomService();
  const room = await roomService.createRoom({
    name: roomName,
    emptyTimeout: 600,
    maxParticipants: 50,
    metadata: JSON.stringify({ createdBy: identity, topic: topic || '' }),
  });

  return NextResponse.json({ name: room.name, sid: room.sid });
}
```

**SDK mapping:** `getRoomService()` (cached `getApiUrl()`), `RoomServiceClient.createRoom()`

### 3. Kick Participant — `app/api/kick/route.ts`

Removes a participant. Backend verifies the caller's role from the request (not via `getParticipant()` which is local-only).

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getRoomService } from '@/lib/room-service';

export async function POST(req: NextRequest) {
  const { room, identity, callerRole } = await req.json();

  if (!room || !identity || !callerRole) {
    return NextResponse.json({ error: 'room, identity, and callerRole are required' }, { status: 400 });
  }

  if (callerRole !== 'host') {
    return NextResponse.json({ error: 'Only hosts can kick participants' }, { status: 403 });
  }

  // RemoveParticipant broadcasts via P2P — works from any node
  const client = await getRoomService();
  await client.removeParticipant(room, identity);
  return NextResponse.json({ success: true });
}
```

**SDK mapping:** `RoomServiceClient.removeParticipant()` (P2P broadcast — works cross-node)

### 4. Mute Participant — `app/api/mute/route.ts`

Mutes a participant's track. Backend verifies the caller's role.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getRoomService } from '@/lib/room-service';

export async function POST(req: NextRequest) {
  const { room, identity, trackSid, callerRole } = await req.json();

  if (!room || !identity || !trackSid || !callerRole) {
    return NextResponse.json({ error: 'room, identity, trackSid, and callerRole are required' }, { status: 400 });
  }

  if (callerRole !== 'host') {
    return NextResponse.json({ error: 'Only hosts can mute participants' }, { status: 403 });
  }

  // MutePublishedTrack broadcasts via P2P — works from any node
  const client = await getRoomService();
  await client.mutePublishedTrack(room, identity, trackSid, true);
  return NextResponse.json({ success: true });
}
```

**SDK mapping:** `RoomServiceClient.mutePublishedTrack()` (P2P broadcast — works cross-node)

### 5. List Participants — `app/api/participants/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

// Note: In dTelecom's decentralized network, ListParticipants is a local-only
// read that returns participants from a single node's in-memory store. It does
// not aggregate across nodes. This endpoint is not used by the conference app.
export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get('room');
  if (!room) {
    return NextResponse.json({ error: 'room is required' }, { status: 400 });
  }

  return NextResponse.json([]);
}
```

### 6. List Rooms — `app/api/rooms/route.ts`

```typescript
import { NextResponse } from 'next/server';

// Note: In dTelecom's decentralized network, ListRooms is a local-only read
// that returns rooms hosted on a single node. It does not aggregate across
// all nodes. This endpoint is not used by the conference app.
export async function GET() {
  return NextResponse.json([]);
}
```

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

Uses `<PreJoin>` to preview camera/mic and select devices before joining. Token and wsUrl stored in sessionStorage (not URL params) for security.

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
      sessionStorage.setItem(`room:${room}`, JSON.stringify({
        token, wsUrl,
        audioEnabled: choices.audioEnabled,
        videoEnabled: choices.videoEnabled,
      }));
      router.push(`/room/${encodeURIComponent(room)}`);
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div data-lk-theme="default" style={{ height: '100vh' }}>
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

**Component mapping:** `<PreJoin>` from `@dtelecom/components-react`, `LocalUserChoices` interface. Note `data-lk-theme="default"` wrapper needed because PreJoin is outside `<LiveKitRoom>`.

### 3. Room Page — `app/room/[roomName]/page.tsx`

Connects to the room and renders the conference UI.

```tsx
'use client';
import { LiveKitRoom } from '@dtelecom/components-react';
import '@dtelecom/components-styles';
import { useRouter } from 'next/navigation';
import ConferenceRoom from '@/components/ConferenceRoom';
import { use, useState, useEffect } from 'react';

interface RoomSession {
  token: string;
  wsUrl: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
}

export default function RoomPage({ params }: { params: Promise<{ roomName: string }> }) {
  const { roomName } = use(params);
  const router = useRouter();
  const [session, setSession] = useState<RoomSession | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(`room:${roomName}`);
    if (stored) {
      setSession(JSON.parse(stored));
      sessionStorage.removeItem(`room:${roomName}`);
    }
    setChecked(true);
  }, [roomName]);

  if (!checked) return null;
  if (!session) { router.push('/'); return null; }

  return (
    <LiveKitRoom
      token={session.token}
      serverUrl={session.wsUrl}
      connect={true}
      audio={session.audioEnabled}
      video={session.videoEnabled}
      onDisconnected={() => router.push('/')}
      onError={(err) => console.error('Room error:', err)}
      onMediaDeviceFailure={(failure) => {
        console.error('Media device failure:', failure);
        alert('Could not access camera or microphone. Please check permissions.');
      }}
    >
      <ConferenceRoom roomName={roomName} />
    </LiveKitRoom>
  );
}
```

**Component mapping:** `<LiveKitRoom>` with `audio`, `video`, `onError`, `onMediaDeviceFailure` props. Token passed via `sessionStorage` (not URL params) for security.

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

Lists all participants. Hosts see kick/mute buttons. Uses `participant.getTrack(Track.Source.Microphone)` to check audio state. Passes `callerRole` to backend for verification.

```tsx
'use client';
import {
  useParticipants,
  useLocalParticipant,
} from '@dtelecom/components-react';
import { Track } from '@dtelecom/livekit-client';
import type { ParticipantMeta } from '@/lib/types';
import { kickParticipant, muteParticipant } from '@/lib/api';

interface Props {
  roomName: string;
  onClose: () => void;
}

export default function ParticipantListPanel({ roomName, onClose }: Props) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  let localMeta: ParticipantMeta = { role: 'guest' };
  try { localMeta = JSON.parse(localParticipant.metadata || '{}'); } catch {}
  const isHost = localMeta.role === 'host';

  async function handleKick(identity: string) {
    if (!confirm(`Remove ${identity} from the room?`)) return;
    try {
      await kickParticipant(roomName, identity, localMeta.role);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to kick participant');
    }
  }

  async function handleMute(identity: string, trackSid: string) {
    try {
      await muteParticipant(roomName, identity, trackSid, localMeta.role);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to mute participant');
    }
  }

  return (
    <div style={{ width: 280, borderLeft: '1px solid #333', padding: 16, overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <strong>Participants ({participants.length})</strong>
        <button onClick={onClose}>Close</button>
      </div>
      {participants.map((p) => {
        let meta: ParticipantMeta = { role: 'guest' };
        try { meta = JSON.parse(p.metadata || '{}'); } catch {}
        const audioTrack = p.getTrack(Track.Source.Microphone);
        const isLocal = p.identity === localParticipant.identity;

        return (
          <div key={p.identity} style={{ padding: '8px 0', borderBottom: '1px solid #222' }}>
            <span>{p.name || p.identity}</span>
            {isLocal && <span style={{ marginLeft: 8, fontSize: 12 }}>(You)</span>}
            {meta.role === 'host' && <span style={{ marginLeft: 8, fontSize: 12 }}>(Host)</span>}
            {isHost && !isLocal && (
              <span style={{ float: 'right' }}>
                {audioTrack && !audioTrack.isMuted && (
                  <button onClick={() => handleMute(p.identity, audioTrack.trackSid)} style={{ marginRight: 4 }}>
                    Mute
                  </button>
                )}
                <button onClick={() => handleKick(p.identity)}>Remove</button>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

**Hook mapping:** `useParticipants()`, `useLocalParticipant()`, `participant.getTrack(Track.Source.Microphone)`

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

For custom chat UI, use the `useChat` hook. Note: `send` may be `undefined` before connection — use optional chaining:

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
      <form onSubmit={(e) => { e.preventDefault(); send?.(inputValue); }}>
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
// Pass meta.role as callerRole to backend API calls
```

### 3. Backend verifies callerRole before privileged actions

```typescript
// In your API route (e.g. /api/kick)
const { room, identity, callerRole } = await req.json();
if (callerRole !== 'host') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
// Write ops broadcast via P2P — work from any node
const client = await getRoomService();
await client.removeParticipant(room, identity);
```

**Why not `getParticipant()` for verification?** Because it's a local read — only checks the current node's in-memory store. The caller may be on a different node, causing a 404. The role in `callerRole` was embedded in the JWT by your server during token creation, so it is trustworthy.

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
| API URL resolution | `AccessToken.getApiUrl()` | `@dtelecom/server-sdk-js` |
| Room management | `RoomServiceClient` (via `getRoomService()`) | `@dtelecom/server-sdk-js` |
| Room connection | `<LiveKitRoom>` | `@dtelecom/components-react` |
| Video grid | `<GridLayout>` + `<ParticipantTile>` | `@dtelecom/components-react` |
| Control bar (mic/cam/screen/leave) | `<ControlBar>` | `@dtelecom/components-react` |
| Audio playback | `<RoomAudioRenderer>` | `@dtelecom/components-react` |
| Pre-join camera/mic preview | `<PreJoin>` | `@dtelecom/components-react` |
| Chat messages | `<Chat>` or `useChat` | `@dtelecom/components-react` |
| Participant list (client-side) | `useParticipants()` | `@dtelecom/components-react` |
| Local participant info | `useLocalParticipant()` | `@dtelecom/components-react` |
| Track lookup | `participant.getTrack(Track.Source.Microphone)` | `@dtelecom/livekit-client` |
| Connection state | `useConnectionState()` | `@dtelecom/components-react` |
| Track listing | `useTracks()` | `@dtelecom/components-react` |
| Kick participant | `RoomServiceClient.removeParticipant()` | `@dtelecom/server-sdk-js` |
| Mute participant | `RoomServiceClient.mutePublishedTrack()` | `@dtelecom/server-sdk-js` |
| Create room | `RoomServiceClient.createRoom()` | `@dtelecom/server-sdk-js` |
| List rooms (local-only) | `RoomServiceClient.listRooms()` | `@dtelecom/server-sdk-js` |
| List participants (local-only) | `RoomServiceClient.listParticipants()` | `@dtelecom/server-sdk-js` |

---

## State Management

This app uses **no external state management libraries**. All state comes from:

1. **LiveKitRoom context** — `<LiveKitRoom>` provides a React context that all hooks read from (`useParticipants`, `useLocalParticipant`, `useConnectionState`, `useTracks`, `useChat`, etc.)
2. **React useState** — for local UI state (sidebar toggle, form inputs, error messages)
3. **sessionStorage** — for passing token/wsUrl/settings between pages (more secure than URL params)

There is no need for Redux, Zustand, or other state libraries because the room state is fully managed by the LiveKit React context.

---

## Webhooks & Participant Count

dTelecom embeds the webhook URL in the access token (via the `webHookURL` option) — there is no dashboard configuration. When a participant connects, the SFU node reads the URL from the JWT and sends events there.

### In-memory count store — `lib/participant-count.ts`

```typescript
// globalThis trick to survive Next.js hot-reload in dev
const g = globalThis as typeof globalThis & { __participantCounts?: Map<string, number> };
const counts = (g.__participantCounts ??= new Map<string, number>());

export function incrementRoom(name: string): void {
  counts.set(name, (counts.get(name) ?? 0) + 1);
}

export function decrementRoom(name: string): void {
  const n = (counts.get(name) ?? 0) - 1;
  n <= 0 ? counts.delete(name) : counts.set(name, n);
}

export function clearRoom(name: string): void {
  counts.delete(name);
}

export function getRoomCount(name: string): number {
  return counts.get(name) ?? 0;
}
```

### Webhook receiver — `app/api/webhook/route.ts`

Webhooks are signed by the **SFU node** with its own Ed25519 key (not your app's key). `WebhookReceiver` automatically validates the node via the Solana registry, verifies the JWT signature, and checks the SHA-256 body hash. `receive()` is **async** because it may query Solana on first use.

```typescript
import { WebhookReceiver } from '@dtelecom/server-sdk-js';
import { NextRequest, NextResponse } from 'next/server';
import { incrementRoom, decrementRoom, clearRoom } from '@/lib/participant-count';

const receiver = new WebhookReceiver(process.env.API_KEY!, process.env.API_SECRET!);

export async function POST(req: NextRequest) {
  const body = await req.text(); // raw body needed for SHA-256 verification
  const authToken = req.headers.get('Authorization') ?? '';
  const event = await receiver.receive(body, authToken);

  const roomName = event.room?.name;
  if (roomName) {
    if (event.event === 'participant_joined') incrementRoom(roomName);
    if (event.event === 'participant_left') decrementRoom(roomName);
    if (event.event === 'room_finished') clearRoom(roomName);
  }

  return NextResponse.json({ ok: true });
}
```

### Room count endpoint — `app/api/room-count/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getRoomCount } from '@/lib/participant-count';

export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get('room');
  if (!room) return NextResponse.json({ error: 'room is required' }, { status: 400 });
  return NextResponse.json({ room, count: getRoomCount(room) });
}
```

### Development: cloudflared tunnel

dTelecom SFU nodes can't reach `localhost`, so you need a tunnel during development:

```bash
brew install cloudflared
cloudflared tunnel --url http://localhost:3000
# Prints: https://random-words.trycloudflare.com
```

Set `WEBHOOK_URL=https://random-words.trycloudflare.com/api/webhook` in `.env.local` and restart your dev server.

---

## Install & Run

```bash
npx create-next-app@latest my-conference --app --typescript
# When prompted about React Compiler, select "No" (experimental, may cause issues)
cd my-conference
npm install @dtelecom/server-sdk-js @dtelecom/livekit-client @dtelecom/components-react @dtelecom/components-styles
```

Create `.env.local` with the variables above, then:

```bash
npm run dev
```

Open `http://localhost:3000`, create a room as host, then open another tab and join as guest.
