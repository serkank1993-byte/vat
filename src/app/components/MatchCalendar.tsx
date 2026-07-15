"use client";

import type { Match, Team } from "@/lib/types";
import { card, secondaryButton } from "@/lib/ui";

const WEEKDAY_LABELS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export default function MatchCalendar({
  matches,
  teams,
  month,
  onMonthChange,
}: {
  matches: Match[];
  teams: Team[];
  month: Date;
  onMonthChange: (next: Date) => void;
}) {
  function teamName(id: number | null) {
    return teams.find((t) => t.id === id)?.name ?? "—";
  }

  const matchesByDate = new Map<string, Match[]>();
  for (const m of matches) {
    const key = dateKey(new Date(m.match_date));
    const list = matchesByDate.get(key) ?? [];
    list.push(m);
    matchesByDate.set(key, list);
  }
  for (const list of matchesByDate.values()) {
    list.sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());
  }

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstOfMonth = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;

  const cells: (Date | null)[] = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, monthIndex, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const isToday = (d: Date) =>
    d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();

  return (
    <div className={`${card} flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <button
          onClick={() => onMonthChange(new Date(year, monthIndex - 1, 1))}
          className={secondaryButton}
          aria-label="Önceki ay"
        >
          ‹
        </button>
        <span className="font-semibold capitalize">
          {month.toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}
        </span>
        <button
          onClick={() => onMonthChange(new Date(year, monthIndex + 1, 1))}
          className={secondaryButton}
          aria-label="Sonraki ay"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-foreground/50">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="min-h-[5.5rem] rounded-lg" />;
          const dayMatches = matchesByDate.get(dateKey(d)) ?? [];
          return (
            <div
              key={i}
              className={`flex min-h-[5.5rem] flex-col gap-1 rounded-lg border p-1.5 text-left transition-colors duration-300 ${
                isToday(d) ? "border-accent bg-accent/10" : "border-border"
              }`}
            >
              <span className={`text-xs ${isToday(d) ? "font-semibold text-accent" : "text-foreground/60"}`}>
                {d.getDate()}
              </span>
              <div className="flex flex-col gap-1">
                {dayMatches.slice(0, 2).map((m) => (
                  <span
                    key={m.id}
                    title={`${teamName(m.team_id)} - ${m.opponent_name} · ${new Date(m.match_date).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`}
                    className="truncate rounded bg-accent/15 px-1 py-0.5 text-[10px] font-medium text-accent"
                  >
                    {new Date(m.match_date).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}{" "}
                    {m.opponent_name}
                  </span>
                ))}
                {dayMatches.length > 2 && (
                  <span className="text-[10px] text-foreground/50">+{dayMatches.length - 2} daha</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
