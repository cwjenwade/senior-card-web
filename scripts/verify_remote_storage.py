from __future__ import annotations

import json
from pathlib import Path

from jenny_batch_bridge import PRODUCT_STORE_DIR, load_env, select_rows, table_exists


CHECK_TABLES = [
    "participants",
    "card_interactions",
    "diary_entries",
    "egg_progress",
    "partner_links",
    "partner_prompt_queue",
    "internal_review_queue",
]


def local_count(table: str) -> int:
    path = PRODUCT_STORE_DIR / f"{table}.json"
    if not path.exists():
        return 0
    return len(json.loads(path.read_text(encoding="utf-8")))


def main() -> None:
    env = load_env()
    print("Remote write verification:")
    for table in CHECK_TABLES:
        if table_exists(env, table):
            rows = select_rows(env, table, "select=*&limit=1000")
            print(f"- {table}: remote rows={len(rows)}, local fallback rows={local_count(table)}")
        else:
            print(f"- {table}: remote missing, local fallback rows={local_count(table)}")


if __name__ == "__main__":
    main()
