import { RoomServiceClient } from "livekit-server-sdk";
import { userFromRequest } from "@/lib/server-auth";

// Admin izbacuje nekoga iz videa za stolom.

export const runtime = "nodejs";

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  const key = process.env.LIVEKIT_API_KEY;
  const secret = process.env.LIVEKIT_API_SECRET;
  const auth = await userFromRequest(req);
  if (!url || !key || !secret || !auth) return Response.json({ ok: false }, { status: 401 });
  const { data: me } = await auth.sb.from("profiles").select("is_admin").eq("id", auth.userId).maybeSingle();
  if (!me?.is_admin) return Response.json({ ok: false }, { status: 403 });

  const { roomId, identity } = (await req.json().catch(() => ({}))) as { roomId?: number; identity?: string };
  if (!Number.isInteger(roomId) || typeof identity !== "string") return Response.json({ ok: false }, { status: 400 });
  const service = new RoomServiceClient(url.replace(/^wss?:/, "https:"), key, secret);
  await service.removeParticipant(`kafic-room-${roomId}`, identity).catch(() => {});
  return Response.json({ ok: true });
}
