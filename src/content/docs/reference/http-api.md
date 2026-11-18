---
title: HTTP API reference
description: Call dTelecom Cloud from any language with plain HTTP.
---

# HTTP API reference

The server SDK is a thin wrapper over this API. Server SDKs exist for JavaScript (`@dtelecom/server-sdk-js`) and Go (`dTelecom/server-sdk-go`). Use the API directly from Python, PHP, Ruby or any other language that can send HTTPS requests.

The machine-readable specification is at `https://cloud.dtelecom.org/v1/openapi.json`.

## Basics

| | |
| --- | --- |
| Base URL | `https://cloud.dtelecom.org` |
| Authentication | `Authorization: Bearer <API_KEY>:<API_SECRET>` |
| Request bodies | JSON (`Content-Type: application/json`), or `multipart/form-data` for uploads |
| Responses | JSON, field names in `snake_case` |
| Idempotency | `Idempotency-Key` header, required on `transcriptions/jobs`, `tts/jobs`, `translation`, `vision/snapshot`, `moderation/audio` and `moderation/video-frame`. Without it: 400 `invalid_idempotency_key` |
| Charges | `charged_microcredits`, a decimal string. 1,000,000 microcredits = $1 |

Call the API only from your backend. The `Authorization` header contains your API secret.

```shell
export DTELECOM_API_KEY="dtk_live_..."
export DTELECOM_API_SECRET="..."
export AUTH="Authorization: Bearer $DTELECOM_API_KEY:$DTELECOM_API_SECRET"
export API="https://cloud.dtelecom.org"
```

### Errors

A failed call returns a non-2xx status and a JSON body with a machine-readable code:

```json
{ "error": "insufficient_balance" }
```

Some errors also carry `id`, the job or request they belong to, and a `Retry-After` header in seconds. Over the request rate limit the answer is 429 `rate_limited` with `Retry-After: 1`. See [Errors](../platform/errors.md).

A WAV job that is refused answers 422 `backend_rejected` with the reason in `detail`:

```json
{ "error": "backend_rejected", "detail": { "code": "UNSUPPORTED_TAG", "message": "Unsupported element: emphasis", "position": 13 } }
```

A request that was accepted but refused by a model returns 422 with the stored request, so you can see that nothing was charged:

```json
{ "id": "7f1c...", "kind": "translation", "status": "failed", "charged_microcredits": "0", "error": "inference_rejected" }
```

### Status codes

| Call | Success status |
| --- | --- |
| Tokens and sessions | 200 |
| Translation, vision, moderation | 200 when the request is completed; 202 with `Retry-After: 1` while `status` is `running` |
| Creating a transcription or WAV job | 202 with the current state of the job: `uploading`, `queued` or `running`. A repeat with the same key may already return `completed` |
| Reading a job or a request | 200 |
| Deleting a job | An open job (`uploading`, `queued`, `running`) becomes `cancelled` and can still be read. A completed job loses its result: `deleted`, then 404 `request_not_found`. A `failed` job stays `failed` |

### Idempotency

| Calls | Key |
| --- | --- |
| Translation, vision, moderation | 1-128 characters from `A-Z a-z 0-9 _ -` |
| Transcription and WAV jobs | 1-128 printable ASCII characters, no spaces |

- After a temporary error (429, 502, 503, 504) the key is released: a repeat with the same key runs the request again.
- A 4xx refusal is stored: the same key returns the same refusal.
- The key of a transcription job is tied to the file. The same key with another file gives 409 `idempotency_conflict`.
- Results are kept for 24 hours. After that a translation, vision or moderation request answers 410 `result_expired`, and a job answers 404 `request_not_found`.

## Endpoints

