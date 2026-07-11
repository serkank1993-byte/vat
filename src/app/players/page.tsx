"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Player, Team } from "@/lib/types";
import { card, dangerLink, input, pageTitle, primaryButton, secondaryButton } from "@/lib/ui";

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [position, setPosition] = useState("");
  const [teamId, setTeamId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteLinks, setInviteLinks] = useState<Record<number, string>>({});
  const [copiedId, setCopiedId] = useState<number | null>(null);

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

  async function handleToggleCaptain(player: Player) {
    const newRole = player.role === "captain" ? "player" : "captain";
    const { error } = await supabase.from("players").update({ role: newRole }).eq("id", player.id);
    if (error) setError(error.message);
    else loadData();
  }

  async function handleGenerateInvite(player: Player) {
    const token = player.invite_token ?? crypto.randomUUID();
    if (!player.invite_token) {
      const { error } = await supabase.from("players").update({ invite_token: token }).eq("id", player.id);
      if (error) {
        setError(error.message);
        return;
      }
      setPlayers((prev) => prev.map((p) => (p.id === player.id ? { ...p, invite_token: token } : p)));
    }
    setInviteLinks((prev) => ({ ...prev, [player.id]: `${window.location.origin}/kayit?token=${token}` }));
  }

  async function handleCopy(id: number, link: string) {
    await navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function teamName(id: number | null) {
    return teams.find((t) => t.id === id)?.name ?? "—";
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className={pageTitle}>Oyuncular</h1>

      <form onSubmit={handleAdd} className={`${card} flex flex-wrap gap-2`}>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {players.map((player) => (
            <div key={player.id} className={`${card} flex flex-col gap-2`}>
              <div className="flex items-center justify-between">
                <span>
                  <span className="font-medium">
                    #{player.jersey_number} {player.name}
                  </span>{" "}
                  <span className="text-foreground/50">
                    {player.position ?? ""} · {teamName(player.team_id)}
                  </span>
                  {player.role === "captain" && (
                    <span className="ml-2 rounded-full bg-accent/15 text-accent text-xs px-2 py-0.5">
                      Kaptan
                    </span>
                  )}
                  {player.user_id && (
                    <span className="ml-2 rounded-full bg-foreground/10 text-foreground/60 text-xs px-2 py-0.5">
                      Hesabı var
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-3">
                  <button onClick={() => handleToggleCaptain(player)} className="text-sm text-accent hover:underline">
                    {player.role === "captain" ? "Kaptanlıktan çıkar" : "Kaptan yap"}
                  </button>
                  <button onClick={() => handleDelete(player.id)} className={dangerLink}>
                    Sil
                  </button>
                </div>
              </div>

              {!player.user_id && (
                <div className="flex items-center gap-2">
                  {inviteLinks[player.id] ? (
                    <>
                      <input
                        readOnly
                        value={inviteLinks[player.id]}
                        className={`flex-1 text-xs ${input}`}
                        onFocus={(e) => e.target.select()}
                      />
                      <button
                        onClick={() => handleCopy(player.id, inviteLinks[player.id])}
                        className={secondaryButton}
                      >
                        {copiedId === player.id ? "Kopyalandı" : "Kopyala"}
                      </button>
                    </>
                  ) : (
                    <button onClick={() => handleGenerateInvite(player)} className={secondaryButton}>
                      Davet Linki Oluştur
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
