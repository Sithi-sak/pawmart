-- Order status history: one row per status an order has passed through,
-- so the customer tracking page (task 3.3) can show a dated timeline.
-- Statuses only ever move forward (enforced in the backend), so there is
-- at most one row per status per order.

create table order_status_history (
  id bigint generated always as identity primary key,
  order_id bigint not null references orders(id) on delete cascade,
  status text not null
    check (status in ('confirmed', 'processing', 'shipping', 'out_for_delivery', 'delivered')),
  created_at timestamptz not null default now()
);

create index order_status_history_order_id_idx on order_status_history (order_id);

alter table order_status_history enable row level security;

create policy "view history of accessible orders" on order_status_history
  for select using (
    exists (
      select 1 from orders o
      where o.id = order_id and (o.customer_id = auth.uid() or is_admin())
    )
  );

create policy "admins insert order status history" on order_status_history
  for insert with check (is_admin());
