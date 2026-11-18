#!/usr/bin/env python3
"""Draws the docs diagrams as standalone SVG files.

One visual language for every diagram: thin outlined boxes, dashed zones that show who runs what,
labelled arrows, one accent colour for the media path. Colours are CSS variables with light-theme
fallbacks, so a file looks right on its own and follows the site theme when inlined.

Usage: python3 _site-builder/diagrams.py <docs-folder>
"""
import os
import sys
from html import escape

C = {
    'text': 'var(--text,#131715)', 'dim': 'var(--dim,#5c6862)', 'line': 'var(--line,#dfe5e2)',
    'panel': 'var(--panel,#f5f7f6)', 'bg': 'var(--bg,#ffffff)',
    'accent': 'var(--accent,#087a4d)', 'soft': 'var(--accent-soft,#e2f6ec)',
}
SANS = "var(--font-body,'Onest','Helvetica Neue',Arial,sans-serif)"
MONO = "var(--font-mono,'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace)"


class Diagram:
    def __init__(self, w, h, label):
        self.w, self.h, self.aria, self.el = w, h, label, []

    def zone(self, x, y, w, h, title):
        self.el.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14" style="fill:none;stroke:{C["line"]};stroke-width:1.5;stroke-dasharray:5 5"/>')
        self.el.append(f'<text x="{x + 16}" y="{y + 22}" style="font:500 10.5px {MONO};letter-spacing:.09em;fill:{C["dim"]}">{escape(title.upper())}</text>')

    def box(self, x, y, w, h, title, sub='', accent=False):
        fill, stroke = (C['soft'], C['accent']) if accent else (C['panel'], C['line'])
        self.el.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" style="fill:{fill};stroke:{stroke};stroke-width:1.5"/>')
        ty = y + h / 2 + (-3 if sub else 5)
        self.el.append(f'<text x="{x + 16}" y="{ty}" style="font:600 14px {SANS};fill:{C["text"]}">{escape(title)}</text>')
        if sub:
            self.el.append(f'<text x="{x + 16}" y="{ty + 18}" style="font:400 11px {MONO};fill:{C["dim"]}">{escape(sub)}</text>')

    def arrow(self, pts, accent=False, both=False, dashed=False):
        col = C['accent'] if accent else C['dim']
        d = 'M' + ' L'.join(f'{x} {y}' for x, y in pts)
        dash = ';stroke-dasharray:4 4' if dashed else ''
        self.el.append(f'<path d="{d}" style="fill:none;stroke:{col};stroke-width:{2 if accent else 1.5};stroke-linejoin:round{dash}"/>')
        ends = [(pts[-2], pts[-1])] + ([(pts[1], pts[0])] if both else [])
        for (x0, y0), (x1, y1) in ends:
            dx, dy = x1 - x0, y1 - y0
            n = (dx * dx + dy * dy) ** .5
            ux, uy = dx / n, dy / n
            a, b = 9, 4.5
            p = [(x1, y1), (x1 - ux * a - uy * b, y1 - uy * a + ux * b), (x1 - ux * a + uy * b, y1 - uy * a - ux * b)]
            self.el.append('<polygon points="' + ' '.join(f'{px:.1f},{py:.1f}' for px, py in p) + f'" style="fill:{col}"/>')

    def label(self, x, y, text, anchor='middle', accent=False):
        col = C['accent'] if accent else C['text']
        self.el.append(f'<text x="{x}" y="{y}" text-anchor="{anchor}" style="font:500 11.5px {MONO};fill:{col}">{escape(text)}</text>')

    def step(self, x, y, n):
        self.el.append(f'<circle cx="{x}" cy="{y}" r="10" style="fill:{C["bg"]};stroke:{C["text"]};stroke-width:1.5"/>')
        self.el.append(f'<text x="{x}" y="{y + 4}" text-anchor="middle" style="font:600 11.5px {MONO};fill:{C["text"]}">{n}</text>')

    def stack(self, x, y, w, h, title, sub=''):
        """A box with two more behind it: many of the same thing."""
        for o in (12, 6):
            self.el.append(f'<rect x="{x + o}" y="{y + o}" width="{w}" height="{h}" rx="10" style="fill:{C["bg"]};stroke:{C["line"]};stroke-width:1.5"/>')
        self.box(x, y, w, h, title, sub)

    def note(self, x, y, text, anchor='middle'):
        self.el.append(f'<text x="{x}" y="{y}" text-anchor="{anchor}" style="font:400 11px {MONO};fill:{C["dim"]}">{escape(text)}</text>')

    def seq(self, actors, rows, top=16, gap=42):
        """A sequence diagram. actors: (x, title, sub). rows: (from, to, label, kind) with kind '', 'accent', 'reply' or 'note'."""
        bottom = top + 56 + 34 + gap * len(rows)
        for x, title, sub in actors:
            self.el.append(f'<path d="M{x} {top + 56} L{x} {bottom}" style="stroke:{C["line"]};stroke-width:1.5;stroke-dasharray:5 5"/>')
            self.el.append(f'<rect x="{x - 96}" y="{top}" width="192" height="56" rx="10" style="fill:{C["panel"]};stroke:{C["line"]};stroke-width:1.5"/>')
            self.el.append(f'<text x="{x}" y="{top + 25}" text-anchor="middle" style="font:600 14px {SANS};fill:{C["text"]}">{escape(title)}</text>')
            self.el.append(f'<text x="{x}" y="{top + 43}" text-anchor="middle" style="font:400 11px {MONO};fill:{C["dim"]}">{escape(sub)}</text>')
        n = 0
        for i, (a, b, text, kind) in enumerate(rows):
            y = top + 56 + 44 + gap * i
            if kind == 'note':
                x = actors[a][0]
                tw = len(text) * 6.9 + 24
                self.el.append(f'<rect x="{x - tw / 2:.0f}" y="{y - 15}" width="{tw:.0f}" height="26" rx="13" style="fill:{C["bg"]};stroke:{C["line"]};stroke-width:1.5"/>')
                self.note(x, y + 2, text)
                continue
            x0, x1 = actors[a][0], actors[b][0]
            self.arrow([(x0, y), (x1, y)], accent=kind == 'accent', dashed=kind == 'reply')
            lx = min(x0, x1) + 16
            if kind != 'reply':
                n += 1
                self.step(lx + 10, y, n)
                self.el.append(f'<rect x="{lx + 26}" y="{y - 22}" width="2" height="2" style="fill:none"/>')
            self.label((x0 + x1) / 2 + (14 if kind != 'reply' else 0), y - 8, text, accent=kind == 'accent')

    def svg(self):
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.w} {self.h}" role="img" aria-label="{escape(self.aria)}">\n'
                + '\n'.join(self.el) + '\n</svg>\n')


