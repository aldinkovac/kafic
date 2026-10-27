"use client";

import { useState } from "react";
import { EMOJIS } from "@/lib/reactions";

type Props = {
  items: { emoji: string; count: number; mine: boolean }[];
  onToggle: (emoji: string) => void;
  right?: boolean;
};

// Lajkovi ispod poruke: postojeći se klikom dodaju/skidaju, a "+" otvara izbor.
export function Reactions({ items, onToggle, right }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`mt-0.5 flex flex-wrap items-center gap-1 ${right ? "justify-end" : ""}`}>
      {items.map((r) => (
        <button key={r.emoji} onClick={() => onToggle(r.emoji)}
          className={`rounded-full border px-1.5 text-xs leading-5 ${r.mine
            ? "border-amber-600 bg-amber-100 dark:bg-amber-900/50"
            : "border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900"}`}>
          {r.emoji} {r.count}
        </button>
      ))}
      {open ? (
        <span className="flex gap-0.5 rounded-full border border-stone-200 bg-white px-1 shadow-sm dark:border-stone-700 dark:bg-stone-900">
          {EMOJIS.map((e) => (
            <button key={e} className="px-0.5 text-base hover:scale-125" onClick={() => { onToggle(e); setOpen(false); }}>{e}</button>
          ))}
          <button className="px-1 text-xs text-stone-400" onClick={() => setOpen(false)}>✕</button>
        </span>
      ) : (
        <button onClick={() => setOpen(true)} title="Lajkuj"
          className="rounded-full px-1 text-xs leading-5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800">
          ♡+
        </button>
      )}
    </div>
  );
}
