-- SOXLO Messenger production access rules.
-- Applied to Supabase project ovwfqbcxsdfddnfdgopg.

revoke all on table public.messenger_profiles from anon;
revoke all on table public.messenger_messages from anon;
revoke all on table public.messenger_call_signals from anon;

revoke all on table public.messenger_profiles from authenticated;
revoke all on table public.messenger_messages from authenticated;
revoke all on table public.messenger_call_signals from authenticated;

grant select, insert on table public.messenger_profiles to authenticated;
grant update (display_name) on table public.messenger_profiles to authenticated;
grant select, insert on table public.messenger_messages to authenticated;
grant update (read_at) on table public.messenger_messages to authenticated;
grant select, insert, delete on table public.messenger_call_signals to authenticated;
grant usage, select on sequence public.messenger_call_signals_id_seq to authenticated;

alter table public.messenger_profiles enable row level security;
alter table public.messenger_messages enable row level security;
alter table public.messenger_call_signals enable row level security;

drop policy if exists messenger_profiles_select on public.messenger_profiles;
drop policy if exists messenger_profiles_insert_self on public.messenger_profiles;
drop policy if exists messenger_profiles_update_self on public.messenger_profiles;
drop policy if exists messenger_messages_select_participant on public.messenger_messages;
drop policy if exists messenger_messages_insert_sender on public.messenger_messages;
drop policy if exists messenger_messages_mark_read on public.messenger_messages;
drop policy if exists messenger_signals_select_participant on public.messenger_call_signals;
drop policy if exists messenger_signals_insert_sender on public.messenger_call_signals;
drop policy if exists messenger_signals_delete_participant on public.messenger_call_signals;

create policy messenger_profiles_select on public.messenger_profiles for select to authenticated using (true);
create policy messenger_profiles_insert_self on public.messenger_profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy messenger_profiles_update_self on public.messenger_profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy messenger_messages_select_participant on public.messenger_messages for select to authenticated
using ((select auth.uid()) = sender_id or (select auth.uid()) = recipient_id);
create policy messenger_messages_insert_sender on public.messenger_messages for insert to authenticated
with check ((select auth.uid()) = sender_id and recipient_id <> (select auth.uid()) and length(body) between 1 and 4000);
create policy messenger_messages_mark_read on public.messenger_messages for update to authenticated
using ((select auth.uid()) = recipient_id) with check ((select auth.uid()) = recipient_id);

create policy messenger_signals_select_participant on public.messenger_call_signals for select to authenticated
using ((select auth.uid()) = sender_id or (select auth.uid()) = recipient_id);
create policy messenger_signals_insert_sender on public.messenger_call_signals for insert to authenticated
with check ((select auth.uid()) = sender_id and recipient_id <> (select auth.uid()) and signal_type in ('offer','answer','ice','hangup'));
create policy messenger_signals_delete_participant on public.messenger_call_signals for delete to authenticated
using ((select auth.uid()) = sender_id or (select auth.uid()) = recipient_id);

create index if not exists messenger_messages_pair_created_idx
  on public.messenger_messages (sender_id, recipient_id, created_at desc);
create index if not exists messenger_messages_recipient_created_idx
  on public.messenger_messages (recipient_id, created_at desc);
create index if not exists messenger_signals_recipient_created_idx
  on public.messenger_call_signals (recipient_id, created_at desc);
create index if not exists messenger_signals_call_id_idx
  on public.messenger_call_signals (call_id, id);
