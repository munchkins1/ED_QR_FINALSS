# CampusQR Attend — Supabase Setup (one SQL block)

This file contains the **complete** CampusQR schema in a single block.
Copy the SQL below into **Supabase Dashboard → SQL Editor → New query**,
paste, and click **Run**. It is safe to re-run (idempotent).

It creates: the enums, the `profiles` / `events` / `attendance` / `appeals` / `audit_logs`
tables, the helper functions, the `check_in()` RPC, the admin RPCs, all RLS
policies, column grants, the signup trigger, the event audit trigger, and the
Realtime publication. After setup, **STEP 1b** widens teachers to full event, appeal + attendance access.

---

## STEP 1 — Run this SQL

```sql
-- ============================================================
-- CampusQR — complete schema: enums, tables, helpers, RLS/CRUD
-- policies, grants, signup trigger, realtime. Safe to re-run.
-- ============================================================

-- ==================== 1. enum types ====================
do $$ begin
  create type public.user_role as enum ('student', 'teacher', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.event_status as enum ('draft', 'open', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.attendance_status as enum ('present', 'late', 'absent', 'excused');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.educational_level as enum
    ('college', 'senior_high', 'junior_high', 'elementary');
exception when duplicate_object then null; end $$;

-- Casts client-supplied text to the enum without raising on a bad value,
-- so a hand-crafted signup cannot abort the trigger.
create or replace function public.try_education_level(value text)
returns public.educational_level
language plpgsql
immutable
as $$
begin
  return nullif(value, '')::public.educational_level;
exception when others then
  return null;
end;
$$;


-- ---------- new columns ----------
-- `section` and `block` are non-reserved keywords in PostgreSQL.
alter table public.profiles add column if not exists educational_level public.educational_level;
alter table public.profiles add column if not exists course     text;
alter table public.profiles add column if not exists year_level text;
alter table public.profiles add column if not exists block      text;
alter table public.profiles add column if not exists section    text;

comment on column public.profiles.educational_level is 'college | senior_high | junior_high | elementary';
comment on column public.profiles.course           is 'College course (BSIT, ...) or SHS track (STEM, ...)';
comment on column public.profiles.year_level       is 'College year 1-4, or grade level 11-12 / 7-10 / 1-6';
comment on column public.profiles.block            is 'College block A-F; NULL for every other level';
comment on column public.profiles.section          is 'Free-text section for SHS / JHS / Elementary; NULL for College';
comment on column public.profiles.grade_class      is 'Denormalised display string built by formatGradeClass(); kept for reports.';

-- ==================== 2. tables ====================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text unique not null,
  full_name   text not null default '',
  role        public.user_role not null default 'student',
  student_no  text,
  grade_class text,
  department  text,
  title       text,
  phone       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  -- educational details (structured):
  -- college     -> course + year_level 1-4 + block A-F
  -- senior_high -> course (track) + year_level 11-12 + section
  -- junior_high -> year_level 7-10 + section
  -- elementary  -> year_level 1-6 + section
  educational_level public.educational_level,
  course     text,
  year_level text,
  block      text,
  section    text
);
comment on table public.profiles is 'Application profile + role for every authenticated user.';
comment on column public.profiles.grade_class is 'Denormalised display string (e.g. "Year 3 . Block A") built by formatGradeClass() in js/education.js; kept for the admin reports.';

-- Upgrade path: `create table if not exists` skips an existing table, so a
-- database built from an older schema gains the columns here.
-- `section` and `block` are non-reserved keywords in PostgreSQL.
alter table public.profiles add column if not exists educational_level public.educational_level;
alter table public.profiles add column if not exists course     text;
alter table public.profiles add column if not exists year_level text;
alter table public.profiles add column if not exists block      text;
alter table public.profiles add column if not exists section    text;

comment on column public.profiles.educational_level is 'college | senior_high | junior_high | elementary';
comment on column public.profiles.course           is 'College course (BSIT, ...) or SHS track (STEM, ...)';
comment on column public.profiles.year_level       is 'College year 1-4, or grade level 11-12 / 7-10 / 1-6';
comment on column public.profiles.block            is 'College block A-F; NULL for every other level';
comment on column public.profiles.section          is 'Free-text section for SHS / JHS / Elementary; NULL for College';

create table if not exists public.events (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  description    text not null default '',
  venue          text not null default '',
  start_datetime timestamptz not null,
  end_datetime   timestamptz,
  status         public.event_status not null default 'draft',
  qr_token       uuid not null default gen_random_uuid() unique,
  created_by     uuid not null references public.profiles(id) on delete cascade,
  created_at     timestamptz not null default now(),
  constraint events_time_check check (end_datetime is null or end_datetime >= start_datetime)
);

create table if not exists public.attendance (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  student_id  uuid not null references public.profiles(id) on delete cascade,
  status      public.attendance_status not null default 'present',
  method      text not null default 'qr',
  recorded_at timestamptz not null default now(),
  recorded_by uuid references public.profiles(id) on delete set null,
  constraint attendance_unique_per_event unique (event_id, student_id)
);

create table if not exists public.audit_logs (
  id         bigint generated always as identity primary key,
  actor_id   uuid references public.profiles(id) on delete set null,
  action     text not null,
  entity     text,
  entity_id  text,
  details    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_events_created_by   on public.events(created_by);
create index if not exists idx_events_status       on public.events(status);
create index if not exists idx_attendance_event    on public.attendance(event_id);
create index if not exists idx_attendance_student  on public.attendance(student_id);

-- ---------- legacy compatibility columns ----------
-- The pre-existing (non-CampusQR) helpers in lib/attendance.ts + lib/events.ts
-- still select/insert these columns, and types/database.ts declares them as
-- optional. Fresh databases would fail those queries without them, so they
-- are kept as NULLABLE compatibility columns: CampusQR code never writes
-- them (`create table if not exists` skips existing tables, hence the
-- explicit `add column if not exists` for both fresh and upgraded DBs).
alter table public.profiles   add column if not exists updated_at timestamptz;
alter table public.events     add column if not exists event_code text;
alter table public.events     add column if not exists title      text;
alter table public.events     add column if not exists start_time timestamptz;
alter table public.events     add column if not exists end_time   timestamptz;
alter table public.attendance add column if not exists scanned_at timestamptz;

-- Keeps profiles.updated_at fresh without any app code.
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_touch_updated_at on public.profiles;
create trigger trg_profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------- backfill: infer the level of existing rows ----------
with legacy as (
  select
    p.id,
    case
      when p.department ilike '%college%' then 'college'::public.educational_level
      when p.department ilike '%senior%'  then 'senior_high'::public.educational_level
      when p.department ilike '%junior%'  then 'junior_high'::public.educational_level
      when p.department ilike '%kinder%'  then 'elementary'::public.educational_level
      when g.n between 1  and 6            then 'elementary'::public.educational_level
      when g.n between 7  and 10           then 'junior_high'::public.educational_level
      when g.n between 11 and 12           then 'senior_high'::public.educational_level
    end as lvl
  from public.profiles p
  left join lateral (
    select nullif((regexp_match(coalesce(p.grade_class, ''), '^grade\s+(\d+)'))[1], '')::int as n
  ) g on true
)
update public.profiles p
   set educational_level = l.lvl
  from legacy l
 where p.id = l.id
   and p.educational_level is null
   and l.lvl is not null;

-- ==================== 3. helper functions (RLS calls these) ====================
create or replace function public.current_role()
returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select (role = 'admin' and is_active)
                   from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_staff()  -- teacher OR admin
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select (role in ('teacher','admin') and is_active)
                   from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_student()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select (role = 'student' and is_active)
                   from public.profiles where id = auth.uid()), false);
$$;

-- Protect role / is_active from self-escalation at the trigger level.
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Only administrators can change user roles';
    end if;
    if new.is_active is distinct from old.is_active then
      raise exception 'Only administrators can change account status';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_fields on public.profiles;
create trigger trg_protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- ==================== 4. check-in RPC ====================
create or replace function public.check_in(p_token text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_student public.profiles;
  v_event   public.events;
  v_token   uuid;
begin
  -- 1. authenticated?
  if v_uid is null then
    return jsonb_build_object('result','unauthorized',
      'message','You must be signed in to record attendance.');
  end if;

  -- 2. caller must be an active student
  select * into v_student from public.profiles where id = v_uid;
  if not found then
    return jsonb_build_object('result','unauthorized','message','Profile not found.');
  end if;
  if v_student.role <> 'student' or not v_student.is_active then
    return jsonb_build_object('result','unauthorized',
      'message','Only active student accounts can record attendance.');
  end if;

  -- 3. valid QR token?
  begin
    v_token := p_token::uuid;
  exception when others then
    return jsonb_build_object('result','invalid',
      'message','That QR code is not a valid CampusQR event code.');
  end;

  select * into v_event from public.events where qr_token = v_token;
  if not found then
    return jsonb_build_object('result','invalid',
      'message','Invalid QR code - no matching event found.');
  end if;

  -- 4. event must be open
  if v_event.status <> 'open' then
    return jsonb_build_object('result','closed',
      'message','This event is closed for attendance.');
  end if;
  if v_event.end_datetime is not null and now() > v_event.end_datetime then
    return jsonb_build_object('result','closed',
      'message','This event has already ended.');
  end if;

  -- 5. duplicate prevention
  if exists (select 1 from public.attendance
             where event_id = v_event.id and student_id = v_uid) then
    return jsonb_build_object('result','duplicate','event',v_event.name,
      'message','You have already checked in to this event.');
  end if;

  -- 6. record attendance
  insert into public.attendance (event_id, student_id, status, method, recorded_by)
  values (v_event.id, v_uid, 'present', 'qr', v_uid);

  -- 7. audit trail
  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (v_uid, 'attendance.checkin', 'attendance', v_event.id::text,
          jsonb_build_object('event', v_event.name, 'student', v_student.full_name));

  return jsonb_build_object('result','success','event',v_event.name,
    'event_id', v_event.id, 'message','Attendance recorded successfully.');
end;
$$;

-- ==================== 5. admin RPCs ====================
create or replace function public.admin_set_role(p_user_id uuid, p_role public.user_role)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    return jsonb_build_object('result','unauthorized','message','Administrator privileges required.');
  end if;
  if p_user_id = auth.uid() and p_role <> 'admin' then
    return jsonb_build_object('result','error','message','You cannot remove your own administrator role.');
  end if;
  update public.profiles set role = p_role where id = p_user_id;
  insert into public.audit_logs(actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'user.set_role', 'profiles', p_user_id::text,
          jsonb_build_object('role', p_role));
  return jsonb_build_object('result','success','message','Role updated.');
end;
$$;

create or replace function public.admin_set_active(p_user_id uuid, p_active boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    return jsonb_build_object('result','unauthorized','message','Administrator privileges required.');
  end if;
  if p_user_id = auth.uid() and p_active = false then
    return jsonb_build_object('result','error','message','You cannot deactivate your own account.');
  end if;
  update public.profiles set is_active = p_active where id = p_user_id;
  insert into public.audit_logs(actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'user.set_active', 'profiles', p_user_id::text,
          jsonb_build_object('is_active', p_active));
  return jsonb_build_object('result','success',
    'message', case when p_active then 'Account activated.' else 'Account deactivated.' end);
end;
$$;

create or replace function public.admin_delete_user(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_admin_count int;
  v_event_count int;
begin
  if not public.is_admin() then
    return jsonb_build_object('result', 'unauthorized', 'message', 'Administrator privileges required.');
  end if;
  if p_user_id = auth.uid() then
    return jsonb_build_object('result', 'error', 'message', 'You cannot delete your own account.');
  end if;
  select count(*) into v_admin_count
    from public.profiles
    where role = 'admin' and is_active and id <> p_user_id;
  if v_admin_count = 0 then
    return jsonb_build_object('result', 'error', 'message', 'You cannot delete the last active administrator.');
  end if;
  select count(*) into v_event_count
    from public.events
    where created_by = p_user_id;
  if v_event_count > 0 then
    return jsonb_build_object('result', 'error', 'message',
      'This account owns ' || v_event_count || ' event(s). Delete or reassign them first.');
  end if;
  delete from auth.users where id = p_user_id;
  if not found then
    return jsonb_build_object('result', 'error', 'message', 'Account not found.');
  end if;
  insert into public.audit_logs(actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'user.delete', 'profiles', p_user_id::text,
            jsonb_build_object('deleted_user_id', p_user_id));
  return jsonb_build_object('result', 'success', 'message', 'Account deleted permanently.');
exception when others then
  return jsonb_build_object('result', 'error', 'message', SQLERRM);
end;
$$;

revoke execute on function public.admin_set_role(uuid, public.user_role) from anon;
revoke execute on function public.admin_set_active(uuid, boolean) from anon;
revoke execute on function public.admin_delete_user(uuid) from anon;

-- ---------- QR rotation (server-side; kills screenshots) ----------
-- lib/campusqr/events.ts calls rpc('rotate_qr_token', { p_event_id }) first
-- and falls back to a client-side update when the function is absent.
-- Defining it here makes rotation atomic server-side. Owner-or-admin only
-- (same rule as events_update); returns the refreshed event row.
create or replace function public.rotate_qr_token(p_event_id uuid)
returns public.events
language plpgsql security definer set search_path = public as $$
declare
  v_event public.events;
begin
  select * into v_event from public.events where id = p_event_id;
  if not found then
    raise exception 'Event not found.';
  end if;
  if not (v_event.created_by = auth.uid() or public.is_admin()) then
    raise exception 'Only the event owner or an administrator can rotate the QR code.';
  end if;
  update public.events
     set qr_token = gen_random_uuid()
   where id = p_event_id
  returning * into v_event;
  return v_event;
end;
$$;

revoke execute on function public.rotate_qr_token(uuid) from anon;

-- ==================== 6. RLS / CRUD policies ====================
alter table public.profiles   enable row level security;
alter table public.events     enable row level security;
alter table public.attendance enable row level security;
alter table public.audit_logs enable row level security;

-- ==================== profiles ====================
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select using (id = auth.uid());

drop policy if exists profiles_select_staff on public.profiles;
create policy profiles_select_staff on public.profiles
  for select using (public.is_staff());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = public.current_role());

-- *** Makes Admin -> Manage Users -> Edit work (admin UPDATE any row). ***
drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- INSERT/DELETE: none for clients. handle_new_user() creates the row at
-- signup; accounts are removed by deleting auth.users (cascade) or admin_delete_user().

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, email, full_name, role, student_no, phone,
    educational_level, course, year_level, block, section,
    department, grade_class
  )
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(new.email, '@', 1)
    ),
    'student',  -- public signups are ALWAYS students, whatever metadata claims
    nullif(new.raw_user_meta_data ->> 'student_no', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    public.try_education_level(new.raw_user_meta_data ->> 'educational_level'),
    nullif(new.raw_user_meta_data ->> 'course', ''),
    nullif(new.raw_user_meta_data ->> 'year_level', ''),
    nullif(new.raw_user_meta_data ->> 'block', ''),
    nullif(new.raw_user_meta_data ->> 'section', ''),
    nullif(new.raw_user_meta_data ->> 'department', ''),
    nullif(new.raw_user_meta_data ->> 'grade_class', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ==================== events ====================
drop policy if exists events_select on public.events;
create policy events_select on public.events
  for select using (
    -- Staff (teacher + admin) see every event, drafts included;
    -- students see open + closed only (their status flips live).
    status in ('open', 'closed') or created_by = auth.uid() or public.is_staff()
  );

drop policy if exists events_insert on public.events;
create policy events_insert on public.events
  for insert with check (public.is_staff() and created_by = auth.uid());

drop policy if exists events_update on public.events;
create policy events_update on public.events
  -- Staff (teacher + admin) may update ANY event.
  for update using (public.is_staff())
  with check (public.is_staff());

drop policy if exists events_delete on public.events;
create policy events_delete on public.events
  -- Staff (teacher + admin) may delete ANY event.
  for delete using (public.is_staff());

-- ==================== attendance ====================
drop policy if exists attendance_select on public.attendance;
create policy attendance_select on public.attendance
  -- Students see their own rows; staff (teacher + admin) monitor and
  -- correct every event's attendance (the Monitor tab opens any event).
  for select using (
    student_id = auth.uid() or public.is_staff()
  );

drop policy if exists attendance_update on public.attendance;
create policy attendance_update on public.attendance
  -- Staff (teacher + admin) may correct any row: per-row edits on
  -- Monitor, and approving an appeal flips the absent row to excused.
  for update using (public.is_staff())
  with check (public.is_staff());

drop policy if exists attendance_delete on public.attendance;
create policy attendance_delete on public.attendance
  -- Staff (teacher + admin) may remove any row (Monitor delete).
  for delete using (public.is_staff());
-- No INSERT policy on purpose: check-ins only via check_in() RPC.

-- ==================== audit_logs ====================
drop policy if exists audit_select_admin on public.audit_logs;
create policy audit_select_admin on public.audit_logs
  for select using (public.is_admin());

-- ---------- grants ----------
grant usage on schema public to authenticated;
grant select on public.profiles, public.events,
               public.attendance, public.audit_logs to authenticated;
grant insert, update, delete on public.events, public.attendance to authenticated;

revoke update on public.profiles from anon, authenticated;

grant update (full_name, phone, student_no, grade_class, department, title,
              educational_level, course, year_level, block, section)
  on public.profiles to authenticated;

-- ---------- audit trigger ----------
create or replace function public.audit_event_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs(actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'event.create', 'events', new.id::text,
            jsonb_build_object('name', new.name, 'status', new.status));
  elsif tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      insert into public.audit_logs(actor_id, action, entity, entity_id, details)
      values (auth.uid(), 'event.status', 'events', new.id::text,
              jsonb_build_object('name', new.name, 'from', old.status, 'to', new.status));
    else
      insert into public.audit_logs(actor_id, action, entity, entity_id, details)
      values (auth.uid(), 'event.update', 'events', new.id::text,
              jsonb_build_object('name', new.name));
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_events on public.events;
create trigger trg_audit_events
  after insert or update on public.events
  for each row execute function public.audit_event_change();

-- ==================== appeals (absent-only, one per student+event) ====================
do $$ begin
  create type public.appeal_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.appeals (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.profiles(id) on delete cascade,
  event_id      uuid not null references public.events(id) on delete cascade,
  attendance_id uuid references public.attendance(id) on delete set null,
  reason        text not null,
  status        public.appeal_status not null default 'pending',
  feedback      text,
  created_at    timestamptz not null default now(),
  constraint appeals_one_per_student_event unique (student_id, event_id)
);
create index if not exists idx_appeals_event   on public.appeals(event_id);
create index if not exists idx_appeals_student on public.appeals(student_id);

alter table public.appeals enable row level security;

drop policy if exists appeals_select on public.appeals;
create policy appeals_select on public.appeals
  for select using (
    -- A student sees their own appeals; staff (teacher + admin) see ALL.
    student_id = auth.uid()
    or public.is_staff()
  );

drop policy if exists appeals_insert on public.appeals;
create policy appeals_insert on public.appeals
  for insert with check (
    student_id = auth.uid()
    and public.is_student()
    and status = 'pending'
    and exists (
      select 1 from public.attendance a
      where a.id = appeals.attendance_id
        and a.student_id = auth.uid()
        and a.event_id = appeals.event_id
        and a.status = 'absent'
    )
  );

drop policy if exists appeals_update on public.appeals;
create policy appeals_update on public.appeals
  for update using (public.is_staff() and status = 'pending')
  with check (public.is_staff());
-- No DELETE policy: appeals are kept for the record.

grant select on public.appeals to authenticated;
grant insert, update on public.appeals to authenticated;

-- ---------- absent marking: closing an event marks the rest Absent ----------
-- A student who never scanned the QR (no attendance row) automatically
-- becomes `absent` here — that absent row is exactly what they can appeal
-- from Attendance history (one appeal per student per closed event).
-- Students NEVER need to scan a closed event: the check_in() RPC refuses
-- closed events, so the trigger below is the ONLY way absent rows appear.
create or replace function public.mark_absent_on_event_close()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    -- Catches events created directly as `closed` (no UPDATE ever fires).
    if new.status = 'closed' then
      insert into public.attendance (event_id, student_id, status, method)
      select new.id, p.id, 'absent', 'auto'
        from public.profiles p
       where p.role = 'student'
         and p.is_active
         and not exists (
           select 1 from public.attendance a
           where a.event_id = new.id and a.student_id = p.id
         )
      on conflict (event_id, student_id) do nothing;
    end if;
  elsif new.status = 'closed' and old.status is distinct from 'closed' then
    insert into public.attendance (event_id, student_id, status, method)
    select new.id, p.id, 'absent', 'auto'
      from public.profiles p
     where p.role = 'student'
       and p.is_active
       and not exists (
         select 1 from public.attendance a
         where a.event_id = new.id and a.student_id = p.id
       )
    on conflict (event_id, student_id) do nothing;
  elsif new.status <> 'closed' and old.status = 'closed' then
    delete from public.attendance
     where event_id = new.id
       and status = 'absent'
       and method = 'auto';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_mark_absent_on_event_close on public.events;
create trigger trg_mark_absent_on_event_close
  after insert or update of status on public.events
  for each row execute function public.mark_absent_on_event_close();

-- ---------- backfill: closed events that pre-date the trigger ----------
-- Events closed BEFORE this migration ran never got auto-absent rows
-- (no UPDATE fires for them). This one-shot backfill inserts them now —
-- idempotent (`not exists` + `on conflict do nothing`), so re-runs are safe.
insert into public.attendance (event_id, student_id, status, method)
select e.id, p.id, 'absent', 'auto'
  from public.events e
  join public.profiles p
    on p.role = 'student'
   and p.is_active
 where e.status = 'closed'
   and not exists (
     select 1 from public.attendance a
     where a.event_id = e.id and a.student_id = p.id
   )
on conflict (event_id, student_id) do nothing;

-- ==================== realtime (optional, safe to re-run) ====================
-- If the publication does not exist, enable Realtime first:
-- Database -> Replication -> enable supabase_realtime, then re-run this block.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'attendance'
  ) then
    alter publication supabase_realtime add table public.attendance;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'events'
  ) then
    alter publication supabase_realtime add table public.events;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'audit_logs'
  ) then
    alter publication supabase_realtime add table public.audit_logs;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'appeals'
  ) then
    alter publication supabase_realtime add table public.appeals;
  end if;
end;
$$;
```

