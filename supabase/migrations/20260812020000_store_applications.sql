-- Multi-vendor pivot, part 3 (checkpoint 3.10.7/3.10.8): public "become a
-- seller" applications, reviewed by the platform admin. Approval is handled
-- by the backend (routers/store_applications.py), which needs the
-- service-role key to create the auth.users row -- this table only ever
-- holds the request itself, never a password.

create table store_applications (
  id bigint generated always as identity primary key,
  contact_name text not null,
  email text not null,
  phone text,
  store_name text not null,
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by uuid references customers(id),
  reviewed_at timestamptz,
  created_store_id bigint references stores(id),
  created_at timestamptz not null default now()
);

alter table store_applications enable row level security;

-- Anyone can submit a request (no account exists yet at this point), but
-- only ever as a fresh pending row -- not admin-reviewed fields.
create policy "anyone can submit a store application" on store_applications
  for insert with check (
    status = 'pending'
    and rejection_reason is null
    and reviewed_by is null
    and reviewed_at is null
    and created_store_id is null
  );

-- Contains applicant contact info (email/phone) -- admin-only to read, same
-- trust level as the customers table.
create policy "admins manage store applications" on store_applications
  for all using (is_admin()) with check (is_admin());
