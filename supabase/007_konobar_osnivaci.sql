-- Konobar (jasno označen bot) i doživotni VIP za osnivače.
-- Pokreni ovaj fajl u Supabase SQL editoru nakon 006_vip_admin.sql (samo jednom).

-- Sistemske izmjene (npr. VIP za osnivače) prolaze pored zaštite profila. --------

create or replace function public.keep_verified() returns trigger
language plpgsql as $$
begin
  if current_setting('kafic.system', true) = 'on' then
    return new;
  end if;
  if auth.role() = 'authenticated' then
    new.verified := old.verified;
    new.is_admin := old.is_admin;
    if not public.is_admin() or new.id = auth.uid() then
      new.vip_until := old.vip_until;
      new.banned_until := old.banned_until;
    end if;
  end if;
  return new;
end;
$$;

-- Doživotni VIP za sve koji naprave profil do kraja novembra 2026. ----------------

create function public.founder_vip() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if now() < timestamptz '2026-12-01 00:00:00+01' then
    perform set_config('kafic.system', 'on', true);
    update profiles set vip_until = timestamptz '2999-01-01 00:00:00+00' where id = new.id;
    perform set_config('kafic.system', 'off', true);
  end if;
  return new;
end;
$$;
create trigger founder_vip after insert on public.profiles
  for each row execute function public.founder_vip();

-- I svi koji su već tu postaju osnivači.
update public.profiles set vip_until = timestamptz '2999-01-01 00:00:00+00';

-- Konobar ------------------------------------------------------------------------

-- Poruke bez korisnika (user_id = null) su Konobarove. Običan korisnik ih ne može napisati,
-- jer pravilo za pisanje traži da je user_id njegov.
alter table public.room_messages alter column user_id drop not null;
alter table public.room_messages add column is_bot boolean not null default false;
alter table public.room_messages add constraint room_messages_bot_check check ((user_id is null) = is_bot);

drop policy "read room messages" on public.room_messages;
create policy "read room messages" on public.room_messages
  for select to authenticated using (
    can_access_room(room_id) and (is_bot or not is_blocked(auth.uid(), user_id))
  );

create table public.konobar_lines (
  id serial primary key,
  kind text not null check (kind in ('pozdrav', 'tema')),
  line text not null
);
alter table public.konobar_lines enable row level security;
create policy "admin reads konobar" on public.konobar_lines for select using (public.is_admin());
create policy "admin edits konobar" on public.konobar_lines for all using (public.is_admin()) with check (public.is_admin());

-- {ime} se mijenja nadimkom gosta.
insert into public.konobar_lines (kind, line) values
  ('pozdrav', 'Dobro došao/la, {ime}! ☕ Šta ćeš popiti?'),
  ('pozdrav', 'Evo {ime}! Sjedi, kafa je taman skuhana. ☕'),
  ('pozdrav', 'Merhaba {ime}! Izvoli, slobodno se uključi u priču.'),
  ('pozdrav', 'Pozdrav {ime}! Prvi put ovdje? Reci odakle si. 👋'),
  ('pozdrav', '{ime}, dobro došao/la u društvo! Kafa, čaj ili sok?'),
  ('tema', 'Pitanje za sto: gdje su najbolji ćevapi u vašem gradu? 🥙'),
  ('tema', 'Kafa ujutro ili čaj? Ko je za džezvu, a ko za espresso? ☕'),
  ('tema', 'Koja pjesma vas uvijek vrati u mladost? 🎶'),
  ('tema', 'Da možete sutra otputovati bilo gdje, gdje biste išli? ✈️'),
  ('tema', 'Šta je bolje: more u Neumu ili bazen u Tuzli? 🌊'),
  ('tema', 'Ko je iz dijaspore? Šta vam najviše fali od kuće?'),
  ('tema', 'Najbolji film koji ste gledali ove godine? 🎬'),
  ('tema', 'Pita: krompiruša, zeljanica ili burek? Samo jedno! 🥧'),
  ('tema', 'Šta radite ovaj vikend? Neko za kafu? 😊'),
  ('tema', 'Prvi koncert na kojem ste bili? 🎤'),
  ('tema', 'Jutarnji tip ili noćna ptica? 🦉'),
  ('tema', 'Koji je najljepši grad u BiH? Bez svađe! 😄'),
  ('tema', 'Šta vas najbrže nasmije? 😂'),
  ('tema', 'Planine ili more? 🏔️🌊'),
  ('tema', 'Koje jelo vaša mama pravi najbolje na svijetu? 🍲');

create function public.konobar_line(k text, ime text default '') returns text
language sql stable security definer set search_path = public as $$
  select replace(line, '{ime}', ime) from konobar_lines where kind = k order by random() limit 1;
$$;

-- Pozdrav kad neko prvi put napiše nešto u sobi.
create function public.konobar_greet() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  nick text;
  line text;
begin
  if new.is_bot then return new; end if;
  if exists (
    select 1 from room_messages
    where room_id = new.room_id and user_id = new.user_id and id <> new.id
  ) then
    return new;
  end if;
  select nickname into nick from profiles where id = new.user_id;
  line := konobar_line('pozdrav', nick);
  if line is not null then
    insert into room_messages (room_id, user_id, is_bot, body) values (new.room_id, null, true, line);
  end if;
  return new;
end;
$$;
create trigger konobar_greet after insert on public.room_messages
  for each row execute function public.konobar_greet();

-- Svakih 30 minuta, uveče, Konobar baci temu u jednu tihu sobu, ali samo ako je neko online.
create function public.konobar_tick() returns void
language plpgsql security definer set search_path = public as $$
declare
  local_hour int := extract(hour from now() at time zone 'Europe/Sarajevo');
  r int;
begin
  if local_hour < 17 or local_hour > 23 then return; end if;
  if not exists (select 1 from profiles where last_seen_at > now() - interval '10 minutes') then return; end if;
  select rooms.id into r from rooms
  where category in ('kraj', 'tema')
    and not exists (
      select 1 from room_messages m where m.room_id = rooms.id and m.created_at > now() - interval '90 minutes'
    )
  order by random() limit 1;
  if r is not null then
    insert into room_messages (room_id, user_id, is_bot, body) values (r, null, true, konobar_line('tema'));
  end if;
end;
$$;

-- Raspored (pg_cron). Ako ovaj dio javi grešku, uključi "pg_cron" u Database > Extensions i pokreni ga ponovo.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('konobar', '*/30 * * * *', 'select public.konobar_tick()');
