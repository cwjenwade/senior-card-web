# Final E2E Verification Report

Generated on 2026-04-27.

Verification target:

`M02 -> batch analysis -> remote diary_entries update -> queue upsert -> M04 display`

## A. 匯出幾筆 remote diary_entries

- Export source: remote product `diary_entries`
- Exported rows: `1`
- Export file: `elderly-ml/data/jenny_diary_export.csv`

Exported entry:

- `participant_id`: `Uremotecheck002`
- `entry_date`: `2026-04-27`
- `linked_card_id`: `C0001`

## B. 成功分析幾筆

- `analyze_diary.py`: `1` row analyzed
- `run_e02_prediction.py`: `1` row predicted
- `run_e03_rules.py`: completed successfully

Generated files:

- `elderly-ml/data/jenny_diary_analysis_out.csv`
- `elderly-ml/data/jenny_diary_summary_out.csv`
- `elderly-ml/data/jenny_e02_predictions_out.csv`
- `elderly-ml/data/jenny_manual_review_out.csv`
- `elderly-ml/data/jenny_care_queue_out.csv`

## C. 回寫了哪些欄位

The remote `diary_entries` row for `Uremotecheck002` was updated with:

- `risk_label = low`
- `need_type = emotion`
- `priority_score = 2`
- `priority_reason = base:low`
- `manual_review = false`
- `semantic_risk_score = 0`
- `analysis_status = analyzed`
- `model_version = e02-v1`
- `rule_version = jenny-queue-v1`
- `analysis_run_at = 2026-04-27T00:17:20+00:00`

The existing `linked_card_id = C0001` remained intact.

## D. 建立幾筆 partner_prompt_queue

- Batch run imported `0` new `partner_prompt_queue` rows from `elderly-ml`
- Current remote `partner_prompt_queue` visible in M04: `1` row

Important note:

- The currently visible queue row was created by the existing product-side heuristic flow before this batch verification.
- The current analyzed diary entry was low-risk and did not produce a new partner queue row from `run_e03_rules.py`.

## E. 建立幾筆 internal_review_queue

- Batch run imported `0` new `internal_review_queue` rows
- Current remote `internal_review_queue`: `0` rows

Reason:

- The current diary did not meet manual review or high-risk queue conditions.

## F. M04 是否可讀到 queue

Yes.

Verified by:

- `GET /` returned `200 OK`
- Dashboard HTML contained:
  - `Partner Prompt Queue`
  - `Internal Review Queue`
  - partner queue count `1 rows`
  - internal queue count `0 rows`

This confirms the M04 page is reading queue data from remote tables.

## G. 哪些仍是 placeholder

- The partner queue row currently shown is still from the product-side heuristic path, not from the new `elderly-ml` batch run.
- No high-risk or manual-review diary was present in remote `diary_entries`, so this verification did not produce a new batch-created queue item.
- `partner_participant_id` is still the v1 placeholder `internal-partner-pool`.
- External notification delivery remains intentionally unimplemented.

## H. 若失敗，失敗在哪一步

Final verification status: `success with no blocking failures`.

One issue occurred during the first batch rerun attempt:

- `analyze_diary.py` failed because it was launched from the wrong working directory, so relative model paths like `models/elderly_risk_clf.joblib` could not be resolved.

Resolution:

- The manual loop runner was corrected to execute the Python scripts inside the `elderly-ml` working directory.
- After that fix, the full batch loop completed successfully.

## Summary

- Remote product tables are live.
- `M02` data can be exported from remote `diary_entries`.
- `elderly-ml` batch scripts can run end-to-end.
- Analysis fields can be written back to remote `diary_entries`.
- M04 can read remote queue tables.
- For this specific dataset, batch analysis completed but did not generate a new queue item because the analyzed diary was low-risk.
