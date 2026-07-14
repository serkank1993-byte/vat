"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Match, MatchEvent, Player, Team } from "@/lib/types";
import { EVENT_TYPES, ZONES } from "@/lib/match-tracking";
import { extractYouTubeId, loadYouTubeIframeApi, type YTPlayer } from "@/lib/youtube";
import { card, chip, dangerLink, input, primaryButton, secondaryButton, sectionTitle } from "@/lib/ui";
import PageHeading from "@/app/components/PageHeading";
import { PlayCircleIcon } from "@/lib/icons";

const PLAYER_ELEMENT_ID = "vat-youtube-player";

export default function AnalysisPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [matchId, setMatchId] = useState("");
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [playerReady, setPlayerReady] = useState(false);

  const ytPlayerRef = useRef<YTPlayer | null>(null);

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

  const selectedMatch = matches.find((m) => m.id === Number(matchId));
  const videoId = selectedMatch?.video_url ? extractYouTubeId(selectedMatch.video_url) : null;

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
    setPlayerReady(false);
    ytPlayerRef.current = null;
    const match = matches.find((m) => m.id === Number(id));
    setVideoUrlInput(match?.video_url ?? "");
    loadEvents(id);
  }

  async function handleSaveVideoUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!matchId || !videoUrlInput.trim()) return;
    if (!extractYouTubeId(videoUrlInput.trim())) {
      setError("Bu geçerli bir YouTube linkine benzemiyor.");
      return;
    }
    const { error } = await supabase
      .from("matches")
      .update({ video_url: videoUrlInput.trim() })
      .eq("id", Number(matchId));
    if (error) setError(error.message);
    else {
      setMatches((prev) =>
        prev.map((m) => (m.id === Number(matchId) ? { ...m, video_url: videoUrlInput.trim() } : m)),
      );
    }
  }

  useEffect(() => {
    if (!videoId) return;
    let cancelled = false;
    loadYouTubeIframeApi().then(() => {
      if (cancelled || !window.YT) return;
      ytPlayerRef.current = new window.YT.Player(PLAYER_ELEMENT_ID, {
        videoId,
        events: {
          onReady: (e) => {
            ytPlayerRef.current = e.target;
            setPlayerReady(true);
          },
        },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  const playersForSelectedMatch = useMemo(() => {
    if (!selectedMatch) return [];
    return players.filter((p) => p.team_id === selectedMatch.team_id);
  }, [selectedMatch, players]);

  function teamName(id: number | null) {
    return teams.find((t) => t.id === id)?.name ?? "—";
  }

  function playerLabel(id: number | null) {
    const player = players.find((p) => p.id === id);
    if (!player) return "—";
    return `#${player.jersey_number} ${player.name}`;
  }

  function logEvent(eventType: string) {
    if (!matchId || !selectedPlayerId) return;
    const currentTime = ytPlayerRef.current?.getCurrentTime() ?? 0;
    const minute = Math.floor(currentTime / 60);
    const second = Math.floor(currentTime % 60);
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

  function seekTo(minute: number, second: number | null) {
    ytPlayerRef.current?.seekTo(minute * 60 + (second ?? 0), true);
    ytPlayerRef.current?.playVideo();
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading icon={PlayCircleIcon} title="Video Analiz" />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
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

      {selectedMatch && !selectedMatch.video_url && (
        <form onSubmit={handleSaveVideoUrl} className="flex gap-2">
          <input
            value={videoUrlInput}
            onChange={(e) => setVideoUrlInput(e.target.value)}
            placeholder="Maçın YouTube linkini yapıştır"
            className={`flex-1 ${input}`}
          />
          <button type="submit" className={primaryButton}>
            Videoyu kaydet
          </button>
        </form>
      )}

      {selectedMatch && selectedMatch.video_url && !videoId && (
        <p className="text-sm text-red-600 dark:text-red-400">Kayıtlı video linki geçerli bir YouTube URL&apos;sine benzemiyor.</p>
      )}

      {selectedMatch && videoId && (
        <div className="flex flex-col md:flex-row md:items-start md:gap-6">
          <div className="flex-1 min-w-0 md:sticky md:top-20">
            <div className="aspect-video w-full rounded-md overflow-hidden bg-black">
              <div id={PLAYER_ELEMENT_ID} className="w-full h-full" />
            </div>
            {!playerReady && <p className="text-sm text-foreground/60 pt-2">Oynatıcı yükleniyor...</p>}
          </div>

          <div className="mt-6 md:mt-0 md:w-[320px] md:shrink-0 flex flex-col gap-4">
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
              <div className="grid grid-cols-3 grid-rows-3 gap-1 w-full max-w-56 aspect-[3/4] rounded-md overflow-hidden border border-border">
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
              <div className="grid grid-cols-3 gap-2">
                {EVENT_TYPES.map((et) => (
                  <button
                    key={et.key}
                    onClick={() => logEvent(et.key)}
                    disabled={!selectedPlayerId || !playerReady}
                    className={`${secondaryButton} py-3 px-1 text-sm`}
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
                <ul className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                  {events.map((ev) => (
                    <li
                      key={ev.id}
                      className={`${card} flex items-center justify-between py-3 text-sm ${
                        ev.id < 0 ? "opacity-50" : ""
                      }`}
                    >
                      <button onClick={() => seekTo(ev.minute, ev.second)} className="text-left hover:underline">
                        <span className="font-mono text-accent">
                          {ev.minute}:{(ev.second ?? 0).toString().padStart(2, "0")}
                        </span>{" "}
                        — {playerLabel(ev.player_id)} —{" "}
                        {EVENT_TYPES.find((et) => et.key === ev.event_type)?.label ?? ev.event_type}
                        {ev.zone && ` — ${ZONES.find((z) => z.value === ev.zone)?.label}`}
                      </button>
                      <button onClick={() => handleDeleteEvent(ev.id)} className={dangerLink}>
                        Sil
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
