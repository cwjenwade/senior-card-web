alter table if exists public.participants add column if not exists reminder_opt_in boolean not null default false;
alter table if exists public.participants add column if not exists care_ambassador_opt_in boolean not null default false;
alter table if exists public.participants add column if not exists wants_care boolean not null default false;
alter table if exists public.participants add column if not exists chat_match_opt_in boolean not null default false;
alter table if exists public.participants add column if not exists m03_completed_at timestamptz;

alter table if exists public.partner_links add column if not exists link_type text not null default 'care';
alter table if exists public.partner_links add column if not exists match_status text not null default 'waiting_match';
alter table if exists public.partner_links add column if not exists chat_enabled boolean not null default false;
alter table if exists public.partner_links add column if not exists updated_at timestamptz not null default now();

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
