#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ML_DIR="${ROOT_DIR}/../elderly-ml"
MODEL_VERSION="${MODEL_VERSION:-e02-v1}"
RULE_VERSION="${RULE_VERSION:-jenny-queue-v1}"
PYTHON_BIN="${ML_DIR}/.venv/bin/python"

if [ ! -x "$PYTHON_BIN" ]; then
  PYTHON_BIN="python3"
fi

cd "$ROOT_DIR"

python3 scripts/jenny_batch_bridge.py check-tables
python3 scripts/jenny_batch_bridge.py export-diaries \
  --diary-output "${ML_DIR}/data/jenny_diary_export.csv" \
  --raw-output "${ML_DIR}/data/jenny_raw_diary_export.csv"

if [ "$(wc -l < "${ML_DIR}/data/jenny_diary_export.csv")" -le 1 ]; then
  JENNY_ML_DATA_DIR="${ML_DIR}/data" python3 - <<'PY'
import csv
import os
from pathlib import Path

ml_dir = Path(os.environ["JENNY_ML_DATA_DIR"])
files = {
    "jenny_diary_analysis_out.csv": ["entry_id","participant_id","entry_date","entry_text","source_type","linked_card_id","mood_self_report","risk_label","need_type","priority_score","priority_reason","manual_review","semantic_risk_score","silence_gap_days","created_at"],
    "jenny_diary_summary_out.csv": ["participant_id","anchor_date","reward_window_start","reward_window_days","required_days_for_egg_box","diary_days_in_window","egg_box_eligible","last_entry_date","silence_days","silence_alert","latest_week_avg_priority","previous_week_avg_priority","priority_delta","trend_alert","high_priority_entries","semantic_risk_entries","manual_review_entries","needs_human_review"],
    "jenny_e02_predictions_out.csv": ["prediction_id","entry_id","user_id","created_at","text","pred_semantic_flag","pred_semantic_group","pred_risk_level","pred_need_type","pred_emotion_label","confidence","model_version","evidence_span","requires_review"],
    "jenny_manual_review_out.csv": ["review_id","entry_id","user_id","created_at","review_reason","model_version","pred_semantic_group","pred_risk_level","pred_need_type","evidence_span","review_status","reviewer_id","review_started_at","review_completed_at"],
    "jenny_care_queue_out.csv": ["queue_id","entry_id","user_id","created_at","trigger_type","trigger_evidence","pred_semantic_group","pred_risk_level","pred_need_type","priority_level","notification_target","queue_status","review_decision","final_action","handled_by","handled_at"],
}
for name, headers in files.items():
    path = ml_dir / name
    with path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.writer(handle)
        writer.writerow(headers)
PY
else
  "${PYTHON_BIN}" "${ML_DIR}/src/analyze_diary.py" \
    --input "${ML_DIR}/data/jenny_diary_export.csv" \
    --entry-output "${ML_DIR}/data/jenny_diary_analysis_out.csv" \
    --summary-output "${ML_DIR}/data/jenny_diary_summary_out.csv"

  "${PYTHON_BIN}" "${ML_DIR}/src/run_e02_prediction.py" \
    --input "${ML_DIR}/data/jenny_raw_diary_export.csv" \
    --output "${ML_DIR}/data/jenny_e02_predictions_out.csv" \
    --model-version "${MODEL_VERSION}"

  "${PYTHON_BIN}" "${ML_DIR}/src/run_e03_rules.py" \
    --predictions "${ML_DIR}/data/jenny_e02_predictions_out.csv" \
    --raw "${ML_DIR}/data/jenny_raw_diary_export.csv" \
    --manual-review "${ML_DIR}/data/jenny_manual_review_out.csv" \
    --queue "${ML_DIR}/data/jenny_care_queue_out.csv"
fi

python3 scripts/jenny_batch_bridge.py import-analysis \
  --analysis-input "${ML_DIR}/data/jenny_diary_analysis_out.csv" \
  --summary-input "${ML_DIR}/data/jenny_diary_summary_out.csv" \
  --prediction-input "${ML_DIR}/data/jenny_e02_predictions_out.csv" \
  --manual-review-input "${ML_DIR}/data/jenny_manual_review_out.csv" \
  --queue-input "${ML_DIR}/data/jenny_care_queue_out.csv" \
  --model-version "${MODEL_VERSION}" \
  --rule-version "${RULE_VERSION}" \
  --report-output "${ROOT_DIR}/docs/manual_analysis_e2e_report.md"

echo "Manual analysis loop finished."
echo "Report: ${ROOT_DIR}/docs/manual_analysis_e2e_report.md"
