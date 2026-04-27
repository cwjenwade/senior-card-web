# Jenny LINE Services

`senior-card-web` is the Next.js / Vercel project for the Jenny LINE prototype.

Product shape:

- `M01` 長輩圖上傳、標記、推薦、選圖記錄
- `M02` 日記輸入、14 天雞蛋進度、50 字門檻、18:00 / 20:00 提醒
- `M03` 關懷大使、被關懷設定、好友配對與聊天基礎
- `M04` 政策、鄰里活動、宮廟與社區資訊

`elderly-ml` remains a separate local Python prototype for `E02` and `E03` batch analysis. The web app does not reimplement the ML stack in Next.js. Instead, the web app now provides the product-facing storage shape that can receive those analysis outputs.

## Local Development

```bash
npm install
npm run dev
```

Open:

- Dashboard: `http://localhost:3000`
- Card admin: `http://localhost:3000/cards`
- Info admin: `http://localhost:3000/info-admin`
- LINE webhook health: `http://localhost:3000/api/line/webhook`
- System check JSON: `http://localhost:3000/api/admin/system-check`

## Environment Variables

Create `.env.local`:

```bash
cp .env.example .env.local
```

Recommended values:

```bash
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
APP_BASE_URL=
```

## Current Routes

- `/`
- `/cards`
- `/info-admin`
- `/api/line/webhook`
- `/api/m01/cards/[cardId]/image`
- `/api/cron/m02-reminders`
- `/api/cron/supabase-keepalive`
- `/api/admin/cards`
- `/api/admin/info`
- `/api/admin/system-check`
- `/api/admin/queues/run`
- `/api/admin/queues/update`

## Module Summary

## M01 今日長輩圖

Current v1 behavior:

- enter from rich menu or text trigger
- show 3 daily recommended cards
- render cards in a LINE Flex carousel
- read card metadata and `image_url` from `card_catalog`
- allow one daily main-card selection
- allow one refresh per day
- allow `favorite` recording
- write recommendation snapshots to `daily_card_recommendations`
- write `view` / `refresh` / `select` / `favorite` / `diary_written` actions to `card_interactions`
- create a guided prompt for M02 after selection

Admin:

- `/cards`
- create / edit / preview / active / inactive
- filter by `style_main` / `tone` / `status`

Triggers:

- `今日長輩圖`
- `長輩圖`
- `m01`

Postbacks:

- `module=m01&action=start`
- `module=m01&action=refresh`
- `module=m01&action=select&card_id=...`

## M02 看圖寫一句

Current v1 behavior:

- enter from rich menu, trigger text, or after M01 selection
- accept free text while the M02 session is waiting
- minimum `50` characters
- maximum `300` Chinese characters
- one valid completion per day
- duplicate completion is blocked and not re-counted
- write legacy rows to `line_diary_entries`
- write product rows to `diary_entries`
- preserve `linked_card_id`
- update `egg_progress`
- mark analysis state as `pending`
- support a reminder batch route at `18:00` and `20:00` Taipei time when M03 reminder is enabled

Triggers:

- `看圖寫一句`
- `寫日記`
- `寫日記換雞蛋`
- `m02`

Postback:

- `module=m02&action=start`

## M03 關懷與配對

Current v1 behavior:

- enter from rich menu or text trigger
- if not configured, run a lightweight setting flow:
  1. ask for display name
  2. ask whether diary reminders are welcome
  3. ask whether the elder wants to be a care ambassador
  4. ask whether the elder wants to be cared for
  5. ask whether the elder wants to join chat matching
- write results to `participants` and placeholder `partner_links`
- if already configured, show a compact summary and allow restart

Triggers:

- `關懷與配對`
- `關懷大使`
- `好友配對`
- `m03`

Postbacks:

- `module=m03&action=start`
- `module=m03&action=restart`
- `module=m03&action=set_option&setting=...&value=yes|no`

## M04 最新活動與政策

Current v1 behavior:

- `M04` is now an information service module
- LINE users can read recent:
  - policy
  - neighborhood
  - temple
  - community
- admin content management is available at `/info-admin`
- category filtering and status editing are included

Internal queue note:

- `partner_prompt_queue` and `internal_review_queue` are still kept as internal routing mechanisms
- they are no longer presented as the M04 front-end module

## Storage Model

Formal product tables are defined in:

- `supabase/jenny_core_schema.sql`

Current product-layer target tables:

- `participants`
- `card_catalog`
- `card_preferences`
- `card_interactions`
- `daily_card_recommendations`
- `guided_diary_prompts`
- `diary_entries`
- `egg_progress`
- `partner_links`
- `community_info`
- `partner_prompt_queue`
- `internal_review_queue`

Legacy compatibility tables still used:

- `line_interaction_events`
- `line_diary_entries`

If the formal product tables do not yet exist in Supabase, the app falls back to local JSON storage under `storage/product-store` for the new product tables while still using legacy webhook-compatible storage where available.

## External Card Asset Mode

This project now treats elder-card images as external assets.

