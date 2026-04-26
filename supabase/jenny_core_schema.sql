create table if not exists public.participants (
  id text primary key,
  display_name text not null default '',
  age_band text not null default '',
  wants_partner boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.card_catalog (
  card_id text primary key,
  card_title text not null,
  style_main text not null,
  style_sub text not null default '',
  tone text not null default '',
  imagery text not null,
  text_density text not null default 'short',
  energy_level text not null default 'steady',
  caption_text text not null,
  status text not null default 'active',
  id text unique not null,
  title text not null,
  text_type text not null,
  visual_series text not null,
  caption text not null,
  prompt text not null default '',
  cc0_source text not null default '',
  image_url text not null default '',
  font_size text not null default 'large',
  color_tone text not null default 'warm',
  religious_content text not null default 'none',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.card_preferences (
  participant_id text primary key references public.participants(id) on delete cascade,
  preferred_style_main text not null default '',
  preferred_tone text not null default '',
  preferred_imagery text not null default '',
  profile_confidence numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.card_interactions (
  id text primary key,
  participant_id text not null references public.participants(id) on delete cascade,
  card_id text not null default '',
  interaction_date date not null,
  action_type text not null,
  selected_as_main boolean not null default false,
  diary_written boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_card_recommendations (
  id text primary key,
  participant_id text not null references public.participants(id) on delete cascade,
  recommendation_date date not null,
  card_id text not null,
  rank_order integer not null,
  strategy_type text not null default 'preference_rule',
  score_total numeric not null default 0,
  reason_text text not null default ''
);

create table if not exists public.guided_diary_prompts (
  id text primary key,
  participant_id text not null references public.participants(id) on delete cascade,
  prompt_date date not null,
  main_card_id text not null,
  prompt_text text not null,
  status text not null default 'ready'
);

create table if not exists public.diary_entries (
  id text primary key,
  participant_id text not null references public.participants(id) on delete cascade,
  entry_date date not null,
  entry_text text not null,
  linked_card_id text not null default '',
  risk_label text not null default '',
  need_type text not null default '',
  priority_score integer not null default 0,
  priority_reason text not null default '',
  manual_review boolean not null default false,
  semantic_risk_score integer not null default 0,
  analysis_status text not null default 'pending',
  model_version text not null default '',
  rule_version text not null default '',
  analysis_run_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.egg_progress (
  participant_id text primary key references public.participants(id) on delete cascade,
  window_start date not null,
  window_end date not null,
  days_completed integer not null default 0,
  egg_box_eligible boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.partner_links (
  id text primary key,
  participant_id text not null references public.participants(id) on delete cascade,
  partner_participant_id text not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.partner_prompt_queue (
  id text primary key,
  participant_id text not null references public.participants(id) on delete cascade,
  partner_participant_id text not null,
  trigger_type text not null,
  trigger_reason text not null,
  status text not null default 'partner_prompt',
  model_version text not null default '',
  rule_version text not null default '',
  trigger_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.internal_review_queue (
  id text primary key,
  participant_id text not null references public.participants(id) on delete cascade,
  trigger_type text not null,
  trigger_reason text not null,
  priority_score integer not null default 0,
  status text not null default 'pending_review',
  model_version text not null default '',
  rule_version text not null default '',
  trigger_date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table if exists public.diary_entries add column if not exists model_version text not null default '';
alter table if exists public.diary_entries add column if not exists rule_version text not null default '';
alter table if exists public.diary_entries add column if not exists analysis_run_at timestamptz;
alter table if exists public.partner_prompt_queue add column if not exists model_version text not null default '';
alter table if exists public.partner_prompt_queue add column if not exists rule_version text not null default '';
alter table if exists public.partner_prompt_queue add column if not exists trigger_date date not null default current_date;
alter table if exists public.internal_review_queue add column if not exists model_version text not null default '';
alter table if exists public.internal_review_queue add column if not exists rule_version text not null default '';
alter table if exists public.internal_review_queue add column if not exists trigger_date date not null default current_date;

create table if not exists public.line_interaction_events (
  id text primary key,
  session_id text not null,
  user_id text not null,
  card_id text,
  event_type text not null,
  mood_today text,
  text_type text,
  visual_series text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.line_diary_entries (
  id text primary key,
  session_id text not null,
  user_id text not null,
  linked_card_id text,
  mood_today text,
  text_type_preference text,
  visual_series_preference text,
  entry_text text not null,
  source text not null default 'line_text',
  created_at timestamptz not null default now()
);

create unique index if not exists idx_card_interactions_day_action on public.card_interactions (participant_id, interaction_date, card_id, action_type);
create unique index if not exists idx_daily_card_recommendations_unique on public.daily_card_recommendations (participant_id, recommendation_date, rank_order);
create unique index if not exists idx_guided_diary_prompts_unique on public.guided_diary_prompts (participant_id, prompt_date);
create unique index if not exists idx_partner_prompt_queue_dedupe on public.partner_prompt_queue (participant_id, trigger_type, trigger_date);
create unique index if not exists idx_internal_review_queue_dedupe on public.internal_review_queue (participant_id, trigger_type, trigger_date);

create index if not exists idx_diary_entries_participant_date on public.diary_entries (participant_id, entry_date desc);
create index if not exists idx_egg_progress_window on public.egg_progress (window_end desc);
create index if not exists idx_line_interaction_events_user_time on public.line_interaction_events (user_id, created_at desc);
create index if not exists idx_line_diary_entries_user_time on public.line_diary_entries (user_id, created_at desc);

insert into public.card_catalog (
  card_id, card_title, style_main, style_sub, tone, imagery, text_density, energy_level, caption_text, status,
  id, title, text_type, visual_series, caption, prompt, cc0_source, image_url, font_size, color_tone, religious_content
) values
  ('C0001', '晨光平安・花開暖暖', '問安語', '溫和', '溫和', '花系列', 'short', 'steady', '願你今天平安順心，心情輕鬆。', 'active', 'C0001', '晨光平安・花開暖暖', '問安語', '花系列', '願你今天平安順心，心情輕鬆。', '選一張今天的問安圖。', 'Jenny generated card', '', 'large', 'calm', 'none'),
  ('C0002', '慢慢也很好・山林清氣', '勵志語', '明亮', '明亮', '山林系列', 'medium', 'uplift', '放慢腳步，今天也能有好心情。', 'active', 'C0002', '慢慢也很好・山林清氣', '勵志語', '山林系列', '放慢腳步，今天也能有好心情。', '選一張今天的勵志圖。', 'Jenny generated card', '', 'medium', 'bright', 'none'),
  ('C0003', '佛光護佑・安心靜心', '神佛金句', '平靜', '平靜', '神佛系列', 'short', 'steady', '願你平安健康，福慧常伴左右。', 'active', 'C0003', '佛光護佑・安心靜心', '神佛金句', '神佛系列', '願你平安健康，福慧常伴左右。', '選一張今天的神佛金句圖。', 'Jenny generated card', '', 'large', 'calm', 'high'),
  ('C0004', '早安・花開暖暖', '問安語', '溫和', '溫和', '花系列', 'short', 'steady', '送上一句問安，願你今天舒服自在。', 'active', 'C0004', '早安・花開暖暖', '問安語', '花系列', '送上一句問安，願你今天舒服自在。', '選一張今天的問安圖。', 'Jenny generated card', '', 'large', 'calm', 'none'),
  ('C0005', '日日都有光・山林清氣', '勵志語', '明亮', '明亮', '山林系列', 'medium', 'uplift', '願你心裡有光，日子一天比一天安穩。', 'active', 'C0005', '日日都有光・山林清氣', '勵志語', '山林系列', '願你心裡有光，日子一天比一天安穩。', '選一張今天的勵志圖。', 'Jenny generated card', '', 'medium', 'bright', 'none'),
  ('C0006', '心安得福・安心靜心', '神佛金句', '平靜', '平靜', '神佛系列', 'short', 'steady', '心安就是福，願福氣常在。', 'active', 'C0006', '心安得福・安心靜心', '神佛金句', '神佛系列', '心安就是福，願福氣常在。', '選一張今天的神佛金句圖。', 'Jenny generated card', '', 'large', 'calm', 'high')
on conflict (card_id) do update set
  card_title = excluded.card_title,
  style_main = excluded.style_main,
  style_sub = excluded.style_sub,
  tone = excluded.tone,
  imagery = excluded.imagery,
  text_density = excluded.text_density,
  energy_level = excluded.energy_level,
  caption_text = excluded.caption_text,
  status = excluded.status,
  id = excluded.id,
  title = excluded.title,
  text_type = excluded.text_type,
  visual_series = excluded.visual_series,
  caption = excluded.caption,
  prompt = excluded.prompt,
  cc0_source = excluded.cc0_source,
  image_url = excluded.image_url,
  font_size = excluded.font_size,
  color_tone = excluded.color_tone,
  religious_content = excluded.religious_content,
  updated_at = now();
