-- Security + exchange-logic checks. Run with: npm run test:db (needs local Postgres, see README).
\set ON_ERROR_STOP on
insert into auth.users (id, email, raw_user_meta_data) values
 ('aaaaaaaa-0000-0000-0000-000000000001','a@x.com','{"full_name":"Asha Dev"}'),
 ('bbbbbbbb-0000-0000-0000-000000000002','b@x.com','{}'),
 ('cccccccc-0000-0000-0000-000000000003','c@x.com','{}');
select count(*) = 3 as profiles_created from public.profiles;

create function pg_temp.expect_error(q text, frag text) returns text language plpgsql as $$
begin execute q; raise exception 'EXPECTED ERROR BUT OK: %', q;
exception when others then
  if sqlerrm like 'EXPECTED ERROR%' then raise; end if;
  if position(frag in sqlerrm) = 0 then raise exception 'wrong error for %: %', q, sqlerrm; end if;
  return 'ok: ' || sqlerrm; end $$;
grant execute on function pg_temp.expect_error(text,text) to authenticated;

-- ── as A
set role authenticated; set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
update public.profiles set goal='get', apps_per_day=10, onboarded=true where id = auth.uid();
select pg_temp.expect_error($$update public.profiles set credits = 999 where id = auth.uid()$$, 'permission denied');
insert into public.apps (owner_id, package_name, app_name) values (auth.uid(), 'com.asha.habits', 'Habit Tracker');
select pg_temp.expect_error($$update public.apps set boosted_until = now() + interval '30 days'$$, 'permission denied');
select pg_temp.expect_error($$insert into public.apps (owner_id, package_name, app_name) values ('bbbbbbbb-0000-0000-0000-000000000002', 'com.fake.one', 'X')$$, 'row-level security');
select pg_temp.expect_error($$insert into public.apps (owner_id, package_name, app_name) values (auth.uid(), 'not a package', 'X')$$, 'check constraint');
insert into public.apps (owner_id, package_name, app_name) values (auth.uid(), 'com.asha.two', 'Two'), (auth.uid(), 'com.asha.three', 'Three');
select pg_temp.expect_error($$insert into public.apps (owner_id, package_name, app_name) values (auth.uid(), 'com.asha.four', 'Four')$$, 'up to 3');
select pg_temp.expect_error($$select public.join_app((select id from public.apps where package_name='com.asha.habits'))$$, 'own app');
reset role;

-- ── as B
set role authenticated; set request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-000000000002';
select count(*) as b_sees_profiles from public.profiles;  -- expect 1 (own)
select app_name, tester_count from public.discover_apps(10) order by app_name;
select public.join_app((select id from public.apps where package_name='com.asha.habits')) is not null as b_joined;
select public.join_app((select id from public.apps where package_name='com.asha.habits')) is not null as b_join_again_idempotent;
select pg_temp.expect_error($$insert into public.assignments (app_id, tester_id) values ((select id from public.apps where package_name='com.asha.two'), auth.uid())$$, 'permission denied');
select pg_temp.expect_error($$select public.check_in((select id from public.assignments limit 1), null)$$, 'feedback');
select public.check_in((select id from public.assignments limit 1), 'Login button is hidden on small screens') as day_after_first;
select public.check_in((select id from public.assignments limit 1), null) as same_day_again;
select credits, streak from public.profiles;  -- expect 1, 1
select count(*) as discover_without_joined from public.discover_apps(10) where package_name = 'com.asha.habits';  -- 0
reset role;

-- ── as C (stranger)
set role authenticated; set request.jwt.claim.sub = 'cccccccc-0000-0000-0000-000000000003';
select count(*) as c_sees_assignments, (select count(*) from public.checkins) as c_sees_checkins from public.assignments;  -- 0, 0
select app_name, tester_count from public.discover_apps(10) where package_name='com.asha.habits';  -- 1 tester
select pg_temp.expect_error($$select public.check_in((select id from public.assignments limit 1), 'x')$$, 'not found');
reset role;

-- ── as A again: sees the tester row + feedback for own app, but not B's profile
set role authenticated; set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
select count(*) as a_sees_assignments from public.assignments;
select c.feedback from public.checkins c join public.assignments s on s.id=c.assignment_id join public.apps a on a.id=s.app_id where a.owner_id = auth.uid();
select count(*) as a_sees_other_profiles from public.profiles where id <> auth.uid();
reset role;

-- ── simulate 13 more days for B → completion bonus
set role authenticated; set request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-000000000002';
reset role;
do $$ declare i int; begin
  for i in 2..14 loop
    update public.checkins set day = day - 1; update public.assignments set last_checkin_on = current_date - 1;  -- shift history back a day
    update public.profiles set last_checkin_on = current_date - 1 where email='b@x.com';
    perform set_config('request.jwt.claim.sub','bbbbbbbb-0000-0000-0000-000000000002', true);
    perform public.check_in((select id from public.assignments limit 1), case when i in (7,14) then 'day '||i else null end);
  end loop; end $$;
select s.status, s.checkin_count, p.credits, p.streak from public.assignments s join public.profiles p on p.id = s.tester_id;  -- completed, 14, 17, 14
set role authenticated; set request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-000000000002';
select public.join_app((select id from public.apps where package_name='com.asha.two')) is not null as joined_two;
select public.leave_app((select s.id from public.assignments s join public.apps a on a.id=s.app_id where a.package_name='com.asha.two'));
select reliability from public.profiles;  -- 90
reset role;
set role anon;
select pg_temp.expect_error($$select public.discover_apps(5)$$, 'permission denied');
select count(*) as anon_sees_apps from public.apps;
