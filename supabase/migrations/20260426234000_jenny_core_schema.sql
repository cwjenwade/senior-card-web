create table if not exists public.participants (
  id text primary key,
  display_name text not null default '',
  age_band text not null default '',
  wants_partner boolean not null default false,
  wants_reminders boolean not null default false,
  wants_to_help_others boolean not null default false,
  wants_to_be_cared_for boolean not null default false,
  wants_chat_matching boolean not null default false,
  reminder_opt_in boolean not null default false,
  care_ambassador_opt_in boolean not null default false,
  wants_care boolean not null default false,
  chat_match_opt_in boolean not null default false,
  m03_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.participants add column if not exists wants_reminders boolean not null default false;
alter table if exists public.participants add column if not exists wants_to_help_others boolean not null default false;
alter table if exists public.participants add column if not exists wants_to_be_cared_for boolean not null default false;
alter table if exists public.participants add column if not exists wants_chat_matching boolean not null default false;
alter table if exists public.participants add column if not exists reminder_opt_in boolean not null default false;
alter table if exists public.participants add column if not exists care_ambassador_opt_in boolean not null default false;
alter table if exists public.participants add column if not exists wants_care boolean not null default false;
alter table if exists public.participants add column if not exists chat_match_opt_in boolean not null default false;
alter table if exists public.participants add column if not exists m03_completed_at timestamptz;

create table if not exists public.card_catalog (
  card_id text primary key,
  card_title text not null,
  image_provider text not null default 'external',
  image_url text not null default '',
  image_key text not null default '',
  style_main text not null,
  style_sub text not null default '',
  tone text not null default '',
  imagery text not null,
  text_density text not null default 'short',
  energy_level text not null default 'steady',
  caption_text text not null,
  default_prompt text not null default '',
  status text not null default 'active',
  uploaded_by text not null default 'system',
  id text unique not null,
  title text not null,
  text_type text not null,
  visual_series text not null,
  caption text not null,
  prompt text not null default '',
  cc0_source text not null default '',
  font_size text not null default 'large',
  color_tone text not null default 'warm',
  religious_content text not null default 'none',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.card_catalog add column if not exists image_provider text not null default 'external';
alter table if exists public.card_catalog add column if not exists image_url text not null default '';
alter table if exists public.card_catalog add column if not exists image_key text not null default '';
alter table if exists public.card_catalog add column if not exists default_prompt text not null default '';
alter table if exists public.card_catalog add column if not exists uploaded_by text not null default 'system';

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
  link_id text unique not null,
  participant_id text not null references public.participants(id) on delete cascade,
  partner_participant_id text not null,
  status text not null default 'pending',
  link_type text not null default 'care_pair',
  match_status text not null default 'pending',
  chat_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table if exists public.partner_links add column if not exists link_id text;
update public.partner_links set link_id = id where link_id is null;
alter table if exists public.partner_links add column if not exists link_type text not null default 'care_pair';
alter table if exists public.partner_links add column if not exists match_status text not null default 'pending';
alter table if exists public.partner_links add column if not exists chat_enabled boolean not null default false;
alter table if exists public.partner_links add column if not exists updated_at timestamptz not null default now();
create unique index if not exists idx_partner_links_link_id on public.partner_links (link_id);

create table if not exists public.care_events (
  event_id text primary key,
  participant_id text not null references public.participants(id) on delete cascade,
  target_participant_id text not null default '',
  event_type text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.community_info (
  info_id text primary key,
  title text not null,
  category text not null,
  description text not null,
  event_date date,
  location text not null default '',
  contact text not null default '',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
create index if not exists idx_care_events_participant_time on public.care_events (participant_id, created_at desc);
create index if not exists idx_community_info_category_status on public.community_info (category, status, event_date desc);

insert into public.community_info (
  info_id, title, category, description, event_date, location, contact, status
) values
  ('info-policy-001', '長者交通補助申請提醒', 'policy', '本月起可向里辦公室申請長者交通補助，記得帶身分證與印章。', current_date + 7, '里民活動中心', '里幹事 02-0000-0000', 'active'),
  ('info-neighborhood-001', '週三鄰里健走', 'neighborhood', '每週三早上 8:30 在活動中心集合，一起散步聊天。', current_date + 3, '和平里活動中心', '里辦公室 02-1111-1111', 'active'),
  ('info-temple-001', '媽祖廟平安餐會', 'temple', '本週六中午有平安餐會與祈福活動，歡迎提早報名。', current_date + 5, '福安宮', '廟務組 02-2222-2222', 'active'),
  ('info-community-001', '社區手作下午茶', 'community', '下週二下午有簡單手作與下午茶，適合想出門坐坐聊天的長輩。', current_date + 9, '社區據點教室', '社區志工 02-3333-3333', 'active')
on conflict (info_id) do update set
  title = excluded.title,
  category = excluded.category,
  description = excluded.description,
  event_date = excluded.event_date,
  location = excluded.location,
  contact = excluded.contact,
  status = excluded.status,
  updated_at = now();

create index if not exists idx_diary_entries_participant_date on public.diary_entries (participant_id, entry_date desc);
create index if not exists idx_egg_progress_window on public.egg_progress (window_end desc);
create index if not exists idx_line_interaction_events_user_time on public.line_interaction_events (user_id, created_at desc);
create index if not exists idx_line_diary_entries_user_time on public.line_diary_entries (user_id, created_at desc);

insert into public.card_catalog (
  card_id, card_title, image_provider, image_url, image_key, style_main, style_sub, tone, imagery, text_density, energy_level, caption_text, default_prompt, status, uploaded_by,
  id, title, text_type, visual_series, caption, prompt, cc0_source, font_size, color_tone, religious_content
) values
  ('C0001', '晨光平安・花開暖暖', 'external', 'https://images.unsplash.com/photo-1468327768560-75b778cbb551?auto=format&fit=crop&w=1200&q=80', '', '問安語', '溫柔晨光', '溫和', '花系列', 'short', 'steady', '願你今天平安順心，心情輕鬆。', '看著這張花開的圖，寫一句今天想對自己說的話。', 'active', 'system-seed', 'C0001', '晨光平安・花開暖暖', '問安語', '花系列', '願你今天平安順心，心情輕鬆。', '看著這張花開的圖，寫一句今天想對自己說的話。', '', 'large', 'calm', 'none'),
  ('C0002', '慢慢也很好・山林清氣', 'external', 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80', '', '勵志語', '舒心散步', '明亮', '山林系列', 'medium', 'uplift', '放慢腳步，今天也能有好心情。', '看著這片山林，寫一句今天最想記下的心情。', 'active', 'system-seed', 'C0002', '慢慢也很好・山林清氣', '勵志語', '山林系列', '放慢腳步，今天也能有好心情。', '看著這片山林，寫一句今天最想記下的心情。', '', 'medium', 'bright', 'none'),
  ('C0003', '佛光護佑・安心靜心', 'external', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', '', '神佛金句', '靜心平安', '平靜', '神佛系列', 'short', 'calm', '願你平安健康，福慧常伴左右。', '看著這張安靜的圖，寫一句今天想留下的祝福。', 'active', 'system-seed', 'C0003', '佛光護佑・安心靜心', '神佛金句', '神佛系列', '願你平安健康，福慧常伴左右。', '看著這張安靜的圖，寫一句今天想留下的祝福。', '', 'large', 'calm', 'high'),
  ('C0004', '早安・花開暖暖', 'external', 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1200&q=80', '', '問安語', '柔和問候', '溫和', '花系列', 'short', 'steady', '送上一句問安，願你今天舒服自在。', '這張圖讓你想到什麼？寫一句今天的問候。', 'active', 'system-seed', 'C0004', '早安・花開暖暖', '問安語', '花系列', '送上一句問安，願你今天舒服自在。', '這張圖讓你想到什麼？寫一句今天的問候。', '', 'large', 'calm', 'none'),
  ('C0005', '日日都有光・山林清氣', 'external', 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80', '', '勵志語', '向光而行', '明亮', '山林系列', 'medium', 'uplift', '願你心裡有光，日子一天比一天安穩。', '看著這張有光的圖，寫一句今天想鼓勵自己的話。', 'active', 'system-seed', 'C0005', '日日都有光・山林清氣', '勵志語', '山林系列', '願你心裡有光，日子一天比一天安穩。', '看著這張有光的圖，寫一句今天想鼓勵自己的話。', '', 'medium', 'bright', 'none'),
  ('C0006', '心安得福・安心靜心', 'external', 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=80', '', '神佛金句', '安心祝福', '平靜', '神佛系列', 'short', 'calm', '心安就是福，願福氣常在。', '看著這張平靜的圖，寫一句今天想守住的心情。', 'active', 'system-seed', 'C0006', '心安得福・安心靜心', '神佛金句', '神佛系列', '心安就是福，願福氣常在。', '看著這張平靜的圖，寫一句今天想守住的心情。', '', 'large', 'calm', 'high')
on conflict (card_id) do update set
  card_title = excluded.card_title,
  image_provider = excluded.image_provider,
  image_url = excluded.image_url,
  image_key = excluded.image_key,
  style_main = excluded.style_main,
  style_sub = excluded.style_sub,
  tone = excluded.tone,
  imagery = excluded.imagery,
  text_density = excluded.text_density,
  energy_level = excluded.energy_level,
  caption_text = excluded.caption_text,
  default_prompt = excluded.default_prompt,
  status = excluded.status,
  uploaded_by = excluded.uploaded_by,
  id = excluded.id,
  title = excluded.title,
  text_type = excluded.text_type,
  visual_series = excluded.visual_series,
  caption = excluded.caption,
  prompt = excluded.prompt,
  cc0_source = excluded.cc0_source,
  font_size = excluded.font_size,
  color_tone = excluded.color_tone,
  religious_content = excluded.religious_content,
  updated_at = now();
