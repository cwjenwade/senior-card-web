# M03 Remote Validation Report

Date: 2026-04-27
Target: `localhost:3000` with remote Supabase from `.env.local`

## Scope

Only validated remote table existence, system-check alignment, and reminder read path.
No product feature changes were made.

## 1. API Calls

### `/api/admin/system-check`

Result: `200 OK`

Key result:

- `missing: []`
- `tables` includes:
  - `care_events: available=true`
  - `community_info: available=true`
- `formal product tables` is `completed`

### `/api/m03/settings`

Result: `405 Method Not Allowed`

This is expected for a direct GET request. The route at [src/app/api/m03/settings/route.ts](/Users/wade/Developer/Jenny/senior-card-web/src/app/api/m03/settings/route.ts:1) only exports `POST`.

Remote usage check:

- Before write, it calls `hasRequiredTables(["participants", "partner_links", "care_events"])`
- Current remote validation shows those tables are available
- Therefore the route is remote-ready for normal form POST usage

### `/api/cron/m02-reminders?dry_run=1&hour=18`

Result:

```json
{"ok":true,"dryRun":true,"hour":18,"today":"2026-04-27","eligibleCount":0,"results":[]}
```

Interpretation:

- Route executed successfully against remote-backed participant data
- No eligible participant needed an 18:00 reminder in this run

## 2. `system-check.ts` Table Validation Logic

`runSystemCheck()` in [src/lib/system-check.ts](/Users/wade/Developer/Jenny/senior-card-web/src/lib/system-check.ts:24) calls `listKnownTables()`.

`listKnownTables()` in [src/lib/jenny-product-store.ts](/Users/wade/Developer/Jenny/senior-card-web/src/lib/jenny-product-store.ts:283) checks these tables:

- `participants`
- `card_preferences`
- `card_interactions`
- `daily_card_recommendations`
- `guided_diary_prompts`
- `diary_entries`
- `egg_progress`
- `partner_links`
- `care_events`
- `community_info`
- `partner_prompt_queue`
- `internal_review_queue`

Actual existence check path:

- `listKnownTables()`
- `tableAvailable()`
- `hasTable()` in [src/lib/supabase-rest.ts](/Users/wade/Developer/Jenny/senior-card-web/src/lib/supabase-rest.ts:23)
- REST probe: `GET {SUPABASE_URL}/rest/v1/<table>?select=*&limit=1`

## 3. Old Name / Schema Check

Findings:

- `system-check` is not checking old table names
- `care_events` matches migration naming
- `community_info` matches migration naming
- No wrong schema name is hardcoded in `system-check.ts`
- The code assumes Supabase REST default exposure for `public` tables, which matches the migrations

Relevant constants:

- `careEvents: "care_events"`
- `communityInfo: "community_info"`

These are defined in [src/lib/jenny-product-store.ts](/Users/wade/Developer/Jenny/senior-card-web/src/lib/jenny-product-store.ts:149).

## 4. Migration Verification

### `20260427193000_module_redefinition_alignment.sql`

Verified it contains:

- `create table if not exists public.community_info (...)`
- `create index if not exists idx_community_info_category_status ...`
- seed/upsert into `public.community_info`

Reference: [supabase/migrations/20260427193000_module_redefinition_alignment.sql](/Users/wade/Developer/Jenny/senior-card-web/supabase/migrations/20260427193000_module_redefinition_alignment.sql:12)

### `20260427220000_m03_friend_care_v1.sql`

Verified it contains:

- `create table if not exists public.care_events (...)`
- `create index if not exists idx_care_events_participant_time ...`

Reference: [supabase/migrations/20260427220000_m03_friend_care_v1.sql](/Users/wade/Developer/Jenny/senior-card-web/supabase/migrations/20260427220000_m03_friend_care_v1.sql:45)

Conclusion:

- Both required tables are created by migration SQL
- No missing SQL needed to be added

## 5. Direct Remote Evidence

Direct Supabase REST reads against the configured remote returned:

### A. `care_events` exists on remote

Query succeeded:

- `GET /rest/v1/care_events?select=event_id&limit=1`
- Response: `[]`

Interpretation:

- Table exists
- It currently has zero rows in remote

### B. `community_info` exists on remote

Query succeeded:

- `GET /rest/v1/community_info?select=info_id&limit=2`
- Response included:
  - `info-policy-001`
  - `info-neighborhood-001`

Interpretation:

- Table exists
- Remote data is present and selectable

## 6. Why `system-check` Previously Reported Missing

Current code does not reproduce the issue. On 2026-04-27, `/api/admin/system-check` reports both tables available.

The most credible cause of the earlier `missing` result is environmental timing, not current code mismatch:

- earlier docs recorded that remote migrations had not yet been applied in that environment
- see [docs/m01_m04_redefinition_report.md](/Users/wade/Developer/Jenny/senior-card-web/docs/m01_m04_redefinition_report.md:250), which explicitly said `community_info` was not yet available remotely

So:

- original missing status was consistent with an earlier remote schema state
- current repository code is aligned with current migration table names
- no verification-logic fix is required in the present codebase

## 7. Post-Fix / Current Validation Result

### D. Current validation result

Current result after revalidation:

- `care_events`: available on remote
- `community_info`: available on remote
- `/api/admin/system-check`: `200 OK`
- `formal product tables`: `completed`
- `missing`: empty

No code change to `system-check.ts` was necessary because the current logic already aligns with the live remote schema.

## 8. `/api/m03/settings` Remote Readiness

### E. `/api/m03/settings` can use remote normally

Direct GET is not the correct invocation and returns `405`.

For actual usage:

- route is POST-only
- route validates remote tables before writing
- required remote tables are currently available

Conclusion:

- `/api/m03/settings` is remote-ready for its intended POST flow

## 9. Reminder Flag Validation

### F. M02 reminder still reads `wants_reminders` correctly

Evidence:

- `src/app/api/cron/m02-reminders/route.ts` filters with `if (!participant.wants_reminders) continue;`
- `listParticipants()` normalizes `wants_reminders` from remote `wants_reminders ?? reminder_opt_in`
- direct remote read returned:
  - `Uremotecheck001`: `wants_reminders=true`, `reminder_opt_in=true`
  - `Uremotecheck002`: `wants_reminders=false`, `reminder_opt_in=false`
- reminder API executed successfully with `dry_run=1`

Conclusion:

- M02 reminder logic is still reading `wants_reminders`
- backward-compatible fallback from `reminder_opt_in` also remains in place

## Final Conclusion

- `care_events` exists in remote
- `community_info` exists in remote
- current `system-check` table names and lookup path are aligned with migrations
- no schema-name bug or old-table-name bug is present in the current code
- no migration patch was needed
- no product feature change was made
