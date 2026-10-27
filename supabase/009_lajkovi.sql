-- Lajkovi (reakcije) na poruke u sobama i u privatnim chatovima.
-- Pokreni ovaj fajl u Supabase SQL editoru nakon 008_neprocitano_obavjestenja.sql (samo jednom).

create table public.room_reactions (
  message_id bigint not null references public.room_messages on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  emoji text not null check (emoji in ('👍', '❤️', '😂', '😮')),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create table public.private_reactions (
  message_id bigint not null references public.private_messages on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  emoji text not null check (emoji in ('👍', '❤️', '😂', '😮')),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

alter table public.room_reactions enable row level security;
alter table public.private_reactions enable row level security;

-- Reakcije vidi i daje samo onaj ko vidi poruku (pravila za poruke važe i ovdje).
create policy "see room reactions" on public.room_reactions
  for select to authenticated using (exists (select 1 from room_messages m where m.id = message_id));
create policy "react in rooms" on public.room_reactions
  for insert to authenticated with check (
    user_id = auth.uid() and not public.is_banned(auth.uid())
    and exists (select 1 from room_messages m where m.id = message_id)
  );
create policy "unreact in rooms" on public.room_reactions
  for delete to authenticated using (user_id = auth.uid());

create policy "see private reactions" on public.private_reactions
  for select to authenticated using (exists (select 1 from private_messages m where m.id = message_id));
create policy "react in private" on public.private_reactions
  for insert to authenticated with check (
    user_id = auth.uid() and not public.is_banned(auth.uid())
    and exists (select 1 from private_messages m where m.id = message_id)
  );
create policy "unreact in private" on public.private_reactions
  for delete to authenticated using (user_id = auth.uid());

-- Uživo: da se lajk odmah pojavi kod drugih. "full" da i brisanje lajka stigne sa svim podacima.
alter table public.room_reactions replica identity full;
alter table public.private_reactions replica identity full;
alter publication supabase_realtime add table public.room_reactions;
alter publication supabase_realtime add table public.private_reactions;
