import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AppSetup } from "@/components/AppSetup";
import { CallManager } from "@/components/CallManager";
import { Nav } from "@/components/Nav";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = {
  title: "Kafić",
  description: "Diskretno mjesto za upoznavanje za naše ljude u BiH i dijaspori.",
  appleWebApp: { capable: true, title: "Kafić", statusBarStyle: "default" },
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="bs" className={jakarta.variable}>
      <body className="antialiased">
        <AppSetup />
        <CallManager />
        <Nav />
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 md:pb-10">{children}</main>
        <footer className="mx-auto hidden max-w-6xl items-center justify-between px-4 pb-10 text-xs text-stone-500 md:flex">
          <span>© Kafić · za našu raju u BiH i dijaspori</span>
          <Link href="/privatnost" className="hover:text-stone-900 dark:hover:text-white">Privatnost i uslovi</Link>
        </footer>
      </body>
    </html>
  );
}
