"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import type { Match, MatchAttendance, MatchTacticPosition, Player, TacticsContext, Team } from "@/lib/types";
import { DEFAULT_FORMATION, FORMATIONS, FORMATION_NAMES } from "@/lib/formations";
import { card, chip, dangerLink, input, primaryButton, secondaryButton, sectionTitle } from "@/lib/ui";
import PitchDiagram from "@/app/components/PitchDiagram";
import PageHeading from "@/app/components/PageHeading";
import EmptyState from "@/app/components/EmptyState";
import { CalendarIcon, MaximizeIcon, MinimizeIcon, TacticsBoardIcon } from "@/lib/icons";

const TABS: { key: TacticsContext; label: string }[] = [
  { key: "starting", label: "İlk 11 & Diziliş" },
  { key: "set_piece_attack", label: "Duran Top - Hücum" },
  { key: "set_piece_defense", label: "Duran Top - Savunma" },
];

type Marker = { playerId: number; x: number; y: number };
type StartingSlot = { playerId: number | null; x: number; y: number };

export default function TacticsPage() {
  const { session } = useSession();
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matchId, setMatchId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [myPlayer, setMyPlayer] = useState<Player | null>(null);

  const [roster, setRoster] = useState<Player[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [tab, setTab] = useState<TacticsContext>("starting");
  const [formation, setFormation] = useState(DEFAULT_FORMATION);
  const [startingSlots, setStartingSlots] = useState<StartingSlot[]>(
    FORMATIONS[DEFAULT_FORMATION].map((s) => ({ playerId: null, x: s.x, y: s.y })),
  );
  const [setPieceMarkers, setSetPieceMarkers] = useState<Record<"set_piece_attack" | "set_piece_defense", Marker[]>>({
    set_piece_attack: [],
    set_piece_defense: [],
  });
  const [attendance, setAttendance] = useState<MatchAttendance[]>([]);
  const [onlyAttending, setOnlyAttending] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function handleFullscreenChange() {
      if (!document.fullscreenElement) setIsFullscreen(false);
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  function toggleFullscreen() {
    const next = !isFullscreen;
    setIsFullscreen(next);

    // Native Fullscreen API is a nice-to-have (hides browser chrome) but is
    // unreliable/unsupported on many phones & tablets (notably iOS Safari for
    // non-video elements). The maximized layout above works regardless, so we
    // only best-effort call it and never let a rejection/missing API break the toggle.
    const el = panelRef.current as
      | (HTMLDivElement & {
          webkitRequestFullscreen?: () => Promise<void> | void;
        })
      | null;
    try {
      if (next) {
        const request = el?.requestFullscreen?.bind(el) ?? el?.webkitRequestFullscreen?.bind(el);
        const result = request?.();
        if (result instanceof Promise) result.catch(() => {});
      } else if (document.fullscreenElement) {
        const exit = document.exitFullscreen?.bind(document);
        const result = exit?.();
        if (result instanceof Promise) result.catch(() => {});
      }
    } catch {
      // ignore — CSS-driven maximized layout already applied above
    }
  }

  async function loadBase() {
    setLoading(true);
    const [matchesRes, teamsRes] = await Promise.all([
      supabase.from("matches").select("*").order("match_date", { ascending: false }),
      supabase.from("teams").select("*").order("name"),
    ]);
    if (matchesRes.error) setError(matchesRes.error.message);
    else setMatches(matchesRes.data ?? []);
    if (teamsRes.data) setTeams(teamsRes.data);

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
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function loadMatchData(id: number) {
    setMatchLoading(true);
    setError(null);
    setSaved(false);
    setSelectedPlayerId(null);
    const match = matches.find((m) => m.id === id);
    const teamId = match?.team_id ?? null;

    const [playersRes, formationRes, tacticsRes, attendanceRes] = await Promise.all([
      teamId
        ? supabase.from("players").select("*").eq("team_id", teamId).order("jersey_number")
        : Promise.resolve({ data: [] as Player[], error: null }),
      supabase.from("match_formations").select("*").eq("match_id", id).maybeSingle(),
      supabase.from("match_tactics").select("*").eq("match_id", id),
      supabase.from("match_attendance").select("*").eq("match_id", id),
    ]);
    if (playersRes.error) setError(playersRes.error.message);
    setRoster(playersRes.data ?? []);
    setAttendance(attendanceRes.data ?? []);

    const loadedFormation = formationRes.data?.formation ?? DEFAULT_FORMATION;
    setFormation(loadedFormation);

    const allTactics: MatchTacticPosition[] = tacticsRes.data ?? [];
    const presetSlots = FORMATIONS[loadedFormation] ?? FORMATIONS[DEFAULT_FORMATION];
    const startingRows = allTactics
      .filter((r) => r.context === "starting")
      .sort((a, b) => a.player_id - b.player_id);
    const newStartingSlots: StartingSlot[] = presetSlots.map((preset, i) => {
      const row = startingRows[i];
      return row
        ? { playerId: row.player_id, x: Number(row.pos_x), y: Number(row.pos_y) }
        : { playerId: null, x: preset.x, y: preset.y };
    });
    setStartingSlots(newStartingSlots);

    setSetPieceMarkers({
      set_piece_attack: allTactics
        .filter((r) => r.context === "set_piece_attack")
        .map((r) => ({ playerId: r.player_id, x: Number(r.pos_x), y: Number(r.pos_y) })),
      set_piece_defense: allTactics
        .filter((r) => r.context === "set_piece_defense")
        .map((r) => ({ playerId: r.player_id, x: Number(r.pos_x), y: Number(r.pos_y) })),
    });

    setMatchLoading(false);
  }

  useEffect(() => {
    if (matchId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadMatchData(Number(matchId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  const selectedMatch = matches.find((m) => m.id === Number(matchId)) ?? null;
  const canEdit =
    isAdmin || (myPlayer?.role === "captain" && selectedMatch != null && myPlayer.team_id === selectedMatch.team_id);

  function teamName(id: number | null) {
    return teams.find((t) => t.id === id)?.name ?? "—";
  }

  function playerLabel(id: number | null) {
    const p = roster.find((pl) => pl.id === id);
    return p ? `#${p.jersey_number} ${p.name}` : "—";
  }

  function isAttending(playerId: number) {
    return attendance.some((a) => a.player_id === playerId && a.status === "geliyor");
  }

  function handleFormationChange(name: string) {
    setFormation(name);
    const presetSlots = FORMATIONS[name];
    setStartingSlots((prev) => presetSlots.map((preset, i) => ({ playerId: prev[i]?.playerId ?? null, ...preset })));
    setSaved(false);
  }

  function handleAssignSlot(slotIndex: number, playerId: number | null) {
    setStartingSlots((prev) => {
      const next = prev.map((slot) => ({ ...slot }));
      if (playerId != null) {
        for (const slot of next) {
          if (slot.playerId === playerId) slot.playerId = null;
        }
      }
      next[slotIndex].playerId = playerId;
      return next;
    });
    setSaved(false);
  }

  function handleSlotDrag(slotIndex: number, x: number, y: number) {
    setStartingSlots((prev) => {
      const next = [...prev];
      next[slotIndex] = { ...next[slotIndex], x, y };
      return next;
    });
    setSaved(false);
  }

  function handleSlotPointerDown(slotIndex: number, e: React.PointerEvent<HTMLDivElement>) {
    if (!canEdit || startingSlots[slotIndex].playerId == null) return;
    e.preventDefault();
    e.stopPropagation();
    const pitchEl = (e.currentTarget as HTMLElement).closest("[data-pitch]") as HTMLElement | null;
    if (!pitchEl) return;
    const rect = pitchEl.getBoundingClientRect();

    function onMove(moveEvent: PointerEvent) {
      const x = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      const y = 100 - ((moveEvent.clientY - rect.top) / rect.height) * 100;
      handleSlotDrag(slotIndex, Math.min(100, Math.max(0, x)), Math.min(100, Math.max(0, y)));
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function handlePitchClick(x: number, y: number) {
    if (tab === "starting" || !canEdit) return;
    if (selectedPlayerId == null) return;
    const context = tab as "set_piece_attack" | "set_piece_defense";
    setSetPieceMarkers((prev) => {
      const others = prev[context].filter((m) => m.playerId !== selectedPlayerId);
      return { ...prev, [context]: [...others, { playerId: selectedPlayerId, x, y }] };
    });
    setSaved(false);
  }

  function handleRemoveMarker(context: "set_piece_attack" | "set_piece_defense", playerId: number) {
    setSetPieceMarkers((prev) => ({ ...prev, [context]: prev[context].filter((m) => m.playerId !== playerId) }));
    if (selectedPlayerId === playerId) setSelectedPlayerId(null);
    setSaved(false);
  }

  async function handleSave() {
    if (!selectedMatch) return;
    setSaving(true);
    setError(null);

    if (tab === "starting") {
      const { error: formationError } = await supabase
        .from("match_formations")
        .upsert({ match_id: selectedMatch.id, formation, updated_at: new Date().toISOString() });
      if (formationError) {
        setError(formationError.message);
        setSaving(false);
        return;
      }
      const { error: deleteError } = await supabase
        .from("match_tactics")
        .delete()
        .eq("match_id", selectedMatch.id)
        .eq("context", "starting");
      if (deleteError) {
        setError(deleteError.message);
        setSaving(false);
        return;
      }
      const rows = startingSlots
        .map((slot) =>
          slot.playerId != null
            ? { match_id: selectedMatch.id, context: "starting", player_id: slot.playerId, pos_x: slot.x, pos_y: slot.y }
            : null,
        )
        .filter((r): r is NonNullable<typeof r> => r != null);
      if (rows.length > 0) {
        const { error: insertError } = await supabase.from("match_tactics").insert(rows);
        if (insertError) {
          setError(insertError.message);
          setSaving(false);
          return;
        }
      }
    } else {
      const context = tab;
      const { error: deleteError } = await supabase
        .from("match_tactics")
        .delete()
        .eq("match_id", selectedMatch.id)
        .eq("context", context);
      if (deleteError) {
        setError(deleteError.message);
        setSaving(false);
        return;
      }
      const rows = setPieceMarkers[context].map((m) => ({
        match_id: selectedMatch.id,
        context,
        player_id: m.playerId,
        pos_x: m.x,
        pos_y: m.y,
      }));
      if (rows.length > 0) {
        const { error: insertError } = await supabase.from("match_tactics").insert(rows);
        if (insertError) {
          setError(insertError.message);
          setSaving(false);
          return;
        }
      }
    }
    setSaving(false);
    setSaved(true);
  }

  const assignedPlayerIds = new Set(
    startingSlots.map((s) => s.playerId).filter((id): id is number => id != null),
  );
  const placedIds = new Set(
    tab !== "starting"
      ? setPieceMarkers[tab as "set_piece_attack" | "set_piece_defense"].map((m) => m.playerId)
      : [],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeading icon={TacticsBoardIcon} title="Taktik" />

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <select value={matchId} onChange={(e) => setMatchId(e.target.value)} className={`self-start ${input}`}>
        <option value="">Bir maç seçin</option>
        {matches.map((m) => (
          <option key={m.id} value={m.id}>
            {teamName(m.team_id)} - {m.opponent_name} ({new Date(m.match_date).toLocaleDateString("tr-TR")})
          </option>
        ))}
      </select>

      {loading ? (
        <p className="text-foreground/60">Yükleniyor...</p>
      ) : !matchId ? (
        <EmptyState icon={CalendarIcon} message="Taktik hazırlamak için önce bir maç seçin." />
      ) : matchLoading ? (
        <p className="text-foreground/60">Yükleniyor...</p>
      ) : (
        <div
          ref={panelRef}
          className={`flex flex-col gap-4 ${
            isFullscreen ? "fixed inset-0 z-50 overflow-y-auto bg-background p-4 sm:p-6" : ""
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {TABS.map((t) => (
                <button key={t.key} onClick={() => setTab(t.key)} className={chip(tab === t.key)}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-foreground/70">
                <input
                  type="checkbox"
                  checked={onlyAttending}
                  onChange={(e) => setOnlyAttending(e.target.checked)}
                  className="h-4 w-4 accent-accent"
                />
                Sadece &quot;Geliyorum&quot; diyenler
              </label>
              <button onClick={toggleFullscreen} className={secondaryButton}>
                {isFullscreen ? <MinimizeIcon className="h-4 w-4" /> : <MaximizeIcon className="h-4 w-4" />}
                {isFullscreen ? "Küçült" : "Tam Ekran"}
              </button>
            </div>
          </div>

          {!canEdit && (
            <p className="text-sm text-foreground/50">
              Bu maçın taktiğini yalnızca takımın kaptanı veya yönetici düzenleyebilir. Salt okunur görüntülüyorsunuz.
            </p>
          )}

          {tab === "starting" ? (
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex flex-col gap-3 w-full lg:w-80 shrink-0">
                <label className="flex flex-col gap-1 text-sm text-foreground/70">
                  Diziliş
                  <select
                    value={formation}
                    onChange={(e) => handleFormationChange(e.target.value)}
                    disabled={!canEdit}
                    className={input}
                  >
                    {FORMATION_NAMES.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className={`${card} flex flex-col gap-2 max-h-[28rem] overflow-y-auto`}>
                  <h2 className={sectionTitle}>Kadro Yerleşimi</h2>
                  {startingSlots.map((slot, i) => (
                    <label key={i} className="flex items-center gap-2 text-sm">
                      <span className="w-14 shrink-0 text-foreground/50">Slot {i + 1}</span>
                      <select
                        value={slot.playerId ?? ""}
                        onChange={(e) => handleAssignSlot(i, e.target.value ? Number(e.target.value) : null)}
                        disabled={!canEdit}
                        className={`flex-1 ${input}`}
                      >
                        <option value="">Boş</option>
                        {roster
                          .filter((p) => !assignedPlayerIds.has(p.id) || p.id === slot.playerId)
                          .filter((p) => !onlyAttending || p.id === slot.playerId || isAttending(p.id))
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              #{p.jersey_number} {p.name}
                            </option>
                          ))}
                      </select>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-foreground/50">
                  Bir oyuncuyu sahada sürükleyerek tam konumunu ayarlayabilirsiniz.
                </p>
              </div>
              <div className={`w-full mx-auto lg:mx-0 ${isFullscreen ? "max-w-2xl" : "max-w-md"}`}>
                <PitchDiagram>
                  {startingSlots.map((slot, i) => {
                    const player = slot.playerId != null ? roster.find((p) => p.id === slot.playerId) : null;
                    return (
                      <div
                        key={i}
                        onPointerDown={(e) => handleSlotPointerDown(i, e)}
                        className="absolute flex -translate-x-1/2 translate-y-1/2 flex-col items-center touch-none"
                        style={{ left: `${slot.x}%`, bottom: `${slot.y}%` }}
                      >
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/80 bg-black/40 text-xs font-semibold text-white ${
                            player && canEdit ? "cursor-grab active:cursor-grabbing" : ""
                          }`}
                        >
                          {player ? player.jersey_number : "+"}
                        </div>
                        {player && (
                          <div className="mt-1 max-w-[72px] truncate rounded bg-black/60 px-1.5 py-0.5 text-center text-[10px] text-white">
                            {player.name}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </PitchDiagram>
              </div>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex flex-col gap-2 w-full lg:w-72 shrink-0">
                <h2 className={sectionTitle}>Kadro</h2>
                <p className="text-xs text-foreground/50">
                  Bir oyuncuya tıklayın, sonra saha üzerinde duracağı yere tıklayın.
                </p>
                <div className={`${card} flex flex-col gap-1.5 max-h-[28rem] overflow-y-auto`}>
                  {roster
                    .filter((p) => !onlyAttending || isAttending(p.id) || placedIds.has(p.id))
                    .map((p) => {
                      const placed = setPieceMarkers[tab as "set_piece_attack" | "set_piece_defense"].some(
                        (m) => m.playerId === p.id,
                      );
                      return (
                        <div key={p.id} className="flex items-center gap-2">
                          <button
                            onClick={() => canEdit && setSelectedPlayerId(p.id)}
                            disabled={!canEdit}
                            className={`flex-1 text-left rounded-md px-2 py-1.5 text-sm transition ${
                              selectedPlayerId === p.id
                                ? "bg-accent text-accent-foreground"
                                : placed
                                  ? "bg-foreground/10"
                                  : "hover:bg-foreground/5"
                            }`}
                          >
                            #{p.jersey_number} {p.name}
                          </button>
                          {placed && canEdit && (
                            <button
                              onClick={() =>
                                handleRemoveMarker(tab as "set_piece_attack" | "set_piece_defense", p.id)
                              }
                              className={dangerLink}
                            >
                              Kaldır
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
              <div className={`w-full mx-auto lg:mx-0 ${isFullscreen ? "max-w-2xl" : "max-w-md"}`}>
                <PitchDiagram onClick={canEdit ? handlePitchClick : undefined}>
                  {setPieceMarkers[tab as "set_piece_attack" | "set_piece_defense"].map((m) => {
                    const player = roster.find((p) => p.id === m.playerId);
                    return (
                      <div
                        key={m.playerId}
                        className="absolute flex -translate-x-1/2 translate-y-1/2 flex-col items-center"
                        style={{ left: `${m.x}%`, bottom: `${m.y}%` }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canEdit) setSelectedPlayerId(m.playerId);
                          }}
                          className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold text-white transition ${
                            selectedPlayerId === m.playerId
                              ? "border-yellow-300 bg-accent"
                              : "border-white/80 bg-black/50"
                          }`}
                        >
                          {player?.jersey_number}
                        </button>
                        {player && (
                          <div className="mt-1 max-w-[72px] truncate rounded bg-black/60 px-1.5 py-0.5 text-center text-[10px] text-white">
                            {player.name}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </PitchDiagram>
              </div>
            </div>
          )}

          {canEdit && (
            <div className="flex items-center gap-3">
              <button onClick={handleSave} disabled={saving} className={primaryButton}>
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
              {saved && <span className="text-sm text-accent">Kaydedildi.</span>}
              {selectedPlayerId != null && tab !== "starting" && (
                <span className="text-sm text-foreground/50">
                  Seçili: {playerLabel(selectedPlayerId)} — sahaya tıklayarak yerleştirin.
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
