"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Player, Team } from "@/lib/types";

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [position, setPosition] = useState("");
  const [teamId, setTeamId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    const [playersRes, teamsRes] = await Promise.all([
      supabase.from("players").select("*").order("created_at", { ascending: false }),
      supabase.from("teams").select("*").order("name"),
    ]);
    if (playersRes.error) setError(playersRes.error.message);
    else setPlayers(playersRes.data ?? []);
    if (teamsRes.data) setTeams(teamsRes.data);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !jerseyNumber) return;
    const { error } = await supabase.from("players").insert({
      name,
      jersey_number: Number(jerseyNumber),
      position: position || null,
      team_id: teamId ? Number(teamId) : null,
    });
    if (error) setError(error.message);
    else {
      setName("");
      setJerseyNumber("");
      setPosition("");
      setTeamId("");
      loadData();
    }
  }

  async function handleDelete(id: number) {
    const { error } = await supabase.from("players").delete().eq("id", id);
    if (error) setError(error.message);
    else loadData();
  }

  function teamName(id: number | null) {
    return teams.find((t) => t.id === id)?.name ?? "—";
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Players</h1>

      <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Player name"
          className="flex-1 min-w-[160px] rounded-md border border-black/10 dark:border-white/20 px-3 py-2 bg-transparent"
        />
        <input
          value={jerseyNumber}
          onChange={(e) => setJerseyNumber(e.target.value)}
          placeholder="#"
          type="number"
          className="w-20 rounded-md border border-black/10 dark:border-white/20 px-3 py-2 bg-transparent"
        />
        <input
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          placeholder="Position"
          className="w-32 rounded-md border border-black/10 dark:border-white/20 px-3 py-2 bg-transparent"
        />
        <select
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          className="rounded-md border border-black/10 dark:border-white/20 px-3 py-2 bg-transparent"
        >
          <option value="">No team</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
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
      ) : players.length === 0 ? (
        <p className="text-black/60 dark:text-white/60">No players yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {players.map((player) => (
            <li
              key={player.id}
              className="flex items-center justify-between rounded-md border border-black/10 dark:border-white/10 px-4 py-2"
            >
              <span>
                #{player.jersey_number} {player.name}{" "}
                <span className="text-black/50 dark:text-white/50">
                  {player.position ?? ""} · {teamName(player.team_id)}
                </span>
              </span>
              <button
                onClick={() => handleDelete(player.id)}
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
