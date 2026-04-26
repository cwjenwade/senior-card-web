# Jenny LINE Services

`senior-card-web` is the Next.js / Vercel project for:

1. the operator dashboard
2. the LINE webhook service
3. M01 greeting-card selection
4. M02 diary-for-eggs activity flow

`elderly-ml` stays local as a separate Python / ML project.
It is not deployed to Vercel, and E02 / E03 do not run inside this Next.js app.

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

The only valid webhook path is:

```text
/api/line/webhook
```

Do not use:

```text
/api/webhook
```

## M01

M01 only does:

- greeting-card production flow
- mood selection
- text type selection
- visual series selection
- recommending three cards
- selecting / disliking / refreshing cards

M01 does not:

- write diaries
- ask for short text
- ask for free text
- trigger E02 / E03
- do semantic analysis

M01 test text triggers:

- `製作長輩圖`
- `長輩圖`
- `今日長輩圖`
- `m01`

M01 postback actions:

- `module=m01&action=start`
- `module=m01&action=set_mood&mood=...`
- `module=m01&action=set_text_type&text_type=...`
- `module=m01&action=set_visual_series&visual_series=...`
- `module=m01&action=select&card_id=...`
- `module=m01&action=dislike&card_id=...`
- `module=m01&action=refresh`

## M02

M02 is the diary-for-eggs activity flow.

M02 only does:

- start diary collection
- wait for `日記：` input
- validate length
- create one diary record per day
- mark the day as completed

M02 does not:

- generate greeting cards
- recommend greeting cards
- trigger E02 / E03
- do semantic analysis

M02 test text triggers:

- `寫日記換雞蛋`
- `寫日記`
- `今日日記`
- `m02`

M02 diary rules:

- input must start with `日記：`
- minimum `100` Chinese characters
- maximum `300` Chinese characters
- fewer than `100` does not complete the day
- more than `300` is rejected
- one completed entry per day

## Current Runtime Storage

M01 and M02 currently use in-memory stores:

- `src/lib/m01-session-store.ts`
- `src/lib/m02-diary-store.ts`

This is good enough for local testing and early webhook flow checks.

Important:

- Vercel serverless does not guarantee in-memory persistence
- formal production storage should move to Supabase

## Unknown Text Handling

This app is not a chatbot.

Undefined text is always answered with:

```text
請從下方選單選擇服務。
```

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
