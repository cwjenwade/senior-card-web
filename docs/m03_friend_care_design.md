# M03 Friend Care Design

Generated on 2026-04-27.

## Positioning

`M03` is now the first formal version of `好友關懷與配對服務`.

It is:

- a lightweight role and matching module
- a low-risk companion service
- the preference source for whether M02 diary reminders may be sent

It is not:

- a heavy personal profile form
- a free-search social network
- a full chat room

## 1. 我的設定

Fields:

- `display_name`
- `wants_reminders`
- `wants_to_help_others`
- `wants_to_be_cared_for`
- `wants_chat_matching`

Notes:

- `wants_reminders` controls whether M02 may send 18:00 / 20:00 reminders
- `wants_to_help_others` means the elder may become a care ambassador candidate
- `wants_to_be_cared_for` means the elder may be assigned a care partner
- `wants_chat_matching` means the elder is willing to join a system-managed chat pair queue

## 2. 我的配對狀態

Status shown to the elder:

- whether a care partner exists
- whether a chat partner exists
- `matching_status`

User-facing status values:

- `matched`
- `pending`
- `paused`
- `closed`

Link types:

- `care_pair`
- `chat_pair`

## 3. 今天的關懷

Low-intensity daily actions:

- send one greeting
- mark that the elder is willing to call today
- request care when the elder wants someone to talk
- mark available for today

These actions write `care_events` rows.

Event types:

- `send_greeting`
- `request_care`
- `willing_to_call`
- `mark_available`
- `pause_matching`

## 4. 聊天配對基礎

First version scope:

- only show whether chat matching is enabled
- show whether a chat partner currently exists
- allow pause / resume / exit
- do not implement a full chat window

## Matching Rules

### Care Pair

- participants with `wants_to_help_others = true` are candidates to care for others
- participants with `wants_to_be_cared_for = true` are candidates to receive care
- first version uses simple rule-based pairing
- first version prefers one-to-one pairing
- if the cared participant already has a `matched` care pair, do not create a duplicate pair
- if no partner is available yet, create or keep a `pending` row

### Chat Pair

- both sides must have `wants_chat_matching = true`
- first version is system-managed only
- no free search is allowed
- if no partner is available yet, create or keep a `pending` row
- if matched, create mirrored `chat_pair` rows for both sides

## Data Model

### participants

Canonical M03 columns:

- `wants_reminders`
- `wants_to_help_others`
- `wants_to_be_cared_for`
- `wants_chat_matching`

Compatibility columns remain mirrored:

- `reminder_opt_in`
- `care_ambassador_opt_in`
- `wants_care`
- `chat_match_opt_in`

### partner_links

Used as the formal pair-status table.

Columns:

- `link_id`
- `participant_id`
- `partner_participant_id`
- `link_type`
- `status`
- `created_at`
- `updated_at`

### care_events

Low-intensity interaction log.

Columns:

- `event_id`
- `participant_id`
- `target_participant_id`
- `event_type`
- `note`
- `created_at`

## M02 Reminder Linkage

M02 reminder route must read `wants_reminders`.

Rules:

- if `wants_reminders = false`, no 18:00 or 20:00 reminder may be sent
- if `wants_reminders = true`, reminder logic may continue
- when the elder changes the M03 switch, the next reminder check must immediately read the new value from remote

## Front-End Scope

Required first-version UI blocks:

- 我的設定
- 我的配對狀態
- 今天的關懷
- 聊天配對基礎

The UI should remain:

- low-friction
- low-risk
- manageable by the product team
