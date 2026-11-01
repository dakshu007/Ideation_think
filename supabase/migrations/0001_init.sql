-- TestLoop: initial schema
-- Run once in Supabase → SQL Editor (or `supabase db push`).
--
-- Rules of the exchange:
--   * A user signs in with Google; a profile row is created automatically.
--   * A developer adds an app (just its package name; links are derived from it).
--   * Testers join apps, opt in on Google Play, and check in once a day.
--   * Each check-in earns 1 credit; finishing 14 check-ins earns 3 bonus credits.
--   * Feedback is required on check-in 1, 7 and 14 (developers need it for
--     Google's production-access form).
--   * Credits are the owner's priority in the discover queue: test more, get tested sooner.
--
-- Credits, streaks, assignments and check-ins can only change through the
-- security-definer functions at the bottom, never by direct writes from the browser.

-- ───────────────────────── profiles ─────────────────────────
create table public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  email            text not null,
  full_name        text,
  avatar_url       text,
  goal             text check (goal in ('get', 'test')),
  android_version  text check (char_length(android_version) <= 40),
  apps_per_day     int  not null default 10 check (apps_per_day between 1 and 50),
  credits          int  not null default 0,
  streak           int  not null default 0,
  last_checkin_on  date,
  reliability      int  not null default 100,
  onboarded        boolean not null default false,
  created_at       timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Users may only edit their own setup answers, never credits/streak/reliability.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (goal, android_version, apps_per_day, onboarded) on public.profiles to authenticated;

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── apps ─────────────────────────
create table public.apps (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references public.profiles(id) on delete cascade,
  package_name   text not null unique
                 check (package_name ~ '^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$'
                        and char_length(package_name) <= 150),
  app_name       text not null check (char_length(btrim(app_name)) between 1 and 60),
  status         text not null default 'active' check (status in ('active', 'done')),
  boosted_until  timestamptz,
  created_at     timestamptz not null default now()
);

create index apps_owner_idx on public.apps (owner_id);

alter table public.apps enable row level security;

-- App names/packages are visible to every signed-in member (they are tested publicly anyway).
create policy "apps: members read" on public.apps
  for select to authenticated using (true);
create policy "apps: owner inserts" on public.apps
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "apps: owner updates" on public.apps
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "apps: owner deletes" on public.apps
  for delete to authenticated using (owner_id = (select auth.uid()));

-- boosted_until is set by payments only.
revoke insert, update on public.apps from anon, authenticated;
grant insert (owner_id, package_name, app_name) on public.apps to authenticated;
grant update (app_name, status) on public.apps to authenticated;

-- Max 3 active apps per developer.
create function public.limit_active_apps() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.apps where owner_id = new.owner_id and status = 'active') >= 3 then
    raise exception 'You can run up to 3 tests at a time.';
  end if;
  return new;
end $$;

create trigger apps_limit before insert on public.apps
  for each row execute function public.limit_active_apps();

-- ───────────────────────── assignments ─────────────────────────
-- One row per (tester, app): "this tester is testing this app".
create table public.assignments (
  id               uuid primary key default gen_random_uuid(),
  app_id           uuid not null references public.apps(id) on delete cascade,
  tester_id        uuid not null references public.profiles(id) on delete cascade,
  joined_at        timestamptz not null default now(),
  last_checkin_on  date,
  checkin_count    int  not null default 0,
  status           text not null default 'active' check (status in ('active', 'left', 'completed')),
  unique (app_id, tester_id)
);

create index assignments_tester_idx on public.assignments (tester_id);

alter table public.assignments enable row level security;

-- Testers see their own rows; app owners see the rows for their apps (no tester identity is exposed
-- because profiles are only readable by their owner).
create policy "assignments: tester or owner reads" on public.assignments
  for select to authenticated using (
    tester_id = (select auth.uid())
    or exists (select 1 from public.apps a where a.id = app_id and a.owner_id = (select auth.uid()))
  );

revoke insert, update, delete on public.assignments from anon, authenticated;

-- ───────────────────────── checkins ─────────────────────────
create table public.checkins (
  id             bigint generated always as identity primary key,
  assignment_id  uuid not null references public.assignments(id) on delete cascade,
  day            date not null default current_date,
  day_number     int  not null,
  feedback       text check (char_length(feedback) <= 500),
  created_at     timestamptz not null default now(),
  unique (assignment_id, day)
);

alter table public.checkins enable row level security;

create policy "checkins: tester or owner reads" on public.checkins
  for select to authenticated using (
    exists (
      select 1 from public.assignments s
      join public.apps a on a.id = s.app_id
      where s.id = assignment_id
        and (s.tester_id = (select auth.uid()) or a.owner_id = (select auth.uid()))
    )
  );

revoke insert, update, delete on public.checkins from anon, authenticated;

-- ───────────────────────── functions ─────────────────────────

