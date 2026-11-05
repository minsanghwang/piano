-- Stage 3: availability, public booking link, booking requests.
-- Anonymous visitors never touch tables; they only call the two security-definer functions below.

alter table public.tuners
  add column booking_slug text not null unique default replace(gen_random_uuid()::text, '-', '');

create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  tuner_id uuid not null default auth.uid() references public.tuners (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = Sunday
  start_time time not null,
  end_time time not null,
  check (end_time > start_time)
);

create table public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  tuner_id uuid not null default auth.uid() references public.tuners (id) on delete cascade,
  day date not null,
  unique (tuner_id, day)
);

create table public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  tuner_id uuid not null references public.tuners (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  phone text not null check (char_length(phone) between 5 and 30),
  address text check (char_length(address) <= 300),
  requested_at timestamptz not null,
  status text not null default 'requested' check (status in ('requested', 'accepted', 'declined', 'done')),
  created_at timestamptz not null default now()
);
-- A slot can be held by one live request at a time.
create unique index booking_slot_taken on public.booking_requests (tuner_id, requested_at)
  where status in ('requested', 'accepted');
create index on public.booking_requests (tuner_id, requested_at);

alter table public.availability_rules enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.booking_requests enable row level security;

create policy rules_own on public.availability_rules for all to authenticated
  using (tuner_id = (select auth.uid())) with check (tuner_id = (select auth.uid()));
create policy exceptions_own on public.availability_exceptions for all to authenticated
  using (tuner_id = (select auth.uid())) with check (tuner_id = (select auth.uid()));
-- Tuners read and update their requests; inserts only happen through create_booking_request.
create policy bookings_select on public.booking_requests for select to authenticated
  using (tuner_id = (select auth.uid()));
create policy bookings_update on public.booking_requests for update to authenticated
  using (tuner_id = (select auth.uid())) with check (tuner_id = (select auth.uid()));
create policy bookings_delete on public.booking_requests for delete to authenticated
  using (tuner_id = (select auth.uid()));

-- Open 2-hour slots for the next 14 days (Korea time), at least 12 hours from now.
create function public.public_open_slots(p_slug text)
returns table (slot timestamptz)
language sql stable security definer set search_path = ''
as $$
  select s.ts
  from public.tuners t
  cross join generate_series(0, 14) as g(n)
  join public.availability_rules r
    on r.tuner_id = t.id
   and r.weekday = extract(dow from (now() at time zone 'Asia/Seoul')::date + g.n)
  cross join lateral generate_series(
    ((now() at time zone 'Asia/Seoul')::date + g.n) + r.start_time,
    ((now() at time zone 'Asia/Seoul')::date + g.n) + r.end_time - interval '2 hours',
    interval '2 hours'
  ) as local_ts
  cross join lateral (select local_ts at time zone 'Asia/Seoul' as ts) s
  where t.booking_slug = p_slug
    and s.ts > now() + interval '12 hours'
    and not exists (
      select 1 from public.availability_exceptions e
      where e.tuner_id = t.id and e.day = local_ts::date
    )
    and not exists (
      select 1 from public.booking_requests b
      where b.tuner_id = t.id and b.requested_at = s.ts and b.status in ('requested', 'accepted')
    )
  order by s.ts;
$$;

create function public.create_booking_request(
  p_slug text, p_name text, p_phone text, p_address text, p_at timestamptz
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_tuner uuid;
  v_id uuid;
begin
  select id into v_tuner from public.tuners where booking_slug = p_slug;
  if v_tuner is null then
    raise exception 'unknown booking link';
  end if;
  -- Crude spam brake: at most 10 new requests per tuner per hour.
  if (select count(*) from public.booking_requests
      where tuner_id = v_tuner and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'too many requests, try later';
  end if;
  if not exists (select 1 from public.public_open_slots(p_slug) where slot = p_at) then
    raise exception 'slot not available';
  end if;
  insert into public.booking_requests (tuner_id, name, phone, address, requested_at)
  values (v_tuner, p_name, p_phone, nullif(p_address, ''), p_at)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.public_open_slots(text) from public;
revoke all on function public.create_booking_request(text, text, text, text, timestamptz) from public;
grant execute on function public.public_open_slots(text) to anon, authenticated;
grant execute on function public.create_booking_request(text, text, text, text, timestamptz) to anon, authenticated;
