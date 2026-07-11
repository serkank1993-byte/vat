"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Player, Team } from "@/lib/types";
import { card, dangerLink, input, pageTitle, primaryButton, secondaryButton } from "@/lib/ui";
import { uploadImage } from "@/lib/storage";
import PlayerCard from "@/app/components/PlayerCard";

function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [meta, base64] = result.split(",");
      const mimeMatch = meta.match(/data:(.*);base64/);
      resolve({ base64, mimeType: mimeMatch?.[1] ?? file.type });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function base64ToFile(base64: string, mimeType: string, filename: string): File {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  const byteArray = new Uint8Array(byteNumbers);
  return new File([byteArray], filename, { type: mimeType });
}

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

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detailName, setDetailName] = useState("");
  const [detailJerseyNumber, setDetailJerseyNumber] = useState("");
  const [detailPosition, setDetailPosition] = useState("");
  const [detailPhotoFile, setDetailPhotoFile] = useState<File | null>(null);
  const [savingDetail, setSavingDetail] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);

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

  function toggleExpand(player: Player) {
    if (expandedId === player.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(player.id);
    setDetailName(player.name);
    setDetailJerseyNumber(String(player.jersey_number));
    setDetailPosition(player.position ?? "");
    setDetailPhotoFile(null);
  }

  async function saveBasicFields(playerId: number): Promise<boolean> {
    if (!detailName.trim() || !detailJerseyNumber) return false;
    const { error } = await supabase
      .from("players")
      .update({
        name: detailName,
        jersey_number: Number(detailJerseyNumber),
        position: detailPosition || null,
      })
      .eq("id", playerId);
    if (error) {
      setError(error.message);
      return false;
    }
    return true;
  }

  async function handleSaveDetail(player: Player) {
    setSavingDetail(true);
    const ok = await saveBasicFields(player.id);
    if (!ok) {
      setSavingDetail(false);
      return;
    }
    if (detailPhotoFile) {
      const url = await uploadImage("player-photos", player.id, detailPhotoFile);
      if (url) await supabase.from("players").update({ photo_url: url }).eq("id", player.id);
    }
    setSavingDetail(false);
    loadData();
  }

  async function handleGenerateAiCard(player: Player) {
    if (!detailPhotoFile) {
      setError("Yapay zeka kartı için önce bir fotoğraf seçin.");
      return;
    }
    setGeneratingAi(true);
    setError(null);
    const ok = await saveBasicFields(player.id);
    if (!ok) {
      setGeneratingAi(false);
      return;
    }
    try {
      const { base64, mimeType } = await fileToBase64(detailPhotoFile);
      const team = teams.find((t) => t.id === player.team_id);
      const res = await fetch("/api/generate-player-card", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          photoBase64: base64,
          mimeType,
          playerName: detailName,
          jerseyNumber: detailJerseyNumber,
          position: detailPosition,
          teamName: team?.name,
          primaryColor: team?.primary_color,
          secondaryColor: team?.secondary_color,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.imageBase64) {
        setError(data.error ?? "Yapay zeka kartı oluşturulamadı.");
        setGeneratingAi(false);
        return;
      }
      const file = base64ToFile(
        data.imageBase64,
        data.mimeType ?? "image/png",
        `ai-card.${(data.mimeType ?? "image/png").split("/")[1] ?? "png"}`,
      );
      const url = await uploadImage("player-photos", player.id, file);
      if (url) await supabase.from("players").update({ photo_url: url }).eq("id", player.id);
    } catch {
      setError("Yapay zeka kartı oluşturulurken bir hata oluştu.");
    }
    setGeneratingAi(false);
    loadData();
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
                  <button
                    onClick={() => toggleExpand(player)}
                    className="font-medium hover:underline"
                  >
                    #{player.jersey_number} {player.name}
                  </button>{" "}
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

              {expandedId === player.id && (
                <div className="flex flex-col sm:flex-row gap-4 border-t border-border pt-4 mt-1">
                  <PlayerCard player={player} team={teams.find((t) => t.id === player.team_id) ?? null} />
                  <div className="flex-1 flex flex-col gap-3">
                    <label className="flex flex-col gap-1 text-sm text-foreground/70">
                      Ad Soyad
                      <input
                        value={detailName}
                        onChange={(e) => setDetailName(e.target.value)}
                        className={input}
                      />
                    </label>
                    <div className="flex gap-3">
                      <label className="flex flex-col gap-1 text-sm text-foreground/70">
                        Forma No
                        <input
                          value={detailJerseyNumber}
                          onChange={(e) => setDetailJerseyNumber(e.target.value)}
                          type="number"
                          className={`w-24 ${input}`}
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-sm text-foreground/70">
                        Mevki
                        <input
                          value={detailPosition}
                          onChange={(e) => setDetailPosition(e.target.value)}
                          className={input}
                        />
                      </label>
                    </div>
                    <label className="flex flex-col gap-1 text-sm text-foreground/70">
                      Kart Fotoğrafı
                      <input
                        onChange={(e) => setDetailPhotoFile(e.target.files?.[0] ?? null)}
                        type="file"
                        accept="image/*"
                        className="text-sm"
                      />
                      <span className="text-xs text-foreground/50">
                        Yapay zeka ile oluşturmak için bir selfie/portre seçin.
                      </span>
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => handleSaveDetail(player)}
                        disabled={savingDetail || generatingAi}
                        className={`self-start ${primaryButton}`}
                      >
                        {savingDetail ? "Kaydediliyor..." : "Kaydet"}
                      </button>
                      <button
                        onClick={() => handleGenerateAiCard(player)}
                        disabled={generatingAi || savingDetail || !detailPhotoFile}
                        className={`self-start ${secondaryButton}`}
                      >
                        {generatingAi ? "Kart Oluşturuluyor..." : "Yapay Zeka ile Profesyonel Kart Oluştur"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
