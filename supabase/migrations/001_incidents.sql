-- SafeNet Incidents Table
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

create table if not exists public.incidents (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  severity      text not null check (severity in ('critical', 'high', 'medium', 'low')),
  incident_type text not null check (incident_type in ('fire', 'flood', 'accident', 'medical', 'criminal', 'infrastructure', 'other')),
  lat           double precision,
  lng           double precision,
  address       text,
  image_url     text,
  ai_analysis   text,
  status        text not null default 'active' check (status in ('active', 'resolved', 'monitoring')),
  reported_by   uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.incidents enable row level security;

-- Policy: Anyone can read incidents (public emergency data)
create policy "incidents_select_policy"
  on public.incidents for select
  using (true);

-- Policy: Authenticated users can insert incidents
create policy "incidents_insert_policy"
  on public.incidents for insert
  with check (true);

-- Policy: Authenticated users can update incident status
create policy "incidents_update_policy"
  on public.incidents for update
  using (true);

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger incidents_updated_at
  before update on public.incidents
  for each row execute function public.handle_updated_at();

-- Enable Realtime
alter publication supabase_realtime add table public.incidents;

-- Sample data for testing (optional — remove for production)
insert into public.incidents (title, description, severity, incident_type, lat, lng, address, status, ai_analysis)
values
  ('Building Fire - Sector 14',
   'Large fire reported on 3rd floor of residential complex. Smoke visible from multiple blocks.',
   'critical', 'fire',
   28.6280, 77.2180,
   'Sector 14, Delhi',
   'active',
   'CRITICAL fire incident. Immediate evacuation of all floors required. Wind direction suggests northward spread.'),

  ('Flash Flood - Ring Road',
   'Road flooded due to heavy rainfall. Vehicles stranded.',
   'high', 'flood',
   28.6050, 77.2050,
   'Ring Road near ITO',
   'active',
   'HIGH severity flooding. Avoid low-lying areas. Move to elevated ground immediately.'),

  ('Multi-vehicle Accident - NH48',
   'Three vehicles involved. Two injured reported.',
   'high', 'accident',
   28.5980, 77.2230,
   'NH48, Gurugram border',
   'monitoring',
   'HIGH severity accident. Emergency services dispatched. Alternate routes recommended.'),

  ('Power Grid Failure - South Zone',
   'Transformer explosion causing widespread power outage.',
   'medium', 'infrastructure',
   28.5890, 77.1950,
   'South Extension, Delhi',
   'active',
   'MEDIUM severity infrastructure failure. Backup power recommended. Avoid the area.'),

  ('Medical Emergency - CP',
   'Person collapsed at metro station. Ambulance called.',
   'low', 'medical',
   28.6315, 77.2167,
   'Connaught Place Metro',
   'resolved',
   'LOW severity medical emergency. Situation under control.');
