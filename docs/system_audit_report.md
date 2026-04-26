# System Audit Report

Generated on 2026-04-26.

## Scope

This audit reviews the current state of:

- Next.js app routes
- LINE webhook handlers
- rich menu binding
- M01 to M04 coverage
- storage layers
- Supabase usage
- prototype analysis integration

## Current Routes

Current app routes discovered from `next build`:

- `/api/line/webhook`
- `/api/m01/cards/[cardId]/image`
- `/api/cron/supabase-keepalive`

There is currently no dashboard page, no M04 queue page, and no admin system check route in the app router output.

## Current Webhook Handlers

The LINE webhook currently supports:

- `follow`
- `postback` for `module=m01`
- `postback` for `module=m02&action=start`
- text triggers for `M01`
- text triggers for `M02`
- text input handling for `M02` diary submission

There is currently no webhook handling for:

- `M03`
- `M04`
- egg progress inquiry
- profile summary inquiry

## Current Rich Menu Status

LINE API check shows the currently bound default rich menu is:

- `richMenuId`: `richmenu-c05e8ce6212f3d1f713b58fbd718a002`
- name: `M01 M02 Test Menu`
- selected: `true`

Current areas:

- left: `製作長輩圖` -> `module=m01&action=start`
- right: `寫日記換雞蛋` -> `module=m02&action=start`

This is only a temporary 2-slot menu and does not yet cover M03 or egg progress.

## M01 Status

Current M01 state:

- LINE can enter M01 from text trigger or rich menu postback.
- The flow currently asks for:
  - mood
  - text type
  - visual series
- Then it renders a LINE Flex carousel with 3 cards.
- User can select a card.
- User can refresh recommendations.
- Selected cards are rendered through `/api/m01/cards/[cardId]/image`.

Current gaps against the target brief:

- M01 is still a multi-step preference picker, not a simpler "today's three cards" flow.
- Refresh is not limited to once per day.
- Selection events are not yet written to a formal `card_interactions` table.
- Daily recommendations are not yet written to `daily_card_recommendations`.
- Guided diary prompts are not yet written to `guided_diary_prompts`.
- There is no "我的雞蛋進度" entry.

## M02 Status

Current M02 state:

- LINE can enter M02 from text trigger or postback.
- The user must send text prefixed with `日記：`.
- Current validation requires:
  - at least 100 CJK characters
  - at most 300 CJK characters
- The webhook blocks duplicate completion for the same day.
- Diary entries are written to `line_diary_entries` when Supabase is available.

Current gaps:

- The input mode is stricter than the target "自由輸入一句".
- Diary rows are not written to a formal `diary_entries` table.
- `linked_card_id` is not currently preserved.
- `egg_progress` is not currently maintained.
- `completed today` exists logically, but no dedicated frontend/admin visibility exists.
- Analysis fields exist only in the ML prototype, not in the web app storage model.

## M03 Status

Current M03 state:

- Not implemented in the web app.
- No webhook entry.
- No onboarding flow.
- No participant summary page.

Related data only exists in the ML prototype as CSV concepts such as `participant_profiles.csv`.

## M04 Status

Current M04 state:

- Not implemented in the web app.
- No queue list page.
- No manual review actions in Next.js.
- No partner prompt queue table in Supabase.
- No internal review queue table in Supabase.

Related logic exists only in the Python prototype:

- `elderly-ml/src/run_e03_rules.py`
- `elderly-ml/src/care_rules.py`

## Current Storage State

### In-memory

Still in-memory in `senior-card-web`:

- M01 session snapshots
- M01 feedback event fallback
- M02 session snapshots
- M02 reward event fallback
- M02 diary fallback map

### Supabase-backed

Currently available and readable in Supabase:

- `line_interaction_events`
- `line_diary_entries`

### Missing Formal Product Tables

The following requested product tables do not currently exist in Supabase:

- `participants`
- `card_preferences`
- `card_interactions`
- `daily_card_recommendations`
- `guided_diary_prompts`
- `diary_entries`
- `egg_progress`
- `partner_links`
- `partner_prompt_queue`
- `internal_review_queue`

`card_catalog` is also missing in the current Supabase schema cache.

## Existing SQL / Schema Files

Current schema file:

- `supabase/m01_schema.sql`

It currently defines only:

- `card_catalog`
- `line_interaction_events`
- `line_diary_entries`

It does not define the full M01 to M04 product storage requested for this round.

## Analysis Prototype Integration

`elderly-ml` already contains batch-oriented analysis logic and queue generation concepts:

- diary analysis outputs
- risk labels
- need types
- semantic risk scoring
- queue generation
- manual review logs

However, these are not yet connected to the web app as live tables or UI.

## Blockers

Main blockers identified before implementation:

1. Supabase formal product tables are not yet provisioned.
2. The web app currently stores only low-level event logs, not product-facing state tables.
3. M03 and M04 are absent from the Next.js runtime.
4. rich menu only covers M01 and M02.
5. There is no admin/system audit page or completion-check route.
6. There is no current web surface for queue review.
7. `src/app/page.tsx` is currently deleted in the working tree, so the web app has no dashboard entry page at the moment.

## Summary

Before implementation starts:

- `M01`: partially implemented
- `M02`: partially implemented
- `M03`: missing
- `M04`: missing
- rich menu: partially implemented
- Supabase formal tables: largely missing
- ML prototype: available, but not wired into the web app
