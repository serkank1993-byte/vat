import type { Config } from "@netlify/functions";

type RequestBody = {
  photoBase64?: string;
  mimeType?: string;
  playerName?: string;
  jerseyNumber?: string | number;
  position?: string;
  teamName?: string;
  primaryColor?: string;
  secondaryColor?: string;
};

const handler = async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Yalnızca POST istekleri desteklenir." }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  const apiKey = Netlify.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "AI servisi yapılandırılmamış." }), {
      status: 500,
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

  const { photoBase64, mimeType, jerseyNumber, position, teamName, primaryColor, secondaryColor } = body;

  if (!photoBase64) {
    return new Response(JSON.stringify({ error: "Fotoğraf verisi gerekli." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const promptParts = [
    "Bu fotoğraftaki kişinin yüz hatlarını ve kimliğini olabildiğince koruyarak, onu profesyonel bir futbol kulübünün stüdyo portre fotoğrafında gösteren gerçekçi, yüksek çözünürlüklü bir görsel oluştur.",
    "Klasik futbolcu stüdyo pozu: kollar göğüs önünde kavuşturulmuş veya yanlarda, göğüs hizasından yukarısı çerçevede, düz nötr stüdyo arka planı, profesyonel stüdyo ışıklandırması.",
    teamName ? `Forma, ${teamName} takımının forma renklerinde olsun.` : "",
    primaryColor ? `Forma ana rengi yaklaşık ${primaryColor} olsun.` : "",
    secondaryColor ? `Forma ikincil rengi yaklaşık ${secondaryColor} olsun.` : "",
    jerseyNumber ? `Forma üzerinde ${jerseyNumber} numarası görünsün.` : "",
    position ? `Oyuncu mevkii: ${position}.` : "",
    "Sonuç bir futbol koleksiyon kartı için kullanılacak profesyonel bir spor fotoğrafı gibi görünmeli.",
  ]
    .filter(Boolean)
    .join(" ");

  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: promptParts },
                { inline_data: { mime_type: mimeType || "image/jpeg", data: photoBase64 } },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ["IMAGE"],
          },
        }),
      },
    );
  } catch {
    return new Response(JSON.stringify({ error: "AI servisine ulaşılamadı." }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }

  if (!response.ok) {
    const detail = await response.text();
    return new Response(JSON.stringify({ error: "AI servisi bir hata döndürdü.", detail }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }

  const data = await response.json();
  const parts: Array<{ inlineData?: { data?: string; mimeType?: string } }> =
    data?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.data);

  if (!imagePart?.inlineData?.data) {
    return new Response(JSON.stringify({ error: "AI görsel üretemedi. Farklı bir fotoğraf deneyin." }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      imageBase64: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType || "image/png",
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
};

export default handler;

export const config: Config = {
  path: "/api/generate-player-card",
};
