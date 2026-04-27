# Module Redefinition Audit

Generated on 2026-04-27.

This audit compares the current implementation in `senior-card-web` with the new formal M01-M04 definitions.

## 1. Current M01 Parts That Can Be Reused

Reusable now:

- external `image_url` card source is already in place through `card_catalog`
- M01 already recommends 3 cards per day
- M01 already supports one refresh per day
- M01 already supports one selected main card per day
- M01 already writes recommendation snapshots to `daily_card_recommendations`
- M01 already writes `view`, `refresh`, and `select` actions to `card_interactions`
- M01 already bridges the selected main card into `guided_diary_prompts` and M02
- card admin page `/cards` already supports create, edit, preview, active/inactive, and basic filtering

Needs adjustment:

- there is no explicit `favorite` action in the formal runtime
- README and copy still describe old wording in places

## 2. Current M02 Parts That Can Be Reused

Reusable now:

- one diary per day logic already exists
- `linked_card_id` is already written into `diary_entries`
- duplicate completion is already blocked
- 14-day egg progress already uses `egg_progress`
- `analysis_status = pending` is already written before analysis
- front-end progress reply already exists

Needs adjustment:

- current minimum diary threshold is `20` Chinese characters, not the new required threshold
- no 18:00 / 20:00 reminder route or batch logic exists yet
- reminder enablement is not controlled by M03 settings yet
- current progress wording is tuned to the old 10-day threshold

## 3. Current M03 Parts That Do Not Match The New Definition

Current M03 is still closer to:

- lightweight profile + 3 liked cards + optional partner reminder

Mismatch with new definition:

- current naming is still `我的小檔案`
- current flow still asks the elder to choose 3 liked cards
- current settings do not include:
  - reminder opt-in
  - care ambassador opt-in
  - wants-to-be-cared-for opt-in
  - chat matching opt-in
- current summary text does not reflect ambassador / cared-for / chat state
- current link model is only `wants_partner`, not the fuller relationship configuration

## 4. Current M04 Parts That Do Not Match The New Definition

Current M04 in the app still points to:

- `partner_prompt_queue`
- `internal_review_queue`
- queue management on the dashboard

Mismatch with new definition:

- new M04 should be policy / neighborhood / temple / community information
- current queue system is an internal mechanism, not a front-end module
- there is no `info` table, no info admin page, and no front-end info reply yet

## 5. Existing Admin / Backend Pages

Current pages:

- `/`
  - dashboard for product tables, participants, egg progress, queue status
- `/cards`
  - elder card admin page

Current admin APIs:

- `/api/admin/cards`
- `/api/admin/system-check`
- `/api/admin/queues/run`
- `/api/admin/queues/update`

## 6. Existing Data Tables

Current formal product tables:

- `participants`
- `card_catalog`
- `card_preferences`
- `card_interactions`
- `daily_card_recommendations`
- `guided_diary_prompts`
- `diary_entries`
- `egg_progress`
- `partner_links`
- `partner_prompt_queue`
- `internal_review_queue`

Legacy compatibility tables still present:

- `line_interaction_events`
- `line_diary_entries`

Missing for the new formal definition:

- no dedicated M04 information table yet
- no explicit M03 preference columns for reminder / ambassador / chat matching yet

## 7. Existing Rich Menu Four Slots

Current temporary rich menu script binds:

- top-left: `今日長輩圖` -> `module=m01&action=start`
- top-right: `看圖寫一句` -> `module=m02&action=start`
- bottom-left: `我的雞蛋進度` -> `module=egg&action=start`
- bottom-right: `我的小檔案` -> `module=m03&action=start`

Mismatch with new definition:

- bottom-left should no longer be a standalone egg module
- bottom-right wording should become care / matching
- there is no M04 information entry in rich menu yet

## 8. Current Routes / APIs That Can Be Reused

Can be reused directly or with small copy changes:

- `/api/line/webhook`
- `/cards`
- `/api/admin/cards`
- `/api/admin/system-check`
- `card_catalog`
- `card_interactions`
- `diary_entries`
- `egg_progress`
- `partner_links`

Can be reused as internal-only mechanisms:

- `/api/admin/queues/run`
- `/api/admin/queues/update`
- `partner_prompt_queue`
- `internal_review_queue`

## 9. Routes / APIs That Need Renaming Or Rewriting

Need rewriting or semantic repositioning:

- `/`
  - homepage wording still treats queue as M04
- `/api/line/webhook`
  - M03 flow and M04 flow need redefinition
- `scripts/create-rich-menu.mjs`
  - menu labels and slot meanings need updating

Need to be added:

- M04 information admin route
- M04 information front-end list / reply path
- M02 reminder batch / cron route

## 10. Old Queue / Care Rules That Should Be Preserved Internally

These should remain as internal mechanisms, but not be presented as M04:

- `partner_prompt_queue`
- `internal_review_queue`
- `runQueueDetection()`
- batch analysis outputs from `elderly-ml`

New wording guidance:

- queue = internal reminder / routing mechanism
- M04 = information service module

## Summary

High-confidence reuse:

- M01 storage and admin foundation
- M02 diary + egg progress core
- remote Supabase product mainline
- external image URL card model

Main redefinition work still needed:

- M02 threshold + reminder logic
- M03 settings and terminology
- M04 info-service table, admin, and LINE reply
- homepage / README / rich menu naming alignment
