from __future__ import annotations

import argparse
import csv
import json
import os
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib import error, parse, request


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ML_ROOT = PROJECT_ROOT.parent / "elderly-ml"
PRODUCT_STORE_DIR = PROJECT_ROOT / "storage" / "product-store"

PRODUCT_TABLES = [
    "participants",
    "card_preferences",
    "card_interactions",
    "daily_card_recommendations",
    "guided_diary_prompts",
    "diary_entries",
    "egg_progress",
    "partner_links",
    "partner_prompt_queue",
    "internal_review_queue",
]


def now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def load_env() -> dict[str, str]:
    env = dict(os.environ)
    env_path = PROJECT_ROOT / ".env.local"
    if env_path.exists():
      for line in env_path.read_text(encoding="utf-8").splitlines():
          trimmed = line.strip()
          if not trimmed or trimmed.startswith("#") or "=" not in trimmed:
              continue
          key, value = trimmed.split("=", 1)
          env.setdefault(key.strip(), value.strip().strip("\"'"))
    return env


def resolve_rest_url(env: dict[str, str]) -> str | None:
    url = env.get("SUPABASE_URL", "").strip()
    if not url:
        return None
    return url.rstrip("/") if "/rest/v1" in url else f"{url.rstrip('/')}/rest/v1"


