import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { userFromRequest } from "@/lib/server-auth";

// Ulaz u grupni video za stolom (LiveKit). Ulazi samo prijavljen član koji smije u tu sobu i nije banovan.

export const runtime = "nodejs";

const MAX_IN_VIDEO = 12;

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  const key = process.env.LIVEKIT_API_KEY;
  const secret = process.env.LIVEKIT_API_SECRET;
  if (!url || !key || !secret) return Response.json({ error: "Video za stolom još nije uključen." }, { status: 503 });

  const auth = await userFromRequest(req);
  if (!auth) return Response.json({ error: "Prijavi se." }, { status: 401 });
  const { roomId } = (await req.json().catch(() => ({}))) as { roomId?: number };
  if (!Number.isInteger(roomId)) return Response.json({ error: "Nema sobe." }, { status: 400 });

  // Pravila baze odlučuju: soba se vidi samo ako korisnik smije u nju.
  const [{ data: room }, { data: me }] = await Promise.all([
    auth.sb.from("rooms").select("id").eq("id", roomId).maybeSingle(),
    auth.sb.from("profiles").select("nickname, avatar, banned_until").eq("id", auth.userId).maybeSingle(),
  ]);
  if (!room || !me) return Response.json({ error: "Ne možeš u ovu sobu." }, { status: 403 });
  if (me.banned_until && new Date(me.banned_until) > new Date()) {
    return Response.json({ error: "Trenutno ti je zabranjeno pisanje i video." }, { status: 403 });
  }

  const name = `kafic-room-${roomId}`;
  const service = new RoomServiceClient(url.replace(/^wss?:/, "https:"), key, secret);
  const inRoom = await service.listParticipants(name).catch(() => []);
  if (inRoom.length >= MAX_IN_VIDEO && !inRoom.some((p) => p.identity === auth.userId)) {
    return Response.json({ error: `Sto je pun (najviše ${MAX_IN_VIDEO} na videu). Probaj malo kasnije.` }, { status: 409 });
  }

  const token = new AccessToken(key, secret, { identity: auth.userId, name: `${me.avatar} ${me.nickname}`, ttl: "2h" });
  token.addGrant({ room: name, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: false, canUpdateOwnMetadata: true });
  return Response.json({ url, token: await token.toJwt() });
}
