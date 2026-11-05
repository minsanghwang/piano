-- Stage 1: tuner profile, customers, instruments, services.
-- Isolation: every table carries tuner_id; RLS only lets a row be seen/changed by its tuner.
-- Composite FKs (id, tuner_id) make it impossible to attach a row to another tuner's parent.

create table public.tuners (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  default_retune_months int not null default 12 check (default_retune_months between 1 and 60),
  created_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  tuner_id uuid not null default auth.uid() references public.tuners (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  phone text check (char_length(phone) <= 30),
  address text check (char_length(address) <= 300),
  notes text check (char_length(notes) <= 2000),
  contact_consent boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, tuner_id)
);

create table public.instruments (
  id uuid primary key default gen_random_uuid(),
  tuner_id uuid not null default auth.uid(),
  customer_id uuid not null,
  type text not null default 'piano' check (type in ('piano')),
  subtype text check (subtype in ('upright', 'grand')),
  make_model text check (char_length(make_model) <= 100),
  location text check (char_length(location) <= 200),
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  unique (id, tuner_id),
  foreign key (customer_id, tuner_id) references public.customers (id, tuner_id) on delete cascade
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  tuner_id uuid not null default auth.uid(),
  instrument_id uuid not null,
  visit_date date not null,
  work_type text not null default 'tuning' check (work_type in ('tuning', 'regulation', 'voicing', 'repair')),
  work_done text check (char_length(work_done) <= 2000),
  price int check (price >= 0),
  next_due_date date,
  created_at timestamptz not null default now(),
  foreign key (instrument_id, tuner_id) references public.instruments (id, tuner_id) on delete cascade
);

create index on public.customers (tuner_id);
create index on public.instruments (customer_id);
create index on public.services (instrument_id, visit_date desc);

alter table public.tuners enable row level security;
alter table public.customers enable row level security;
alter table public.instruments enable row level security;
alter table public.services enable row level security;

create policy tuners_own on public.tuners for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy customers_own on public.customers for all to authenticated
  using (tuner_id = (select auth.uid())) with check (tuner_id = (select auth.uid()));
create policy instruments_own on public.instruments for all to authenticated
  using (tuner_id = (select auth.uid())) with check (tuner_id = (select auth.uid()));
create policy services_own on public.services for all to authenticated
  using (tuner_id = (select auth.uid())) with check (tuner_id = (select auth.uid()));