| Method and path | Purpose |
| --- | --- |
| `POST /v1/webrtc/token` | Create a participant token |
| `POST /v1/webrtc/token/extend` | Extend a participant session |
| `POST /v1/webrtc/admin-token` | Get a room admin token |
| `POST /v1/stt/session` | Open a streaming Speech-to-Text session |
| `POST /v1/stt/session/extend` | Add time to it |
| `POST /v1/tts/session` | Open a streaming Text-to-Speech session |
| `POST /v1/tts/session/extend` | Add characters to it |
| `POST /v1/transcriptions/jobs` | Upload a file for transcription |
| `GET /v1/transcriptions/jobs/{id}` | Job status and result |
| `DELETE /v1/transcriptions/jobs/{id}` | Cancel or delete |
| `POST /v1/tts/jobs` | Start a WAV synthesis job |
| `GET /v1/tts/jobs/{id}` | Job status |
| `GET /v1/tts/jobs/{id}/audio` | Download the WAV file |
| `DELETE /v1/tts/jobs/{id}` | Cancel or delete |
| `POST /v1/translation` | Translate text |
| `GET /v1/translation/requests/{id}` | Read a translation |
| `POST /v1/vision/snapshot` | Ask about an image |
| `GET /v1/vision/requests/{id}` | Read a vision result |
| `POST /v1/moderation/audio` | Moderate an audio chunk |
| `POST /v1/moderation/video-frame` | Moderate a video frame |
| `GET /v1/moderation/requests/{id}` | Read a moderation result |
| `POST /v1/moderation/streams` | Get a ticket for the moderation WebSocket |
| `GET /v1/moderation/stream` | The moderation WebSocket |

## Rooms

### Create a participant token

`POST /v1/webrtc/token`

| Field | Type | Description |
| --- | --- | --- |
| `room_name` | string, required | Room to join. 1 to 256 bytes. |
| `identity` | string, required | Unique within the room. 1 to 256 bytes. |
| `duration_minutes` | integer, required | Session lifetime in minutes. The SDK sends 360 by default; the maximum is 1,440. |
| `name` | string | Display name. |
| `metadata` | string | Visible to other participants. Up to 16 KiB. |
| `client_ip` | string | The participant's public IP, used to pick the nearest node. |
| `webhook_urls` | string[] | Up to 5 HTTPS URLs. No localhost or private addresses. |
| `grants` | object | `can_publish`, `can_subscribe`, `can_publish_data` (default `true`) and `room_admin` (default `false`). |

```shell
curl -s "$API/v1/webrtc/token" -H "$AUTH" -H "Content-Type: application/json" -d '{
  "room_name": "daily-standup",
  "identity": "user-42",
  "duration_minutes": 60,
  "grants": { "can_publish": true }
}'
```

```json
{
  "token": "eyJ...",
  "ws_url": "wss://...",
  "session_id": "c5803361-85df-433b-ad05-d7a21a53314d",
  "expires_at": "2026-11-15T12:00:00Z"
}
```

Give `token` and `ws_url` to the client SDK.

Errors to expect: 403 `room_participant_limit` (1,000 tokens per room) and 429 `concurrency_limit`. A concurrent participant is counted from the moment the token is issued.

### Extend a session

`POST /v1/webrtc/token/extend`

```shell
curl -s "$API/v1/webrtc/token/extend" -H "$AUTH" -H "Content-Type: application/json" -d '{
  "session_id": "c5803361-85df-433b-ad05-d7a21a53314d",
  "additional_minutes": 30
}'
```

Returns `token`, `ws_url` and `new_expires_at`.

Extend before `expires_at`. A participant whose token expired is removed from the room about a minute later, and a later extension gets 409 `session_not_extendable`. The extended token keeps `name`, `metadata`, grants and `webhook_urls`.

### Room admin token

`POST /v1/webrtc/admin-token`

```shell
curl -s "$API/v1/webrtc/admin-token" -H "$AUTH" -H "Content-Type: application/json" -d '{ "room_name": "daily-standup" }'
```

Returns `token`, valid for 10 minutes, `api_urls`, the nodes currently hosting the room, and `expires_at`. The server SDKs use this token inside `roomService()`. Manage rooms from your backend through the JavaScript or Go server SDK.

## Speech-to-Text

### Open a streaming session

`POST /v1/stt/session`

| Field | Type | Description |
| --- | --- | --- |
| `duration_minutes` | integer, required | Prepaid minutes, up to 1,440. |
| `language` | string | Language code or `auto`. |
| `webrtc_session_id` | string | Links the stream to a room participant. |

```shell
curl -s "$API/v1/stt/session" -H "$AUTH" -H "Content-Type: application/json" -d '{
  "duration_minutes": 10,
  "language": "en"
}'
```

