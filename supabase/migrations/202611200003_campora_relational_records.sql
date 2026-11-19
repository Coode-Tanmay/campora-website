-- Move CAMPORA customer and order records into indexed relational rows.
-- The complete original JSON payload is retained for a lossless application migration.
create table if not exists public.campora_customers (
  id text primary key,
  email text not null,
  full_name text not null default '',
  role text not null default 'customer',
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists campora_customers_email_lower_uidx
  on public.campora_customers (lower(email));

create table if not exists public.campora_orders (
  id text primary key,
  customer_id text not null references public.campora_customers(id) on update cascade,
  order_number text not null unique,
  service_id text,
  service_name text not null default '',
  status text not null default 'new_order',
  payment_status text not null default 'pending',
  final_amount numeric(12,2) not null default 0,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campora_orders_customer_created_idx
  on public.campora_orders (customer_id, created_at desc);
create index if not exists campora_orders_status_idx
  on public.campora_orders (status);
create index if not exists campora_orders_payment_status_idx
  on public.campora_orders (payment_status);

alter table public.campora_customers enable row level security;
alter table public.campora_orders enable row level security;
revoke all on public.campora_customers from public, anon, authenticated;
revoke all on public.campora_orders from public, anon, authenticated;
grant all on public.campora_customers to service_role;
grant all on public.campora_orders to service_role;

-- Backfill without dropping or modifying the existing JSONB source of truth.
insert into public.campora_customers (id, email, full_name, role, payload)
select
  user_item->>'id',
  lower(user_item->>'email'),
  coalesce(user_item->>'name', ''),
  coalesce(user_item->>'role', 'customer'),
  user_item
from public.campora_app_state state_row
cross join lateral jsonb_array_elements(state_row.users) as user_item
where state_row.id = 'primary'
  and coalesce(user_item->>'id', '') <> ''
  and coalesce(user_item->>'email', '') <> ''
on conflict (id) do update
set email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role,
    payload = excluded.payload,
    updated_at = now();

insert into public.campora_orders (
  id, customer_id, order_number, service_id, service_name,
  status, payment_status, final_amount, payload
)
select
  order_item->>'id',
  order_item->>'customerId',
  order_item->>'id',
  nullif(order_item->>'serviceId', ''),
  coalesce(order_item->>'serviceName', ''),
  coalesce(order_item->>'status', 'new_order'),
  coalesce(order_item->>'paymentStatus', 'pending'),
  coalesce(nullif(order_item->>'finalPrice', '')::numeric, nullif(order_item->>'total', '')::numeric, 0),
  order_item
from public.campora_app_state state_row
cross join lateral jsonb_array_elements(state_row.orders) as order_item
where state_row.id = 'primary'
  and coalesce(order_item->>'id', '') <> ''
  and coalesce(order_item->>'customerId', '') <> ''
on conflict (id) do update
set customer_id = excluded.customer_id,
    service_id = excluded.service_id,
    service_name = excluded.service_name,
    status = excluded.status,
    payment_status = excluded.payment_status,
    final_amount = excluded.final_amount,
    payload = excluded.payload,
    updated_at = now();
