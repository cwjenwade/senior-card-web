# M03 Friend Care Implementation Report

Generated on 2026-04-27.

## A. Files Changed

- `README.md`
- `docs/data_dictionary.md`
- `docs/m03_friend_care_design.md`
- `src/app/api/cron/m02-reminders/route.ts`
- `src/app/api/line/webhook/route.ts`
- `src/app/api/m03/settings/route.ts`
- `src/app/api/m03/actions/route.ts`
- `src/app/m03/page.tsx`
- `src/app/page.tsx`
- `src/lib/jenny-product-store.ts`
- `src/lib/system-check.ts`
- `supabase/jenny_core_schema.sql`
- `supabase/migrations/20260426234000_jenny_core_schema.sql`
- `supabase/migrations/20260427220000_m03_friend_care_v1.sql`

## B. New Or Changed Columns And Tables

### `participants`

Added canonical M03 columns:

- `wants_reminders`
- `wants_to_help_others`
- `wants_to_be_cared_for`
- `wants_chat_matching`

Compatibility mirror columns remain:

- `reminder_opt_in`
- `care_ambassador_opt_in`
- `wants_care`
- `chat_match_opt_in`

### `partner_links`

Adjusted to support formal pair usage:

- `link_id`
- `link_type`
- `status`
- `match_status`
- `chat_enabled`
- `updated_at`

Formal link types:

- `care_pair`
- `chat_pair`

Formal statuses:

- `pending`
- `matched`
- `paused`
- `closed`

### `care_events`

New table:

- `event_id`
- `participant_id`
- `target_participant_id`
- `event_type`
- `note`
- `created_at`

## C. M03 Front-End Functions

The new `/m03` page now shows:

- display name
- reminder switch
- helper switch
- cared-for switch
- chat-matching switch
- whether a care partner exists
- whether a chat partner exists
- current pair status
- low-intensity buttons:
  - `送出問候`
  - `今天想聊聊`
  - `今天願意打電話`
  - `今天可被安排`
- chat matching controls:
  - `暫停`
  - `恢復`
  - `退出`
- recent `care_events`

Important runtime rule:

- if the remote M03 schema is not ready, `/m03` shows a setup-needed message instead of writing to local fallback

## D. Pairing Rules

### Care Pair

- `wants_to_help_others = true` makes the elder a helper candidate
- `wants_to_be_cared_for = true` makes the elder a cared-for candidate
- first version uses rule-based pairing only
- first version prefers one-to-one matching
- if no helper is available, a `pending` care-pair row is kept

### Chat Pair

- both sides must have `wants_chat_matching = true`
- no free search exists
- system pairing only
- if no chat partner is available, a `pending` chat-pair row is kept

## E. Linkage With M02 Reminders

`/api/cron/m02-reminders` now reads `participants.wants_reminders`.

Rules:

- if `wants_reminders = false`, the elder is skipped
- if `wants_reminders = true`, the route may send the reminder
- changing the M03 switch affects the next reminder check immediately because the route reads the current remote participant row

## F. Remaining Placeholders

- no full chat window exists
- no free-search friend discovery exists
- matching is still a simple first-version rule flow
- mirrored partner rows are basic and do not yet implement advanced balancing
- remote migration has not been applied in this environment yet, so true remote M03 writes remain blocked until the latest migration is pushed

## G. How To Validate Locally

1. Run:

```bash
npm install
npm run dev
npm run lint
npm run build
```

2. Open:

- `/m03`
- `/api/admin/system-check`
- `/api/cron/m02-reminders?dry_run=1&hour=18`

3. Current local validation completed:

- `npm run lint` passed
- `npm run build` passed
- `/m03` returned `200`
- `/m03` rendered:
  - `我的設定`
  - `我的配對狀態`
  - `今天的關懷`
  - `聊天配對基礎`
- `/api/admin/system-check` reports:
  - `M03 care and matching settings` completed
- `/api/cron/m02-reminders?dry_run=1&hour=18` returned `ok: true`

4. Current blocker:

- remote still misses:
  - `care_events`
  - earlier missing `community_info`
- without the latest `db push`, M03 routes intentionally refuse to fall back to local storage

## H. How To Validate In LINE

1. Tap `關懷與配對`
2. Enter a display name
3. Choose whether reminders are welcome
4. Choose whether the elder wants to help others
5. Choose whether the elder wants to be cared for
6. Choose whether the elder wants chat matching
7. Open `關懷與配對` again and confirm the summary text appears
8. Tap:
   - `送出問候`
   - or `今天想聊聊`
   - or `今天願意打電話`

Expected data after remote migration is applied:

- `participants` updated
- `partner_links` updated
- `care_events` receives a new row

## Manual Step Still Required

To make M03 fully write to remote:

```bash
cd /Users/wade/Developer/Jenny/senior-card-web
export SUPABASE_DB_PASSWORD='your_database_password'
supabase db push --linked
unset SUPABASE_DB_PASSWORD
```

After that, verify again:

```bash
curl http://localhost:3000/api/admin/system-check
```