---

## STEP 1b — Give teachers full event, appeal + attendance access (run this SQL)

Use this when your database was **already set up** with STEP 1 and you now
want **teachers** to have the same power as admins:

* **events**  → see, create, **update** and **delete** ANY event (not just their own)
* **appeals** → see and **accept / reject** ANY appeal
* **attendance** → view, correct and delete rows on ANY event (Monitor edits + appeal approvals)

Copy the block below into **Supabase Dashboard → SQL Editor → New query**,
paste, and click **Run**. It only replaces the affected policies, so it is
safe to re-run (idempotent). No app restart needed.

```sql
-- ============================================================
-- CampusQR — STAFF (TEACHER) FULL ACCESS
--   • events  → see / create / update / delete EVERY event
--   • appeals → see and decide (approve / reject) EVERY appeal
--   • attendance → view / correct / delete EVERY row (Monitor + approvals)
-- Re-runnable: drops then recreates the affected policies.
-- ============================================================

-- ---------------- events ----------------
drop policy if exists events_select on public.events;
create policy events_select on public.events
  for select using (
    status in ('open','closed') or created_by = auth.uid() or public.is_staff()
  );

drop policy if exists events_update on public.events;
create policy events_update on public.events
  for update using (public.is_staff()) with check (public.is_staff());

drop policy if exists events_delete on public.events;
create policy events_delete on public.events
  for delete using (public.is_staff());

-- ---------------- appeals ----------------
drop policy if exists appeals_select on public.appeals;
create policy appeals_select on public.appeals
  for select using (
    student_id = auth.uid() or public.is_staff()
  );

-- ---------------- attendance ----------------
drop policy if exists attendance_select on public.attendance;
create policy attendance_select on public.attendance
  -- Staff (teacher + admin) read every event's attendance (Monitor + appeal review).
  for select using (
    student_id = auth.uid() or public.is_staff()
  );

drop policy if exists attendance_update on public.attendance;
create policy attendance_update on public.attendance
  -- Monitor per-row edits; approving an appeal flips the absent row to excused.
  for update using (public.is_staff())
  with check (public.is_staff());

drop policy if exists attendance_delete on public.attendance;
create policy attendance_delete on public.attendance
  for delete using (public.is_staff());
```

