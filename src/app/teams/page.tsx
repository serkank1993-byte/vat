"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import type { Player, Team } from "@/lib/types";
import { card, dangerLink, input, primaryButton, secondaryButton } from "@/lib/ui";
import TeamRecordsPanel from "@/app/components/TeamRecordsPanel";
import { uploadImage } from "@/lib/storage";
import PageHeading from "@/app/components/PageHeading";
import EmptyState from "@/app/components/EmptyState";
import { ShieldIcon } from "@/lib/icons";

export default function TeamsPage() {
  const { session } = useSession();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [myPlayer, setMyPlayer] = useState<Player | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const [name, setName] = useState("");
  const [foundedDate, setFoundedDate] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [secondaryColor, setSecondaryColor] = useState("");
  const [jerseyFile, setJerseyFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFoundedDate, setEditFoundedDate] = useState("");
  const [editPrimaryColor, setEditPrimaryColor] = useState("");
  const [editSecondaryColor, setEditSecondaryColor] = useState("");
  const [editJerseyFile, setEditJerseyFile] = useState<File | null>(null);
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);

  const [expandedId, setExpandedId] = useState<number | null>(null);

  async function loadRole() {
    setRoleLoading(true);
    const { data: adminData } = await supabase.rpc("is_admin");
    setIsAdmin(Boolean(adminData));

    if (session) {
      const { data: playerRow } = await supabase
        .from("players")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();
      setMyPlayer(playerRow ?? null);
    } else {
      setMyPlayer(null);
    }
    setRoleLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRole();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function loadTeams(admin: boolean, teamId: number | null) {
    setLoading(true);
    let query = supabase.from("teams").select("*").order("created_at", { ascending: false });
    if (!admin) {
      if (teamId == null) {
        setTeams([]);
        setLoading(false);
        return;
      }
      query = query.eq("id", teamId);
    }
    const { data, error } = await query;
    if (error) setError(error.message);
    else setTeams(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (roleLoading) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTeams(isAdmin, myPlayer?.team_id ?? null);
  }, [roleLoading, isAdmin, myPlayer]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const { data, error } = await supabase
      .from("teams")
      .insert({
        name,
        founded_date: foundedDate || null,
        primary_color: primaryColor || null,
        secondary_color: secondaryColor || null,
      })
      .select()
      .single();
    if (error) {
      setError(error.message);
      return;
    }
    if (jerseyFile && data) {
      const url = await uploadImage("team-jerseys", data.id, jerseyFile);
      if (url) await supabase.from("teams").update({ jersey_image_url: url }).eq("id", data.id);
    }
    if (logoFile && data) {
      const url = await uploadImage("team-logos", data.id, logoFile);
      if (url) await supabase.from("teams").update({ logo_url: url }).eq("id", data.id);
    }
    setName("");
    setFoundedDate("");
    setPrimaryColor("");
    setSecondaryColor("");
    setJerseyFile(null);
    setLogoFile(null);
    loadTeams(isAdmin, myPlayer?.team_id ?? null);
  }

  async function handleDelete(id: number) {
    const { error } = await supabase.from("teams").delete().eq("id", id);
    if (error) setError(error.message);
    else loadTeams(isAdmin, myPlayer?.team_id ?? null);
  }

  function startEdit(team: Team) {
    setEditingId(team.id);
    setEditFoundedDate(team.founded_date ?? "");
    setEditPrimaryColor(team.primary_color ?? "");
    setEditSecondaryColor(team.secondary_color ?? "");
    setEditJerseyFile(null);
    setEditLogoFile(null);
  }

  async function handleSaveEdit(team: Team) {
    const { error } = await supabase
      .from("teams")
      .update({
        founded_date: editFoundedDate || null,
        primary_color: editPrimaryColor || null,
        secondary_color: editSecondaryColor || null,
      })
      .eq("id", team.id);
    if (error) {
      setError(error.message);
      return;
    }
    if (editJerseyFile) {
      const url = await uploadImage("team-jerseys", team.id, editJerseyFile);
      if (url) await supabase.from("teams").update({ jersey_image_url: url }).eq("id", team.id);
    }
    if (editLogoFile) {
      const url = await uploadImage("team-logos", team.id, editLogoFile);
      if (url) await supabase.from("teams").update({ logo_url: url }).eq("id", team.id);
    }
    setEditingId(null);
    loadTeams(isAdmin, myPlayer?.team_id ?? null);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading icon={ShieldIcon} title="Takımlar" />

      {isAdmin && (
      <form onSubmit={handleAdd} className={`${card} flex flex-col gap-3 max-w-xl`}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Takım adı"
          className={input}
        />
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-foreground/70">
            Kuruluş Tarihi
            <input
              value={foundedDate}
              onChange={(e) => setFoundedDate(e.target.value)}
              type="date"
              className={input}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground/70">
            Ana Renk
            <input
              value={primaryColor || "#059669"}
              onChange={(e) => setPrimaryColor(e.target.value)}
              type="color"
              className="h-9 w-12 rounded-md border border-border p-1"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground/70">
            İkinci Renk
            <input
              value={secondaryColor || "#ffffff"}
              onChange={(e) => setSecondaryColor(e.target.value)}
              type="color"
              className="h-9 w-12 rounded-md border border-border p-1"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1 text-sm text-foreground/70">
            Logo Görseli
            <input
              onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
              type="file"
              accept="image/*"
              className="text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-foreground/70">
            Forma Görseli
            <input
              onChange={(e) => setJerseyFile(e.target.files?.[0] ?? null)}
              type="file"
              accept="image/*"
              className="text-sm"
            />
          </label>
        </div>
        <button type="submit" className={`self-start ${primaryButton}`}>
          Ekle
        </button>
      </form>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {loading || roleLoading ? (
        <p className="text-foreground/60">Yükleniyor...</p>
      ) : teams.length === 0 ? (
        <EmptyState
          icon={ShieldIcon}
          message={isAdmin ? "Henüz takım yok." : "Henüz bir takıma bağlı değilsin."}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {teams.map((team) => (
            <div key={team.id} className={`${card} flex flex-col gap-3`}>
              {editingId === team.id ? (
                <div className="flex flex-col gap-3">
                  <span className="font-medium">{team.name}</span>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-foreground/70">
                      Kuruluş Tarihi
                      <input
                        value={editFoundedDate}
                        onChange={(e) => setEditFoundedDate(e.target.value)}
                        type="date"
                        className={input}
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm text-foreground/70">
                      Ana Renk
                      <input
                        value={editPrimaryColor || "#059669"}
                        onChange={(e) => setEditPrimaryColor(e.target.value)}
                        type="color"
                        className="h-9 w-12 rounded-md border border-border p-1"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm text-foreground/70">
                      İkinci Renk
                      <input
                        value={editSecondaryColor || "#ffffff"}
                        onChange={(e) => setEditSecondaryColor(e.target.value)}
                        type="color"
                        className="h-9 w-12 rounded-md border border-border p-1"
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex flex-col gap-1 text-sm text-foreground/70">
                      Logo Görseli
                      <input
                        onChange={(e) => setEditLogoFile(e.target.files?.[0] ?? null)}
                        type="file"
                        accept="image/*"
                        className="text-sm"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm text-foreground/70">
                      Forma Görseli
                      <input
                        onChange={(e) => setEditJerseyFile(e.target.files?.[0] ?? null)}
                        type="file"
                        accept="image/*"
                        className="text-sm"
                      />
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => handleSaveEdit(team)} className={primaryButton}>
                      Kaydet
                    </button>
                    <button onClick={() => setEditingId(null)} className={secondaryButton}>
                      İptal
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {team.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={team.logo_url}
                        alt={`${team.name} logosu`}
                        className="h-12 w-12 rounded-full object-cover border border-border shrink-0"
                      />
                    ) : (
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent font-semibold">
                        {team.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    {team.jersey_image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={team.jersey_image_url}
                        alt={`${team.name} forması`}
                        className="h-14 w-14 rounded-md object-cover border border-border"
                      />
                    )}
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{team.name}</span>
                      <div className="flex items-center gap-2">
                        {team.primary_color && (
                          <span
                            className="h-4 w-4 rounded-full border border-border"
                            style={{ backgroundColor: team.primary_color }}
                            title="Ana renk"
                          />
                        )}
                        {team.secondary_color && (
                          <span
                            className="h-4 w-4 rounded-full border border-border"
                            style={{ backgroundColor: team.secondary_color }}
                            title="İkinci renk"
                          />
                        )}
                        {team.founded_date && (
                          <span className="text-xs text-foreground/50">
                            Kuruluş: {new Date(team.founded_date).toLocaleDateString("tr-TR")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {isAdmin && (
                      <div className="flex items-center gap-3">
                        <button onClick={() => startEdit(team)} className="text-sm text-accent hover:underline">
                          Düzenle
                        </button>
                        <button onClick={() => handleDelete(team.id)} className={dangerLink}>
                          Sil
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => setExpandedId(expandedId === team.id ? null : team.id)}
                      className="text-xs text-foreground/60 hover:underline"
                    >
                      {expandedId === team.id ? "Rekorlar & Başarıları Gizle" : "Rekorlar & Başarılar"}
                    </button>
                  </div>
                </div>
              )}

              {expandedId === team.id && editingId !== team.id && <TeamRecordsPanel teamId={team.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