Returns `session_id`, `token`, `server_url`, `stream_url` and `expires_at`. `stream_url` is the full WebSocket address (`server_url` + `/v1/stream`): connect to it and send `token` as `session_key`. The message protocol is in [Speech-to-Text (streaming)](../ai/speech-to-text.md#the-websocket-protocol).

One session key serves one connection. A second connection gets `{"type":"error","error":"session_key_used"}` and close code 1008, so after any disconnect create a new session.

### Extend

`POST /v1/stt/session/extend` with `session_id` and `additional_minutes`. Returns `token` and `new_expires_at`. Send the new `token` to the open socket as `{"type":"extend","session_key":"..."}`; the server answers `{"type":"extended","expires_in":N}`.

### Transcribe a file

`POST /v1/transcriptions/jobs`, `multipart/form-data`.

| Part | Description |
| --- | --- |
| `file` | The audio or video file. Up to 256 MiB and 2 hours. |
| `language` | Language code. Default `en`. |
| `diarize` | `true` or `false`. Default `true`. |

```shell
curl -s "$API/v1/transcriptions/jobs" -H "$AUTH" \
  -H "Idempotency-Key: call-2026-11-10" \
  -F "file=@call.mp3" -F "language=en"
```

Poll `GET /v1/transcriptions/jobs/{id}` until `status` is `completed`, `failed` or `cancelled`.

```shell
curl -s "$API/v1/transcriptions/jobs/JOB_ID" -H "$AUTH"
```

The completed job carries `result` with `text`, `language`, `segments` (`start`, `end`, `speaker`, `text`), `speaker_labels`, `speaker_segments`, `timing_type` and `media`. Speakers are named `speaker_1`, `speaker_2`. `language=auto` is rejected with 400 `upload_rejected`. `DELETE` the same path to cancel or delete.

## Text-to-Speech

### Open a streaming session

`POST /v1/tts/session`

| Field | Type | Description |
| --- | --- | --- |
| `max_characters` | integer, required | Characters the session may synthesise. |
| `voice` | string | Recorded for the dashboard only. The voice is chosen in the first message of the stream. |
| `language` | string | Language code. |
| `webrtc_session_id` | string | Links the stream to a room participant. |

Returns `session_id`, `token`, `server_url`, `stream_url` and `expires_at`. Connect to `stream_url`. One session key serves one connection. See [Text-to-Speech](../ai/text-to-speech.md).

`POST /v1/tts/session/extend` with `session_id` and `additional_characters` returns `token`, `max_characters` and `new_expires_at`. Send the new `token` to the open socket the same way as for Speech-to-Text.

### Make a WAV file

`POST /v1/tts/jobs`

| Field | Type | Description |
| --- | --- | --- |
| `text` | string, required | Text or SSML, up to 10,000 characters. |
| `voice` | string | Voice name. |
| `language` | string | Language code. |
| `speed` | number | Speaking rate. |
| `input_format` | string | `text` or `ssml`. |
| `dictionary` | object | Pronunciation aliases. |
| `watermark` | boolean | Audio watermark. |

```shell
curl -s "$API/v1/tts/jobs" -H "$AUTH" -H "Content-Type: application/json" \
  -H "Idempotency-Key: welcome-prompt-v1" \
  -d '{ "text": "Welcome to Acme support.", "voice": "af_heart" }'

curl -s "$API/v1/tts/jobs/JOB_ID" -H "$AUTH"                       # poll
curl -s "$API/v1/tts/jobs/JOB_ID/audio" -H "$AUTH" -o welcome.wav  # download
```

Asking for the audio before the job is `completed` gives 409 `job_not_complete`.

## Translation

`POST /v1/translation`

| Field | Type | Description |
| --- | --- | --- |
| `q` | string, required | Up to 500 characters. |
| `target` | string, required | Target language code. |
| `source` | string | Source language code. Detected when omitted. |

```shell
curl -s "$API/v1/translation" -H "$AUTH" -H "Content-Type: application/json" \
  -H "Idempotency-Key: msg-8841-es" \
  -d '{ "q": "Where is the nearest station?", "target": "es" }'
```

```json
{
  "id": "7f1c...",
  "kind": "translation",
  "status": "completed",
  "charged_microcredits": "145",
  "result": {
    "translated_text": "¿Dónde está la estación más cercana?",
    "source": "auto",
    "target": "es",
    "detected_language": { "language": "en", "confidence": 0.98 },
    "usage": { "characters": 29 }
  }
}
```

A 202 response with `"status": "running"` means the work is not finished: repeat the call with the same `Idempotency-Key`, or poll `GET /v1/translation/requests/{id}`.

## Vision

`POST /v1/vision/snapshot`, `multipart/form-data`.

| Part | Description |
| --- | --- |
| `image` | JPEG, PNG or WebP, up to 6 MiB and 4 million pixels. |
| `question` | Up to 4,000 characters. |
| `source` | `camera` or `screen`. |
| `session_id` | A WebRTC session id, to link the snapshot to a room participant. |

```shell
curl -s "$API/v1/vision/snapshot" -H "$AUTH" \
  -H "Idempotency-Key: room-12-frame-1001" \
  -F "image=@frame.jpg" -F "question=How many people are in the room?"
```

The answer is in `result.answer`. Poll `GET /v1/vision/requests/{id}` if `status` is `running`.

## Moderation

`POST /v1/moderation/audio` and `POST /v1/moderation/video-frame`, both `multipart/form-data`.

| Endpoint | Part | Description |
| --- | --- | --- |
| audio | `audio` | Raw PCM16 LE, mono, 16 kHz, up to 30 seconds. |
| audio | `language` | Language code. Default `en`. |
| video-frame | `image` | Same limits as Vision. |
| both | `session_id` | A WebRTC session id. |

```shell
curl -s "$API/v1/moderation/video-frame" -H "$AUTH" \
  -H "Idempotency-Key: room-12-user-42-frame-7" \
  -F "image=@frame.jpg"
```

The verdict is in `result.decision`: `pass` or `flag`. Poll `GET /v1/moderation/requests/{id}` if `status` is `running`.

`POST /v1/moderation/streams` returns a ticket (`token`, `websocket_path`, `expires_at`) for the moderation WebSocket.

## Python example

No SDK is needed. This uses the `requests` package.

```python
import os
import time
import requests

API = "https://cloud.dtelecom.org"
AUTH = {"Authorization": f"Bearer {os.environ['DTELECOM_API_KEY']}:{os.environ['DTELECOM_API_SECRET']}"}


def create_token(room: str, identity: str, minutes: int = 60) -> dict:
    r = requests.post(
        f"{API}/v1/webrtc/token",
        headers=AUTH,
        json={"room_name": room, "identity": identity, "duration_minutes": minutes},
        timeout=15,
    )
    r.raise_for_status()
    return r.json()  # token, ws_url, session_id, expires_at


def translate(text: str, target: str, key: str) -> str:
    r = requests.post(
        f"{API}/v1/translation",
        headers={**AUTH, "Idempotency-Key": key},
        json={"q": text, "target": target},
        timeout=30,
    )
    r.raise_for_status()
    body = r.json()
    while r.status_code == 202:  # still running: poll until it is done
        time.sleep(1)
        r = requests.get(f"{API}/v1/translation/requests/{body['id']}", headers=AUTH, timeout=15)
        r.raise_for_status()
        body = r.json()
    return body["result"]["translated_text"]


def transcribe(path: str, key: str) -> dict:
    with open(path, "rb") as f:
        r = requests.post(
            f"{API}/v1/transcriptions/jobs",
            headers={**AUTH, "Idempotency-Key": key},
            files={"file": f},
            data={"language": "en"},
            timeout=300,
        )
    r.raise_for_status()
    job = r.json()
    while job["status"] not in ("completed", "failed", "cancelled"):
        time.sleep(2)
        r = requests.get(f"{API}/v1/transcriptions/jobs/{job['id']}", headers=AUTH, timeout=15)
        r.raise_for_status()
        job = r.json()
    return job


if __name__ == "__main__":
    print(create_token("daily-standup", "user-42")["ws_url"])
    print(translate("Good morning", "de", "greeting-de-1"))
```

## Go example

Go has a server SDK, `dTelecom/server-sdk-go`. This is the same call over plain HTTP, for when you do not want the dependency.

```go
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

type tokenResponse struct {
	Token     string `json:"token"`
	WsURL     string `json:"ws_url"`
	SessionID string `json:"session_id"`
	ExpiresAt string `json:"expires_at"`
}

func createToken(room, identity string) (*tokenResponse, error) {
	body, _ := json.Marshal(map[string]any{
		"room_name":        room,
		"identity":         identity,
		"duration_minutes": 60,
	})
	req, _ := http.NewRequest("POST", "https://cloud.dtelecom.org/v1/webrtc/token", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+os.Getenv("DTELECOM_API_KEY")+":"+os.Getenv("DTELECOM_API_SECRET"))
	req.Header.Set("Content-Type", "application/json")

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode >= 300 {
		return nil, fmt.Errorf("dtelecom: HTTP %d", res.StatusCode)
	}
	var out tokenResponse
	return &out, json.NewDecoder(res.Body).Decode(&out)
}

func main() {
	t, err := createToken("daily-standup", "user-42")
	if err != nil {
		panic(err)
	}
	fmt.Println(t.WsURL)
}
```
