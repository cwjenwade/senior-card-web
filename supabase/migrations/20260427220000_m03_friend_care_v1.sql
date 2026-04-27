alter table if exists public.participants add column if not exists wants_reminders boolean not null default false;
alter table if exists public.participants add column if not exists wants_to_help_others boolean not null default false;
alter table if exists public.participants add column if not exists wants_to_be_cared_for boolean not null default false;
alter table if exists public.participants add column if not exists wants_chat_matching boolean not null default false;

update public.participants
set
  wants_reminders = coalesce(reminder_opt_in, false),
  wants_to_help_others = coalesce(care_ambassador_opt_in, false),
  wants_to_be_cared_for = coalesce(wants_care, wants_partner, false),
  wants_chat_matching = coalesce(chat_match_opt_in, false);

alter table if exists public.partner_links add column if not exists link_id text;
update public.partner_links set link_id = id where link_id is null;
create unique index if not exists idx_partner_links_link_id on public.partner_links (link_id);

alter table if exists public.partner_links add column if not exists link_type text not null default 'care_pair';
alter table if exists public.partner_links add column if not exists match_status text not null default 'pending';
alter table if exists public.partner_links add column if not exists chat_enabled boolean not null default false;
alter table if exists public.partner_links add column if not exists updated_at timestamptz not null default now();

update public.partner_links
set
  link_type = case
    when link_type in ('chat', 'chat_pair') then 'chat_pair'
    else 'care_pair'
  end,
  status = case
    when status in ('matched', 'paused', 'closed', 'pending') then status
    when status = 'active' then 'matched'
    else 'pending'
  end,
  match_status = case
    when coalesce(match_status, '') in ('matched', 'paused', 'closed', 'pending') then match_status
    when status = 'active' then 'matched'
    when status = 'inactive' then 'closed'
    else 'pending'
  end,
  chat_enabled = case
    when link_type in ('chat', 'chat_pair') then true
    else coalesce(chat_enabled, false)
  end,
  updated_at = coalesce(updated_at, created_at, now());

create table if not exists public.care_events (
  event_id text primary key,
  participant_id text not null references public.participants(id) on delete cascade,
  target_participant_id text not null default '',
  event_type text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_care_events_participant_time on public.care_events (participant_id, created_at desc);
