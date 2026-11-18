---
title: Dashboard guide
description: Where to find usage, cost, keys and limits in the dTelecom Cloud dashboard.
---

# Dashboard guide

The dashboard at [cloud.dtelecom.org](https://cloud.dtelecom.org) is where you manage keys, watch usage and pay. This page maps each screen to the question it answers.

## Projects

The project switcher is at the top of the sidebar. A project groups its own rooms, usage and API keys. All projects of an organization share one plan, one balance and one set of limits.

Use separate projects for separate apps or for staging and production, so their usage does not mix.

## Balance widget

Under the project switcher: the total balance, the plan with its renewal date, and purchased credits. Click it to open **Billing**.

## Overview

"Is everything working, and what am I spending?"

| Card | Shows |
| --- | --- |
| Balance | Total credits in dollars and credits. |
| Spend this cycle | Everything spent since the cycle started. |
| Sessions | Rooms in the selected period, and how many are live now. |
| Concurrent participants | Issued tokens, waiting to connect or active, against your plan limit, and the peak. A token counts from the moment it is issued; an unused token holds its slot until it expires. |
| Network status | Service status, with a link to [status.dtelecom.org](https://status.dtelecom.org), and your participants' average round-trip time. |
| Spend per hour | A chart split by WebRTC, Speech-to-Text, Text-to-Speech, Translation, Vision and Moderation. |
| Live sessions | Rooms that are live right now, with participants, duration and cost so far. |

Switch any chart between dollars and credits, and the period between 24 hours, 7 days and 30 days.

## Sessions

"What happened in my rooms, and what did each one cost?"

- **Participant-minutes** and **Spent on WebRTC**, with the split between audio and video tiers.
- **Concurrent participants vs limit**: the peak per hour against your plan limit. A "limit hit" mark means the cloud refused to issue some tokens.
- **Sessions table**: every room session with its status (`live`, `ended`, `rejected`), start time, duration, participants, media type and cost.

A `rejected` row is a token request that was refused, for one of two reasons: the concurrent participants limit was reached, or the balance was too low.

## AI services

"How much of each AI service am I using?"

One tab per service: Speech-to-Text, Text-to-Speech, Translation, Vision, Moderation. Each shows volume, request count, success rate, languages and spend, plus a chart of spend per hour **by API key**.

The first call to a service appears here within about a minute. Requests refused because of their input (422) are not counted in the success rate.

## Billing

| Block | What you do there |
| --- | --- |
| Current plan | See included usage, concurrency and rate limits; change or cancel the plan. |
| Credits | See included and purchased credits separately; top up. |
| Bandwidth add-on | Reserve bandwidth for a fixed monthly price (paid plans). |
| Auto top-up | Recharge automatically below a threshold, up to a monthly maximum. |
| Payment methods | Add or change a card. |
| Invoices | Download every invoice as PDF. |
| Rates | The current price of every service. |

See [Billing and credits](billing.md).

## API keys

Create, name and revoke keys. For each key the table shows who created it, when it was last used and how much it spent in the last 30 days.

- The secret is shown once, when the key is created. Store it right away.
- Every key has full access to its project.
- Name keys after where they are used: `production-api`, `staging`, `captions-bot`. The name is what you see in usage charts.

## Settings

| Tab | What it holds |
| --- | --- |
| General | Project name, project id, the API origin for `DTELECOM_CLOUD_URL`, archiving the project. |
| Alerts | An email when the balance falls below a threshold. The default is $5. |
| Quota and limits | The limits of your plan as they apply right now. |

**Archiving a project** revokes its keys and ends its live sessions. Sessions, usage and invoices stay visible, read-only, and the project can be restored. Keys that were revoked stay revoked after a restore: create new ones. To delete a project or the whole account permanently, write to `support@dtelecom.org`.

## Checking your integration

After your first calls, confirm that the dashboard shows what you expect:

1. Create a room with two participants and leave it after two minutes. **Sessions** should show one session, about four participant-minutes, and a cost of about $0.0004 for audio.
2. Make one AI call. The matching tab under **AI services** should show one request within a minute.
3. Open **API keys**. The key you used should show a recent "last used" time.

If a number looks wrong, compare it with the source. For Translation, Vision and Moderation that is `chargedMicrocredits` in the API response for the same request. For rooms it is the cost of the session in **Sessions**. Send both numbers to support.
