alter table if exists public.participants add column if not exists district text not null default '';
alter table if exists public.participants add column if not exists is_little_angel boolean not null default false;
alter table if exists public.participants add column if not exists is_little_owner boolean not null default false;
alter table if exists public.participants add column if not exists free_owner_slots integer not null default 5;
alter table if exists public.participants add column if not exists extra_owner_slots integer not null default 0;

alter table if exists public.diary_entries add column if not exists entry_index integer not null default 1;

alter table if exists public.partner_links add column if not exists angel_participant_id text not null default '';
alter table if exists public.partner_links add column if not exists owner_participant_id text not null default '';
update public.partner_links
set angel_participant_id = case
      when angel_participant_id <> '' then angel_participant_id
      when link_type = 'care_pair' then partner_participant_id
      else participant_id
    end,
    owner_participant_id = case
      when owner_participant_id <> '' then owner_participant_id
      when link_type = 'care_pair' then participant_id
      else partner_participant_id
    end
where angel_participant_id = '' or owner_participant_id = '';

create table if not exists public.user_daily_mood (
  participant_id text not null references public.participants(id) on delete cascade,
  selected_date date not null,
  mood text not null,
  created_at timestamptz not null default now(),
  primary key (participant_id, selected_date)
);

create table if not exists public.user_daily_checkin (
  participant_id text not null references public.participants(id) on delete cascade,
  selected_date date not null,
  claimed_today boolean not null default false,
  claim_season text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (participant_id, selected_date)
);

create table if not exists public.care_messages (
  id text primary key,
  sender_participant_id text not null references public.participants(id) on delete cascade,
  receiver_participant_id text not null references public.participants(id) on delete cascade,
  message_type text not null,
  message_text text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.volunteer_requests (
  id text primary key,
  participant_id text not null references public.participants(id) on delete cascade,
  request_text text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_reports (
  id text primary key,
  reporter_participant_id text not null references public.participants(id) on delete cascade,
  target_participant_id text not null references public.participants(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_blocks (
  id text primary key,
  blocker_participant_id text not null references public.participants(id) on delete cascade,
  target_participant_id text not null references public.participants(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table if exists public.community_info add column if not exists district text not null default '';

create unique index if not exists idx_user_daily_mood_unique on public.user_daily_mood (participant_id, selected_date);
create unique index if not exists idx_user_daily_checkin_unique on public.user_daily_checkin (participant_id, selected_date);
create index if not exists idx_care_messages_sender_time on public.care_messages (sender_participant_id, created_at desc);
create index if not exists idx_care_messages_receiver_time on public.care_messages (receiver_participant_id, created_at desc);
create index if not exists idx_community_info_district_status on public.community_info (district, status, event_date desc);
create index if not exists idx_volunteer_requests_participant_time on public.volunteer_requests (participant_id, created_at desc);
create index if not exists idx_user_reports_target_time on public.user_reports (target_participant_id, created_at desc);
create index if not exists idx_user_blocks_target_time on public.user_blocks (target_participant_id, created_at desc);
