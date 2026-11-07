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
