create table if not exists public.card_catalog (
  id text primary key,
  title text not null,
  text_type text not null,
  visual_series text not null,
  tone text not null,
  caption text not null,
  prompt text not null,
  status text not null default 'draft',
  cc0_source text not null,
  image_url text not null,
  font_size text not null default 'large',
  text_density text not null default 'short',
  color_tone text not null default 'warm',
  religious_content text not null default 'none',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.line_interaction_events (
  id text primary key,
  session_id text not null,
  user_id text not null,
  card_id text,
  event_type text not null,
  mood_today text,
  text_type text,
  visual_series text,
  payload jsonb default '{}'::jsonb,
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

create index if not exists idx_card_catalog_status on public.card_catalog (status);
create index if not exists idx_card_catalog_text_type on public.card_catalog (text_type);
create index if not exists idx_card_catalog_visual_series on public.card_catalog (visual_series);

create index if not exists idx_line_events_user_time on public.line_interaction_events (user_id, created_at desc);
create index if not exists idx_line_events_session on public.line_interaction_events (session_id);
create index if not exists idx_line_diaries_user_time on public.line_diary_entries (user_id, created_at desc);
create index if not exists idx_line_diaries_session on public.line_diary_entries (session_id);

insert into public.card_catalog (
  id, title, text_type, visual_series, tone, caption, prompt, status, cc0_source, image_url, font_size, text_density, color_tone, religious_content
) values
  ('C001', '晨光平安', '平安語', '日出系列', '平靜', '今天也慢慢來，平平安安就很好。', '看到這張圖，今天想寫一句什麼？', 'active', 'Unsplash / sunrise coast', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', 'large', 'short', 'warm', 'none'),
  ('C002', '蘭花問安', '問安語', '花系列', '溫和', '今天過得還好嗎？寫一句也可以。', '今天心裡最想記下來的是什麼？', 'active', 'Unsplash / orchid macro', 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1200&q=80', 'large', 'short', 'calm', 'none'),
  ('C003', '慢慢也很好', '勵志語', '山水系列', '明亮', '今天不用急，往前一點點就很好。', '今天有哪件小事值得記下來？', 'active', 'Unsplash / mountain path', 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80', 'medium', 'medium', 'warm', 'none'),
  ('C004', '你辛苦了', '陪伴語', '茶水果系列', '陪伴', '今天先歇一下，也算在照顧自己。', '如果跟自己說一句溫柔的話，會是什麼？', 'active', 'Unsplash / tea table', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80', 'large', 'short', 'calm', 'none'),
  ('C006', '平安心念', '平安語', '神佛系列', '平靜', '願心安，身安，今天也平平順順。', '今天心裡安不安？一句話也可以。', 'active', 'Unsplash / temple hall', 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1200&q=80', 'large', 'short', 'calm', 'high'),
  ('C007', '小狗來問安', '問安語', '動物系列', '明亮', '今天有沒有吃飯喝水？寫一句就好。', '今天想簡單記一句什麼？', 'active', 'Unsplash / puppy portrait', 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&q=80', 'large', 'short', 'bright', 'none')
on conflict (id) do update set
  title = excluded.title,
  text_type = excluded.text_type,
  visual_series = excluded.visual_series,
  tone = excluded.tone,
  caption = excluded.caption,
  prompt = excluded.prompt,
  status = excluded.status,
  cc0_source = excluded.cc0_source,
  image_url = excluded.image_url,
  font_size = excluded.font_size,
  text_density = excluded.text_density,
  color_tone = excluded.color_tone,
  religious_content = excluded.religious_content,
  updated_at = now();
