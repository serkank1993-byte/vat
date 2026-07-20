"use client";

export type LineupSlot = {
  label: string;
  playerName: string;
  jerseyNumber: number;
  x: number; // 0-100 sol->sağ
  y: number; // 0-100 kendi kalesi->rakip kalesi
};

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** İlk 11 dizilişinden paylaşılabilir bir saha görseli (SVG string) üretir. */
export function buildLineupSvg(opts: {
  title: string;
  subtitle: string;
  formation: string;
  slots: LineupSlot[];
  markerColor: string;
}): string {
  const W = 660;
  const H = 920;
  const headerH = 96;
  const pad = 18;
  const pitchLeft = pad;
  const pitchTop = headerH;
  const pitchW = W - pad * 2;
  const pitchH = H - headerH - pad;

  const px = (x: number) => pitchLeft + (x / 100) * pitchW;
  const py = (y: number) => pitchTop + (1 - y / 100) * pitchH; // y=0 alt (kendi kalesi)

  const line = (x1: number, y1: number, x2: number, y2: number) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="white" stroke-opacity="0.65" stroke-width="2"/>`;
  const rectStroke = (x: number, y: number, w: number, h: number) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="white" stroke-opacity="0.65" stroke-width="2"/>`;

  const centerX = pitchLeft + pitchW / 2;
  const centerY = pitchTop + pitchH / 2;

  const boxW = pitchW * 0.5;
  const boxH = pitchH * 0.14;

  const markers = opts.slots
    .map((s) => {
      const cx = px(s.x);
      const cy = py(s.y);
      const r = 22;
      const name = escapeXml(s.playerName.length > 14 ? s.playerName.slice(0, 13) + "…" : s.playerName);
      const nameW = Math.max(54, name.length * 8.2);
      return `
        <g>
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="${opts.markerColor}" stroke="white" stroke-width="2.5"/>
          <text x="${cx}" y="${cy + 6}" text-anchor="middle" font-size="19" font-weight="700" fill="white" font-family="Arial, sans-serif">${s.jerseyNumber}</text>
          <g transform="translate(${cx}, ${cy + r + 14})">
            <rect x="${-nameW / 2}" y="-13" width="${nameW}" height="22" rx="6" fill="rgba(0,0,0,0.55)"/>
            <text x="0" y="3" text-anchor="middle" font-size="13" fill="white" font-family="Arial, sans-serif">${name}</text>
          </g>
        </g>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#0f172a"/>
    <text x="${pad}" y="40" font-size="26" font-weight="800" fill="#ffffff" font-family="Arial, sans-serif">${escapeXml(opts.title)}</text>
    <text x="${pad}" y="70" font-size="16" fill="#94a3b8" font-family="Arial, sans-serif">${escapeXml(opts.subtitle)}</text>
    <text x="${W - pad}" y="40" text-anchor="end" font-size="22" font-weight="700" fill="#10b981" font-family="Arial, sans-serif">${escapeXml(opts.formation)}</text>

    <rect x="${pitchLeft}" y="${pitchTop}" width="${pitchW}" height="${pitchH}" rx="10" fill="#059669"/>
    ${rectStroke(pitchLeft + 6, pitchTop + 6, pitchW - 12, pitchH - 12)}
    ${line(pitchLeft + 6, centerY, pitchLeft + pitchW - 6, centerY)}
    <circle cx="${centerX}" cy="${centerY}" r="${pitchW * 0.12}" fill="none" stroke="white" stroke-opacity="0.65" stroke-width="2"/>
    <circle cx="${centerX}" cy="${centerY}" r="3" fill="white" fill-opacity="0.65"/>
    ${rectStroke(centerX - boxW / 2, pitchTop + 6, boxW, boxH)}
    ${rectStroke(centerX - boxW / 2, pitchTop + pitchH - 6 - boxH, boxW, boxH)}
    ${markers}
  </svg>`;
}

/** SVG string'i PNG Blob'a çevirir. */
export function svgToPngBlob(svg: string, width: number, height: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const scale = 2; // retina kalitesi
      const canvas = document.createElement("canvas");
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas desteklenmiyor."));
        return;
      }
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Görsel oluşturulamadı."));
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("SVG yüklenemedi."));
    };
    img.src = url;
  });
}

/** PNG blob'unu paylaşır (destekleniyorsa) veya indirir. */
export async function shareOrDownloadPng(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & {
    canShare?: (data: { files: File[] }) => boolean;
    share?: (data: { files: File[]; title?: string }) => Promise<void>;
  };
  if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title: "İlk 11" });
      return;
    } catch {
      // paylaşım iptal edildi veya desteklenmiyor -> indirmeye düş
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
