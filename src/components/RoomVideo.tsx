"use client";

import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track, type Participant } from "livekit-client";
import { supabase, type Profile } from "@/lib/supabase";
import { processedStream } from "@/lib/blur";

// Grupni video za stolom (LiveKit). Kamera uvijek kreće zamućena, mikrofon ugašen.
// Blur se pravi prije slanja, kao u video pozivu 1 na 1.

function Tile({ participant, roomId, me, isLocal, localStream }: {
  participant: Participant; roomId: number; me: Profile; isLocal: boolean; localStream?: MediaStream;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const blurred = participant.attributes.blurred !== "0";
  const cam = participant.getTrackPublication(Track.Source.Camera)?.track;
  const [reported, setReported] = useState(false);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (isLocal && localStream) {
      el.srcObject = localStream;
      return;
    }
    if (cam) cam.attach(el);
    return () => { cam?.detach(el); };
  }, [cam, isLocal, localStream]);

  async function report() {
    await supabase().from("reports").insert({ reporter: me.id, reported: participant.identity, reason: `Video za stolom (soba ${roomId})` });
    setReported(true);
  }

  async function kick() {
    const { data } = await supabase().auth.getSession();
    await fetch("/api/video-kick", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
      body: JSON.stringify({ roomId, identity: participant.identity }),
    });
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-stone-900">
      <video ref={video} autoPlay playsInline muted={isLocal} className={`aspect-[4/3] w-full object-cover ${isLocal ? "-scale-x-100" : ""}`} />
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-black/60 px-2 py-1 text-[11px] text-white">
        <span className="mr-auto truncate">{participant.name}{isLocal ? " (ti)" : ""}{blurred ? " · 🙈" : ""}</span>
        {!participant.isMicrophoneEnabled && <span title="Mikrofon ugašen">🔇</span>}
        {!isLocal && (reported
          ? <span className="text-stone-300">prijavljeno</span>
          : <button className="text-red-300 underline" onClick={report}>Prijavi</button>)}
        {!isLocal && me.is_admin && <button className="text-red-300 underline" onClick={kick}>Izbaci</button>}
      </div>
    </div>
  );
}

export function RoomVideo({ roomId, me }: { roomId: number; me: Profile }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [, setVersion] = useState(0);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [blurred, setBlurred] = useState(true);
  const [micOn, setMicOn] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream>();
  const state = useRef({ blurred: true, cameraOff: false });
  const media = useRef<ReturnType<typeof processedStream> | null>(null);
  const roomRef = useRef<Room | null>(null);

  useEffect(() => () => leave(), []);

  async function join() {
    setError("");
    setJoining(true);
    try {
      const { data } = await supabase().auth.getSession();
      const res = await fetch("/api/video-token", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
        body: JSON.stringify({ roomId }),
      });
      const body = (await res.json()) as { url?: string; token?: string; error?: string };
      if (!res.ok || !body.url || !body.token) throw new Error(body.error ?? "Video nije uspio.");

      let raw: MediaStream;
      try {
        raw = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 480 }, height: { ideal: 360 }, facingMode: "user" },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
      } catch {
        throw new Error("Kamera ili mikrofon nisu dozvoljeni. Dozvoli ih u pregledniku (ikona lokota pored adrese).");
      }
      state.current = { blurred: true, cameraOff: false };
      media.current = processedStream(raw, () => state.current);
      setLocalStream(media.current.stream);

      const r = new Room({ adaptiveStream: true, dynacast: true });
      const bump = () => setVersion((v) => v + 1);
      r.on(RoomEvent.ParticipantConnected, bump)
        .on(RoomEvent.ParticipantDisconnected, bump)
        .on(RoomEvent.TrackSubscribed, bump)
        .on(RoomEvent.TrackUnsubscribed, bump)
        .on(RoomEvent.TrackMuted, bump)
        .on(RoomEvent.TrackUnmuted, bump)
        .on(RoomEvent.ParticipantAttributesChanged, bump)
        .on(RoomEvent.Disconnected, () => {
          // Samo ako nas je izbacio server (admin ili prekid veze), ne kad sami izađemo.
          if (roomRef.current !== r) return;
          setError("Video je prekinut.");
          leave();
        });
      roomRef.current = r;
      await r.connect(body.url, body.token);
      await r.localParticipant.setAttributes({ blurred: "1" });
      const videoTrack = media.current.stream.getVideoTracks()[0];
      const audioTrack = media.current.stream.getAudioTracks()[0];
      await r.localParticipant.publishTrack(videoTrack, { source: Track.Source.Camera, name: "camera" });
      if (audioTrack) {
        audioTrack.enabled = false;
        await r.localParticipant.publishTrack(audioTrack, { source: Track.Source.Microphone, name: "mic" });
        await r.localParticipant.setMicrophoneEnabled(false);
      }
      setRoom(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Video nije uspio.");
      leave();
    }
    setJoining(false);
  }

  function leave() {
    const r = roomRef.current;
    roomRef.current = null;
    r?.disconnect();
    media.current?.stop();
    media.current = null;
    setRoom(null);
    setLocalStream(undefined);
    setBlurred(true);
    setMicOn(false);
  }

  async function toggleBlur() {
    const on = !blurred;
    state.current.blurred = on;
    setBlurred(on);
    await room?.localParticipant.setAttributes({ blurred: on ? "1" : "0" });
  }

  async function toggleMic() {
    const on = !micOn;
    const track = media.current?.stream.getAudioTracks()[0];
    if (track) track.enabled = on;
    await room?.localParticipant.setMicrophoneEnabled(on);
    setMicOn(on);
  }

  if (!room) {
    return (
      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
        <button className="btn-light" onClick={join} disabled={joining}>{joining ? "Uključujem…" : "📹 Uključi video za stolom"}</button>
        <span className="text-xs text-stone-500">Kreće zamućeno i bez zvuka. Ti biraš kad ćeš se otkriti.</span>
        {error && <span className="w-full text-xs text-red-600">{error}</span>}
      </div>
    );
  }

  const people: Participant[] = [room.localParticipant, ...room.remoteParticipants.values()];
  return (
    <div className="mb-2 space-y-2 rounded-xl border border-stone-200 p-2 dark:border-stone-800">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {people.map((p) => (
          <Tile key={p.identity} participant={p} roomId={roomId} me={me} isLocal={p === room.localParticipant} localStream={localStream} />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button onClick={toggleBlur} className={blurred ? "btn" : "btn-light"}>{blurred ? "👀 Otkrij se" : "🙈 Zamuti"}</button>
        <button onClick={toggleMic} className="btn-light">{micOn ? "🎙️ Utišaj" : "🔇 Uključi mikrofon"}</button>
        <button onClick={leave} className="text-red-700 underline">Izađi iz videa</button>
        <span className="ml-auto text-xs text-stone-500">{people.length} na videu · snimanje drugih nije dozvoljeno</span>
      </div>
    </div>
  );
}
