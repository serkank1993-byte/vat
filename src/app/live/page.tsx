"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Match, MatchEvent, Player, Team } from "@/lib/types";

const EVENT_TYPES: { key: string; label: string }[] = [
  { key: "goal", label: "Goal" },
  { key: "assist", label: "Assist" },
  { key: "shot", label: "Shot" },
  { key: "shot_on_target", label: "Shot on Target" },
  { key: "pass", label: "Pass" },
  { key: "successful_pass", label: "Successful Pass" },
  { key: "dribble", label: "Dribble" },
  { key: "tackle", label: "Tackle" },
  { key: "foul", label: "Foul" },
  { key: "yellow_card", label: "Yellow Card" },
  { key: "red_card", label: "Red Card" },
];

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function LivePage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [matchId, setMatchId] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
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

  async function logEvent(eventType: string) {
    if (!matchId || !selectedPlayerId) return;
    const minute = Math.floor(elapsedSeconds / 60);
    const second = elapsedSeconds % 60;
    const { data, error } = await supabase
      .from("events")
      .insert({
        match_id: Number(matchId),
        player_id: Number(selectedPlayerId),
        event_type: eventType,
        minute,
        second,
      })
      .select()
      .single();
    if (error) setError(error.message);
    else if (data) setEvents((prev) => [data, ...prev]);
  }

  async function handleDeleteEvent(id: number) {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) setError(error.message);
    else setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  function playerLabel(id: number | null) {
    const player = players.find((p) => p.id === id);
    if (!player) return "—";
    return `#${player.jersey_number} ${player.name}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Live Match Tracking</h1>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {loading && <p>Loading...</p>}

      <select
        value={matchId}
        onChange={(e) => handleSelectMatch(e.target.value)}
        className="self-start rounded-md border border-black/10 dark:border-white/20 px-3 py-2 bg-transparent"
      >
        <option value="">Select a match</option>
        {matches.map((m) => (
          <option key={m.id} value={m.id}>
            {teamName(m.team_id)} vs {m.opponent_name} ({new Date(m.match_date).toLocaleDateString()})
          </option>
        ))}
      </select>

      {selectedMatch && (
        <>
          <div className="flex items-center gap-4 rounded-md border border-black/10 dark:border-white/10 px-4 py-3">
            <span className="text-3xl font-mono tabular-nums">{formatClock(elapsedSeconds)}</span>
            <button
              onClick={() => setRunning((r) => !r)}
              className="rounded-md bg-foreground text-background px-4 py-2 font-medium"
            >
              {running ? "Pause" : "Start"}
            </button>
            <button
              onClick={() => {
                setRunning(false);
                setElapsedSeconds(0);
              }}
              className="rounded-md border border-black/10 dark:border-white/20 px-4 py-2"
            >
              Reset
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-black/70 dark:text-white/70">Active player</h2>
            <div className="flex flex-wrap gap-2">
              {playersForSelectedMatch.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlayerId(String(p.id))}
                  className={`rounded-md border px-3 py-2 text-sm ${
                    selectedPlayerId === String(p.id)
                      ? "bg-foreground text-background border-transparent"
                      : "border-black/10 dark:border-white/20"
                  }`}
                >
                  #{p.jersey_number} {p.name}
                </button>
              ))}
              {playersForSelectedMatch.length === 0 && (
                <p className="text-black/60 dark:text-white/60 text-sm">
                  No players found for this match&apos;s team.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-black/70 dark:text-white/70">Log event</h2>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map((et) => (
                <button
                  key={et.key}
                  onClick={() => logEvent(et.key)}
                  disabled={!selectedPlayerId}
                  className="rounded-md border border-black/10 dark:border-white/20 px-3 py-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black/5 dark:hover:bg-white/10"
                >
                  {et.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-black/70 dark:text-white/70">Event feed</h2>
            {events.length === 0 ? (
              <p className="text-black/60 dark:text-white/60 text-sm">No events logged yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {events.map((ev) => (
                  <li
                    key={ev.id}
                    className="flex items-center justify-between rounded-md border border-black/10 dark:border-white/10 px-4 py-2 text-sm"
                  >
                    <span>
                      <span className="font-mono">
                        {ev.minute}:{(ev.second ?? 0).toString().padStart(2, "0")}
                      </span>{" "}
                      — {playerLabel(ev.player_id)} —{" "}
                      {EVENT_TYPES.find((et) => et.key === ev.event_type)?.label ?? ev.event_type}
                    </span>
                    <button
                      onClick={() => handleDeleteEvent(ev.id)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Delete
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
