"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Stats = { members: number; photos: number; ads: number; online: number };

// Brojači se prikazuju tek kad ima dovoljno članova, da prazan sajt ne odbija ljude.
const SHOW_FROM_MEMBERS = 50;

export function SiteStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    supabase().rpc("site_stats").then(({ data }: { data: Stats | null }) => setStats(data));
  }, []);

  if (!stats || stats.members < SHOW_FROM_MEMBERS) return null;

  const items: [string, number][] = [
    ["članova", stats.members],
    ["fotografija", stats.photos],
    ["ličnih oglasa", stats.ads],
    ["online sada", stats.online],
  ];

  return (
    <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {items.map(([label, n]) => (
        <div key={label} className="rounded-2xl bg-white p-5 text-center shadow-sm dark:bg-stone-900">
          <div className="text-3xl font-bold text-amber-700 dark:text-amber-400">
            {label === "online sada" && <span className="mr-2 inline-block h-3 w-3 rounded-full bg-green-500 align-middle" />}
            {n.toLocaleString("bs-BA")}
          </div>
          <div className="text-sm text-stone-500">{label}</div>
        </div>
      ))}
    </section>
  );
}