def auth_headers(env: dict[str, str], prefer: str | None = None) -> dict[str, str] | None:
    api_key = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SUPABASE_ANON_KEY")
    if not api_key:
        return None
    headers = {
        "apikey": api_key,
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    return headers


def request_json(method: str, url: str, headers: dict[str, str], payload: Any | None = None) -> tuple[int, Any]:
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    req = request.Request(url, data=data, headers=headers, method=method)
    try:
        with request.urlopen(req) as response:
            body = response.read().decode("utf-8")
            return response.status, json.loads(body) if body else None
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8")
        try:
            parsed = json.loads(body) if body else None
        except json.JSONDecodeError:
            parsed = body
        return exc.code, parsed


def table_exists(env: dict[str, str], table: str) -> bool:
    rest_url = resolve_rest_url(env)
    headers = auth_headers(env)
    if not rest_url or not headers:
        return False
    status, _ = request_json("GET", f"{rest_url}/{table}?select=*&limit=1", headers)
    return status == 200


def select_rows(env: dict[str, str], table: str, query: str = "select=*&limit=1000") -> list[dict[str, Any]]:
    rest_url = resolve_rest_url(env)
    headers = auth_headers(env)
    if not rest_url or not headers:
        return []
    status, payload = request_json("GET", f"{rest_url}/{table}?{query}", headers)
    return payload if status == 200 and isinstance(payload, list) else []


def upsert_rows(env: dict[str, str], table: str, rows: list[dict[str, Any]]) -> bool:
    if not rows:
        return True
    rest_url = resolve_rest_url(env)
    headers = auth_headers(env, "resolution=merge-duplicates,return=minimal")
    if rest_url and headers and table_exists(env, table):
        status, _ = request_json("POST", f"{rest_url}/{table}", headers, rows)
        return status in {200, 201}

    local_path = PRODUCT_STORE_DIR / f"{table}.json"
    local_path.parent.mkdir(parents=True, exist_ok=True)
    existing = []
    if local_path.exists():
        existing = json.loads(local_path.read_text(encoding="utf-8"))
    key_field = "id"
    if table in {"card_preferences", "egg_progress"}:
        key_field = "participant_id"
    index = {str(row.get(key_field)): row for row in existing}
    for row in rows:
        index[str(row.get(key_field))] = row
    local_path.write_text(json.dumps(list(index.values()), ensure_ascii=False, indent=2), encoding="utf-8")
    return True


def read_product_rows(env: dict[str, str], table: str) -> list[dict[str, Any]]:
    if table_exists(env, table):
        return select_rows(env, table)
    local_path = PRODUCT_STORE_DIR / f"{table}.json"
    if local_path.exists():
        return json.loads(local_path.read_text(encoding="utf-8"))
    return []


def bool_from_any(value: Any) -> bool:
    return str(value).strip().lower() in {"1", "true", "yes", "y"}


def write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({key: row.get(key, "") for key in fieldnames})


def export_diaries(args: argparse.Namespace) -> None:
    env = load_env()
    diary_rows = read_product_rows(env, "diary_entries")

    source = "product:diary_entries"
    if not diary_rows:
        legacy_rows = select_rows(env, "line_diary_entries") if table_exists(env, "line_diary_entries") else []
        if legacy_rows:
            source = "legacy:line_diary_entries"
            diary_rows = [
                {
                    "id": row["id"],
                    "participant_id": row["user_id"],
                    "entry_date": str(row["created_at"])[:10],
                    "entry_text": row["entry_text"],
                    "linked_card_id": row.get("linked_card_id") or "",
                    "created_at": row["created_at"],
                }
                for row in legacy_rows
            ]

    export_rows = [
        {
            "entry_id": row["id"],
            "participant_id": row["participant_id"],
            "entry_date": row["entry_date"],
            "entry_text": row["entry_text"],
            "source_type": "line",
            "linked_card_id": row.get("linked_card_id", ""),
            "mood_self_report": "",
            "created_at": row.get("created_at", f"{row['entry_date']}T00:00:00"),
        }
        for row in diary_rows
    ]
    raw_rows = [
        {
            "entry_id": row["id"],
            "user_id": row["participant_id"],
            "created_at": row.get("created_at", f"{row['entry_date']}T00:00:00"),
            "source_channel": "line",
            "raw_text": row["entry_text"],
            "text_length": len(str(row["entry_text"])),
            "has_image": 0,
            "has_sticker": 0,
            "reply_context": "",
            "consent_status": "granted",
            "data_status": "active",
        }
        for row in diary_rows
    ]

    write_csv(args.diary_output, [
        "entry_id", "participant_id", "entry_date", "entry_text", "source_type", "linked_card_id", "mood_self_report", "created_at"
    ], export_rows)
    write_csv(args.raw_output, [
        "entry_id", "user_id", "created_at", "source_channel", "raw_text", "text_length", "has_image", "has_sticker", "reply_context", "consent_status", "data_status"
    ], raw_rows)

    print(f"Export source: {source}")
    print(f"Diary rows exported: {len(export_rows)}")
    print(f"Diary export: {args.diary_output}")
    print(f"Raw export: {args.raw_output}")


def ensure_participants(env: dict[str, str], participant_ids: set[str]) -> int:
    existing = {row["id"]: row for row in read_product_rows(env, "participants")}
    rows = []
    now = now_iso()
    for participant_id in sorted(participant_ids):
        if participant_id in existing:
            continue
        rows.append({
            "id": participant_id,
            "display_name": participant_id,
            "age_band": "",
            "wants_partner": False,
            "created_at": now,
            "updated_at": now,
        })
    upsert_rows(env, "participants", rows)
    return len(rows)


def import_analysis(args: argparse.Namespace) -> None:
    env = load_env()
    analysis_rows = list(csv.DictReader(args.analysis_input.open(encoding="utf-8-sig")))
    summary_rows = list(csv.DictReader(args.summary_input.open(encoding="utf-8-sig"))) if args.summary_input.exists() else []
    prediction_rows = list(csv.DictReader(args.prediction_input.open(encoding="utf-8-sig"))) if args.prediction_input.exists() else []
    manual_rows = list(csv.DictReader(args.manual_review_input.open(encoding="utf-8-sig"))) if args.manual_review_input.exists() else []
    queue_rows = list(csv.DictReader(args.queue_input.open(encoding="utf-8-sig"))) if args.queue_input.exists() else []

    participant_ids = {row["participant_id"] for row in analysis_rows if row.get("participant_id")}
    participants_created = ensure_participants(env, participant_ids)

    imported_diaries: list[dict[str, Any]] = []
    imported_eggs: list[dict[str, Any]] = []
    imported_partner_queue: list[dict[str, Any]] = []
    imported_internal_queue: list[dict[str, Any]] = []
    run_at = now_iso()

    for row in analysis_rows:
        imported_diaries.append({
            "id": row["entry_id"],
            "participant_id": row["participant_id"],
            "entry_date": row["entry_date"],
            "entry_text": row["entry_text"],
            "linked_card_id": row.get("linked_card_id", ""),
            "risk_label": row.get("risk_label", ""),
            "need_type": row.get("need_type", ""),
            "priority_score": int(float(row.get("priority_score") or 0)),
            "priority_reason": row.get("priority_reason", ""),
            "manual_review": bool_from_any(row.get("manual_review", "")),
            "semantic_risk_score": int(float(row.get("semantic_risk_score") or 0)),
            "analysis_status": "analyzed",
            "model_version": args.model_version,
            "rule_version": args.rule_version,
            "analysis_run_at": run_at,
            "created_at": row.get("created_at") or f"{row['entry_date']}T00:00:00",
        })

    for row in summary_rows:
        imported_eggs.append({
            "participant_id": row["participant_id"],
            "window_start": row.get("reward_window_start", ""),
            "window_end": row.get("anchor_date", ""),
            "days_completed": int(float(row.get("diary_days_in_window") or 0)),
            "egg_box_eligible": bool_from_any(row.get("egg_box_eligible", "")),
            "updated_at": run_at,
        })

    prediction_by_entry = {row["entry_id"]: row for row in prediction_rows if row.get("entry_id")}

    for row in manual_rows:
        participant_id = row.get("user_id", "")
        prediction = prediction_by_entry.get(row.get("entry_id", ""), {})
        imported_internal_queue.append({
            "id": f"irq-review-{row['review_id']}",
            "participant_id": participant_id,
            "trigger_type": row.get("review_reason", "manual_review"),
            "trigger_reason": f"manual review required: {row.get('review_reason', '')}",
            "priority_score": 4 if prediction.get("pred_risk_level") != "urgent" else 5,
            "status": "pending_review",
            "model_version": row.get("model_version", args.model_version),
            "rule_version": args.rule_version,
            "created_at": row.get("created_at", run_at),
        })

    for row in queue_rows:
        participant_id = row.get("user_id", "")
        priority_score = 5 if str(row.get("priority_level", "")).lower() == "urgent" else 4
        imported_internal_queue.append({
            "id": f"irq-queue-{row['queue_id']}",
            "participant_id": participant_id,
            "trigger_type": row.get("trigger_type", "e03_queue"),
            "trigger_reason": row.get("trigger_evidence", ""),
            "priority_score": priority_score,
            "status": "needs_manual_routing" if row.get("queue_status") == "needs_manual_routing" else "pending_review",
            "model_version": args.model_version,
            "rule_version": args.rule_version,
            "created_at": row.get("created_at", run_at),
        })

    participants = {row["id"]: row for row in read_product_rows(env, "participants")}
    partner_links = [row for row in read_product_rows(env, "partner_links") if row.get("status") != "closed"]
    analyzed_by_participant: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in imported_diaries:
        analyzed_by_participant[row["participant_id"]].append(row)
    for rows in analyzed_by_participant.values():
        rows.sort(key=lambda item: (item["entry_date"], item["id"]))

    for participant_id, rows in analyzed_by_participant.items():
        participant = participants.get(participant_id, {})
        partner = next((item for item in partner_links if item.get("participant_id") == participant_id), None)
        if not bool_from_any(participant.get("wants_partner", False)) or not partner:
            continue

        latest = rows[-1]
        latest_date = datetime.fromisoformat(latest["entry_date"])
        anchor_date = max(datetime.fromisoformat(item["entry_date"]) for item in rows)
        silence_days = (anchor_date - latest_date).days
        recent_three = rows[-3:]
        priority_rising = len(recent_three) == 3 and recent_three[0]["priority_score"] < recent_three[1]["priority_score"] < recent_three[2]["priority_score"]
        semantic_rising = len(recent_three) >= 2 and recent_three[-1]["semantic_risk_score"] > recent_three[-2]["semantic_risk_score"]
        low_mood_cluster = len(recent_three) >= 2 and sum(item["semantic_risk_score"] for item in recent_three) / len(recent_three) >= 2

        if silence_days >= 3 or priority_rising or semantic_rising or low_mood_cluster:
            if silence_days >= 3:
                trigger_type = "silence_gap"
                trigger_reason = f"no diary for {silence_days} days"
            elif priority_rising:
                trigger_type = "priority_rising"
                trigger_reason = "priority score is rising across the latest 3 entries"
            elif semantic_rising:
                trigger_type = "semantic_risk_up"
                trigger_reason = "semantic risk score increased in recent entries"
            else:
                trigger_type = "low_mood_cluster"
                trigger_reason = "low mood semantic signals increased"
            imported_partner_queue.append({
                "id": f"ppq-{participant_id}-{anchor_date.date().isoformat()}-{trigger_type}",
                "participant_id": participant_id,
                "partner_participant_id": partner["partner_participant_id"],
                "trigger_type": trigger_type,
                "trigger_reason": trigger_reason,
                "status": "partner_prompt",
                "model_version": args.model_version,
                "rule_version": args.rule_version,
                "created_at": run_at,
            })

    if not imported_internal_queue:
        for row in imported_diaries:
            if row["priority_score"] >= 4 or row["manual_review"] or row["semantic_risk_score"] >= 4:
                imported_internal_queue.append({
                    "id": f"irq-fallback-{row['id']}",
                    "participant_id": row["participant_id"],
                    "trigger_type": "analysis_threshold",
                    "trigger_reason": f"priority={row['priority_score']}, manual_review={row['manual_review']}, semantic={row['semantic_risk_score']}",
                    "priority_score": row["priority_score"],
                    "status": "pending_review",
                    "model_version": args.model_version,
                    "rule_version": args.rule_version,
                    "created_at": run_at,
                })

    upsert_rows(env, "diary_entries", imported_diaries)
    upsert_rows(env, "egg_progress", imported_eggs)
    upsert_rows(env, "partner_prompt_queue", imported_partner_queue)
    upsert_rows(env, "internal_review_queue", imported_internal_queue)

    report_lines = [
        "# Manual Analysis Loop Report",
        "",
        f"Generated at: {run_at}",
        "",
        "## Inputs",
        "",
        f"- analysis csv: `{args.analysis_input}`",
        f"- summary csv: `{args.summary_input}`",
        f"- prediction csv: `{args.prediction_input}`",
        f"- manual review csv: `{args.manual_review_input}`",
        f"- queue csv: `{args.queue_input}`",
        "",
        "## Versions",
        "",
        f"- model_version: `{args.model_version}`",
        f"- rule_version: `{args.rule_version}`",
        "",
        "## Results",
        "",
        f"- participants created: {participants_created}",
        f"- diary rows upserted: {len(imported_diaries)}",
        f"- egg progress rows upserted: {len(imported_eggs)}",
        f"- partner queue rows upserted: {len(imported_partner_queue)}",
        f"- internal review queue rows upserted: {len(imported_internal_queue)}",
        "",
        "## Table availability",
        "",
    ]
    for table in PRODUCT_TABLES:
        report_lines.append(f"- {table}: {'remote' if table_exists(env, table) else 'local-fallback'}")
    report_lines.extend([
        "",
        "## Current blockers",
        "",
        f"- remote product tables missing: {'yes' if not all(table_exists(env, table) for table in PRODUCT_TABLES) else 'no'}",
        f"- exported diary rows were zero: {'yes' if len(imported_diaries) == 0 else 'no'}",
        "",
        "## Next actions",
        "",
        "- apply `supabase/jenny_core_schema.sql` to the remote project",
        "- create at least one real M02 diary row, then rerun `npm run batch:run-manual-loop`",
        "- confirm `/api/admin/system-check` reports product tables as remote instead of local-fallback",
    ])

    args.report_output.parent.mkdir(parents=True, exist_ok=True)
    args.report_output.write_text("\n".join(report_lines) + "\n", encoding="utf-8")

    print(f"Participants created: {participants_created}")
    print(f"Diary rows upserted: {len(imported_diaries)}")
    print(f"Egg progress rows upserted: {len(imported_eggs)}")
    print(f"Partner queue rows upserted: {len(imported_partner_queue)}")
    print(f"Internal queue rows upserted: {len(imported_internal_queue)}")
    print(f"Report written to: {args.report_output}")


def check_tables(_: argparse.Namespace) -> None:
    env = load_env()
    print("Supabase product table status:")
    for table in PRODUCT_TABLES:
      print(f"- {table}: {'present' if table_exists(env, table) else 'missing'}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Bridge Jenny product data with elderly-ml batch scripts.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    export_parser = subparsers.add_parser("export-diaries")
    export_parser.add_argument("--diary-output", type=Path, default=DEFAULT_ML_ROOT / "data" / "jenny_diary_export.csv")
    export_parser.add_argument("--raw-output", type=Path, default=DEFAULT_ML_ROOT / "data" / "jenny_raw_diary_export.csv")
    export_parser.set_defaults(func=export_diaries)

    import_parser = subparsers.add_parser("import-analysis")
    import_parser.add_argument("--analysis-input", type=Path, default=DEFAULT_ML_ROOT / "data" / "jenny_diary_analysis_out.csv")
    import_parser.add_argument("--summary-input", type=Path, default=DEFAULT_ML_ROOT / "data" / "jenny_diary_summary_out.csv")
    import_parser.add_argument("--prediction-input", type=Path, default=DEFAULT_ML_ROOT / "data" / "jenny_e02_predictions_out.csv")
    import_parser.add_argument("--manual-review-input", type=Path, default=DEFAULT_ML_ROOT / "data" / "jenny_manual_review_out.csv")
    import_parser.add_argument("--queue-input", type=Path, default=DEFAULT_ML_ROOT / "data" / "jenny_care_queue_out.csv")
    import_parser.add_argument("--model-version", default="e02-v1")
    import_parser.add_argument("--rule-version", default="jenny-queue-v1")
    import_parser.add_argument("--report-output", type=Path, default=PROJECT_ROOT / "docs" / "manual_analysis_e2e_report.md")
    import_parser.set_defaults(func=import_analysis)

    check_parser = subparsers.add_parser("check-tables")
    check_parser.set_defaults(func=check_tables)
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
