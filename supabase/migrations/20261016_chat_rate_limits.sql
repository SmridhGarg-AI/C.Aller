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
