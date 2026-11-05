-- Stage 2: log of reminders the tuner has confirmed/sent (copy or share).
create table public.reminder_logs (
  id uuid primary key default gen_random_uuid(),
  tuner_id uuid not null default auth.uid(),
  instrument_id uuid not null,
  channel text not null default 'copy' check (channel in ('copy', 'sms')),
  sent_at timestamptz not null default now(),
  foreign key (instrument_id, tuner_id) references public.instruments (id, tuner_id) on delete cascade
);
create index on public.reminder_logs (instrument_id, sent_at desc);
alter table public.reminder_logs enable row level security;
create policy reminder_logs_own on public.reminder_logs for all to authenticated
  using (tuner_id = (select auth.uid())) with check (tuner_id = (select auth.uid()));
