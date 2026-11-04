"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { processedStream } from "@/lib/blur";

export type Call = { id: number; request_id: number; caller: string; status: string; created_at: string };

type Signal =
  | { type: "ready" }
  | { type: "offer" | "answer"; sdp: RTCSessionDescriptionInit }
  | { type: "ice"; candidate: RTCIceCandidateInit }
  | { type: "blur"; on: boolean }
  | { type: "bye" };

type Props = {
  call: Call;
  me: string;
  partner: { id: string; name: string } | null;
  onEnd: (status: "ended") => void;
};

async function iceServers(): Promise<RTCIceServer[]> {
  try {
    const { data } = await supabase().auth.getSession();
    const res = await fetch("/api/turn", { headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}` } });
    return ((await res.json()) as { iceServers: RTCIceServer[] }).iceServers;
  } catch {
    return [{ urls: "stun:stun.l.google.com:19302" }];
  }
}

// Video poziv 1 na 1. Slika ide direktno između dva uređaja; Realtime kanal služi samo za spajanje.
export function VideoCall({ call, me, partner, onEnd }: Props) {
  const isCaller = call.caller === me;
  const [blurred, setBlurred] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [remoteBlurred, setRemoteBlurred] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const state = useRef({ blurred: true, cameraOff: false });
  const sendRef = useRef<(s: Signal) => void>(() => {});
  const audioTrack = useRef<MediaStreamTrack | null>(null);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;

  useEffect(() => {
    const sb = supabase();
    let stopped = false;
    let media: ReturnType<typeof processedStream> | null = null;
    let pc: RTCPeerConnection | null = null;
    let readyTimer: ReturnType<typeof setInterval> | undefined;
    const queued: RTCIceCandidateInit[] = [];
    let gotOffer = false;

    const topic = `call:${call.id}`;
    let channel: ReturnType<typeof sb.channel> | null = null;
    const send = (s: Signal) => { channel?.send({ type: "broadcast", event: "signal", payload: s }); };
    sendRef.current = send;

    async function flush() {
      while (pc && queued.length) await pc.addIceCandidate(queued.shift()!).catch(() => {});
    }

    async function handle(s: Signal) {
      if (!pc) return;
      if (s.type === "ready" && isCaller) {
        if (pc.signalingState === "have-local-offer" && pc.localDescription) {
          send({ type: "offer", sdp: pc.localDescription.toJSON() });
        } else if (pc.signalingState === "stable" && !pc.remoteDescription) {
          await pc.setLocalDescription(await pc.createOffer());
          send({ type: "offer", sdp: pc.localDescription!.toJSON() });
        }
      } else if (s.type === "offer" && !isCaller && !gotOffer) {
        gotOffer = true;
        clearInterval(readyTimer);
        await pc.setRemoteDescription(s.sdp);
        await pc.setLocalDescription(await pc.createAnswer());
        send({ type: "answer", sdp: pc.localDescription!.toJSON() });
        await flush();
      } else if (s.type === "answer" && isCaller && pc.signalingState === "have-local-offer") {
        await pc.setRemoteDescription(s.sdp);
        await flush();
      } else if (s.type === "ice") {
        if (pc.remoteDescription) await pc.addIceCandidate(s.candidate).catch(() => {});
        else queued.push(s.candidate);
      } else if (s.type === "blur") {
        setRemoteBlurred(s.on);
      } else if (s.type === "bye") {
        endRef.current("ended");
      }
    }

    (async () => {
      let raw: MediaStream;
      try {
        raw = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
      } catch {
        setError("Kamera ili mikrofon nisu dozvoljeni. Dozvoli ih u pregledniku (ikona lokota pored adrese) pa pokušaj ponovo.");
        return;
      }
      if (stopped) { raw.getTracks().forEach((t) => t.stop()); return; }
      audioTrack.current = raw.getAudioTracks()[0] ?? null;
      media = processedStream(raw, () => state.current);
      if (localVideo.current) localVideo.current.srcObject = media.stream;

      pc = new RTCPeerConnection({ iceServers: await iceServers() });
      if (stopped) return;
      media.stream.getTracks().forEach((t) => pc!.addTrack(t, media!.stream));
      pc.ontrack = (e) => { if (remoteVideo.current) remoteVideo.current.srcObject = e.streams[0]; };
      pc.onicecandidate = (e) => { if (e.candidate) send({ type: "ice", candidate: e.candidate.toJSON() }); };
      pc.onconnectionstatechange = () => {
        const st = pc?.connectionState;
        if (st === "connected") {
          setConnected(true);
          setNotice("");
          send({ type: "blur", on: state.current.blurred });
        } else if (st === "disconnected") {
          setNotice("Veza je slaba, pokušavam ponovo…");
        } else if (st === "failed") {
          setNotice("Nije uspjelo spajanje. Na nekim mobilnim mrežama video ne prolazi; probajte preko WiFi-ja.");
        }
      };

      // Kanal s istim imenom koji se još gasi bi se ponovo iskoristio, pa ga prvo ugasimo do kraja.
      const old = sb.getChannels().find((c) => c.topic === `realtime:${topic}`);
      if (old) await sb.removeChannel(old);
      if (stopped) return;
      channel = sb.channel(topic, { config: { private: true, broadcast: { self: false } } });
      channel
        .on("broadcast", { event: "signal" }, ({ payload }) => { handle(payload as Signal).catch(() => {}); })
        .subscribe((status) => {
          if (status !== "SUBSCRIBED" || isCaller) return;
          // Primalac javlja da je spreman dok ne stigne ponuda.
          send({ type: "ready" });
          readyTimer = setInterval(() => send({ type: "ready" }), 2000);
        });
    })();

    return () => {
      stopped = true;
      clearInterval(readyTimer);
      if (channel) sb.removeChannel(channel);
      pc?.close();
      media?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call.id]);

  function toggleBlur() {
    const on = !blurred;
    state.current.blurred = on;
    setBlurred(on);
    sendRef.current({ type: "blur", on });
  }

  function toggleMic() {
    if (audioTrack.current) audioTrack.current.enabled = !micOn;
    setMicOn(!micOn);
  }

  function toggleCam() {
    state.current.cameraOff = camOn;
    setCamOn(!camOn);
  }

  async function hangUp() {
    sendRef.current({ type: "bye" });
    await supabase().from("calls").update({ status: "ended" }).eq("id", call.id);
    onEnd("ended");
  }

  async function report() {
    if (!partner) return;
    await supabase().from("reports").insert({ reporter: me, reported: partner.id, reason: "Prijava iz video poziva" });
    await hangUp();
  }

  async function block() {
    if (!partner || !confirm(`Blokirati ${partner.name}? Više vas neće moći kontaktirati.`)) return;
    await supabase().from("blocks").insert({ blocker: me, blocked: partner.id });
    await hangUp();
  }

  const name = partner?.name ?? "…";
  const status = call.status === "ringing" ? (isCaller ? `Zovem ${name}…` : "Spajam…") : connected ? "" : "Spajam…";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-950 text-white">
      <div className="relative flex-1 overflow-hidden">
        <video ref={remoteVideo} autoPlay playsInline className="h-full w-full object-contain" />
        {(status || error || notice) && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
            <p className="rounded-xl bg-black/60 px-4 py-3 text-lg">{error || notice || status}</p>
          </div>
        )}
        {connected && remoteBlurred && (
          <p className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm">
            🙈 {name} je još zamućen/a
          </p>
        )}
        <div className="absolute bottom-3 right-3 w-28 overflow-hidden rounded-xl border border-white/30 shadow-lg sm:w-40">
          <video ref={localVideo} autoPlay playsInline muted className="w-full -scale-x-100" />
          <p className="bg-black/60 py-0.5 text-center text-[11px]">{blurred ? "🙈 ti si zamućen/a" : "👀 vide te jasno"}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 bg-stone-900 p-3 text-sm">
        <button onClick={toggleBlur} className={`rounded-full px-4 py-2 font-semibold ${blurred ? "bg-amber-600" : "bg-stone-700"}`}>
          {blurred ? "👀 Otkrij se" : "🙈 Zamuti"}
        </button>
        <button onClick={toggleMic} className="rounded-full bg-stone-700 px-3 py-2">{micOn ? "🎙️ Utišaj" : "🔇 Uključi zvuk"}</button>
        <button onClick={toggleCam} className="rounded-full bg-stone-700 px-3 py-2">{camOn ? "📷 Ugasi kameru" : "📷 Upali kameru"}</button>
        <button onClick={hangUp} className="rounded-full bg-red-600 px-4 py-2 font-semibold">Prekini</button>
        <button onClick={block} className="px-2 py-2 text-stone-300 underline">Blokiraj</button>
        <button onClick={report} className="px-2 py-2 text-red-300 underline">Prijavi</button>
      </div>
    </div>
  );
}
