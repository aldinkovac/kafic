"use client";

import Link from "next/link";
import { useSession } from "@/lib/useSession";

export function AdminLink() {
  const { profile } = useSession();
  if (!profile?.is_admin) return null;
  return <Link href="/admin" className="text-red-700 dark:text-red-400">Admin</Link>;
}
