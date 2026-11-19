-- CAMPORA persistent application state (first migration from the AI Studio prototype).
-- Run this once in Supabase SQL Editor before starting the updated server.
create table if not exists public.campora_app_state (
  id text primary key check (id = 'primary'),
  orders jsonb not null default '[]'::jsonb,
  users jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- Only the backend server using the Supabase secret/service key may access this table.
-- No browser publishable/anon-key policies are created.
alter table public.campora_app_state enable row level security;
revoke all on table public.campora_app_state from anon, authenticated;
grant all on table public.campora_app_state to service_role;

insert into public.campora_app_state (id, orders, users)
values ('primary', '[]'::jsonb, '[]'::jsonb)
on conflict (id) do nothing;
