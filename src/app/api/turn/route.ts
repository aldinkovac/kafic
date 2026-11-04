import { userFromRequest } from "@/lib/server-auth";

// Serveri za spajanje video poziva. STUN je besplatan i dovoljan za većinu mreža;
// za mobilne mreže koje blokiraju direktnu vezu treba TURN (Cloudflare, vidi README).

export const runtime = "nodejs";

const STUN = [{ urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] }];

export async function GET(req: Request) {
  const keyId = process.env.CLOUDFLARE_TURN_KEY_ID;
  const token = process.env.CLOUDFLARE_TURN_API_TOKEN;
  if (!keyId || !token) return Response.json({ iceServers: STUN });

  // Samo prijavljeni članovi dobijaju TURN, da niko drugi ne troši naš besplatni promet.
  if (!(await userFromRequest(req))) return Response.json({ iceServers: STUN });

  try {
    const res = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ttl: 4 * 3600 }),
    });
    const body = (await res.json()) as { iceServers?: unknown };
    const turn = Array.isArray(body.iceServers) ? body.iceServers : body.iceServers ? [body.iceServers] : [];
    return Response.json({ iceServers: [...STUN, ...turn] });
  } catch {
    return Response.json({ iceServers: STUN });
  }
}
