---
title: Data messages and chat
description: Send chat, reactions and app state through the room.
---

# Data messages and chat

Besides audio and video, participants can exchange arbitrary data through the room: chat, reactions, cursor positions, captions, commands for an agent. Data messages are free.

## Send a message

```typescript
import { DataPacket_Kind, Room } from '@dtelecom/livekit-client';

async function sendChat(room: Room, text: string) {
  const payload = new TextEncoder().encode(JSON.stringify({ text }));
  await room.localParticipant.publishData(payload, DataPacket_Kind.RELIABLE, { topic: 'chat' });
}
```

| Kind | Delivery | Use for |
| --- | --- | --- |
| `DataPacket_Kind.RELIABLE` | ordered, retried | chat, commands, anything that must arrive |
| `DataPacket_Kind.LOSSY` | fast, may drop | cursor positions, live telemetry |

Use a `topic` to separate kinds of messages. Receivers filter on it.

## Receive messages

```typescript
import { Room, RoomEvent } from '@dtelecom/livekit-client';

function onChat(room: Room, handler: (from: string, text: string) => void) {
  room.on(RoomEvent.DataReceived, (payload, participant, kind, topic) => {
    if (topic !== 'chat') return;
    const { text } = JSON.parse(new TextDecoder().decode(payload));
    handler(participant?.identity ?? 'server', text);
  });
}
```

`participant` is undefined when the message came from your backend.

## Send to specific participants

```typescript
import { DataPacket_Kind, Room } from '@dtelecom/livekit-client';

async function whisper(room: Room, toIdentity: string, text: string) {
  const target = room.getParticipantByIdentity(toIdentity);
  if (!target) return; // not in the room
  const payload = new TextEncoder().encode(JSON.stringify({ text }));
  await room.localParticipant.publishData(payload, DataPacket_Kind.RELIABLE, {
    destination: [target.sid], // participant SIDs, not identities
    topic: 'private',
  });
}
```

`destination` takes participant SIDs (`PA_...`). An identity is not accepted there, so look the participant up first.

## Send from your backend

```typescript
import { CloudClient, DataPacket_Kind } from '@dtelecom/server-sdk-js';

const rooms = new CloudClient().roomService();

const payload = new TextEncoder().encode(JSON.stringify({ type: 'poll', question: 'Ready to start?' }));
await rooms.sendData('town-hall', payload, DataPacket_Kind.RELIABLE, { topic: 'system' });
```

Add `destinationSids: ['PA_...']` to the options to reach one participant; get the SID from `listParticipants()`. The room must be live, with at least one participant connected.

A server-side bot in the room can also send data itself with `publishData()`, whether or not it publishes media. See [Server-side media](../guides/server-side-media.md#send-and-receive-data).

## Chat in React

```tsx
import { useState } from 'react';
import { useChat } from '@dtelecom/components-react';

export function ChatBox() {
  const { chatMessages, send } = useChat();
  const [input, setInput] = useState('');

  return (
    <div>
      {chatMessages.map((msg) => (
        <p key={msg.timestamp}>
          <strong>{msg.from?.name}: </strong>
          {msg.message}
        </p>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send?.(input);
          setInput('');
        }}
      >
        <input value={input} onChange={(e) => setInput(e.target.value)} />
        <button type="submit" disabled={!send}>Send</button>
      </form>
    </div>
  );
}
```

`useChat` must be used inside `LiveKitRoom`. `send` is undefined until the room is connected. For a ready-made chat panel, render `<Chat />`.

## Shared state without messages

Two fields are synced to everyone automatically and are available to participants who join later:

| Field | Set by | Use for |
| --- | --- | --- |
| Participant `metadata` | your backend, in `createToken` | role, avatar, seat number |
| Room metadata | your backend, `roomService().updateRoomMetadata()` | topic, layout, "recording" flag |

Data messages are not stored: a participant who joins later does not receive earlier messages. Keep chat history in your own database if you need it.

## Good to know

- The sender does not receive its own message. Add it to your UI locally.
- There is no explicit size limit, but the transport caps one message at about 64 KiB. Keep messages small and send large data as a link.
- Reliable messages arrive in order. Lossy messages may be dropped under load.

## Permissions

A participant needs the `canPublishData` grant to send. It is on by default. Without it a send call in the browser client does not throw: the node drops the message and does not tell the sender. In `@dtelecom/server-sdk-node` the call rejects. The token's permissions are in `localParticipant.permissions`. Turn the grant off for viewers who must not chat:

```typescript
import { CloudClient } from '@dtelecom/server-sdk-js';

const cloud = new CloudClient();

await cloud.createToken({
  room: 'webinar',
  identity: 'viewer-7',
  grants: { canPublish: false, canPublishData: false },
});
```

## Talking to an agent

A [voice agent](../guides/voice-agent.md) receives data messages through `onDataMessage`. Use it to send text input, button presses or context alongside the voice conversation.
