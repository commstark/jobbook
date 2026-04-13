-- ============================================
-- Jobbook — Full Database Migration
-- Paste this into the Supabase SQL Editor
-- https://supabase.com/dashboard/project/_/sql
-- ============================================

-- Enable UUID extension (usually already enabled)
create extension if not exists "pgcrypto";

-- ============================================
-- TABLES
-- ============================================

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  phone text,
  role text default 'partner',
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text,
  address text,
  rating text default 'neutral',
  rating_note text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists customer_phones (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  phone text not null,
  label text,
  is_primary boolean default true,
  created_at timestamptz default now(),
  unique(phone)
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete set null,
  phone text not null,
  status text default 'active',
  last_message_at timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  direction text not null,
  body text,
  media_urls text[],
  twilio_sid text,
  created_at timestamptz default now()
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  assigned_to uuid references users(id) on delete set null,
  title text not null,
  description text,
  category text,
  status text default 'upcoming',
  is_urgent boolean default false,
  quoted_amount decimal(10,2),
  ai_summary text,
  rating_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists job_visits (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete cascade,
  scheduled_at timestamptz,
  scheduled_end timestamptz,
  drive_time_minutes integer,
  notes text,
  created_at timestamptz default now()
);

create table if not exists job_photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete cascade,
  photo_url text not null,
  source text default 'customer',
  caption text,
  created_at timestamptz default now()
);

create table if not exists call_logs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete set null,
  phone text not null,
  direction text,
  duration_seconds integer,
  twilio_sid text,
  title text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete cascade,
  customer_id uuid references customers(id) on delete cascade,
  status text default 'draft',
  total_amount decimal(10,2) not null,
  stripe_payment_intent_id text,
  sent_at timestamptz,
  paid_at timestamptz,
  public_token text unique default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references invoices(id) on delete cascade,
  description text not null,
  quantity decimal(10,2) default 1,
  unit_price decimal(10,2) not null,
  amount decimal(10,2) not null,
  sort_order integer default 0,
  created_at timestamptz default now()
);

create table if not exists voice_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  job_id uuid references jobs(id) on delete set null,
  customer_id uuid references customers(id) on delete set null,
  audio_url text not null,
  transcript text,
  ai_parsed_data jsonb,
  type text,
  created_at timestamptz default now()
);

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  unique(endpoint)
);

create table if not exists settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

-- Seed default settings
insert into settings (key, value) values
  ('business_name', 'Your Plumbing Co'),
  ('primary_partner_id', ''),
  ('stripe_account_id', '')
on conflict (key) do nothing;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
alter table users enable row level security;
alter table customers enable row level security;
alter table customer_phones enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table jobs enable row level security;
alter table job_visits enable row level security;
alter table job_photos enable row level security;
alter table call_logs enable row level security;
alter table invoices enable row level security;
alter table invoice_line_items enable row level security;
alter table voice_notes enable row level security;
alter table push_subscriptions enable row level security;
alter table settings enable row level security;

-- Authenticated users can do everything (shared workspace, both partners)
create policy "Authenticated full access" on users
  for all to authenticated using (true) with check (true);

create policy "Authenticated full access" on customers
  for all to authenticated using (true) with check (true);

create policy "Authenticated full access" on customer_phones
  for all to authenticated using (true) with check (true);

create policy "Authenticated full access" on conversations
  for all to authenticated using (true) with check (true);

create policy "Authenticated full access" on messages
  for all to authenticated using (true) with check (true);

create policy "Authenticated full access" on jobs
  for all to authenticated using (true) with check (true);

create policy "Authenticated full access" on job_visits
  for all to authenticated using (true) with check (true);

create policy "Authenticated full access" on job_photos
  for all to authenticated using (true) with check (true);

create policy "Authenticated full access" on call_logs
  for all to authenticated using (true) with check (true);

create policy "Authenticated full access" on voice_notes
  for all to authenticated using (true) with check (true);

create policy "Authenticated full access" on push_subscriptions
  for all to authenticated using (true) with check (true);

create policy "Authenticated full access" on settings
  for all to authenticated using (true) with check (true);

-- Invoices: authenticated users full access + public can read via token
create policy "Authenticated full access" on invoices
  for all to authenticated using (true) with check (true);

create policy "Public read via token" on invoices
  for select to anon
  using (public_token is not null);

create policy "Authenticated full access" on invoice_line_items
  for all to authenticated using (true) with check (true);

-- Public can read line items for invoices they can see
create policy "Public read via invoice" on invoice_line_items
  for select to anon
  using (
    exists (
      select 1 from invoices
      where invoices.id = invoice_line_items.invoice_id
        and invoices.public_token is not null
    )
  );

-- Service role (webhooks) bypass RLS automatically

-- ============================================
-- INDEXES for performance
-- ============================================

create index if not exists idx_conversations_last_message on conversations(last_message_at desc);
create index if not exists idx_conversations_status on conversations(status);
create index if not exists idx_messages_conversation on messages(conversation_id, created_at);
create index if not exists idx_jobs_customer on jobs(customer_id);
create index if not exists idx_jobs_status on jobs(status);
create index if not exists idx_job_visits_scheduled on job_visits(scheduled_at);
create index if not exists idx_customer_phones_phone on customer_phones(phone);
create index if not exists idx_invoices_token on invoices(public_token);
create index if not exists idx_invoices_job on invoices(job_id);
create index if not exists idx_push_subscriptions_user on push_subscriptions(user_id);

-- ============================================
-- FUNCTION: auto-update users table on first login
-- ============================================
-- This trigger creates a row in our users table when someone signs in via Google
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (email) do update
    set name = coalesce(excluded.name, users.name),
        avatar_url = coalesce(excluded.avatar_url, users.avatar_url);
  return new;
end;
$$;

-- Trigger on auth.users insert (new sign-up)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Also trigger on update (for profile updates)
drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute procedure public.handle_new_user();
