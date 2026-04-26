# Jenny M01 Admin + LINE Webhook

This app is the Vercel-hosted control panel for `M01 長輩圖`.

It serves two jobs:

1. A web dashboard for card library, templates, recommendation rules, and LINE interaction review.
2. A LINE Messaging API webhook implemented in Next.js / Node.

The elder-facing experience is intended to run inside LINE with buttons and Flex Messages. This website is the operator backend.

## Local Development

```bash
npm install
npm run dev
```

Open:

- Dashboard: `http://localhost:3000`
- Webhook health check: `http://localhost:3000/api/line/webhook`

## Environment Variables

Create `.env.local`:

```bash
cp .env.example .env.local
```

Required values:

```bash
LINE_CHANNEL_SECRET=your_line_channel_secret
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
CRON_SECRET=your_random_cron_secret
```

## LINE Webhook

Route:

```text
/api/line/webhook
```

In local dev, the route is:

```text
http://localhost:3000/api/line/webhook
```

In production on Vercel, the route will be:

```text
https://your-domain/api/line/webhook
```

The webhook currently supports:

- Text trigger:
  - `長輩圖`
  - `今日長輩圖`
  - `m01`
- Button flow:
  - mood selection
  - text type selection
  - visual series selection
  - return three recommended cards
  - select / dislike card
- Temporary diary input pattern:
  - message starting with `日記：`

## Storage

This app now uses Supabase first for LINE interaction events and diary text.

Expected tables:

```text
line_interaction_events
line_diary_entries
```

If Supabase is unavailable or the tables do not exist yet, the app falls back to server-side JSONL files.

Local development path:

```text
storage/m01_line_events.jsonl
storage/m01_diary_entries.jsonl
```

On Vercel, the current fallback uses temporary runtime storage under `/tmp/jenny-m01`.
That is enough for early testing, but it is not long-term persistent storage. We should move this to durable storage before production rollout.

## Supabase Keepalive Cron

To reduce the chance of an inactive free-tier project going cold, this app includes a server-side keepalive route:

```text
/api/cron/supabase-keepalive
```

It is scheduled in `vercel.json` and is protected by:

```bash
CRON_SECRET
```

The route pings these two Supabase tables with a minimal read:

- `line_interaction_events`
- `line_diary_entries`

Note: this is only a lightweight keepalive pattern. It is not a platform guarantee against Supabase pausing a free project.

## Current M01 Design Boundary

This app can do:

- Manage pre-made greeting cards
- Manage template presets
- Configure recommendation weights
- Reply to LINE webhook events
- Return Flex Message card recommendations

This app does not yet do:

- Persist LINE selections to a database
- Persist diary text to formal M02 storage
- Run E02 / E03 training inside Vercel
- Make care decisions automatically

## Build Check

```bash
npm run lint
npm run build
```

## Deploy

This project is already linked to the Vercel project `v0-line-senior-card`.

Deploy with:

```bash
vercel --prod
```
