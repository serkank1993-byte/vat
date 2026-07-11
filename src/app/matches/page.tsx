"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Match, Team } from "@/lib/types";
import { card, dangerLink, input, pageTitle, primaryButton } from "@/lib/ui";

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Planlandı",
  completed: "Tamamlandı",
  finished: "Tamamlandı",
};

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [opponentName, setOpponentName] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [location, setLocation] = useState("");
  const [teamId, setTeamId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    const [matchesRes, teamsRes] = await Promise.all([
      supabase.from("matches").select("*").order("match_date", { ascending: false }),
      supabase.from("teams").select("*").order("name"),
    ]);
    if (matchesRes.error) setError(matchesRes.error.message);
    else setMatches(matchesRes.data ?? []);
    if (teamsRes.data) setTeams(teamsRes.data);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!opponentName.trim() || !matchDate) return;
    const { error } = await supabase.from("matches").insert({
      opponent_name: opponentName,
      match_date: matchDate,
      location: location || null,
      team_id: teamId ? Number(teamId) : null,
    });
    if (error) setError(error.message);
    else {
      setOpponentName("");
      setMatchDate("");
      setLocation("");
      setTeamId("");
      loadData();
    }
  }

  async function handleDelete(id: number) {
    const { error } = await supabase.from("matches").delete().eq("id", id);
    if (error) setError(error.message);
    else loadData();
  }

  function teamName(id: number | null) {
    return teams.find((t) => t.id === id)?.name ?? "—";
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className={pageTitle}>Maçlar</h1>

      <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
        <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className={input}>
          <option value="">Takım</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
        <input
          value={opponentName}
          onChange={(e) => setOpponentName(e.target.value)}
          placeholder="Rakip"
          className={`flex-1 min-w-[140px] ${input}`}
        />
        <input
          value={matchDate}
          onChange={(e) => setMatchDate(e.target.value)}
          type="datetime-local"
          className={input}
        />
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Konum"
          className={`w-32 ${input}`}
        />
        <button type="submit" className={primaryButton}>
          Ekle
        </button>
      </form>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {loading ? (
        <p className="text-foreground/60">Yükleniyor...</p>
      ) : matches.length === 0 ? (
        <p className="text-foreground/60">Henüz maç yok.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {matches.map((match) => (
            <li key={match.id} className={`${card} flex items-center justify-between py-3`}>
              <span>
                <span className="font-medium">
                  {teamName(match.team_id)} - {match.opponent_name}
                </span>{" "}
                <span className="text-foreground/50">
                  {new Date(match.match_date).toLocaleString("tr-TR")}
                  {match.location ? ` · ${match.location}` : ""} ·{" "}
                  {STATUS_LABELS[match.status ?? "scheduled"] ?? match.status}
                </span>
              </span>
              <button onClick={() => handleDelete(match.id)} className={dangerLink}>
                Sil
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
