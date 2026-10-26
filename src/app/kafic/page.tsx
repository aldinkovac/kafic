"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, isVip, type Profile } from "@/lib/supabase";
import { slugify, type Room } from "@/lib/rooms";
import { RequireProfile } from "@/components/RequireProfile";

function RoomCard({ r, badge }: { r: Room; badge?: string }) {
  return (
    <Link href={`/kafic/${r.slug}`} className="rounded-xl border border-stone-200 p-4 hover:border-amber-700 dark:border-stone-800">
      <div className="flex items-center gap-2 font-semibold">
        {r.name}
        {badge && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-normal text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">{badge}</span>}
      </div>
      {r.description && <div className="text-sm text-stone-600 dark:text-stone-400">{r.description}</div>}
    </Link>
  );
}

function NewKafana({ me, onCancel }: { me: Profile; onCancel: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const slug = slugify(name);
    const { error } = await supabase().from("rooms").insert({
      slug, name: name.trim(), description: description.trim() || null, category: "kafana", owner_id: me.id, is_open: isOpen,
    });
    if (error) {
      setError(error.code === "42501"
        ? isVip(me) ? "VIP član može imati najviše 5 kafana." : "Možeš imati jednu kafanu. VIP članovi mogu otvoriti do 5."
        : error.message);
      return;
    }
    router.push(`/kafic/${slug}`);
  }

  return (
    <form onSubmit={create} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-stone-900">
      <h2 className="font-semibold">Otvori svoju kafanu</h2>
      <input className="input" required minLength={3} maxLength={40} placeholder="Ime kafane, npr. Kod Mehe" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="input" maxLength={120} placeholder="Kratki opis (neobavezno)" value={description} onChange={(e) => setDescription(e.target.value)} />
      <label className="flex gap-2 text-sm">
        <input type="radio" checked={!isOpen} onChange={() => setIsOpen(false)} />
        <span><b>Zatvorena</b>: ulazi samo raja koju pozoveš linkom</span>
      </label>
      <label className="flex gap-2 text-sm">
        <input type="radio" checked={isOpen} onChange={() => setIsOpen(true)} />
        <span><b>Otvorena</b>: vide je i mogu ući svi članovi</span>
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button className="btn" type="submit">Otvori kafanu</button>
        <button className="btn-light" type="button" onClick={onCancel}>Odustani</button>
      </div>
    </form>
  );
}

function Rooms({ me }: { me: Profile }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [mine, setMine] = useState<Set<number>>(new Set());
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const sb = supabase();
    sb.from("rooms").select("*").order("id").then(({ data }: { data: Room[] | null }) => setRooms(data ?? []));
    sb.from("room_members").select("room_id").eq("user_id", me.id)
      .then(({ data }: { data: { room_id: number }[] | null }) => setMine(new Set((data ?? []).map((m) => m.room_id))));
  }, [me.id]);

  const kafane = rooms.filter((r) => r.category === "kafana");
  const myKafane = kafane.filter((r) => r.owner_id === me.id || mine.has(r.id));
  const openKafane = kafane.filter((r) => r.is_open && !myKafane.includes(r));

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="mr-auto text-2xl font-semibold">Kafane</h1>
          {!creating && <button className="btn" onClick={() => setCreating(true)}>+ Otvori svoju kafanu</button>}
        </div>
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Napravi kafanu za svoju raju i pozovi ih linkom, kao da ste u svojoj staroj kafani.
        </p>
        {creating && <NewKafana me={me} onCancel={() => setCreating(false)} />}
        {myKafane.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {myKafane.map((r) => <RoomCard key={r.id} r={r} badge={r.owner_id === me.id ? "tvoja" : r.is_open ? undefined : "zatvorena"} />)}
          </div>
        )}
        {openKafane.length > 0 && (
          <>
            <h2 className="text-sm font-medium uppercase tracking-wide text-stone-500">Otvorene kafane</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {openKafane.map((r) => <RoomCard key={r.id} r={r} />)}
            </div>
          </>
        )}
        {kafane.length === 0 && !creating && <p className="text-sm text-stone-500">Još nema kafana. Otvori prvu.</p>}
      </section>

      {([["Stolovi po kraju", "kraj"], ["Stolovi po temi", "tema"]] as const).map(([title, cat]) => (
        <section key={cat} className="space-y-2">
          <h2 className="text-sm font-medium uppercase tracking-wide text-stone-500">{title}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {rooms.filter((r) => r.category === cat).map((r) => <RoomCard key={r.id} r={r} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function KaficPage() {
  return <RequireProfile>{(me) => <Rooms me={me} />}</RequireProfile>;
}