def how_it_works():
    d = Diagram(760, 400, 'Your backend gets a token from the Cloud API and passes it to the client; the client connects to a media node.')
    d.zone(16, 16, 268, 368, 'Your app')
    d.zone(476, 16, 268, 368, 'dTelecom Cloud')
    d.box(40, 60, 220, 68, 'Your backend', 'server SDK + API key')
    d.box(40, 292, 220, 68, 'Client', 'browser, mobile app, agent')
    d.box(500, 60, 220, 68, 'Cloud API', 'tokens, usage, billing')
    d.box(500, 176, 220, 68, 'AI services', 'speech, translation, vision')
    d.box(500, 292, 220, 68, 'Media node', 'nearest to the participant', accent=True)

    # 1: client asks its own backend
    d.arrow([(72, 292), (72, 128)])
    d.step(72, 210, 1)
    d.label(88, 214, 'asks to join', 'start')
    # 2: backend asks the cloud for a token
    d.arrow([(260, 82), (500, 82)])
    d.step(322, 82, 2)
    d.label(404, 72, 'createToken()')
    d.arrow([(500, 108), (260, 108)])
    d.label(392, 124, 'token + wsUrl')
    # 3: token goes back to the client
    d.arrow([(196, 128), (196, 292)])
    d.step(196, 210, 3)
    d.label(212, 214, 'token', 'start')
    # 4: media
    d.arrow([(260, 326), (500, 326)], accent=True, both=True)
    d.step(322, 326, 4)
    d.label(400, 314, 'audio, video, data', accent=True)
    # AI calls go through the same API
    d.arrow([(610, 128), (610, 176)])
    return d


