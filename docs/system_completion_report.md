# System Completion Report

Generated on 2026-04-26 after implementation pass.

## 已完成

- M01 now supports a 3-card daily recommendation carousel.
- M01 main-card selection is limited to once per day.
- M01 refresh is limited to once per day.
- M01 writes product-facing recommendation and interaction records.
- M02 accepts free-text diary input while in the active diary session.
- M02 enforces minimum and maximum Chinese-character validation.
- M02 blocks duplicate completion on the same day.
- M02 writes linked-card diary rows and recalculates 14-day egg progress.
- M03 lightweight onboarding is implemented in LINE:
  - display name
  - choose 3 liked cards
  - choose whether a fixed partner reminder is welcome
- M04 partner queue and internal review queue generation logic is implemented.
- A minimal dashboard page exists at `/` to inspect queue rows and update queue status.
- A live system check route exists at `/api/admin/system-check`.
- Audit and data dictionary documents were added.
- README now includes M01 to M04 validation steps.

## 部分完成

- Formal Supabase product tables are defined, but the actual project may still be running on legacy tables plus local fallback storage until the SQL is applied.
- rich menu rebuild is scripted, but the currently bound LINE menu may still be an older version until the script is run again.
- M04 queue logic is live, but it is still a v1 heuristic flow and does not yet receive real-time E02 batch outputs automatically.
- `elderly-ml` analysis outputs are supported by schema shape, but are not yet wired into an automatic import job from the web app.

## 未完成

- No external notification sending is implemented for M04.
- No full admin authentication flow is implemented.
- No automated import pipeline from `elderly-ml` into `diary_entries` or queues is implemented in Next.js.
- No production migration runner is included in this repo; schema application is still a manual Supabase step.

## 待手動設定

- Apply `supabase/jenny_core_schema.sql` in Supabase.
- Rebuild and bind the temporary 4-slot rich menu with `npm run line:create-rich-menu`.
- Confirm the LINE console webhook URL points to `/api/line/webhook`.
- Set Vercel environment variables for LINE and Supabase.

## 已知限制

- M03 onboarding session state still relies on webhook-compatible session event storage and can be interrupted if deployment/runtime state changes mid-flow.
- New product tables fall back to local JSON storage if they do not yet exist in Supabase.
- The queue heuristics are intentionally conservative and only support v1 internal review workflows.
- The dashboard is intentionally minimal and not a full operator console.
