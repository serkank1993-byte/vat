"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Match, Team } from "@/lib/types";

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
      <h1 className="text-2xl font-semibold">Matches</h1>

      <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
        <select
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          className="rounded-md border border-black/10 dark:border-white/20 px-3 py-2 bg-transparent"
        >
          <option value="">Team</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
        <input
          value={opponentName}
          onChange={(e) => setOpponentName(e.target.value)}
          placeholder="Opponent"
          className="flex-1 min-w-[140px] rounded-md border border-black/10 dark:border-white/20 px-3 py-2 bg-transparent"
        />
        <input
          value={matchDate}
          onChange={(e) => setMatchDate(e.target.value)}
          type="datetime-local"
          className="rounded-md border border-black/10 dark:border-white/20 px-3 py-2 bg-transparent"
        />
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location"
          className="w-32 rounded-md border border-black/10 dark:border-white/20 px-3 py-2 bg-transparent"
        />
        <button
          type="submit"
          className="rounded-md bg-foreground text-background px-4 py-2 font-medium"
        >
          Add
        </button>
      </form>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : matches.length === 0 ? (
        <p className="text-black/60 dark:text-white/60">No matches yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {matches.map((match) => (
            <li
              key={match.id}
              className="flex items-center justify-between rounded-md border border-black/10 dark:border-white/10 px-4 py-2"
            >
              <span>
                {teamName(match.team_id)} vs {match.opponent_name}{" "}
                <span className="text-black/50 dark:text-white/50">
                  {new Date(match.match_date).toLocaleString()}
                  {match.location ? ` · ${match.location}` : ""} ·{" "}
                  {match.status ?? "scheduled"}
                </span>
              </span>
              <button
                onClick={() => handleDelete(match.id)}
                className="text-sm text-red-600 hover:underline"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
