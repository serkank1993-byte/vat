"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Match, MatchStat, Player, Team } from "@/lib/types";

export default function DashboardPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [stats, setStats] = useState<MatchStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [matchId, setMatchId] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [passes, setPasses] = useState("0");
  const [successfulPasses, setSuccessfulPasses] = useState("0");
  const [shots, setShots] = useState("0");
  const [shotsOnTarget, setShotsOnTarget] = useState("0");
  const [dribbles, setDribbles] = useState("0");
  const [tackles, setTackles] = useState("0");
  const [fouls, setFouls] = useState("0");
  const [assists, setAssists] = useState("0");
  const [goals, setGoals] = useState("0");
  const [cards, setCards] = useState("");

  async function loadData() {
    setLoading(true);
    const [teamsRes, playersRes, matchesRes, statsRes] = await Promise.all([
      supabase.from("teams").select("*"),
      supabase.from("players").select("*"),
      supabase.from("matches").select("*").order("match_date", { ascending: false }),
      supabase.from("match_stats").select("*").order("created_at", { ascending: false }),
    ]);
    if (teamsRes.error) setError(teamsRes.error.message);
    else setTeams(teamsRes.data ?? []);
    if (playersRes.data) setPlayers(playersRes.data);
    if (matchesRes.data) setMatches(matchesRes.data);
    if (statsRes.error) setError(statsRes.error.message);
    else setStats(statsRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  const playersForSelectedMatch = useMemo(() => {
    const match = matches.find((m) => m.id === Number(matchId));
    if (!match) return players;
    return players.filter((p) => p.team_id === match.team_id);
  }, [matchId, matches, players]);

  function teamName(id: number | null) {
    return teams.find((t) => t.id === id)?.name ?? "—";
  }

  function playerLabel(id: number | null) {
    const player = players.find((p) => p.id === id);
    if (!player) return "—";
    return `#${player.jersey_number} ${player.name}`;
  }

  async function handleAddStat(e: React.FormEvent) {
    e.preventDefault();
    if (!matchId || !playerId) return;
    const { error } = await supabase.from("match_stats").insert({
      match_id: Number(matchId),
      player_id: Number(playerId),
      passes: Number(passes),
      successful_passes: Number(successfulPasses),
      shots: Number(shots),
      shots_on_target: Number(shotsOnTarget),
      dribbles: Number(dribbles),
      tackles: Number(tackles),
      fouls: Number(fouls),
      assists: Number(assists),
      goals: Number(goals),
      cards: cards || null,
    });
    if (error) setError(error.message);
    else {
      setPlayerId("");
      setPasses("0");
      setSuccessfulPasses("0");
      setShots("0");
      setShotsOnTarget("0");
      setDribbles("0");
      setTackles("0");
      setFouls("0");
      setAssists("0");
      setGoals("0");
      setCards("");
      loadData();
    }
  }

  async function handleDeleteStat(id: number) {
    const { error } = await supabase.from("match_stats").delete().eq("id", id);
    if (error) setError(error.message);
    else loadData();
  }

  const teamRecords = useMemo(() => {
    return teams.map((team) => {
      const teamMatches = matches.filter((m) => m.team_id === team.id);
      let wins = 0;
      let draws = 0;
      let losses = 0;
      let goalsFor = 0;
      let goalsAgainst = 0;
      for (const m of teamMatches) {
        const gf = m.score_for ?? 0;
        const ga = m.score_against ?? 0;
        goalsFor += gf;
        goalsAgainst += ga;
        if (m.status === "completed" || m.status === "finished") {
          if (gf > ga) wins++;
          else if (gf === ga) draws++;
          else losses++;
        }
      }
      return {
        team,
        played: teamMatches.length,
        wins,
        draws,
        losses,
        goalsFor,
        goalsAgainst,
      };
    });
  }, [teams, matches]);

  const topScorers = useMemo(() => {
    const totals = new Map<number, number>();
    for (const s of stats) {
      if (s.player_id == null) continue;
      totals.set(s.player_id, (totals.get(s.player_id) ?? 0) + (s.goals ?? 0));
    }
    return [...totals.entries()]
      .filter(([, goals]) => goals > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [stats]);

  const topAssists = useMemo(() => {
    const totals = new Map<number, number>();
    for (const s of stats) {
      if (s.player_id == null) continue;
      totals.set(s.player_id, (totals.get(s.player_id) ?? 0) + (s.assists ?? 0));
    }
    return [...totals.entries()]
      .filter(([, assists]) => assists > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [stats]);

  const passAccuracy = useMemo(() => {
    const totals = new Map<number, { passes: number; successful: number }>();
    for (const s of stats) {
      if (s.player_id == null) continue;
      const entry = totals.get(s.player_id) ?? { passes: 0, successful: 0 };
      entry.passes += s.passes ?? 0;
      entry.successful += s.successful_passes ?? 0;
      totals.set(s.player_id, entry);
    }
    return [...totals.entries()]
      .filter(([, v]) => v.passes > 0)
      .map(([playerId, v]) => ({
        playerId,
        accuracy: (v.successful / v.passes) * 100,
        passes: v.passes,
      }))
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 5);
  }, [stats]);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {loading && <p>Loading...</p>}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Team Record</h2>
        {teamRecords.length === 0 ? (
          <p className="text-black/60 dark:text-white/60">No teams yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left border-b border-black/10 dark:border-white/10">
                  <th className="py-2 pr-4">Team</th>
                  <th className="py-2 pr-4">Played</th>
                  <th className="py-2 pr-4">W</th>
                  <th className="py-2 pr-4">D</th>
                  <th className="py-2 pr-4">L</th>
                  <th className="py-2 pr-4">GF</th>
                  <th className="py-2 pr-4">GA</th>
                  <th className="py-2 pr-4">GD</th>
                </tr>
              </thead>
              <tbody>
                {teamRecords.map((r) => (
                  <tr key={r.team.id} className="border-b border-black/5 dark:border-white/5">
                    <td className="py-2 pr-4">{r.team.name}</td>
                    <td className="py-2 pr-4">{r.played}</td>
                    <td className="py-2 pr-4">{r.wins}</td>
                    <td className="py-2 pr-4">{r.draws}</td>
                    <td className="py-2 pr-4">{r.losses}</td>
                    <td className="py-2 pr-4">{r.goalsFor}</td>
                    <td className="py-2 pr-4">{r.goalsAgainst}</td>
                    <td className="py-2 pr-4">{r.goalsFor - r.goalsAgainst}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Top Scorers</h2>
          {topScorers.length === 0 ? (
            <p className="text-black/60 dark:text-white/60 text-sm">No goals recorded yet.</p>
          ) : (
            <ol className="flex flex-col gap-1 text-sm list-decimal list-inside">
              {topScorers.map(([id, goals]) => (
                <li key={id}>
                  {playerLabel(id)} — {goals}
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Top Assists</h2>
          {topAssists.length === 0 ? (
            <p className="text-black/60 dark:text-white/60 text-sm">No assists recorded yet.</p>
          ) : (
            <ol className="flex flex-col gap-1 text-sm list-decimal list-inside">
              {topAssists.map(([id, assists]) => (
                <li key={id}>
                  {playerLabel(id)} — {assists}
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Pass Accuracy</h2>
          {passAccuracy.length === 0 ? (
            <p className="text-black/60 dark:text-white/60 text-sm">No passes recorded yet.</p>
          ) : (
            <ol className="flex flex-col gap-1 text-sm list-decimal list-inside">
              {passAccuracy.map((p) => (
                <li key={p.playerId}>
                  {playerLabel(p.playerId)} — {p.accuracy.toFixed(0)}% ({p.passes} passes)
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Add Match Stat</h2>
        <form onSubmit={handleAddStat} className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <select
              value={matchId}
              onChange={(e) => {
                setMatchId(e.target.value);
                setPlayerId("");
              }}
              className="rounded-md border border-black/10 dark:border-white/20 px-3 py-2 bg-transparent"
            >
              <option value="">Match</option>
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  {teamName(m.team_id)} vs {m.opponent_name} ({new Date(m.match_date).toLocaleDateString()})
                </option>
              ))}
            </select>
            <select
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
              className="rounded-md border border-black/10 dark:border-white/20 px-3 py-2 bg-transparent"
            >
              <option value="">Player</option>
              {playersForSelectedMatch.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.jersey_number} {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <LabeledInput label="Passes" value={passes} onChange={setPasses} />
            <LabeledInput label="Successful passes" value={successfulPasses} onChange={setSuccessfulPasses} />
            <LabeledInput label="Shots" value={shots} onChange={setShots} />
            <LabeledInput label="Shots on target" value={shotsOnTarget} onChange={setShotsOnTarget} />
            <LabeledInput label="Dribbles" value={dribbles} onChange={setDribbles} />
            <LabeledInput label="Tackles" value={tackles} onChange={setTackles} />
            <LabeledInput label="Fouls" value={fouls} onChange={setFouls} />
            <LabeledInput label="Assists" value={assists} onChange={setAssists} />
            <LabeledInput label="Goals" value={goals} onChange={setGoals} />
            <label className="flex flex-col text-xs gap-1">
              Cards
              <select
                value={cards}
                onChange={(e) => setCards(e.target.value)}
                className="rounded-md border border-black/10 dark:border-white/20 px-3 py-2 bg-transparent"
              >
                <option value="">None</option>
                <option value="yellow">Yellow</option>
                <option value="red">Red</option>
              </select>
            </label>
          </div>
          <button
            type="submit"
            className="self-start rounded-md bg-foreground text-background px-4 py-2 font-medium"
          >
            Add
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Match Stat Entries</h2>
        {stats.length === 0 ? (
          <p className="text-black/60 dark:text-white/60 text-sm">No match stats yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {stats.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-md border border-black/10 dark:border-white/10 px-4 py-2 text-sm"
              >
                <span>
                  {playerLabel(s.player_id)} — G {s.goals ?? 0} · A {s.assists ?? 0} · Shots{" "}
                  {s.shots_on_target ?? 0}/{s.shots ?? 0} · Passes {s.successful_passes ?? 0}/
                  {s.passes ?? 0}
                  {s.cards ? ` · ${s.cards} card` : ""}
                </span>
                <button
                  onClick={() => handleDeleteStat(s.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col text-xs gap-1 w-28">
      {label}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-black/10 dark:border-white/20 px-3 py-2 bg-transparent"
      />
    </label>
  );
}
