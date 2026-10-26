"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { RequireProfile } from "@/components/RequireProfile";

function Join({ code }: { code: string }) {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    supabase().rpc("join_kafana", { code }).then(({ data, error }: { data: string | null; error: { message: string } | null }) => {
      if (error || !data) setError(error?.message ?? "Pozivnica ne postoji.");
      else router.replace(`/kafic/${data}`);
    });
  }, [code, router]);

  return <p className="text-stone-500">{error || "Ulazim u kafanu…"}</p>;
}

export default function PozivnicaPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  return <RequireProfile>{() => <Join code={code} />}</RequireProfile>;
}
