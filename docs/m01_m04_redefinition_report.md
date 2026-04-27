# M01-M04 Redefinition Report

Generated on 2026-04-27.

## A. Formal Module Definitions After Redefinition

### M01

`M01` now represents:

- elder-card metadata management
- external `image_url` card recommendation
- one daily main-card selection
- one refresh per day
- view / favorite / select / diary-written recording

### M02

`M02` now represents:

- one diary per day
- 14-day egg progress
- 50-character minimum threshold
- reminder eligibility at 18:00 and 20:00

### M03

`M03` now represents:

- display name
- reminder opt-in
- care ambassador opt-in
- wants-care opt-in
- chat matching opt-in
- lightweight summary and restart flow

### M04

`M04` now represents:

- policy information
- neighborhood activity information
- temple activity information
- community activity information

## B. Old Features Preserved As Internal Mechanisms

Preserved internally:

- `partner_prompt_queue`
- `internal_review_queue`
- `runQueueDetection()`
- batch analysis bridge from `elderly-ml`

These are no longer presented as the public M04 module.

## C. Completed In This Round

Completed in code:

- added `community_info` table to schema and migrations
- added M03 participant fields to schema and store layer:
  - `reminder_opt_in`
  - `care_ambassador_opt_in`
  - `wants_care`
  - `chat_match_opt_in`
  - `m03_completed_at`
- extended `partner_links` for placeholder matching semantics
- added `/info-admin`
- added `/api/admin/info`
- added `/api/cron/m02-reminders`
- updated webhook triggers and postbacks for:
  - M01 favorite
  - M03 care / matching settings
  - M04 information service
- updated rich menu generator to:
  - `今日長輩圖`
  - `看圖寫一句`
  - `關懷與配對`
  - `最新活動與政策`
- rebuilt the default LINE rich menu to:
  - `richmenu-4b44735870c4863840c1843e11706e22`
- updated README and data dictionary wording
- kept CC0 fallback disabled as a formal M01 source

Validation completed locally:

- `npm run lint`
- `npm run build`
- `/cards` returns `200`
- `/info-admin` returns `200`
- `/api/admin/system-check` reports `M04 info service` completed locally
- `/api/cron/m02-reminders?dry_run=1&hour=18` returns `ok: true`

## D. Remaining Placeholders

Still placeholder / limited:

- M03 does not implement a full chat system
- partner / chat matching is still placeholder-pool based
- M02 reminders are implemented as cron / batch route logic, not a fully scheduled deployment
- internal queue UI is still on the dashboard and has not been given a separate internal operations page

## E. How To Validate Locally

1. Install and run:

```bash
npm install
npm run dev
```

2. Open:

- `/`
- `/cards`
- `/info-admin`
- `/api/admin/system-check`

3. Reminder dry run:

```bash
curl "http://localhost:3000/api/cron/m02-reminders?dry_run=1&hour=18"
curl "http://localhost:3000/api/cron/m02-reminders?dry_run=1&hour=20"
```

4. Build check:

```bash
npm run lint
npm run build
```

## F. How To Validate Through LINE

1. Rebuild rich menu after updating script:

```bash
npm run line:create-rich-menu
```

2. In LINE verify:

- `今日長輩圖` enters M01
- `看圖寫一句` enters M02
- `關懷與配對` enters M03
- `最新活動與政策` enters M04

3. M01 validation:

- receive 3 recommended cards
- favorite one card
- select one main card
- write diary after selection

4. M03 validation:

- enter display name
- toggle reminder
- toggle care ambassador
- toggle wants-care
- toggle chat matching
- re-open M03 and confirm summary text

5. M04 validation:

- enter M04
- switch among policy / neighborhood / temple / community categories

Current note:

- this round follows the detailed rule section and acceptance checks, so the effective M02 minimum is `50` characters rather than `100`

## G. How To Add An External Elder Card

1. Open `/cards`
2. Fill:
   - `image_url`
   - `card_title`
   - `style_main`
   - `style_sub`
   - `tone`
   - `imagery`
   - `text_density`
   - `energy_level`
   - `caption_text`
   - `default_prompt`
   - `status`
3. Submit
4. Confirm the card appears in the list and is `active`

## H. How To Add Policy Or Activity Information

1. Open `/info-admin`
2. Fill:
   - `title`
   - `category`
   - `description`
   - `event_date`
   - `location`
   - `contact`
   - `status`
3. Submit
4. Re-open M04 in LINE and confirm the category can read it

## I. How To Check Reminder And Matching Settings

Check through M03 summary:

- reminder on/off
- care ambassador on/off
- wants-care on/off
- chat matching on/off

Check through dashboard:

- participant row pills

Check reminder route:

- `/api/cron/m02-reminders?dry_run=1&hour=18`
- `/api/cron/m02-reminders?dry_run=1&hour=20`

## J. Whether CC0 Dependency Still Remains

Formal runtime dependency:

- no

Retained legacy files:

- `src/lib/m01-cc0.ts`
- `/api/m01/cards/[cardId]/image`

Current meaning:

- retained only for compatibility / legacy reference
- not intended as the formal M01 source

## Important Current Limitation

The new schema for:

- `community_info`
- new M03 columns on `participants`
- extended `partner_links`

has been prepared in migrations, but remote verification in this environment still shows:

- `community_info` is not available remotely yet
- new M03 participant columns are not yet selectable remotely

This means one manual step is still required:

```bash
cd /Users/wade/Developer/Jenny/senior-card-web
export SUPABASE_DB_PASSWORD='your_database_password'
supabase db push --linked
unset SUPABASE_DB_PASSWORD
```

After that, re-run:

```bash
curl http://localhost:3000/api/admin/system-check
```

and validate `/info-admin` plus the M03 setting writes again.

Until that migration is applied remotely:

- `community_info` will use local fallback storage in this environment
- `/info-admin` already works locally and currently shows one test row:
  - `社區共餐試辦`
