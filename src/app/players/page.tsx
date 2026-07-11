"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Player, Team } from "@/lib/types";
import { card, dangerLink, input, pageTitle, primaryButton } from "@/lib/ui";

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
      <h1 className={pageTitle}>Oyuncular</h1>

      <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Oyuncu adı"
          className={`flex-1 min-w-[160px] ${input}`}
        />
        <input
          value={jerseyNumber}
          onChange={(e) => setJerseyNumber(e.target.value)}
          placeholder="#"
          type="number"
          className={`w-20 ${input}`}
        />
        <input
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          placeholder="Mevki"
          className={`w-32 ${input}`}
        />
        <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className={input}>
          <option value="">Takımsız</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
        <button type="submit" className={primaryButton}>
          Ekle
        </button>
      </form>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {loading ? (
        <p className="text-foreground/60">Yükleniyor...</p>
      ) : players.length === 0 ? (
        <p className="text-foreground/60">Henüz oyuncu yok.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {players.map((player) => (
            <li key={player.id} className={`${card} flex items-center justify-between py-3`}>
              <span>
                <span className="font-medium">
                  #{player.jersey_number} {player.name}
                </span>{" "}
                <span className="text-foreground/50">
                  {player.position ?? ""} · {teamName(player.team_id)}
                </span>
              </span>
              <button onClick={() => handleDelete(player.id)} className={dangerLink}>
                Sil
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
