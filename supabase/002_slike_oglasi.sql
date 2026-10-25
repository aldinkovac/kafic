-- Slike u profilu i u privatnom chatu, lični oglasi i brojači na naslovnoj.
-- Pokreni ovaj fajl u Supabase SQL editoru nakon schema.sql (samo jednom).
--
-- Slike su u privatnom spremištu. Profilne slike vidi samo vlasnik i osobe
-- s kojima je prihvatio privatni chat. Slike iz chata vide samo njih dvoje.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

create table public.profile_photos (
  id bigserial primary key,
  user_id uuid not null references public.profiles on delete cascade,
  path text not null unique,
  created_at timestamptz not null default now()
);
create index on public.profile_photos (user_id, created_at);

alter table public.private_messages alter column body drop not null;
alter table public.private_messages drop constraint if exists private_messages_body_check;
alter table public.private_messages add column image_path text;
alter table public.private_messages add constraint private_messages_content_check check (
  (body is not null and char_length(body) between 1 and 2000) or image_path is not null
);

-- Da li su trenutni korisnik i drugi korisnik u prihvaćenom chatu.
-- Prima tekst (ime foldera), pa ne puca ako folder nije uuid.
create function public.is_chat_partner(other text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from chat_requests
    where status = 'accepted'
      and ((from_user = auth.uid() and to_user::text = other) or (to_user = auth.uid() and from_user::text = other))
      and not is_blocked(from_user, to_user)
  );
$$;

-- Isto kao in_request, ali prima tekst (ime foldera).
create function public.in_request_folder(folder text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from chat_requests
    where id::text = folder and status = 'accepted'
      and auth.uid() in (from_user, to_user)
      and not is_blocked(from_user, to_user)
  );
$$;

alter table public.profile_photos enable row level security;

create policy "own photos" on public.profile_photos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id and path like auth.uid()::text || '/profile/%');
create policy "partner photos" on public.profile_photos
  for select using (is_chat_partner(user_id::text));

-- Slika u chatu mora biti u folderu tog chata.
drop policy "send private messages" on public.private_messages;
create policy "send private messages" on public.private_messages
  for insert with check (
    auth.uid() = sender and in_request(request_id)
    and (image_path is null or image_path like 'chat/' || request_id::text || '/%')
  );

-- Pravila za fajlove. Putanje:
--   <user_id>/profile/<ime>.jpg   profilne slike
--   chat/<request_id>/<ime>.jpg   slike poslane u privatnom chatu
create policy "upload own profile photos" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (storage.foldername(name))[2] = 'profile'
  );
create policy "upload chat photos" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = 'chat'
    and public.in_request_folder((storage.foldername(name))[2])
  );
create policy "read photos" on storage.objects
  for select to authenticated using (
    bucket_id = 'photos' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (
        (storage.foldername(name))[2] = 'profile'
        and public.is_chat_partner((storage.foldername(name))[1])
      )
      or (
        (storage.foldername(name))[1] = 'chat'
        and public.in_request_folder((storage.foldername(name))[2])
      )
    )
  );
-- Svako može obrisati svoje fajlove (profilne i one koje je poslao u chat).
create policy "delete own photos" on storage.objects
  for delete to authenticated using (
    bucket_id = 'photos' and owner_id = auth.uid()::text
  );

-- Lični oglasi: vide ih svi prijavljeni, a na oglas se javlja zahtjevom za privatni chat.
create table public.personal_ads (
  id bigserial primary key,
  user_id uuid not null references public.profiles on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  body text not null check (char_length(body) between 10 and 1000),
  looking_for text not null check (looking_for in ('veza', 'prijateljstvo', 'druženje')),
  region text check (char_length(region) <= 60),
  created_at timestamptz not null default now()
);
create index on public.personal_ads (created_at desc);

alter table public.personal_ads enable row level security;
create policy "read ads" on public.personal_ads
  for select to authenticated using (not is_blocked(auth.uid(), user_id));
create policy "post own ads" on public.personal_ads
  for insert to authenticated with check (
    auth.uid() = user_id
    and (select count(*) from personal_ads where user_id = auth.uid()) < 3
  );
create policy "delete own ads" on public.personal_ads
  for delete using (auth.uid() = user_id);

-- Ko je online: aplikacija osvježava ovo vrijeme dok je korisnik na sajtu.
alter table public.profiles add column last_seen_at timestamptz not null default now();

-- Brojači za naslovnu. Vraća samo ukupne brojeve, nikakve lične podatke.
create function public.site_stats() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'members', (select count(*) from profiles),
    'photos', (select count(*) from profile_photos),
    'ads', (select count(*) from personal_ads),
    'online', (select count(*) from profiles where last_seen_at > now() - interval '5 minutes')
  );
$$;
grant execute on function public.site_stats() to anon, authenticated;
