import type { Config } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

type RequestBody = {
  matchId?: number;
  title?: string;
  body?: string;
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const handler = async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Yalnızca POST istekleri desteklenir." }, 405);
    }

    const supabaseUrl = Netlify.env.get("NEXT_PUBLIC_SUPABASE_URL");
    const supabaseKey = Netlify.env.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    const vapidPublicKey = Netlify.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Netlify.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Netlify.env.get("VAPID_SUBJECT");

    const missing = [
      !supabaseUrl && "NEXT_PUBLIC_SUPABASE_URL",
      !supabaseKey && "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      !vapidPublicKey && "VAPID_PUBLIC_KEY",
      !vapidPrivateKey && "VAPID_PRIVATE_KEY",
      !vapidSubject && "VAPID_SUBJECT",
    ].filter(Boolean);
    if (missing.length > 0) {
      return jsonResponse({ error: `Eksik ortam değişkeni: ${missing.join(", ")}` }, 500);
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Oturum bulunamadı." }, 401);
    }

    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Geçersiz istek gövdesi." }, 400);
    }

    const matchId = body.matchId;
    if (!matchId) {
      return jsonResponse({ error: "matchId gerekli." }, 400);
    }

    const supabase = createClient(supabaseUrl as string, supabaseKey as string, {
      global: { headers: { Authorization: authHeader } },
    });

    const [{ data: targets, error: targetsError }, { data: match }] = await Promise.all([
      supabase.rpc("get_push_targets_for_match", { p_match_id: matchId }),
      supabase.from("matches").select("opponent_name, team_id").eq("id", matchId).maybeSingle(),
    ]);

    if (targetsError) {
      return jsonResponse({ error: targetsError.message }, 403);
    }

    webpush.setVapidDetails(vapidSubject as string, vapidPublicKey as string, vapidPrivateKey as string);

    const title = body.title || "Taktik Duyuruldu";
    const notificationBody = body.body || `${match?.opponent_name ?? "Rakip"} maçının taktiği yayınlandı.`;
    const payload = JSON.stringify({ title, body: notificationBody, url: "/taktik" });

    let sent = 0;
    const sendErrors: string[] = [];
    for (const target of targets ?? []) {
      try {
        await webpush.sendNotification(
          {
            endpoint: target.endpoint,
            keys: { p256dh: target.p256dh, auth: target.auth },
          },
          payload,
        );
        sent++;
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.rpc("delete_stale_push_subscription", { p_endpoint: target.endpoint });
        }
        sendErrors.push(err instanceof Error ? err.message : String(err));
      }
    }

    return jsonResponse({ sent, total: targets?.length ?? 0, sendErrors }, 200);
  } catch (err: unknown) {
    return jsonResponse(
      { error: `Beklenmeyen sunucu hatası: ${err instanceof Error ? err.message : String(err)}` },
      500,
    );
  }
};

export default handler;

export const config: Config = {
  path: "/api/send-tactic-notification",
};