def voice_agent():
    d = Diagram(760, 360, 'A voice agent receives speech from the room, sends it through Speech-to-Text, an LLM and Text-to-Speech, and publishes the answer back.')
    d.zone(16, 16, 200, 328, 'Room')
    d.zone(280, 16, 200, 328, 'Your server')
    d.box(32, 146, 168, 68, 'Participant', 'microphone, speaker')
    d.box(296, 146, 168, 68, 'Voice agent', '@dtelecom/agents-js')
    d.box(560, 40, 184, 68, 'Speech-to-Text', 'dTelecom')
    d.box(560, 146, 184, 68, 'LLM', 'your provider')
    d.box(560, 252, 184, 68, 'Text-to-Speech', 'dTelecom')
    # 1 speech in, 5 answer out
    d.arrow([(200, 166), (296, 166)], accent=True)
    d.step(248, 166, 1)
    d.label(248, 150, 'speech', accent=True)
    d.arrow([(296, 196), (200, 196)], accent=True)
    d.step(248, 196, 5)
    d.label(248, 222, 'answer', accent=True)
    # 2 speech-to-text
    d.arrow([(350, 146), (350, 60), (560, 60)])
    d.step(350, 104, 2)
    d.label(488, 52, 'audio 16 kHz')
    d.arrow([(560, 90), (410, 90), (410, 146)], dashed=True)
    d.label(488, 106, 'transcript')
    # 3 llm
    d.arrow([(464, 166), (560, 166)])
    d.step(512, 166, 3)
    d.label(512, 150, 'text')
    d.arrow([(560, 196), (464, 196)], dashed=True)
    d.label(512, 216, 'answer')
    # 4 text-to-speech
    d.arrow([(410, 214), (410, 270), (560, 270)])
    d.step(410, 244, 4)
    d.label(488, 262, 'sentences')
    d.arrow([(560, 300), (350, 300), (350, 214)], dashed=True)
    d.label(470, 318, 'audio 48 kHz')
    return d


def live_captions():
    d = Diagram(760, 360, 'A caption bot listens to speakers, transcribes and translates their speech, and sends captions to viewers through the room service.')
    d.zone(16, 16, 200, 328, 'Room')
    d.zone(280, 16, 200, 328, 'Your server')
    d.box(32, 52, 168, 68, 'Speaker', 'publishes audio')
    d.box(32, 252, 168, 68, 'Viewers', 'render captions')
    d.box(296, 146, 168, 68, 'Caption bot', 'listen-only')
    d.box(560, 52, 184, 68, 'Speech-to-Text', '$0.004 / min')
    d.box(560, 252, 184, 68, 'Translation', '$0.005 / 1K chars')
    d.arrow([(200, 86), (350, 86), (350, 146)], accent=True)
    d.step(248, 86, 1)
    d.label(300, 76, 'audio', accent=True)
    d.arrow([(410, 146), (410, 86), (560, 86)], both=True)
    d.step(410, 116, 2)
    d.label(492, 76, 'transcript')
    d.arrow([(410, 214), (410, 286), (560, 286)], both=True)
    d.step(410, 250, 3)
    d.label(492, 304, 'translations')
    d.arrow([(350, 214), (350, 286), (200, 286)], accent=True)
    d.step(350, 250, 4)
    d.label(268, 304, 'sendData()', accent=True)
    return d


def stt_session():
    d = Diagram(760, 480, 'A streaming Speech-to-Text session: the backend opens a prepaid session, connects a WebSocket to the speech server, sends audio and receives transcripts.')
    d.seq([(112, 'Your backend', 'server SDK'), (380, 'Cloud API', 'DTELECOM_CLOUD_URL'), (648, 'Speech server', 'streamUrl')], [
        (0, 1, 'stt.createSession()', ''),
        (1, 0, 'token, streamUrl', 'reply'),
        (0, 2, 'open WebSocket', ''),
        (0, 2, 'config + session_key', ''),
        (2, 0, 'ready', 'reply'),
        (0, 2, 'PCM16 16 kHz, binary', 'accent'),
        (2, 0, 'transcription, is_final', 'reply'),
        (0, 2, 'close', ''),
        (1, 1, 'billing stops when the socket closes', 'note'),
    ])
    return d


def tts_session():
    d = Diagram(760, 480, 'A streaming Text-to-Speech session: the backend opens a prepaid session, connects a WebSocket, sends text and receives audio frames.')
    d.seq([(112, 'Your backend', 'server SDK'), (380, 'Cloud API', 'DTELECOM_CLOUD_URL'), (648, 'Speech server', 'streamUrl')], [
        (0, 1, 'tts.createSession()', ''),
        (1, 0, 'token, streamUrl', 'reply'),
        (0, 2, 'open WebSocket', ''),
        (0, 2, '{ session_key }', ''),
        (0, 2, '{ text }', ''),
        (2, 0, 'generating', 'reply'),
        (2, 0, 'PCM16 48 kHz, binary', 'accent'),
        (2, 0, 'done', 'reply'),
        (1, 1, 'send the next sentence, or { type: clear } to interrupt', 'note'),
    ])
    return d


