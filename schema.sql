-- Poin Breaktime - Supabase/PostgreSQL schema
-- Jalankan seluruh file ini di Supabase SQL Editor sebelum migrasi data.

create table if not exists public.employees (
  id text primary key,
  name text not null unique,
  role text,
  gender text check (gender is null or gender in ('PRIA','WANITA')),
  outlet text,
  active boolean not null default true,
  position text not null check (position in ('KASIR','AO','TERAPIS','KAPTEN')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  city text,
  source text,
  updated_at timestamptz
);

create table if not exists public.outlets (
  id text primary key,
  code text not null unique,
  name text not null unique,
  color text,
  display_order integer not null default 0,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  city text
);

create table if not exists public.point_rules (
  id text primary key,
  description text not null unique,
  category text not null check (category in ('PENGURANGAN','PENAMBAHAN','PRESTASI')),
  points numeric(12,2) not null default 0,
  supports_multiplier boolean not null default false,
  roles text[] not null default '{}',
  frequency text,
  active boolean not null default true,
  is_multipliable boolean not null default false,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  auto_daily boolean not null default false,
  derived_type text,
  automation jsonb,
  updated_at timestamptz
);

create table if not exists public.batches (
  id text primary key,
  rule_id text references public.point_rules(id) on update cascade on delete set null,
  entry_date date not null,
  notes text,
  created_by text,
  created_at timestamptz
);

create table if not exists public.assignments (
  id text primary key,
  employee_id text not null references public.employees(id) on update cascade on delete cascade,
  outlet_id text not null references public.outlets(id) on update cascade on delete restrict,
  captain_group text check (captain_group is null or captain_group in ('A','B')),
  effective_from date not null,
  effective_to date,
  assigned_by text,
  constraint assignments_valid_period check (effective_to is null or effective_to >= effective_from)
);

create table if not exists public.point_entries (
  id text primary key,
  batch_id text references public.batches(id) on update cascade on delete set null,
  employee_id text not null references public.employees(id) on update cascade on delete restrict,
  rule_id text not null references public.point_rules(id) on update cascade on delete restrict,
  outlet_id text references public.outlets(id) on update cascade on delete set null,
  entry_date date not null,
  quantity numeric(12,2) not null default 1,
  multiplier numeric(12,2) not null default 1,
  base_points numeric(12,2) not null default 0,
  total_points numeric(12,2) not null default 0,
  entry_kind text not null default 'MANUAL',
  status text not null default 'CONFIRMED',
  created_at timestamptz,
  updated_at timestamptz,
  voided_by_cancellation_id text,
  cancelled_entry_id text
);

create table if not exists public.days_off (
  id text primary key,
  employee_id text not null references public.employees(id) on update cascade on delete cascade,
  off_date date not null,
  status text not null default 'CONFIRMED',
  created_at timestamptz
);

create table if not exists public.audit_logs (
  id text primary key,
  action text not null,
  entity_type text,
  entity_id text,
  actor text,
  before_data jsonb,
  after_data jsonb,
  occurred_at timestamptz not null
);

create table if not exists public.app_meta (
  key text primary key,
  value jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create index if not exists idx_assignments_employee_period on public.assignments(employee_id, effective_from, effective_to);
create index if not exists idx_entries_employee_date on public.point_entries(employee_id, entry_date);
create index if not exists idx_entries_rule_date on public.point_entries(rule_id, entry_date);
create index if not exists idx_entries_outlet_date on public.point_entries(outlet_id, entry_date);
create index if not exists idx_entries_status on public.point_entries(status);
create index if not exists idx_days_off_employee_date on public.days_off(employee_id, off_date);
create index if not exists idx_audit_occurred_at on public.audit_logs(occurred_at desc);

alter table public.employees enable row level security;
alter table public.outlets enable row level security;
alter table public.point_rules enable row level security;
alter table public.batches enable row level security;
alter table public.assignments enable row level security;
alter table public.point_entries enable row level security;
alter table public.days_off enable row level security;
alter table public.audit_logs enable row level security;
alter table public.app_meta enable row level security;

-- Viewer hanya mendapat akses baca. Migrasi dan perubahan server memakai service role.
do $$
declare table_name text;
begin
  foreach table_name in array array['employees','outlets','point_rules','batches','assignments','point_entries','days_off','audit_logs','app_meta']
  loop
    execute format('drop policy if exists viewer_read on public.%I', table_name);
    execute format('create policy viewer_read on public.%I for select to anon, authenticated using (true)', table_name);
  end loop;
end $$;
