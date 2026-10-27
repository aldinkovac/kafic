-- Nepročitane poruke (crveni broj u meniju) i obavještenja na telefon.
-- Pokreni ovaj fajl u Supabase SQL editoru nakon 007_konobar_osnivaci.sql (samo jednom).
--
-- Ako sajt pređe na drugu adresu (npr. kafic.ba), promijeni adresu u funkciji notify_push ispod
-- i ponovo pokreni samo tu funkciju.

-- Nepročitano -------------------------------------------------------------------

-- Kada je ko zadnji put otvorio koji chat.
create table public.chat_reads (
  request_id bigint not null references public.chat_requests on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  read_at timestamptz not null default now(),
  primary key (request_id, user_id)
);
alter table public.chat_reads enable row level security;
create policy "own reads" on public.chat_reads for select using (user_id = auth.uid());

create function public.mark_read(req bigint) returns void
language sql security definer set search_path = public as $$
  insert into chat_reads (request_id, user_id)
  select req, auth.uid() where in_request(req)
  on conflict (request_id, user_id) do update set read_at = now();
$$;

-- Broj nepročitanih poruka po chatu za trenutnog korisnika.
create function public.unread_counts() returns table (request_id bigint, n int)
language sql stable security definer set search_path = public as $$
  select m.request_id, count(*)::int
  from private_messages m
  join chat_requests r on r.id = m.request_id
  left join chat_reads cr on cr.request_id = m.request_id and cr.user_id = auth.uid()
  where r.status = 'accepted'
    and auth.uid() in (r.from_user, r.to_user)
    and not is_blocked(r.from_user, r.to_user)
    and m.sender <> auth.uid()
    and m.created_at > coalesce(cr.read_at, '-infinity')
  group by m.request_id;
$$;

-- Obavještenja (web push) ----------------------------------------------------------

-- Uređaji (telefon, računar) na kojima je korisnik uključio obavještenja.
create table public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references public.profiles on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create policy "own push subscriptions" on public.push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Da se za istu poruku ili zahtjev ne pošalje obavještenje dvaput.
alter table public.private_messages add column pushed_at timestamptz;
alter table public.chat_requests add column pushed_at timestamptz;

create extension if not exists pg_net;

-- Javi sajtu da pošalje obavještenje. Sajt sam provjeri o čemu se radi, ovdje ide samo broj.
-- Ne šalje se ako je primalac upravo na sajtu ili nema uključena obavještenja,
-- i najviše jednom u 10 minuta po chatu.
create function public.notify_push() returns trigger
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
  else
    recipient := new.to_user;
  end if;

  if not exists (select 1 from push_subscriptions where user_id = recipient) then return new; end if;
  if exists (select 1 from profiles where id = recipient and last_seen_at > now() - interval '2 minutes') then
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

create trigger notify_push after insert on public.private_messages
  for each row execute function public.notify_push();
create trigger notify_push after insert on public.chat_requests
  for each row execute function public.notify_push();
