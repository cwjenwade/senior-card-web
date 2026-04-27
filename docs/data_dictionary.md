# Data Dictionary

Generated on 2026-04-26.

This document records the target product tables for M01 to M04 and the current mapping from legacy prototype storage.

## Table Overview

| Target table | Purpose | Current source before full migration |
| --- | --- | --- |
| `participants` | M03 lightweight participant profile | new product table or local fallback |
| `card_catalog` | M01 card metadata library with external `image_url` | Supabase `card_catalog` or local metadata fallback |
| `card_preferences` | style preference summary from M03 | new product table or local fallback |
| `card_interactions` | M01/M02 product-level card actions | new product table or local fallback |
| `daily_card_recommendations` | today's 3-card recommendation snapshot | new product table or local fallback |
| `guided_diary_prompts` | selected card to M02 diary prompt bridge | new product table or local fallback |
| `diary_entries` | product-facing diary storage with analysis fields | new product table or local fallback |
| `egg_progress` | 14-day participation progress | new product table or local fallback |
| `partner_links` | M03 care / ambassador / chat placeholder link state | new product table or local fallback |
| `community_info` | M04 policy / neighborhood / temple / community content | new product table or local fallback |
| `partner_prompt_queue` | internal partner reminder queue | new product table or local fallback |
| `internal_review_queue` | internal review queue | new product table or local fallback |

## Legacy Mapping

### `line_interaction_events` -> product tables

Legacy event rows still exist and are still used for webhook/session compatibility.

Mapping:

- `event_type = shown` -> `card_interactions.action_type = view`
- `event_type = selected` -> `card_interactions.action_type = select`
- `event_type = refreshed` -> `card_interactions.action_type = refresh`
- `event_type = m01_session` -> M01 transient session state only
- `event_type = m02_session` -> M02 transient session state only
- `event_type = m03_session` -> M03 transient onboarding state only

### `line_diary_entries` -> `diary_entries`

Legacy diary rows are still written for compatibility.

Mapping:

- `user_id` -> `participant_id`
- `created_at` -> `entry_date` derived by Taipei day
- `entry_text` -> `entry_text`
- `linked_card_id` -> `linked_card_id`
- analysis fields remain empty until copied into formal `diary_entries`

## Target Tables

## `participants`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text | participant primary key, currently LINE user id |
| `display_name` | text | M03 chosen name |
| `age_band` | text | optional placeholder, not asked from elder in v1 |
| `wants_partner` | boolean | legacy internal flag, now mirrors `wants_care` for internal queue logic |
| `reminder_opt_in` | boolean | whether 18:00 / 20:00 diary reminders are allowed |
| `care_ambassador_opt_in` | boolean | whether the elder is willing to care for others |
| `wants_care` | boolean | whether the elder wants someone to check in |
| `chat_match_opt_in` | boolean | whether the elder is open to friend/chat matching |
| `m03_completed_at` | timestamptz | first completed setting timestamp |
| `created_at` | timestamptz | row creation time |
| `updated_at` | timestamptz | last update time |

## `card_catalog`

Minimum product columns:

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

Compatibility columns kept for current runtime:

- `id`
- `title`
- `text_type`
- `visual_series`
- `caption`
- `prompt`
- `cc0_source`
- `font_size`
- `color_tone`
- `religious_content`

Mapping:

- `card_id` = `id`
- `card_title` = `title`
- `image_provider` = external asset source label
- `image_url` = actual display URL used by M01 / M03
- `image_key` = reserved for future managed providers
- `style_main` = `text_type`
- `style_sub` = lightweight sub-style label
- `imagery` = `visual_series`
- `caption_text` = `caption`
- `default_prompt` = `prompt`

## `card_preferences`

| Column | Type | Notes |
| --- | --- | --- |
| `participant_id` | text | primary key |
| `preferred_style_main` | text | derived from liked cards |
| `preferred_tone` | text | derived from liked cards |
| `preferred_imagery` | text | derived from liked cards |
| `profile_confidence` | numeric | 0 to 1 |
| `updated_at` | timestamptz | last update |

