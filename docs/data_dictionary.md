# Data Dictionary

Updated on 2026-04-27.

This file reflects the formal Jenny product schema used by the website admin and LINE modules.

## M01

### `card_catalog`

- `card_id`: primary key
- `card_title`: card name
- `image_provider`: should be `cloudinary` for formal uploads
- `image_url`: Cloudinary secure URL
- `image_key`: Cloudinary public id
- `style_main`: card copy style
- `style_sub`: sub-style label
- `tone`: emotional tone
- `imagery`: `花系列` / `神明系列` / `台灣花布系列` / `山系列`
- `text_density`: copy length bucket
- `energy_level`: visual energy bucket
- `caption_text`: final caption
- `default_prompt`: optional writing prompt
- `status`: `active` / `draft` / `inactive` / `archived`
- `uploaded_by`: admin source
- `created_at`
- `updated_at`

Compatibility columns still kept:

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

### `card_interactions`

- `id`
- `participant_id`
- `card_id`
- `interaction_date`
- `action_type`
- `selected_as_main`
- `diary_written`
- `created_at`

### `card_preferences`

- `participant_id`
- `preferred_style_main`
- `preferred_tone`
- `preferred_imagery`
- `profile_confidence`
- `updated_at`

### `user_daily_mood`

- `participant_id`
- `selected_date`
- `mood`
- `created_at`

### `user_daily_checkin`

- `participant_id`
- `selected_date`
- `claimed_today`
- `claim_season`
- `created_at`
- `updated_at`

## M02

### `diary_entries`

- `id`
- `participant_id`
- `entry_date`
- `entry_text`
- `entry_index`
- `linked_card_id`
- `risk_label`
- `need_type`
- `priority_score`
- `priority_reason`
- `manual_review`
- `semantic_risk_score`
- `analysis_status`
- `model_version`
- `rule_version`
- `analysis_run_at`
- `created_at`

### `egg_progress`

- `participant_id`
- `window_start`
- `window_end`
- `days_completed`
- `egg_box_eligible`
- `updated_at`

## M03

### `participants`

- `id`
- `display_name`
- `age_band`
- `district`
- `wants_partner`
- `wants_reminders`
- `wants_to_help_others`
- `wants_to_be_cared_for`
- `wants_chat_matching`
- `is_little_angel`
- `is_little_owner`
- `free_owner_slots`
- `extra_owner_slots`
- `reminder_opt_in`
- `care_ambassador_opt_in`
- `wants_care`
- `chat_match_opt_in`
- `m03_completed_at`
- `created_at`
- `updated_at`

### `partner_links`

- `id`
- `link_id`
- `participant_id`
- `partner_participant_id`
- `angel_participant_id`
- `owner_participant_id`
- `status`
- `link_type`
- `match_status`
- `chat_enabled`
- `created_at`
- `updated_at`

### `care_events`

- `event_id`
- `participant_id`
- `target_participant_id`
- `event_type`
- `note`
- `created_at`

### `care_messages`

- `id`
- `sender_participant_id`
- `receiver_participant_id`
- `message_type`
- `message_text`
- `created_at`

### `volunteer_requests`

- `id`
- `participant_id`
- `request_text`
- `status`
- `created_at`
- `updated_at`

### `user_reports`

- `id`
- `reporter_participant_id`
- `target_participant_id`
- `reason`
- `created_at`

### `user_blocks`

- `id`
- `blocker_participant_id`
- `target_participant_id`
- `created_at`

## M04

### `community_info`

- `info_id`
- `title`
- `category`
- `description`
- `event_date`
- `location`
- `district`
- `contact`
- `status`
- `created_at`
- `updated_at`

## Compatibility / Ops Tables

### `daily_card_recommendations`

- stores the 3-card snapshot sent to the user

### `guided_diary_prompts`

- stores the current prompt linked to the selected M01 card

### `partner_prompt_queue`

- internal partner prompt queue

### `internal_review_queue`

- internal review queue

### `line_interaction_events`

- webhook event/session audit trail

### `line_diary_entries`

- compatibility storage for LINE diary raw text
