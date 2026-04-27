# Jenny Delivery Report

Date: 2026-04-27
Project: `/Users/wade/Developer/Jenny/senior-card-web`

## 這次實際修改

### Schema

- updated `supabase/jenny_core_schema.sql`
- added `supabase/migrations/20260427233000_jenny_formal_product_alignment.sql`
- updated `docs/data_dictionary.md`

### Website Admin

- `/cards`: Cloudinary upload flow, new series options, Cloudinary metadata persistence
- `/users`: user basic profile, district, today mood, today claim/checkin
- `/m02-admin`: diary list and 14-day egg progress
- `/m03-admin`: role, pair, volunteer, report, block overview
- `/info-admin`: district field management
- `/m03`: district input plus volunteer / report / block forms
- `/`: dashboard links updated

### LINE / API

- M01 webhook flow changed to mood -> series -> random 3 cards -> select
- M01 writes `user_daily_mood` and `user_daily_checkin`
- M02 diary auto-detects 50+ characters and enforces 10-entry cap
- M02 `entry_index` now written to `diary_entries`
- M02 egg progress changed to 14-day threshold
- M03 settings now persist district and little angel / little owner role flags
- M03 actions API now writes volunteer requests, reports, and blocks
- M04 now replies with carousel content and district-aware filtering

## 驗證

- `npm run lint` passed
- `npm run build` passed

## 手動設定

Cloudinary still requires formal environment variables:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- optional: `CLOUDINARY_UPLOAD_FOLDER`

Supabase migration still needs to be applied to the target remote database if it has not already been run.

## 殘留風險

- 若正式環境尚未設定 Cloudinary env，`/cards` 上傳會被阻擋
- 若 remote Supabase 尚未套用新 migration，新頁面與新流程會退回到缺表狀態
- M03 paid unlock remains schema-only and not payment-enabled
