-- Apply in the Supabase SQL editor for an existing installation.
create table if not exists public.favorites (
 user_id uuid not null references auth.users(id) on delete cascade,
 product_code text not null,
 product jsonb not null,
 created_at timestamptz not null default now(),
 primary key (user_id, product_code)
);
alter table public.favorites enable row level security;
create policy "Own favorites" on public.favorites for all to authenticated
 using (auth.uid() = user_id) with check (auth.uid() = user_id);
