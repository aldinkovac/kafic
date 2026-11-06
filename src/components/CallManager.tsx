"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, uniqueChannel } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import { VideoCall, type Call } from "./VideoCall";

const RING_SECONDS = 45;
const DONE = ["declined", "ended", "missed"];

declare global {
  interface WindowEventMap { "kafic:call": CustomEvent<{ requestId: number }> }
}

// Prati video pozive na svakoj stranici: zvono za dolazni poziv, pokretanje poziva iz chata i sam poziv.
export function CallManager() {
  const { user } = useSession();
  const [call, setCall] = useState<Call | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [partner, setPartner] = useState<{ id: string; name: string } | null>(null);
  const [toast, setToast] = useState("");
  const current = useRef<Call | null>(null);
  current.current = call;

  const finish = useCallback((message = "") => {
    setCall(null);
    setAccepted(false);
    setPartner(null);
    if (message) {
      setToast(message);
      setTimeout(() => setToast(""), 4000);
    }
  }, []);

  // Dolazni pozivi i promjene statusa.
  useEffect(() => {
    if (!user) return;
    const sb = supabase();
    const fresh = (c: Call) => Date.now() - new Date(c.created_at).getTime() < RING_SECONDS * 1000;

    // Ako je stranica otvorena iz obavještenja, poziv možda već zvoni.
    sb.from("calls").select("*").eq("status", "ringing").neq("caller", user.id)
      .order("created_at", { ascending: false }).limit(1)
      .then(({ data }) => {
        const c = (data ?? [])[0] as Call | undefined;
        if (c && fresh(c) && !current.current) setCall(c);
      });

    const channel = sb.channel(uniqueChannel("calls"))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "calls" }, (p: { new: Call }) => {
        if (p.new.caller !== user.id && p.new.status === "ringing" && !current.current) setCall(p.new);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "calls" }, (p: { new: Call }) => {
        const c = current.current;
        if (!c || c.id !== p.new.id) return;
        if (DONE.includes(p.new.status)) {
          const mine = p.new.caller === user.id;
          finish(p.new.status === "declined" && mine ? "Trenutno se ne može javiti." :
            p.new.status === "missed" ? (mine ? "Nije se javio/la." : "Propušten video poziv.") : "Poziv je završen.");
        } else {
          setCall(p.new);
        }
      })
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, [user, finish]);

  // Pokretanje poziva iz privatnog chata.
  useEffect(() => {
    if (!user) return;
    const start = async (e: CustomEvent<{ requestId: number }>) => {
      if (current.current) return;
      const { data, error } = await supabase().from("calls")
        .insert({ request_id: e.detail.requestId, caller: user.id }).select("*").single();
      if (error) return finish(error.message);
      setCall(data as Call);
    };
    window.addEventListener("kafic:call", start);
    return () => window.removeEventListener("kafic:call", start);
  }, [user, finish]);

  // Ime sagovornika.
  useEffect(() => {
    if (!call || !user) return;
    const sb = supabase();
    (async () => {
      const { data: r } = await sb.from("chat_requests").select("from_user, to_user").eq("id", call.request_id).single();
      if (!r) return;
      const id = r.from_user === user.id ? r.to_user : r.from_user;
      const { data: p } = await sb.from("public_profiles").select("nickname, avatar").eq("id", id).maybeSingle();
      setPartner({ id, name: p ? `${p.avatar} ${p.nickname}` : "Član" });
    })();
  }, [call?.id, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ako se niko ne javi, poziv se prekida.
  useEffect(() => {
    if (!call || call.status !== "ringing") return;
    const left = RING_SECONDS * 1000 - (Date.now() - new Date(call.created_at).getTime());
    const t = setTimeout(async () => {
      if (call.caller === user?.id) await supabase().from("calls").update({ status: "missed" }).eq("id", call.id).eq("status", "ringing");
      finish(call.caller === user?.id ? "Nije se javio/la." : "Propušten video poziv.");
    }, Math.max(0, left));
    return () => clearTimeout(t);
  }, [call, user, finish]);

  async function answer(ok: boolean) {
    if (!call) return;
    await supabase().from("calls").update({ status: ok ? "accepted" : "declined" }).eq("id", call.id);
    if (ok) setAccepted(true);
    else finish();
  }

  if (!user) return null;

  const incoming = call && call.caller !== user.id && call.status === "ringing" && !accepted;
  const inCall = call && (call.caller === user.id || accepted);

  return (
    <>
      {incoming && (
        <div className="fixed inset-x-3 top-3 z-50 mx-auto max-w-md rounded-2xl bg-stone-900 p-4 text-white shadow-2xl">
          <p className="text-lg font-semibold">📹 {partner?.name ?? "Neko"} te zove na video</p>
          <p className="mt-1 text-sm text-stone-300">Kamera kreće zamućena. Ti biraš kad ćeš se otkriti.</p>
          <div className="mt-3 flex gap-2">
            <button className="flex-1 rounded-full bg-green-600 py-2 font-semibold" onClick={() => answer(true)}>Prihvati</button>
            <button className="flex-1 rounded-full bg-red-600 py-2 font-semibold" onClick={() => answer(false)}>Odbij</button>
          </div>
        </div>
      )}
      {inCall && <VideoCall call={call} me={user.id} partner={partner} onEnd={() => finish("Poziv je završen.")} />}
      {toast && (
        <div className="fixed inset-x-3 bottom-20 z-50 md:bottom-4 mx-auto max-w-sm rounded-xl bg-stone-900 px-4 py-3 text-center text-sm text-white shadow-xl">{toast}</div>
      )}
    </>
  );
}
