-- Kafić: baza za Supabase. Pokreni cijeli fajl u Supabase SQL editoru.

-- Profili: javno se vidi samo nadimak i avatar.
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  nickname text not null unique check (char_length(nickname) between 3 and 20),
  avatar text not null default '☕',
  city text,
  bio text check (char_length(bio) <= 300),
  verified boolean not null default false,
  hide_from_city boolean not null default true,
  created_at timestamptz not null default now()
);

-- Pristanci se bilježe odvojeno, s vremenom davanja i povlačenja.
create table public.consents (
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('terms', 'sensitive_data', 'newsletter')),
  granted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  primary key (user_id, kind)
);

create table public.rooms (
  id serial primary key,
  slug text not null unique,
  name text not null,
  category text not null check (category in ('kraj', 'tema')),
  description text
);

create table public.room_messages (
  id bigserial primary key,
  room_id int not null references public.rooms on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index on public.room_messages (room_id, created_at desc);

-- Privatni chat počinje samo kad druga osoba prihvati zahtjev.
create table public.chat_requests (
  id bigserial primary key,
  from_user uuid not null references public.profiles on delete cascade,
  to_user uuid not null references public.profiles on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (from_user, to_user),
  check (from_user <> to_user)
);

create table public.private_messages (
  id bigserial primary key,
  request_id bigint not null references public.chat_requests on delete cascade,
  sender uuid not null references public.profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index on public.private_messages (request_id, created_at);

create table public.blocks (
  blocker uuid not null references public.profiles on delete cascade,
  blocked uuid not null references public.profiles on delete cascade,
  primary key (blocker, blocked)
);

create table public.reports (
  id bigserial primary key,
  reporter uuid not null references public.profiles on delete cascade,
  reported uuid not null references public.profiles on delete cascade,
  reason text not null check (char_length(reason) <= 500),
  created_at timestamptz not null default now()
);

-- Pomoćne funkcije za pravila pristupa.
create function public.is_blocked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from blocks
    where (blocker = a and blocked = b) or (blocker = b and blocked = a)
  );
$$;

create function public.in_request(req bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from chat_requests
    where id = req and status = 'accepted'
      and auth.uid() in (from_user, to_user)
      and not is_blocked(from_user, to_user)
  );
$$;

-- Brisanje profila jednim klikom: briše korisnika i sve njegove podatke.
create function public.delete_my_account() returns void
language sql security definer set search_path = public as $$
  delete from auth.users where id = auth.uid();
$$;

-- Row level security: svako vidi i mijenja samo ono što smije.
alter table public.profiles enable row level security;
alter table public.consents enable row level security;
alter table public.rooms enable row level security;
alter table public.room_messages enable row level security;
alter table public.chat_requests enable row level security;
alter table public.private_messages enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;

-- Javni pogled na profil (bez grada i opisa) za sve prijavljene.
create view public.public_profiles with (security_invoker = false) as
  select id, nickname, avatar, verified from public.profiles;
grant select on public.public_profiles to authenticated;

create policy "own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "chat partner profile" on public.profiles
  for select using (exists (
    select 1 from chat_requests r
    where r.status = 'accepted'
      and ((r.from_user = auth.uid() and r.to_user = profiles.id)
        or (r.to_user = auth.uid() and r.from_user = profiles.id))
  ));
create policy "insert own profile" on public.profiles
  for insert with check (auth.uid() = id and verified = false);
create policy "update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Oznaku "verifikovan" može mijenjati samo server (nakon selfie provjere), ne korisnik.
create function public.keep_verified() returns trigger
language plpgsql as $$
begin
  if auth.role() = 'authenticated' then
    new.verified := old.verified;
  end if;
  return new;
end;
$$;
create trigger keep_verified before update on public.profiles
  for each row execute function public.keep_verified();

create policy "own consents" on public.consents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "rooms readable" on public.rooms
  for select to authenticated using (true);

create policy "read room messages" on public.room_messages
  for select to authenticated using (not is_blocked(auth.uid(), user_id));
create policy "post room messages" on public.room_messages
  for insert to authenticated with check (
    auth.uid() = user_id
    and exists (select 1 from profiles where id = auth.uid())
  );
create policy "delete own room messages" on public.room_messages
  for delete using (auth.uid() = user_id);

create policy "see own requests" on public.chat_requests
  for select using (auth.uid() in (from_user, to_user));
create policy "send request" on public.chat_requests
  for insert with check (auth.uid() = from_user and status = 'pending' and not is_blocked(from_user, to_user));
create policy "answer request" on public.chat_requests
  for update using (auth.uid() = to_user) with check (auth.uid() = to_user);

create policy "read private messages" on public.private_messages
  for select using (in_request(request_id));
create policy "send private messages" on public.private_messages
  for insert with check (auth.uid() = sender and in_request(request_id));

create policy "own blocks" on public.blocks
  for all using (auth.uid() = blocker) with check (auth.uid() = blocker);

create policy "file report" on public.reports
  for insert with check (auth.uid() = reporter);

-- Realtime za chat.
alter publication supabase_realtime add table public.room_messages;
alter publication supabase_realtime add table public.private_messages;
alter publication supabase_realtime add table public.chat_requests;

-- Početne sobe.
insert into public.rooms (slug, name, category, description) values
  ('sarajevo', 'Sarajevo', 'kraj', 'Za Sarajlije i one koji to žele biti'),
  ('krajina', 'Krajina', 'kraj', 'Banja Luka, Bihać, Prijedor i okolina'),
  ('hercegovina', 'Hercegovina', 'kraj', 'Mostar i cijela Hercegovina'),
  ('tuzla-zenica', 'Tuzla i Zenica', 'kraj', 'Sjeveroistok i centralna Bosna'),
  ('dijaspora', 'Dijaspora', 'kraj', 'Naši ljudi u Njemačkoj, Austriji, Skandinaviji i šire'),
  ('muzika', 'Muzika', 'tema', 'Od sevdaha do techna'),
  ('putovanja', 'Putovanja', 'tema', 'Gdje si bio, gdje bi išao'),
  ('30-plus', '30+', 'tema', 'Za one koji znaju šta žele'),
  ('ozbiljne-veze', 'Ozbiljne veze', 'tema', 'Za one koji traže nešto trajno');
