create table if not exists public.account_deletion_requests (
 user_id uuid primary key references auth.users(id) on delete cascade,
 status text not null default 'pending' check (status in ('pending','processing','completed')),
 created_at timestamptz not null default now()
);
alter table public.account_deletion_requests enable row level security;
create policy "Read own deletion request" on public.account_deletion_requests for select to authenticated using (auth.uid() = user_id);
create policy "Request own deletion" on public.account_deletion_requests for insert to authenticated with check (auth.uid() = user_id and status = 'pending');
-- Administrators process requests using privileged server/admin tooling. No client update policy.
