-- CAMPORA Supabase security and query-plan hardening.
-- Keep the event trigger operational while preventing direct RPC execution
-- of its SECURITY DEFINER function by API roles.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- Evaluate auth.uid() once per statement rather than once per candidate row.
alter policy "Users can view own profile"
  on public.profiles
  using (id = (select auth.uid()));

alter policy "Customers can view own orders"
  on public.orders
  using (customer_id = (select auth.uid()));

alter policy "Customers can create own orders"
  on public.orders
  with check (customer_id = (select auth.uid()));

alter policy "Customers can view own payments"
  on public.payment_submissions
  using (customer_id = (select auth.uid()));

alter policy "Customers can submit own payments"
  on public.payment_submissions
  with check (
    customer_id = (select auth.uid())
    and exists (
      select 1
      from public.orders
      where orders.id = payment_submissions.order_id
        and orders.customer_id = (select auth.uid())
    )
  );

alter policy "Customers can view own files"
  on public.order_files
  using (customer_id = (select auth.uid()));

alter policy "Customers can register own files"
  on public.order_files
  with check (
    customer_id = (select auth.uid())
    and exists (
      select 1
      from public.orders
      where orders.id = order_files.order_id
        and orders.customer_id = (select auth.uid())
    )
  );

-- Index the foreign-key columns used by joins and ownership checks.
create index if not exists order_files_customer_id_idx on public.order_files (customer_id);
create index if not exists order_files_order_id_idx on public.order_files (order_id);
create index if not exists orders_customer_id_idx on public.orders (customer_id);
create index if not exists payment_submissions_customer_id_idx on public.payment_submissions (customer_id);
create index if not exists payment_submissions_order_id_idx on public.payment_submissions (order_id);
