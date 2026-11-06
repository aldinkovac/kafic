"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/useSession";
import { UnreadBadge, useUnreadCount } from "@/components/MessagesLink";

type Item = { href: string; label: string; icon: React.ReactNode };

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const ITEMS: Item[] = [
  {
    href: "/kafic", label: "Sobe",
    icon: <svg viewBox="0 0 24 24" className="h-6 w-6" {...stroke}><path d="M4 9h13v4a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6V9Z" /><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17" /><path d="M8 3v2M12 3v2" /></svg>,
  },
  {
    href: "/clanovi", label: "Članovi",
    icon: <svg viewBox="0 0 24 24" className="h-6 w-6" {...stroke}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.5A6.5 6.5 0 0 1 21.5 20" /></svg>,
  },
  {
    href: "/oglasi", label: "Oglasi",
    icon: <svg viewBox="0 0 24 24" className="h-6 w-6" {...stroke}><rect x="4" y="3.5" width="16" height="17" rx="3" /><path d="M8 8.5h8M8 12h8M8 15.5h5" /></svg>,
  },
  {
    href: "/poruke", label: "Poruke",
    icon: <svg viewBox="0 0 24 24" className="h-6 w-6" {...stroke}><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V17h0A2.5 2.5 0 0 1 4 14.5v-8Z" /></svg>,
  },
  {
    href: "/profil", label: "Profil",
    icon: <svg viewBox="0 0 24 24" className="h-6 w-6" {...stroke}><circle cx="12" cy="8.5" r="4" /><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" /></svg>,
  },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Nav() {
  const pathname = usePathname();
  const unread = useUnreadCount();
  const { user, profile } = useSession();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-white/80 backdrop-blur-xl dark:border-stone-800/80 dark:bg-stone-950/75">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="flex items-center gap-1.5 text-xl font-extrabold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-600 text-white">
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" {...stroke} strokeWidth={2.2}><path d="M5 9h11v3.5a5.5 5.5 0 0 1-5.5 5.5A5.5 5.5 0 0 1 5 12.5V9Z" /><path d="M16 10h1a2.25 2.25 0 0 1 0 4.5h-1" /></svg>
            </span>
            kafić
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {ITEMS.map((it) => (
              <Link key={it.href} href={it.href}
                className={`relative rounded-full px-4 py-2 text-sm font-medium transition ${isActive(pathname, it.href)
                  ? "bg-stone-100 text-stone-950 dark:bg-stone-800 dark:text-white"
                  : "text-stone-600 hover:text-stone-950 dark:text-stone-400 dark:hover:text-white"}`}>
                {it.label}
                {it.href === "/poruke" && <UnreadBadge count={unread} className="ml-1.5 align-[1px]" />}
              </Link>
            ))}
            {profile?.is_admin && (
              <Link href="/admin" className="rounded-full px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400">Admin</Link>
            )}
          </div>

          <div className="flex items-center gap-2">
            {profile?.is_admin && <Link href="/admin" className="text-sm font-medium text-red-600 md:hidden dark:text-red-400">Admin</Link>}
            {!user && (
              <Link href="/prijava" className="btn px-4 py-2 text-sm">Uđi</Link>
            )}
          </div>
        </nav>
      </header>

      {/* Na telefonu: donja traka kao u aplikaciji. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200/70 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden dark:border-stone-800 dark:bg-stone-950/90">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {ITEMS.map((it) => {
            const active = isActive(pathname, it.href);
            return (
              <Link key={it.href} href={it.href}
                className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition ${active ? "text-stone-950 dark:text-white" : "text-stone-400"}`}>
                {it.icon}
                {it.label}
                {it.href === "/poruke" && <UnreadBadge count={unread} className="absolute left-1/2 top-1 ml-1.5" />}
                {active && <span className="absolute top-0 h-0.5 w-6 rounded-full bg-amber-600" />}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
