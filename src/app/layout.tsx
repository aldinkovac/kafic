import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kafić",
  description: "Diskretno mjesto za upoznavanje za naše ljude u BiH i dijaspori.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="bs">
      <body className="antialiased">
        <header className="border-b border-stone-200 dark:border-stone-800">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="whitespace-nowrap text-lg font-semibold sm:text-xl">☕ Kafić</Link>
            <div className="flex gap-2.5 text-[13px] sm:gap-4 sm:text-sm">
              <Link href="/clanovi">Članovi</Link>
              <Link href="/kafic">Sobe</Link>
              <Link href="/oglasi">Oglasi</Link>
              <Link href="/poruke">Poruke</Link>
              <Link href="/profil">Profil</Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 py-8 text-xs text-stone-500">
          <Link href="/privatnost">Privatnost i uslovi</Link>
        </footer>
      </body>
    </html>
  );
}
