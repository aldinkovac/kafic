"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { RequireProfile } from "@/components/RequireProfile";

type Room = { id: number; slug: string; name: string; category: "kraj" | "tema"; description: string | null };

function Rooms() {
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    supabase().from("rooms").select("*").order("id").then(({ data }: { data: Room[] | null }) => setRooms(data ?? []));
  }, []);

  const groups: [string, Room[]][] = [
    ["Po kraju", rooms.filter((r) => r.category === "kraj")],
    ["Po temi", rooms.filter((r) => r.category === "tema")],
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Izaberi sto</h1>
      {groups.map(([title, list]) => (
        <section key={title} className="space-y-2">
          <h2 className="text-sm font-medium uppercase tracking-wide text-stone-500">{title}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {list.map((r) => (
              <Link key={r.id} href={`/kafic/${r.slug}`} className="rounded-xl border border-stone-200 p-4 hover:border-amber-700 dark:border-stone-800">
                <div className="font-semibold">{r.name}</div>
                {r.description && <div className="text-sm text-stone-600 dark:text-stone-400">{r.description}</div>}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function KaficPage() {
  return <RequireProfile>{() => <Rooms />}</RequireProfile>;
}
