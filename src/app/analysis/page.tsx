"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Match, MatchEvent, Player, Team } from "@/lib/types";
import { EVENT_TYPES, ZONES } from "@/lib/match-tracking";
import { extractYouTubeId, extractYouTubeStart, loadYouTubeIframeApi, type YTPlayer } from "@/lib/youtube";
import { buildMatchSummarySvg, shareOrDownloadPng, svgToPngBlob, type SummaryLine } from "@/lib/lineupImage";
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
  const [kickoffSeconds, setKickoffSeconds] = useState(0);
  const [kickoffSaved, setKickoffSaved] = useState(false);
  const [sharingSummary, setSharingSummary] = useState(false);

  const ytPlayerRef = useRef<YTPlayer | null>(null);
  const kickoffRef = useRef(0);
  useEffect(() => {
    kickoffRef.current = kickoffSeconds;
  }, [kickoffSeconds]);

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
    setKickoffSeconds(match?.video_kickoff_seconds ?? 0);
    setKickoffSaved(false);
    loadEvents(id);
  }

  async function handleSaveVideoUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!matchId || !videoUrlInput.trim()) return;
    const trimmed = videoUrlInput.trim();
    if (!extractYouTubeId(trimmed)) {
      setError("Bu geçerli bir YouTube linkine benzemiyor.");
      return;
    }
    // Linkte t= varsa maç başlangıcı önerisi olarak al.
    const suggestedStart = extractYouTubeStart(trimmed);
    const update: { video_url: string; video_kickoff_seconds?: number } = { video_url: trimmed };
    if (suggestedStart != null && kickoffSeconds === 0) update.video_kickoff_seconds = suggestedStart;
    const { error } = await supabase.from("matches").update(update).eq("id", Number(matchId));
    if (error) setError(error.message);
    else {
      if (update.video_kickoff_seconds != null) setKickoffSeconds(update.video_kickoff_seconds);
      setMatches((prev) =>
        prev.map((m) =>
          m.id === Number(matchId)
            ? { ...m, video_url: trimmed, ...(update.video_kickoff_seconds != null ? { video_kickoff_seconds: update.video_kickoff_seconds } : {}) }
            : m,
        ),
      );
    }
  }

  async function handleMarkKickoff() {
    if (!matchId) return;
    const t = Math.floor(ytPlayerRef.current?.getCurrentTime() ?? 0);
    setKickoffSeconds(t);
    const { error } = await supabase
      .from("matches")
      .update({ video_kickoff_seconds: t })
      .eq("id", Number(matchId));
    if (error) setError(error.message);
    else {
      setMatches((prev) => prev.map((m) => (m.id === Number(matchId) ? { ...m, video_kickoff_seconds: t } : m)));
      setKickoffSaved(true);
      setTimeout(() => setKickoffSaved(false), 2000);
    }
  }

  useEffect(() => {
    if (!videoId) return;
    let cancelled = false;
    loadYouTubeIframeApi().then(() => {
      if (cancelled || !window.YT) return;
      ytPlayerRef.current = new window.YT.Player(PLAYER_ELEMENT_ID, {
        videoId,
        playerVars: { start: Math.floor(kickoffRef.current) },
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
    // Maç başlangıcına göre göreli süre (uzun yayınlarda maç dakikası).
    const matchSeconds = Math.max(0, currentTime - kickoffRef.current);
    const minute = Math.floor(matchSeconds / 60);
    const second = Math.floor(matchSeconds % 60);
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
    ytPlayerRef.current?.seekTo(kickoffRef.current + minute * 60 + (second ?? 0), true);
    ytPlayerRef.current?.playVideo();
  }

  function formatHms(totalSeconds: number) {
    const s = Math.floor(totalSeconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const mm = m.toString().padStart(2, "0");
    const ss = sec.toString().padStart(2, "0");
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  }

  // Klavye kısayolları: 1-9 tuşları olay türlerini kaydeder.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (!selectedPlayerId || !playerReady) return;
      const idx = Number(e.key) - 1;
      if (Number.isInteger(idx) && idx >= 0 && idx < EVENT_TYPES.length) {
        logEvent(EVENT_TYPES[idx].key);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlayerId, playerReady, matchId, selectedZone]);

  // Maç özeti için önemli anlar (gol, asist, kart, isabetli şut).
  const highlightKeys = ["goal", "assist", "shot_on_target", "yellow_card", "red_card"];
  const summaryLines: SummaryLine[] = useMemo(() => {
    return events
      .filter((e) => highlightKeys.includes(e.event_type))
      .slice()
      .sort((a, b) => a.minute - b.minute || (a.second ?? 0) - (b.second ?? 0))
      .map((e) => ({
        minute: e.minute,
        label: EVENT_TYPES.find((et) => et.key === e.event_type)?.label ?? e.event_type,
        detail: playerLabel(e.player_id),
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, players]);

  async function handleShareSummary() {
    if (!selectedMatch) return;
    setSharingSummary(true);
    setError(null);
    try {
      const { svg, width, height } = buildMatchSummarySvg({
        teamName: teamName(selectedMatch.team_id),
        opponentName: selectedMatch.opponent_name,
        date: new Date(selectedMatch.match_date).toLocaleDateString("tr-TR"),
        scoreFor: selectedMatch.score_for,
        scoreAgainst: selectedMatch.score_against,
        lines: summaryLines,
      });
      const blob = await svgToPngBlob(svg, width, height);
      await shareOrDownloadPng(blob, "mac-ozeti.png");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Özet görseli oluşturulamadı.");
    }
    setSharingSummary(false);
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

            <div className={`${card} mt-3 flex flex-col gap-2`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-foreground/70">
                  Maç başlangıcı:{" "}
                  <span className="font-mono font-medium text-foreground">{formatHms(kickoffSeconds)}</span>
                </span>
                <button
                  onClick={() => ytPlayerRef.current?.seekTo(kickoffSeconds, true)}
                  disabled={!playerReady}
                  className={`${secondaryButton} py-1.5 px-3 text-sm`}
                >
                  Başlangıca git
                </button>
              </div>
              <button onClick={handleMarkKickoff} disabled={!playerReady} className={primaryButton}>
                {kickoffSaved ? "Kaydedildi ✓" : "Şu anı maç başlangıcı yap"}
              </button>
              <p className="text-xs text-foreground/50">
                Videoyu ilk vuruş anına getirip bu düğmeye bas. Böylece tüm olaylar maç dakikası olarak
                kaydedilir ve uzun yayınlarda doğru ana atlar.
              </p>
            </div>
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
                {EVENT_TYPES.map((et, i) => (
                  <button
                    key={et.key}
                    onClick={() => logEvent(et.key)}
                    disabled={!selectedPlayerId || !playerReady}
                    className={`${secondaryButton} relative py-3 px-1 text-sm`}
                  >
                    {i < 9 && (
                      <span className="absolute top-1 left-1.5 text-[10px] font-mono text-foreground/40">
                        {i + 1}
                      </span>
                    )}
                    {et.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-foreground/50">
                İpucu: Bir oyuncu seçiliyken klavyeden <span className="font-mono">1–9</span> tuşlarıyla hızlıca
                olay ekleyebilirsin.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h2 className={sectionTitle}>Maç Özeti</h2>
                <button
                  onClick={handleShareSummary}
                  disabled={sharingSummary}
                  className="text-sm text-accent hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {sharingSummary ? "Hazırlanıyor..." : "Görsel Paylaş"}
                </button>
              </div>
              {summaryLines.length === 0 ? (
                <p className="text-foreground/60 text-sm">Önemli an (gol, asist, kart) kaydedilince burada özetlenir.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {summaryLines.map((l, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span className="font-mono font-semibold text-accent w-9 shrink-0">{l.minute}&apos;</span>
                      <span className="font-medium">{l.label}</span>
                      <span className="text-foreground/50">— {l.detail}</span>
                    </li>
                  ))}
                </ul>
              )}
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
