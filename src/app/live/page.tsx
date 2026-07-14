"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Match, MatchEvent, Player, Team } from "@/lib/types";
import { EVENT_TYPES, ZONES, formatClock } from "@/lib/match-tracking";
import { card, chip, dangerLink, input, primaryButton, secondaryButton, sectionTitle } from "@/lib/ui";
import PageHeading from "@/app/components/PageHeading";
import { ActivityIcon } from "@/lib/icons";

export default function LivePage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [matchId, setMatchId] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [running, setRunning] = useState(false);

  async function loadBaseData() {
    setLoading(true);
    const [teamsRes, playersRes, matchesRes] = await Promise.all([
      supabase.from("teams").select("*"),
      supabase.from("players").select("*"),
      supabase.from("matches").select("*").order("match_date", { ascending: false }),
    ]);
    if (teamsRes.data) setTeams(teamsRes.data);
    if (playersRes.data) setPlayers(playersRes.data);
    if (matchesRes.error) setError(matchesRes.error.message);
    else setMatches(matchesRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBaseData();
  }, []);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [running]);

  async function loadEvents(forMatchId: string) {
    if (!forMatchId) {
      setEvents([]);
      return;
    }
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("match_id", Number(forMatchId))
      .order("minute", { ascending: false })
      .order("second", { ascending: false });
    if (error) setError(error.message);
    else setEvents(data ?? []);
  }

  function handleSelectMatch(id: string) {
    setMatchId(id);
    setSelectedPlayerId("");
    setSelectedZone(null);
    setElapsedSeconds(0);
    setRunning(false);
    loadEvents(id);
  }

  const playersForSelectedMatch = useMemo(() => {
    const match = matches.find((m) => m.id === Number(matchId));
    if (!match) return [];
    return players.filter((p) => p.team_id === match.team_id);
  }, [matchId, matches, players]);

  function teamName(id: number | null) {
    return teams.find((t) => t.id === id)?.name ?? "—";
  }

  const selectedMatch = matches.find((m) => m.id === Number(matchId));

  function logEvent(eventType: string) {
    if (!matchId || !selectedPlayerId) return;
    const minute = Math.floor(elapsedSeconds / 60);
    const second = elapsedSeconds % 60;
    // eslint-disable-next-line react-hooks/purity -- runs in a click handler, not during render
    const tempId = -Date.now();
    const optimisticEvent: MatchEvent = {
      id: tempId,
      match_id: Number(matchId),
      player_id: Number(selectedPlayerId),
      event_type: eventType,
      minute,
      second,
      description: null,
      zone: selectedZone,
      created_at: new Date().toISOString(),
    };
    // Show the tap instantly; reconcile with the server in the background
    // so a slow connection never makes live entry feel like it dropped.
    setEvents((prev) => [optimisticEvent, ...prev]);

    supabase
      .from("events")
      .insert({
        match_id: Number(matchId),
        player_id: Number(selectedPlayerId),
        event_type: eventType,
        minute,
        second,
        zone: selectedZone,
      })
      .select()
      .single()
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
          setEvents((prev) => prev.filter((e) => e.id !== tempId));
        } else if (data) {
          setEvents((prev) => prev.map((e) => (e.id === tempId ? data : e)));
        }
      });
  }

  function handleUndoLast() {
    const last = events[0];
    if (!last) return;
    setEvents((prev) => prev.slice(1));
    if (last.id > 0) {
      supabase
        .from("events")
        .delete()
        .eq("id", last.id)
        .then(({ error }) => {
          if (error) setError(error.message);
        });
    }
  }

  function handleDeleteEvent(id: number) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    if (id > 0) {
      supabase
        .from("events")
        .delete()
        .eq("id", id)
        .then(({ error }) => {
          if (error) setError(error.message);
        });
    }
  }

  function playerLabel(id: number | null) {
    const player = players.find((p) => p.id === id);
    if (!player) return "—";
    return `#${player.jersey_number} ${player.name}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading icon={ActivityIcon} title="Canlı Maç Takibi" />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {loading && <p className="text-foreground/60">Yükleniyor...</p>}

      <select
        value={matchId}
        onChange={(e) => handleSelectMatch(e.target.value)}
        className={`self-start ${input}`}
      >
        <option value="">Maç seç</option>
        {matches.map((m) => (
          <option key={m.id} value={m.id}>
            {teamName(m.team_id)} - {m.opponent_name} ({new Date(m.match_date).toLocaleDateString("tr-TR")})
          </option>
        ))}
      </select>

      {selectedMatch && (
        <>
          <div className={`${card} flex items-center gap-4`}>
            <span className="text-3xl font-mono tabular-nums text-accent">{formatClock(elapsedSeconds)}</span>
            <button onClick={() => setRunning((r) => !r)} className={primaryButton}>
              {running ? "Duraklat" : "Başlat"}
            </button>
            <button
              onClick={() => {
                setRunning(false);
                setElapsedSeconds(0);
              }}
              className={secondaryButton}
            >
              Sıfırla
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className={sectionTitle}>Aktif Oyuncu</h2>
            <div className="flex flex-wrap gap-2">
              {playersForSelectedMatch.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlayerId(String(p.id))}
                  className={chip(selectedPlayerId === String(p.id))}
                >
                  #{p.jersey_number} {p.name}
                </button>
              ))}
              {playersForSelectedMatch.length === 0 && (
                <p className="text-foreground/60 text-sm">Bu maçın takımı için oyuncu bulunamadı.</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className={sectionTitle}>
              Saha Bölgesi {selectedZone && "— " + ZONES.find((z) => z.value === selectedZone)?.label}
            </h2>
            <div className="grid grid-cols-3 grid-rows-3 gap-1 w-56 aspect-[3/4] rounded-md overflow-hidden border border-border">
              {ZONES.map((z) => (
                <button
                  key={z.value}
                  onClick={() => setSelectedZone(selectedZone === z.value ? null : z.value)}
                  className={`flex items-center justify-center text-center text-[10px] leading-tight p-1 transition-colors ${
                    selectedZone === z.value
                      ? "bg-accent text-accent-foreground"
                      : "bg-accent/10 hover:bg-accent/20"
                  }`}
                >
                  {z.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className={sectionTitle}>Olay Kaydet</h2>
              <button onClick={handleUndoLast} disabled={events.length === 0} className={dangerLink}>
                Son işlemi geri al
              </button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {EVENT_TYPES.map((et) => (
                <button
                  key={et.key}
                  onClick={() => logEvent(et.key)}
                  disabled={!selectedPlayerId}
                  className={`${secondaryButton} py-4`}
                >
                  {et.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className={sectionTitle}>Olay Akışı</h2>
            {events.length === 0 ? (
              <p className="text-foreground/60 text-sm">Henüz olay kaydedilmedi.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {events.map((ev) => (
                  <li
                    key={ev.id}
                    className={`${card} flex items-center justify-between py-3 text-sm ${
                      ev.id < 0 ? "opacity-50" : ""
                    }`}
                  >
                    <span>
                      <span className="font-mono text-accent">
                        {ev.minute}:{(ev.second ?? 0).toString().padStart(2, "0")}
                      </span>{" "}
                      — {playerLabel(ev.player_id)} —{" "}
                      {EVENT_TYPES.find((et) => et.key === ev.event_type)?.label ?? ev.event_type}
                      {ev.zone && ` — ${ZONES.find((z) => z.value === ev.zone)?.label}`}
                    </span>
                    <button onClick={() => handleDeleteEvent(ev.id)} className={dangerLink}>
                      Sil
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
