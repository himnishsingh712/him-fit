-- Applied to the Supabase project on 18 Nov 2026 (migration: init_tracker_schema).
-- One row per user per day. The whole day's log lives in `data` (items, water, supplements, check-in).
create table public.days (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

-- One row per user: targets, supplement schedule changes, bloodwork.
create table public.config (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row Level Security: each person can only ever see and change their own rows.
alter table public.days enable row level security;
alter table public.config enable row level security;

create policy "own days - select" on public.days for select to authenticated using ((select auth.uid()) = user_id);
create policy "own days - insert" on public.days for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own days - update" on public.days for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own days - delete" on public.days for delete to authenticated using ((select auth.uid()) = user_id);

create policy "own config - select" on public.config for select to authenticated using ((select auth.uid()) = user_id);
create policy "own config - insert" on public.config for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own config - update" on public.config for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create index days_user_updated_idx on public.days (user_id, updated_at);