Confirm the new policies are in place:

```sql
select tablename, policyname, cmd, qual
  from pg_policies
 where schemaname = 'public'
   and tablename in ('events','appeals','attendance')
 order by tablename, policyname;
```

---

## STEP 2 — Make your first Admin (run once)

The SQL Editor runs as the table owner, so this is allowed. Use the email of
an account you have signed up (or will sign up) with:

```sql
update public.profiles
   set role = 'admin'
 where email = 'your.admin@school.edu';
```

Promote a teacher the same way with `role = 'teacher'`. Everyone who
self-registers in the app becomes an active student automatically.

---

## STEP 3 — Connect the app (.env)

Project Settings → API, then set these in the project root `.env`:

```
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon / publishable key>
```

Use the **anon / publishable** key — never the `service_role` key.
Then restart the dev server: `npx expo start -c`.

---

## Logical entity → schema mapping

| App concept | Table / column / function |
|---|---|
| User / Profile | `profiles` (id, email, full_name, role, is_active, phone, student_no, educational fields, created_at) |
| Event | `events` (id, name, description, venue, start_datetime, end_datetime, status, qr_token, created_by) — staff (teacher + admin) manage every event |
| Attendance | `attendance` (id, event_id, student_id, status, method, recorded_at, recorded_by; unique per event+student) - staff (teacher + admin) view/correct/delete any event's rows; students see their own; inserts only via check_in() RPC |
| Appeal | `appeals` (student_id, event_id, attendance_id, reason, status, feedback; unique per student+event) - students appeal only their own `absent` records — staff (teacher + admin) review every appeal |
| Absent marking | `trg_mark_absent_on_event_close` (insert + close) + one-shot backfill — every active student without a row on a closed event is `absent`/`auto`; no scan of a closed event is ever needed (auto rows are removed again if the event reopens) |
| Check-in | `check_in(p_token text)` RPC → `result` = success / duplicate / closed / invalid / unauthorized |
| QR rotation | `rotate_qr_token(p_event_id uuid)` RPC → refreshed event row (owner-or-admin; kills screenshots) |
| Legacy compat | `profiles.updated_at`, `events.event_code/title/start_time/end_time`, `attendance.scanned_at` — nullable columns kept for the pre-existing helpers; CampusQR code never writes them |
| Admin actions | `admin_set_role`, `admin_set_active`, `admin_delete_user` |
| Activity log | `audit_logs` (admin read-only; written by triggers + RPCs) |
| QR payload | `CAMPUSQR:<events.qr_token>` |
| Roles | `user_role` enum: student / teacher / admin |
| Event status | `event_status` enum: draft / open / closed |
| Attendance status | `attendance_status` enum: present / late / absent / excused |
