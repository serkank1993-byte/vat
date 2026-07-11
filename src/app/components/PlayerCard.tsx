import type { Player, Team } from "@/lib/types";

function isLightColor(hex: string): boolean {
  const c = hex.replace("#", "");
  if (c.length !== 6) return false;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}

export default function PlayerCard({ player, team }: { player: Player; team?: Team | null }) {
  const primary = team?.primary_color ?? "#059669";
  const secondary = team?.secondary_color ?? "#e7f2ec";
  const nameColor = isLightColor(primary) ? "#111827" : "#ffffff";
  const bottomColor = isLightColor(secondary) ? "#111827" : "#ffffff";

  return (
    <div
      className="relative w-56 aspect-[3/4] shrink-0 rounded-2xl overflow-hidden shadow-lg border border-black/10 flex flex-col"
      style={{
        background: `linear-gradient(160deg, ${primary} 0%, ${primary} 55%, ${secondary} 55%, ${secondary} 100%)`,
      }}
    >
      <div className="px-3 pt-3">
        <h3
          className="text-lg font-extrabold tracking-wide uppercase truncate drop-shadow"
          style={{ color: nameColor }}
        >
          {player.name}
        </h3>
      </div>

      <div className="flex-1 flex items-end justify-center px-4">
        {player.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.photo_url}
            alt={player.name}
            className="h-full max-h-48 w-auto object-contain drop-shadow-xl"
          />
        ) : (
          <div className="h-28 w-28 mb-4 rounded-full bg-white/90 border border-black/10 flex items-center justify-center text-gray-700 text-4xl font-bold">
            {player.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="flex items-end justify-between px-3 pb-3">
        <span className="text-3xl font-black drop-shadow" style={{ color: bottomColor }}>
          {player.jersey_number}
        </span>
        <div className="text-right" style={{ color: bottomColor }}>
          {player.position && <div className="text-xs font-semibold uppercase opacity-90">{player.position}</div>}
          {team && <div className="text-[10px] opacity-75 truncate max-w-[110px]">{team.name}</div>}
        </div>
      </div>
    </div>
  );
}
