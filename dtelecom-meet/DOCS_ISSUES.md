# Docs / API / SDK Issues & Concerns

Collected during implementation of dtelecom-meet. To be addressed in docs later.

---

## Issue 1: `@dtelecom/server-sdk-js` — broken TypeScript types (CRITICAL)

**Severity:** Blocking
**File:** `node_modules/@dtelecom/server-sdk-js/dist/index.d.ts`

The package's type declaration file uses ambient declarations (`declare const AccessToken: any`) instead of proper module exports. This means:

```typescript
// This fails with: "File '...' is not a module"
import { AccessToken } from '@dtelecom/server-sdk-js';
```

The `index.js` uses CommonJS (`module.exports = { ... }`) but the `index.d.ts` doesn't have `export` statements matching that pattern.

**Workaround:** We had to create a manual `lib/dtelecom-server.d.ts` with full type declarations for the entire server SDK.

**Fix needed:** The SDK should either:
1. Ship proper `export declare class AccessToken { ... }` in its d.ts, OR
2. Use `export =` pattern for CJS, OR
3. Migrate to ESM with proper exports

**Docs impact:** None of our docs mention this issue. Any developer following the docs will hit this immediately when using TypeScript with `moduleResolution: "bundler"` (the Next.js default).

---

## Issue 2: `DTELECOM_API_HOST` — unclear what value to use

**Severity:** High
**Affects:** `RoomServiceClient` constructor, docs guides

The docs say `DTELECOM_API_HOST=https://<your-dtelecom-host>` but never explain what this host actually is or where to find it. Is it:
- A URL from the cloud dashboard?
- The same as the WebSocket URL but with HTTPS?
- A fixed URL like `https://api.dtelecom.org`?

The cloud dashboard (cloud.dtelecom.org) provides API_KEY and API_SECRET, but there's no mention of an API host for the RoomServiceClient.

**Impact:** Developers cannot use RoomServiceClient (and therefore cannot use host controls, room management, or any server API) without knowing this URL.

**Docs change needed:** Add a clear explanation of where to get this URL, ideally with a screenshot from the dashboard.

---

## Issue 3: Server SDK is CJS-only, but docs/prompt recommend ESM imports

**Severity:** Medium
**File:** `@dtelecom/server-sdk-js`

The package.json says `"module": "./dist/index.js"` but the actual file is CommonJS (`module.exports = ...`). This is misleading — it's not an ES module.

Docs say "Use ES modules format exclusively" in the code standards, but the server SDK only supports CJS. This works in Next.js (which handles CJS interop), but could confuse developers using pure ESM environments.

---

## Issue 4: Finding a participant's tracks — `getTrack()` undocumented

**Severity:** Medium
**Affects:** Client-side participant track access (host controls, mute button)

To find a participant's audio track (e.g., for a mute button), you need to use `participant.getTrack(Track.Source.Microphone)`. This API is not documented anywhere.

The CONFERENCE_APP_PLAN.md incorrectly suggested using `p.getTrackPublications()` and our first attempt used `p.trackPublications` (a Map) — both failed type-checking. The correct approach:

```typescript
import { Track } from '@dtelecom/livekit-client';
const audioTrack = participant.getTrack(Track.Source.Microphone);
if (audioTrack && !audioTrack.isMuted) {
  // audioTrack.trackSid is the SID to pass to mutePublishedTrack()
}
```

**Docs change needed:** Add examples showing how to access participant tracks, especially for host-control scenarios.

---

## Issue 5: `ControlBar` `variation` prop undocumented

**Severity:** Low
**Affects:** Custom control bar layouts

`ControlBar` accepts a `variation` prop (`"minimal"` | `"verbose"` | `"textOnly"`) but this is not mentioned in any docs. We used `variation="minimal"` to make the control bar fit alongside our custom buttons.

---

## Issue 6: `data-lk-theme="default"` requirement undocumented

**Severity:** Medium
**Affects:** All LiveKit component styling

LiveKit components require `data-lk-theme="default"` on a parent element to apply styles. The `<LiveKitRoom>` component sets this automatically on its wrapper div, but if you use individual components like `<PreJoin>` (which is outside `<LiveKitRoom>`), you need to wrap them manually:

```tsx
<div data-lk-theme="default">
  <PreJoin ... />
</div>
```

This is not documented anywhere. Without it, PreJoin renders completely unstyled.

---

## Issue 7: `useChat` return type — `send` is optional

**Severity:** Low
**Affects:** Custom chat implementations

The `useChat` hook returns `{ send?: (message: string) => Promise<void>, ... }` where `send` is optional (undefined before connection). The docs show it as always available:

```tsx
const { chatMessages, send } = useChat();
```

Should document that `send` may be undefined and needs a null check: `send?.('hello')`.

---

## Issue 8: Token in URL query params — security concern

**Severity:** Medium (architecture)
**Affects:** Room page routing pattern

The conference app plan (and our implementation) passes the JWT token via URL search params:
```
/room/my-room?token=ey...&wsUrl=wss://...
```

This means the token appears in:
- Browser history
- Server logs (if any proxy logs query strings)
- Referrer headers

A more secure pattern would be to store the token in sessionStorage or a short-lived server session. The docs should mention this tradeoff or recommend a secure alternative.

---

## Issue 9: No docs on how `@dtelecom/components-styles` CSS interacts with Tailwind

**Severity:** Medium
**Affects:** Styling, Tailwind users

When using `@dtelecom/components-styles` alongside Tailwind CSS, there's no guidance on:
- CSS ordering / specificity conflicts
- How to override LiveKit component styles
- The `--lk-*` CSS custom properties that can be overridden
- Whether to use `data-lk-theme` or custom classes

We discovered `--lk-bg`, `--lk-bg2` by inspecting the CSS. These should be documented.

---

## Issue 10: `create-next-app` now asks about React Compiler

**Severity:** Low (docs freshness)
**Affects:** Getting started guide, conference app guide

`npx create-next-app@latest` (v16+) now asks an interactive question about React Compiler. Our docs' `create-next-app` commands don't account for this, which may confuse users or block CI pipelines.

**Fix:** Add `--no-rc` flag or document the prompt.

---
