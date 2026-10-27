"use client";

import { useEffect, useState } from "react";
import { supabase, uniqueChannel } from "./supabase";

// Lajkovi na poruke (009_lajkovi.sql): učitavanje, uživo promjene i dodavanje/skidanje.

export const EMOJIS = ["👍", "❤️", "😂", "😮"] as const;

export type ReactionTable = "room_reactions" | "private_reactions";
type Reaction = { message_id: number; user_id: string; emoji: string };

export function useReactions(table: ReactionTable, messageIds: number[], me: string) {
  const [list, setList] = useState<Reaction[]>([]);
  const key = messageIds.join(",");

  useEffect(() => {
    if (!messageIds.length) return;
    let cancelled = false;
    supabase().from(table).select("message_id, user_id, emoji").in("message_id", messageIds)
      .then(({ data }) => { if (!cancelled) setList((data ?? []) as Reaction[]); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, key]);

  useEffect(() => {
    const sb = supabase();
    const same = (a: Reaction, b: Reaction) => a.message_id === b.message_id && a.user_id === b.user_id && a.emoji === b.emoji;
    const channel = sb.channel(uniqueChannel(table))
      .on("postgres_changes", { event: "INSERT", schema: "public", table }, (p: { new: Reaction }) =>
        setList((l) => (l.some((r) => same(r, p.new)) ? l : [...l, p.new])))
      .on("postgres_changes", { event: "DELETE", schema: "public", table }, (p: { old: Partial<Reaction> }) =>
        setList((l) => l.filter((r) => !same(r, p.old as Reaction))))
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, [table]);

  async function toggle(messageId: number, emoji: string) {
    const row = { message_id: messageId, user_id: me, emoji };
    const mine = list.some((r) => r.message_id === messageId && r.user_id === me && r.emoji === emoji);
    const sb = supabase();
    if (mine) {
      setList((l) => l.filter((r) => !(r.message_id === messageId && r.user_id === me && r.emoji === emoji)));
      await sb.from(table).delete().match(row);
    } else {
      setList((l) => [...l, row]);
      const { error } = await sb.from(table).insert(row);
      if (error) setList((l) => l.filter((r) => r !== row));
    }
  }

  function forMessage(messageId: number) {
    return EMOJIS.map((emoji) => {
      const rs = list.filter((r) => r.message_id === messageId && r.emoji === emoji);
      return { emoji, count: rs.length, mine: rs.some((r) => r.user_id === me) };
    }).filter((r) => r.count > 0);
  }

  return { toggle, forMessage };
}
