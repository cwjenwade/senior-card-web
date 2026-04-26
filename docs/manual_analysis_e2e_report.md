# Manual Analysis Loop Report

Generated at: 2026-04-26T23:32:50

## Inputs

- analysis csv: `/Users/wade/Developer/Jenny/senior-card-web/../elderly-ml/data/jenny_diary_analysis_out.csv`
- summary csv: `/Users/wade/Developer/Jenny/senior-card-web/../elderly-ml/data/jenny_diary_summary_out.csv`
- prediction csv: `/Users/wade/Developer/Jenny/senior-card-web/../elderly-ml/data/jenny_e02_predictions_out.csv`
- manual review csv: `/Users/wade/Developer/Jenny/senior-card-web/../elderly-ml/data/jenny_manual_review_out.csv`
- queue csv: `/Users/wade/Developer/Jenny/senior-card-web/../elderly-ml/data/jenny_care_queue_out.csv`

## Versions

- model_version: `e02-v1`
- rule_version: `jenny-queue-v1`

## Results

- participants created: 0
- diary rows upserted: 0
- egg progress rows upserted: 0
- partner queue rows upserted: 0
- internal review queue rows upserted: 0

## Table availability

- participants: local-fallback
- card_preferences: local-fallback
- card_interactions: local-fallback
- daily_card_recommendations: local-fallback
- guided_diary_prompts: local-fallback
- diary_entries: local-fallback
- egg_progress: local-fallback
- partner_links: local-fallback
- partner_prompt_queue: local-fallback
- internal_review_queue: local-fallback

## Current blockers

- remote product tables missing: yes
- exported diary rows were zero: yes

## Next actions

- apply `supabase/jenny_core_schema.sql` to the remote project
- create at least one real M02 diary row, then rerun `npm run batch:run-manual-loop`
- confirm `/api/admin/system-check` reports product tables as remote instead of local-fallback
