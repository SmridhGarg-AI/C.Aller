-- Run once in the Supabase SQL editor. All user records are private.
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '',
 preferences jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Own profile" on public.profiles for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create table public.scan_history (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 product jsonb not null,
 created_at timestamptz not null default now()
);
alter table public.scan_history enable row level security;
create policy "Own history" on public.scan_history for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('food-images','food-images',false,3000000,array['image/jpeg','image/png','image/webp']);
create policy "Own food images" on storage.objects for all to authenticated using (bucket_id = 'food-images' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'food-images' and (storage.foldername(name))[1] = auth.uid()::text);
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
-- Shared, atomic per-account limit: 10 chat requests per minute across app instances.
create table if not exists public.chat_rate_limits (
 user_id uuid primary key references auth.users(id) on delete cascade,
 window_start timestamptz not null,
 requests integer not null
);
alter table public.chat_rate_limits enable row level security;
revoke all on public.chat_rate_limits from anon, authenticated;
create or replace function public.consume_chat_quota()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare quota public.chat_rate_limits; current_time_value timestamptz := clock_timestamp();
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 insert into public.chat_rate_limits as existing (user_id,window_start,requests)
 values (auth.uid(),current_time_value,1)
 on conflict (user_id) do update set
 window_start = case when existing.window_start <= current_time_value - interval '1 minute' then current_time_value else existing.window_start end,
 requests = case when existing.window_start <= current_time_value - interval '1 minute' then 1 else least(existing.requests+1,11) end
 returning * into quota;
 return jsonb_build_object('allowed',quota.requests<=10,'retryAfter',greatest(1,ceil(extract(epoch from quota.window_start + interval '1 minute' - current_time_value))));
end;
$$;
revoke all on function public.consume_chat_quota() from public, anon;
grant execute on function public.consume_chat_quota() to authenticated;
create table if not exists public.account_deletion_requests (
 user_id uuid primary key references auth.users(id) on delete cascade,
 status text not null default 'pending' check (status in ('pending','processing','completed')),
 created_at timestamptz not null default now()
);
alter table public.account_deletion_requests enable row level security;
create policy "Read own deletion request" on public.account_deletion_requests for select to authenticated using (auth.uid() = user_id);
create policy "Request own deletion" on public.account_deletion_requests for insert to authenticated with check (auth.uid() = user_id and status = 'pending');
-- Administrators process requests using privileged server/admin tooling. No client update policy.
create table if not exists public.user_entitlements (
 user_id uuid primary key references auth.users(id) on delete cascade,
 plan text not null default 'free' check (plan in ('free','plus')),
 active_until timestamptz,
 updated_at timestamptz not null default now()
);
alter table public.user_entitlements enable row level security;
create policy "Read own entitlement" on public.user_entitlements for select to authenticated using (auth.uid()=user_id);
create table if not exists public.barcode_usage (
 user_id uuid references auth.users(id) on delete cascade,
 month date not null,
 scans integer not null default 0,
 primary key(user_id,month)
);
alter table public.barcode_usage enable row level security;
create policy "Read own usage" on public.barcode_usage for select to authenticated using (auth.uid()=user_id);
create table if not exists public.barcode_usage_events (
 user_id uuid references auth.users(id) on delete cascade,
 month date not null,
 event_id uuid not null,
 barcode text not null,
 primary key(user_id,month,event_id)
);
alter table public.barcode_usage_events enable row level security;
-- No client write policies: entitlement grants require privileged, verified billing/admin tooling.
create or replace function public.barcode_entitlement(scan_event uuid default null, scan_barcode text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=auth.uid(); month_key date:=(date_trunc('month',clock_timestamp() at time zone 'UTC'))::date; used integer; plus_active boolean; previous_code text;
begin
 if owner_id is null then raise exception 'Authentication required'; end if;
 select exists(select 1 from public.user_entitlements where user_id=owner_id and plan='plus' and active_until>clock_timestamp()) into plus_active;
 insert into public.barcode_usage(user_id,month,scans) values(owner_id,month_key,0) on conflict do nothing;
 select scans into used from public.barcode_usage where user_id=owner_id and month=month_key for update;
 if scan_event is not null then
  if scan_barcode is null or scan_barcode !~ '^([0-9]{8}|[0-9]{12}|[0-9]{13}|[0-9]{14})$' then raise exception 'Invalid barcode'; end if;
  select barcode into previous_code from public.barcode_usage_events where user_id=owner_id and month=month_key and event_id=scan_event;
  if previous_code is not null and previous_code<>scan_barcode then raise exception 'Scan event belongs to a different barcode'; end if;
  if previous_code is null then
   if not plus_active and used>=50 then return jsonb_build_object('plan','free','used',used,'remaining',0,'allowed',false,'resetsAt',((month_key+interval '1 month') at time zone 'UTC')); end if;
   insert into public.barcode_usage_events values(owner_id,month_key,scan_event,scan_barcode);
   update public.barcode_usage set scans=scans+1 where user_id=owner_id and month=month_key returning scans into used;
  end if;
 end if;
 return jsonb_build_object('plan',case when plus_active then 'plus' else 'free' end,'used',used,'remaining',case when plus_active then null else greatest(0,50-used) end,'allowed',(scan_event is not null or plus_active or used<50),'resetsAt',((month_key+interval '1 month') at time zone 'UTC'));
end;
$$;
revoke all on function public.barcode_entitlement(uuid,text) from public,anon;
grant execute on function public.barcode_entitlement(uuid,text) to authenticated;