## `card_interactions`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text | deterministic event id |
| `participant_id` | text | participant id |
| `card_id` | text | may be empty for refresh |
| `interaction_date` | date | Taipei date |
| `action_type` | text | `view`, `select`, `refresh`, `favorite`, `diary_written` |
| `selected_as_main` | boolean | true only for main daily card |
| `diary_written` | boolean | true when the linked diary is completed |
| `created_at` | timestamptz | event time |

## `daily_card_recommendations`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text | `${participant}-${date}-${rank}` |
| `participant_id` | text | participant id |
| `recommendation_date` | date | recommendation day |
| `card_id` | text | recommended card |
| `rank_order` | integer | 1 to 3 |
| `strategy_type` | text | `preference_rule` or `neutral_fallback` |
| `score_total` | numeric | heuristic score |
| `reason_text` | text | simple recommendation reason |

## `guided_diary_prompts`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text | `${participant}-${date}` |
| `participant_id` | text | participant id |
| `prompt_date` | date | prompt day |
| `main_card_id` | text | selected daily card |
| `prompt_text` | text | writing prompt |
| `status` | text | `ready`, `used`, `archived` |

## `diary_entries`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text | `${participant}-${date}` |
| `participant_id` | text | participant id |
| `entry_date` | date | diary day |
| `entry_text` | text | elder text |
| `linked_card_id` | text | chosen M01 card |
| `risk_label` | text | E02 result |
| `need_type` | text | E02 result |
| `priority_score` | integer | E02 / E03 input |
| `priority_reason` | text | E02 / E03 note |
| `manual_review` | boolean | E02 flag |
| `semantic_risk_score` | integer | E02 result |
| `analysis_status` | text | `pending`, `analyzed`, `error` |
| `model_version` | text | batch model version, e.g. `e02-v1` |
| `rule_version` | text | queue/rule version, e.g. `jenny-queue-v1` |
| `analysis_run_at` | timestamptz | latest import time |
| `created_at` | timestamptz | creation time |

## `egg_progress`

| Column | Type | Notes |
| --- | --- | --- |
| `participant_id` | text | primary key |
| `window_start` | date | 14-day rolling start |
| `window_end` | date | today |
| `days_completed` | integer | unique completed diary days in window |
| `egg_box_eligible` | boolean | true when `days_completed >= 10` |
| `updated_at` | timestamptz | recalculation time |

## `partner_links`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text | primary key |
| `participant_id` | text | elder |
| `partner_participant_id` | text | current v1 placeholder can be a matching pool id |
| `status` | text | `active`, `inactive`, `pending`, `closed` |
| `link_type` | text | `care`, `ambassador`, `chat` |
| `match_status` | text | `waiting_match`, `waiting_assignment`, `matched`, `off` |
| `chat_enabled` | boolean | true only for chat matching placeholders |
| `updated_at` | timestamptz | latest change |
| `created_at` | timestamptz | creation time |

## `community_info`

| Column | Type | Notes |
| --- | --- | --- |
| `info_id` | text | primary key |
| `title` | text | display title |
| `category` | text | `policy`, `neighborhood`, `temple`, `community` |
| `description` | text | content summary |
| `event_date` | date | optional date |
| `location` | text | optional location |
| `contact` | text | optional contact |
| `status` | text | `active`, `draft`, `inactive` |
| `created_at` | timestamptz | creation time |
| `updated_at` | timestamptz | last update time |

## `partner_prompt_queue`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text | primary key |
| `participant_id` | text | elder |
| `partner_participant_id` | text | linked partner or placeholder |
| `trigger_type` | text | e.g. `silence_gap`, `priority_rising` |
| `trigger_reason` | text | human-readable reason |
| `status` | text | `partner_prompt`, `closed`, `needs_manual_routing` |
| `model_version` | text | model version used when row was generated |
| `rule_version` | text | rule version used when row was generated |
| `created_at` | timestamptz | queue create time |

## `internal_review_queue`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text | primary key |
| `participant_id` | text | elder |
| `trigger_type` | text | e.g. `high_priority`, `manual_review` |
| `trigger_reason` | text | human-readable reason |
| `priority_score` | integer | queue sort hint |
| `status` | text | `pending_review`, `closed`, `needs_manual_routing` |
| `model_version` | text | model version used when row was generated |
| `rule_version` | text | rule version used when row was generated |
| `created_at` | timestamptz | queue create time |