def livestream():
    d = Diagram(760, 330, 'In a livestream the host publishes to the room and viewers only receive; the difference is set in the tokens your backend issues.')
    d.box(290, 24, 180, 64, 'Your backend', 'issues both tokens')
    d.box(24, 196, 180, 68, 'Host', 'canPublish: true')
    d.box(290, 196, 180, 68, 'Room', 'media nodes', accent=True)
    d.stack(556, 196, 180, 68, 'Viewers', 'canPublish: false')
    d.arrow([(290, 56), (114, 56), (114, 196)], dashed=True)
    d.label(196, 46, 'host token')
    d.arrow([(470, 56), (646, 56), (646, 196)], dashed=True)
    d.label(566, 46, 'viewer token')
    d.arrow([(204, 230), (290, 230)], accent=True)
    d.label(247, 186, 'camera,', accent=True)
    d.label(247, 200, 'mic', accent=True)
    d.arrow([(470, 216), (556, 216)], accent=True)
    d.label(513, 204, 'media', accent=True)
    d.arrow([(556, 246), (470, 246)])
    d.label(513, 266, 'chat')
    d.note(380, 306, 'a viewer token cannot publish media, whatever the client does')
    return d


def webhooks():
    d = Diagram(760, 300, 'A media node sends signed webhook events to the URL from the participant token; your backend verifies them and answers 2xx.')
    d.zone(16, 16, 268, 268, 'Your app')
    d.zone(476, 16, 268, 268, 'dTelecom Cloud')
    d.box(40, 56, 220, 68, 'Your backend', 'createToken({ webhookUrls })')
    d.box(40, 192, 220, 68, 'Webhook endpoint', 'WebhookReceiver')
    d.box(500, 56, 220, 68, 'Cloud API', 'puts the URLs in the token')
    d.box(500, 192, 220, 68, 'Media node', 'signs every event', accent=True)
    d.arrow([(260, 90), (500, 90)])
    d.step(322, 90, 1)
    d.label(400, 80, 'createToken()')
    d.arrow([(500, 212), (260, 212)], accent=True)
    d.step(438, 212, 2)
    d.label(350, 202, 'POST event', accent=True)
    d.arrow([(260, 242), (500, 242)], dashed=True)
    d.step(322, 242, 3)
    d.label(400, 262, 'verify, 2xx')
    return d


def call_styles():
    d = Diagram(760, 330, 'AI services use three call styles: a single request, a job that you poll, and a prepaid streaming session.')
    cols = [
        (16, 'Request', [('One call', 'with Idempotency-Key'), ('Result', 'in the response')], 'translation, vision, moderation'),
        (268, 'Job', [('create()', '202, status running'), ('get()', 'poll until completed'), ('Result', 'kept for 24 hours')], 'file transcription, WAV'),
        (520, 'Session', [('createSession()', 'token + streamUrl'), ('WebSocket', 'stream in real time'), ('Close', 'pay for what you used')], 'streaming STT and TTS'),
    ]
    for x, title, steps, who in cols:
        d.zone(x, 16, 224, 298, title)
        y = 52
        for i, (a, b) in enumerate(steps):
            d.box(x + 16, y, 192, 58, a, b, accent=(i == len(steps) - 1))
            if i < len(steps) - 1:
                d.arrow([(x + 112, y + 58), (x + 112, y + 80)])
            y += 80
        d.note(x + 112, 300, who)
    return d


DIAGRAMS = {
    'how-it-works': how_it_works, 'voice-agent': voice_agent, 'live-captions': live_captions,
    'stt-session': stt_session, 'tts-session': tts_session, 'livestream': livestream,
    'webhooks': webhooks, 'call-styles': call_styles,
}

if __name__ == '__main__':
    out = os.path.join(sys.argv[1], 'assets', 'diagrams')
    os.makedirs(out, exist_ok=True)
    for name, fn in DIAGRAMS.items():
        open(os.path.join(out, name + '.svg'), 'w', encoding='utf-8').write(fn().svg())
        print('diagram', name)
