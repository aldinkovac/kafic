"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase, uniqueChannel } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";

// "Poruke" u meniju s crvenim brojem nepročitanih poruka i novih zahtjeva, uživo.
export function MessagesLink() {
  const { user } = useSession();
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) return setCount(0);
    const sb = supabase();
    const [{ data }, { count: requests }] = await Promise.all([
      sb.rpc("unread_counts"),
      sb.from("chat_requests").select("id", { count: "exact", head: true }).eq("to_user", user.id).eq("status", "pending"),
    ]);
    const unread = ((data ?? []) as { n: number }[]).reduce((sum, r) => sum + r.n, 0);
    setCount(unread + (requests ?? 0));
  }, [user]);

  useEffect(() => {
    refresh();
    if (!user) return;
    const sb = supabase();
    const channel = sb.channel(uniqueChannel("unread"))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "private_messages" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_requests" }, () => refresh())
      .subscribe();
    const onVisible = () => document.visibilityState === "visible" && refresh();
    window.addEventListener("kafic:read", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      sb.removeChannel(channel);
      window.removeEventListener("kafic:read", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user, refresh]);

  useEffect(() => { refresh(); }, [pathname, refresh]);

  // Broj i na ikoni instalirane aplikacije, gdje telefon to podržava.
  useEffect(() => {
    const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    if (count) nav.setAppBadge?.(count).catch(() => {});
    else nav.clearAppBadge?.().catch(() => {});
  }, [count]);

  return (
    <Link href="/poruke" className="whitespace-nowrap">
      Poruke
      {count > 0 && (
        <span className="ml-1 inline-block min-w-[18px] rounded-full bg-red-600 px-1 text-center align-top text-[11px] font-bold leading-[18px] text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
