export type YTPlayer = {
  getCurrentTime: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
};

type YTPlayerOptions = {
  videoId: string;
  playerVars?: Record<string, number | string>;
  events?: {
    onReady?: (event: { target: YTPlayer }) => void;
  };
};

declare global {
  interface Window {
    YT?: {
      Player: new (elementId: string, options: YTPlayerOptions) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiLoadPromise: Promise<void> | null = null;

export function loadYouTubeIframeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (apiLoadPromise) return apiLoadPromise;

  apiLoadPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(script);
  });

  return apiLoadPromise;
}

/**
 * YouTube linkindeki başlangıç zamanını saniye olarak çıkarır (t= veya start=).
 * "3759", "3759s", "1h2m39s", "62m39s" biçimlerini destekler. Yoksa null.
 */
export function extractYouTubeStart(url: string): number | null {
  try {
    const u = new URL(url.trim());
    const raw = u.searchParams.get("t") ?? u.searchParams.get("start");
    if (!raw) return null;
    if (/^\d+$/.test(raw)) return Number(raw);
    const match = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
    if (!match) return null;
    const [, h, m, s] = match;
    const total = (Number(h ?? 0) * 3600) + (Number(m ?? 0) * 60) + Number(s ?? 0);
    return total > 0 ? total : null;
  } catch {
    return null;
  }
}

export function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      if (u.pathname.startsWith("/live/")) return u.pathname.split("/")[2] ?? null;
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2] ?? null;
    }
    return null;
  } catch {
    return null;
  }
}
