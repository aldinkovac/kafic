"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase, uniqueChannel } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";

// Broj nepročitanih poruka i novih zahtjeva, uživo.
export function useUnreadCount() {
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

  return count;
}

export function UnreadBadge({ count, className = "" }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] font-bold text-white ${className}`}>
      {count > 9 ? "9+" : count}
    </span>
  );
}
