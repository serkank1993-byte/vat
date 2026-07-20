import type { Config } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

type RequestBody = {
  matchId?: number;
  title?: string;
  body?: string;
};

const handler = async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Yalnızca POST istekleri desteklenir." }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  const supabaseUrl = Netlify.env.get("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseKey = Netlify.env.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const vapidPublicKey = Netlify.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Netlify.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Netlify.env.get("VAPID_SUBJECT");

  if (!supabaseUrl || !supabaseKey || !vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return new Response(JSON.stringify({ error: "Bildirim servisi yapılandırılmamış." }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Oturum bulunamadı." }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Geçersiz istek gövdesi." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const matchId = body.matchId;
  if (!matchId) {
    return new Response(JSON.stringify({ error: "matchId gerekli." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const [{ data: targets, error: targetsError }, { data: match }] = await Promise.all([
    supabase.rpc("get_push_targets_for_match", { p_match_id: matchId }),
    supabase.from("matches").select("opponent_name, team_id").eq("id", matchId).maybeSingle(),
  ]);

  if (targetsError) {
    return new Response(JSON.stringify({ error: targetsError.message }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const title = body.title || "Taktik Duyuruldu";
  const notificationBody = body.body || `${match?.opponent_name ?? "Rakip"} maçının taktiği yayınlandı.`;
  const payload = JSON.stringify({ title, body: notificationBody, url: "/taktik" });

  let sent = 0;
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
    }
  }

  return new Response(JSON.stringify({ sent, total: targets?.length ?? 0 }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};

export default handler;

export const config: Config = {
  path: "/api/send-tactic-notification",
};