- image files are not stored in Supabase Storage
- this project stores only card metadata plus `image_url`
- new cards are created from the lightweight admin page at `/cards`
- recommendation, interaction, and diary linkage still use `card_id`
- future providers can be Cloudinary, ImageKit, or any externally hosted image URL

Current behavior:

- `M01`, `M03`, and the rule-based `E01` recommendation path read from `card_catalog`
- displayed card images use `image_url`
- built-in CC0 fallback is disabled as a formal source
- CC0 fallback is disabled
- `/api/m01/cards/[cardId]/image` remains only as a legacy redirect to the external `image_url`

Current minimal `card_catalog` fields:

- `card_id`
- `card_title`
- `image_provider`
- `image_url`
- `image_key`
- `style_main`
- `style_sub`
- `tone`
- `imagery`
- `text_density`
- `energy_level`
- `caption_text`
- `default_prompt`
- `status`
- `uploaded_by`
- `created_at`
- `updated_at`

## Rich Menu

Temporary rich menu generator:

```bash
npm run line:create-rich-menu
```

This script:

1. loads `.env.local`
2. generates `public/rich-menu-m01-m04-temp.png`
3. creates a LINE rich menu
4. uploads the image
5. sets it as the default rich menu

Current temporary 4-slot layout:

- top-left: `今日長輩圖`
- top-right: `看圖寫一句`
- bottom-left: `關懷與配對`
- bottom-right: `最新活動與政策`

To check the currently bound menu:

```bash
curl -H "Authorization: Bearer $LINE_CHANNEL_ACCESS_TOKEN" https://api.line.me/v2/bot/user/all/richmenu
```

## Audit And Reports

Generated documentation:

- `docs/system_audit_report.md`
- `docs/data_dictionary.md`
- `docs/system_completion_report.md`
- `docs/manual_analysis_e2e_report.md`

The live system check route is:

```text
/api/admin/system-check
```

## Manual Batch Analysis Loop

The cross-project manual loop is now scripted:

```bash
npm run batch:check-tables
npm run batch:export-diaries
npm run batch:run-manual-loop
```

What `batch:run-manual-loop` does:

1. export product `diary_entries` to `elderly-ml/data/jenny_diary_export.csv`
2. export raw diary text to `elderly-ml/data/jenny_raw_diary_export.csv`
3. run `elderly-ml/src/analyze_diary.py`
4. run `elderly-ml/src/run_e02_prediction.py`
5. run `elderly-ml/src/run_e03_rules.py`
6. import analysis fields back into product `diary_entries`
7. update `egg_progress`
8. upsert `partner_prompt_queue` and `internal_review_queue`
9. write `docs/manual_analysis_e2e_report.md`

This turns the batch prototype into an operational manual workflow without moving E02/E03 into Next.js.

## How To Validate M01-M04

## 1. Baseline checks

Run:

```bash
npm run lint
npm run build
```

Then open:

- `/`
- `/api/admin/system-check`

## 2. M01 validation

In LINE:

1. Tap `今日長輩圖`.
2. Confirm 3 cards appear in a carousel.
3. Tap `換一組` once and confirm a second refresh is blocked.
4. Select one card.
5. Confirm selecting again on the same day is blocked.

Expected data:

- `daily_card_recommendations` updated
- `card_interactions` contains `view`, optional `refresh`, and `select`

## 3. M02 validation

In LINE:

1. Tap `看圖寫一句`.
2. Send a short message under 50 characters and confirm it is rejected.
3. Send a valid diary entry.
4. Send another diary entry on the same day and confirm it is blocked.

Expected data:

- `diary_entries` contains the row
- `linked_card_id` is populated if M01 selected a card first
- `egg_progress` recalculates to a 14-day window

## 4. M03 validation

In LINE:

1. Tap `關懷與配對`.
2. Enter a display name.
3. Choose whether diary reminders are welcome.
4. Choose whether the elder wants to be a care ambassador.
5. Choose whether the elder wants to be cared for.
6. Choose whether the elder wants chat matching.
7. Tap `關懷與配對` again and confirm the summary is shown.

Expected data:

- `participants`
- placeholder `partner_links`

## 5. M04 validation

In the admin and LINE flow:

1. Open `/info-admin`.
2. Add one `policy` or `community` row.
3. In LINE tap `最新活動與政策`.
4. Confirm recent information is shown.
5. Tap category buttons and confirm category-specific replies.

Expected data:

- `community_info`

## 6. Manual setup still required

Even after code is deployed, these steps remain manual:

- apply `supabase/jenny_core_schema.sql`
- configure LINE webhook URL in the LINE console
- bind or rebuild the LINE rich menu
- deploy the app to Vercel with the correct environment variables

## Deploy

Build:

```bash
npm run build
```

Deploy to Vercel:

```bash
vercel --prod
```

## Notes

- This is not a reply bot.
- High-risk outputs are only for routing and manual review, not medical diagnosis.
- `E02` and `E03` batch logic still lives in `elderly-ml`.
