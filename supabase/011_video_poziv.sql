-- Video poziv 1 na 1 u privatnom chatu (s blurom).
-- Pokreni ovaj fajl u Supabase SQL editoru nakon 010_ogranicenja.sql (samo jednom).
--
-- Slika i zvuk idu direktno između dva uređaja (WebRTC). Baza samo čuva ko koga zove,
-- a Realtime prenosi poruke za spajanje, i to samo između dvoje iz tog chata.

create table public.calls (
  id bigserial primary key,
  request_id bigint not null references public.chat_requests on delete cascade,
  caller uuid not null references public.profiles on delete cascade,
  status text not null default 'ringing' check (status in ('ringing', 'accepted', 'declined', 'ended', 'missed')),
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  pushed_at timestamptz
);
create index on public.calls (request_id, created_at desc);
create index on public.calls (caller, created_at);

alter table public.calls enable row level security;
create policy "see own calls" on public.calls
  for select to authenticated using (in_request(request_id));
create policy "start call" on public.calls
  for insert to authenticated with check (
    caller = auth.uid() and status = 'ringing' and in_request(request_id) and not is_banned(auth.uid())
  );
create policy "answer or end call" on public.calls
  for update to authenticated using (in_request(request_id)) with check (in_request(request_id));

-- Ko zove i u kojem chatu se ne mijenja.
create function public.keep_call() returns trigger language plpgsql as $$
begin
  new.request_id := old.request_id;
  new.caller := old.caller;
  new.created_at := old.created_at;
  if new.status in ('declined', 'ended', 'missed') and new.ended_at is null then new.ended_at := now(); end if;
  return new;
end;
$$;
create trigger keep_call before update on public.calls
  for each row execute function public.keep_call();

-- Najviše 10 poziva na sat (vidi 010_ogranicenja.sql).
create trigger rate_limit before insert on public.calls
  for each row execute function public.rate_limit('caller', '10', '1 hour',
    'Previše poziva u kratkom vremenu. Probaj malo kasnije.');

alter publication supabase_realtime add table public.calls;

-- Poruke za spajanje poziva idu kroz privatni Realtime kanal "call:<broj poziva>".
create function public.can_use_call_topic(topic text) returns boolean
language sql stable security definer set search_path = public as $$
  select topic ~ '^call:[0-9]{1,18}$' and exists (
    select 1 from calls c
    where c.id = substring(topic from 6)::bigint
      and c.status in ('ringing', 'accepted')
      and in_request(c.request_id)
  );
$$;

create policy "call signaling read" on realtime.messages
  for select to authenticated using (public.can_use_call_topic(realtime.topic()));
create policy "call signaling send" on realtime.messages
  for insert to authenticated with check (public.can_use_call_topic(realtime.topic()));

-- Obavještenje na telefon kad neko zove (vidi 008_neprocitano_obavjestenja.sql).
create or replace function public.notify_push() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  recipient uuid;
begin
  if tg_table_name = 'private_messages' then
    select case when r.from_user = new.sender then r.to_user else r.from_user end into recipient
    from chat_requests r where r.id = new.request_id;
    if exists (
      select 1 from private_messages
      where request_id = new.request_id and pushed_at > now() - interval '10 minutes'
    ) then
      return new;
    end if;
  elsif tg_table_name = 'calls' then
    select case when r.from_user = new.caller then r.to_user else r.from_user end into recipient
    from chat_requests r where r.id = new.request_id;
  else
    recipient := new.to_user;
  end if;

  if not exists (select 1 from push_subscriptions where user_id = recipient) then return new; end if;
  if tg_table_name <> 'calls' and exists (
    select 1 from profiles where id = recipient and last_seen_at > now() - interval '2 minutes'
  ) then
    return new;
  end if;

  perform net.http_post(
    url := 'https://kafic.vercel.app/api/push',
    body := jsonb_build_object('kind', tg_table_name, 'id', new.id),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  return new;
end;
$$;

create trigger notify_push after insert on public.calls
  for each row execute function public.notify_push();