-- Join an app as a tester.
create function public.join_app(p_app_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid   uuid := auth.uid();
  v_owner uuid;
  v_id    uuid;
begin
  if v_uid is null then raise exception 'Please sign in again.'; end if;

  select owner_id into v_owner from public.apps where id = p_app_id and status = 'active';
  if v_owner is null then raise exception 'This test has ended.'; end if;
  if v_owner = v_uid then raise exception 'You cannot test your own app.'; end if;

  insert into public.assignments (app_id, tester_id)
  values (p_app_id, v_uid)
  on conflict (app_id, tester_id) do update
    set status = 'active', joined_at = now(), checkin_count = 0, last_checkin_on = null
    where public.assignments.status = 'left'
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.assignments where app_id = p_app_id and tester_id = v_uid;
  end if;
  return v_id;
end $$;

-- Daily check-in. Returns the new check-in count.
create function public.check_in(p_assignment_id uuid, p_feedback text default null) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_uid  uuid := auth.uid();
  a      public.assignments%rowtype;
  v_next int;
  v_last date;
  v_fb   text := nullif(btrim(coalesce(p_feedback, '')), '');
begin
  if v_uid is null then raise exception 'Please sign in again.'; end if;

  select * into a from public.assignments
  where id = p_assignment_id and tester_id = v_uid
  for update;
  if not found then raise exception 'Test not found.'; end if;
  if a.status = 'left' then raise exception 'You left this test.'; end if;
  if a.last_checkin_on = current_date then return a.checkin_count; end if;

  v_next := a.checkin_count + 1;
  if v_next in (1, 7, 14) and v_fb is null then
    raise exception 'Please add one line of feedback today.';
  end if;
  if char_length(v_fb) > 500 then raise exception 'Feedback is too long (500 characters max).'; end if;

  insert into public.checkins (assignment_id, day_number, feedback) values (a.id, v_next, v_fb);

  update public.assignments
     set last_checkin_on = current_date,
         checkin_count   = v_next,
         status          = case when v_next >= 14 then 'completed' else status end
   where id = a.id;

  select last_checkin_on into v_last from public.profiles where id = v_uid for update;
  update public.profiles
     set credits = credits + 1 + case when v_next = 14 then 3 else 0 end,
         streak  = case
                     when v_last = current_date     then streak
                     when v_last = current_date - 1 then streak + 1
                     else 1
                   end,
         last_checkin_on = current_date
   where id = v_uid;

  return v_next;
end $$;

-- Leave a test (e.g. uninstalled). Honest exits cost a little reliability.
create function public.leave_app(p_assignment_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  update public.assignments set status = 'left'
   where id = p_assignment_id and tester_id = v_uid and status = 'active';
  if found then
    update public.profiles set reliability = greatest(0, reliability - 10) where id = v_uid;
  end if;
end $$;

-- Apps this user can join, best first:
--   boosted apps → apps still under 15 testers → owners who test the most → closest to the goal.
create function public.discover_apps(p_limit int default 10)
returns table (app_id uuid, app_name text, package_name text, tester_count int, boosted boolean)
language sql stable security definer set search_path = '' as $$
  with counts as (
    select a.id,
           a.app_name,
           a.package_name,
           coalesce(a.boosted_until > now(), false) as boosted,
           a.created_at,
           p.credits as owner_credits,
           (select count(*) from public.assignments s
             where s.app_id = a.id and s.status in ('active', 'completed'))::int as tester_count
      from public.apps a
      join public.profiles p on p.id = a.owner_id
     where a.status = 'active'
       and a.owner_id <> auth.uid()
       and not exists (
         select 1 from public.assignments m
          where m.app_id = a.id and m.tester_id = auth.uid() and m.status <> 'left'
       )
  )
  select id, app_name, package_name, tester_count, boosted
    from counts
   where tester_count < 20
   order by boosted desc,
            (tester_count >= 15) asc,
            owner_credits desc,
            tester_count desc,
            created_at asc
   limit least(greatest(p_limit, 1), 50);
$$;

revoke execute on function public.join_app(uuid)          from public, anon;
revoke execute on function public.check_in(uuid, text)    from public, anon;
revoke execute on function public.leave_app(uuid)         from public, anon;
revoke execute on function public.discover_apps(int)      from public, anon;
revoke execute on function public.handle_new_user()       from public, anon, authenticated;
revoke execute on function public.limit_active_apps()     from public, anon, authenticated;
grant  execute on function public.join_app(uuid)          to authenticated;
grant  execute on function public.check_in(uuid, text)    to authenticated;
grant  execute on function public.leave_app(uuid)         to authenticated;
grant  execute on function public.discover_apps(int)      to authenticated;

-- Reads go through the RLS policies above.
grant select on public.profiles, public.apps, public.assignments, public.checkins to authenticated;
