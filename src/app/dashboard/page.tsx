"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Match, MatchEvent, Player, Team } from "@/lib/types";
import { card, input, sectionTitle } from "@/lib/ui";
import PageHeading from "@/app/components/PageHeading";
import { BarChartIcon } from "@/lib/icons";
import StatTile from "@/app/components/StatTile";

export default function DashboardPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [matchId, setMatchId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    const [teamsRes, playersRes, matchesRes, eventsRes] = await Promise.all([
      supabase.from("teams").select("*"),
      supabase.from("players").select("*"),
      supabase.from("matches").select("*").order("match_date", { ascending: false }),
      supabase.from("events").select("*"),
    ]);
    if (teamsRes.error) setError(teamsRes.error.message);
    else setTeams(teamsRes.data ?? []);
    if (playersRes.data) setPlayers(playersRes.data);
    if (matchesRes.data) setMatches(matchesRes.data);
    if (eventsRes.error) setError(eventsRes.error.message);
    else setEvents(eventsRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  function playerLabel(id: number | null) {
    const player = players.find((p) => p.id === id);
    if (!player) return "—";
    return `#${player.jersey_number} ${player.name}`;
  }

  function teamName(id: number | null) {
    return teams.find((t) => t.id === id)?.name ?? "—";
  }

  const filteredEvents = useMemo(() => {
    if (!matchId) return events;
    return events.filter((e) => e.match_id === Number(matchId));
  }, [events, matchId]);

  const filteredMatches = useMemo(() => {
    if (!matchId) return matches;
    return matches.filter((m) => m.id === Number(matchId));
  }, [matches, matchId]);

  const teamRecords = useMemo(() => {
    return teams.map((team) => {
      const teamMatches = filteredMatches.filter((m) => m.team_id === team.id);
      let wins = 0;
      let draws = 0;
      let losses = 0;
      let goalsFor = 0;
      let goalsAgainst = 0;
      for (const m of teamMatches) {
        const gf = m.score_for ?? 0;
        const ga = m.score_against ?? 0;
        goalsFor += gf;
        goalsAgainst += ga;
        if (m.status === "completed" || m.status === "finished") {
          if (gf > ga) wins++;
          else if (gf === ga) draws++;
          else losses++;
        }
      }
      return {
        team,
        played: teamMatches.length,
        wins,
        draws,
        losses,
        goalsFor,
        goalsAgainst,
      };
    });
  }, [teams, filteredMatches]);

  function countBy(eventType: string) {
    const totals = new Map<number, number>();
    for (const e of filteredEvents) {
      if (e.player_id == null || e.event_type !== eventType) continue;
      totals.set(e.player_id, (totals.get(e.player_id) ?? 0) + 1);
    }
    return totals;
  }

  const topScorers = useMemo(() => {
    const totals = countBy("goal");
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredEvents]);

  const topAssists = useMemo(() => {
    const totals = countBy("assist");
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredEvents]);

  const passAccuracy = useMemo(() => {
    const passes = countBy("pass");
    const successful = countBy("successful_pass");
    const playerIds = new Set([...passes.keys(), ...successful.keys()]);
    return [...playerIds]
      .map((id) => {
        const attempted = (passes.get(id) ?? 0) + (successful.get(id) ?? 0);
        const made = successful.get(id) ?? 0;
        return { playerId: id, attempted, accuracy: attempted > 0 ? (made / attempted) * 100 : 0 };
      })
      .filter((p) => p.attempted > 0)
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredEvents]);

  const shotAccuracy = useMemo(() => {
    const shots = countBy("shot");
    const onTarget = countBy("shot_on_target");
    const playerIds = new Set([...shots.keys(), ...onTarget.keys()]);
    return [...playerIds]
      .map((id) => {
        const attempted = (shots.get(id) ?? 0) + (onTarget.get(id) ?? 0);
        const made = onTarget.get(id) ?? 0;
        return { playerId: id, attempted, accuracy: attempted > 0 ? (made / attempted) * 100 : 0 };
      })
      .filter((p) => p.attempted > 0)
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredEvents]);

  const playerStatsTable = useMemo(() => {
    const goals = countBy("goal");
    const assists = countBy("assist");
    const shots = countBy("shot");
    const shotsOnTarget = countBy("shot_on_target");
    const passes = countBy("pass");
    const successfulPasses = countBy("successful_pass");
    const dribbles = countBy("dribble");
    const tackles = countBy("tackle");
    const fouls = countBy("foul");
    const yellowCards = countBy("yellow_card");
    const redCards = countBy("red_card");
    const matchesByPlayer = new Map<number, Set<number>>();
    for (const e of filteredEvents) {
      if (e.player_id == null || e.match_id == null) continue;
      const set = matchesByPlayer.get(e.player_id) ?? new Set<number>();
      set.add(e.match_id);
      matchesByPlayer.set(e.player_id, set);
    }

    return players
      .map((p) => ({
        player: p,
        matches: matchesByPlayer.get(p.id)?.size ?? 0,
        goals: goals.get(p.id) ?? 0,
        assists: assists.get(p.id) ?? 0,
        shots: (shots.get(p.id) ?? 0) + (shotsOnTarget.get(p.id) ?? 0),
        shotsOnTarget: shotsOnTarget.get(p.id) ?? 0,
        passes: (passes.get(p.id) ?? 0) + (successfulPasses.get(p.id) ?? 0),
        successfulPasses: successfulPasses.get(p.id) ?? 0,
        dribbles: dribbles.get(p.id) ?? 0,
        tackles: tackles.get(p.id) ?? 0,
        fouls: fouls.get(p.id) ?? 0,
        yellowCards: yellowCards.get(p.id) ?? 0,
        redCards: redCards.get(p.id) ?? 0,
      }))
      .sort((a, b) => b.goals - a.goals || b.assists - a.assists);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredEvents, players]);

  const totalGoals = useMemo(() => {
    return filteredEvents.filter((e) => e.event_type === "goal").length;
  }, [filteredEvents]);

  const topScorerLabel = useMemo(() => {
    if (topScorers.length === 0) return "—";
    const [id, value] = topScorers[0];
    return `${playerLabel(id)} (${value})`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topScorers, players]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeading icon={BarChartIcon} title="İstatistikler" />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {loading && <p className="text-foreground/60">Yükleniyor...</p>}
      <p className="text-sm text-foreground/60">
        Bu sayfa, Canlı Takip ve Video Analiz sayfalarında kaydedilen olaylardan otomatik hesaplanır.
      </p>

      <select value={matchId} onChange={(e) => setMatchId(e.target.value)} className={`self-start ${input}`}>
        <option value="">Tüm maçlar (kümüle)</option>
        {matches.map((m) => (
          <option key={m.id} value={m.id}>
            {teamName(m.team_id)} - {m.opponent_name} ({new Date(m.match_date).toLocaleDateString("tr-TR")})
          </option>
        ))}
      </select>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Toplam Maç" value={filteredMatches.length} />
        <StatTile label="Toplam Gol" value={totalGoals} />
        <StatTile label="Toplam Oyuncu" value={players.length} />
        <StatTile label="En Golcü" value={topScorerLabel} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className={sectionTitle}>Takım Karnesi</h2>
        {teamRecords.length === 0 ? (
          <p className="text-foreground/60 text-sm">Henüz takım yok.</p>
        ) : (
          <div className={`${card} overflow-x-auto`}>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left border-b border-border">
                  <th className="py-2 pr-4">Takım</th>
                  <th className="py-2 pr-4">O</th>
                  <th className="py-2 pr-4">G</th>
                  <th className="py-2 pr-4">B</th>
                  <th className="py-2 pr-4">M</th>
                  <th className="py-2 pr-4">AG</th>
                  <th className="py-2 pr-4">YG</th>
                  <th className="py-2 pr-4">Av</th>
                </tr>
              </thead>
              <tbody>
                {teamRecords.map((r) => (
                  <tr key={r.team.id} className="border-b border-border last:border-0">
                    <td className="py-2 pr-4 font-medium">{r.team.name}</td>
                    <td className="py-2 pr-4">{r.played}</td>
                    <td className="py-2 pr-4">{r.wins}</td>
                    <td className="py-2 pr-4">{r.draws}</td>
                    <td className="py-2 pr-4">{r.losses}</td>
                    <td className="py-2 pr-4">{r.goalsFor}</td>
                    <td className="py-2 pr-4">{r.goalsAgainst}</td>
                    <td className="py-2 pr-4">{r.goalsFor - r.goalsAgainst}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Leaderboard
          title="Gol Krallığı"
          empty="Henüz gol kaydedilmedi."
          rows={topScorers.map(([id, value]) => ({ label: playerLabel(id), value: String(value) }))}
        />
        <Leaderboard
          title="Asist Krallığı"
          empty="Henüz asist kaydedilmedi."
          rows={topAssists.map(([id, value]) => ({ label: playerLabel(id), value: String(value) }))}
        />
        <Leaderboard
          title="Pas İsabeti"
          empty="Henüz pas kaydedilmedi."
          rows={passAccuracy.map((p) => ({
            label: playerLabel(p.playerId),
            value: `%${p.accuracy.toFixed(0)}`,
            hint: `${p.attempted} pas`,
          }))}
        />
        <Leaderboard
          title="Şut İsabeti"
          empty="Henüz şut kaydedilmedi."
          rows={shotAccuracy.map((p) => ({
            label: playerLabel(p.playerId),
            value: `%${p.accuracy.toFixed(0)}`,
            hint: `${p.attempted} şut`,
          }))}
        />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className={sectionTitle}>Oyuncu İstatistikleri</h2>
        {playerStatsTable.length === 0 ? (
          <p className="text-foreground/60 text-sm">Henüz oyuncu yok.</p>
        ) : (
          <div className={`${card} overflow-x-auto`}>
            <table className="w-full text-sm border-collapse whitespace-nowrap">
              <thead>
                <tr className="text-left border-b border-border">
                  <th className="py-2 pr-4">Oyuncu</th>
                  <th className="py-2 pr-4">Maç</th>
                  <th className="py-2 pr-4">Gol</th>
                  <th className="py-2 pr-4">Asist</th>
                  <th className="py-2 pr-4">Şut (İY)</th>
                  <th className="py-2 pr-4">Pas (İY)</th>
                  <th className="py-2 pr-4">Çalım</th>
                  <th className="py-2 pr-4">Müdahale</th>
                  <th className="py-2 pr-4">Faul</th>
                  <th className="py-2 pr-4">Sarı</th>
                  <th className="py-2 pr-4">Kırmızı</th>
                </tr>
              </thead>
              <tbody>
                {playerStatsTable.map((row) => (
                  <tr key={row.player.id} className="border-b border-border last:border-0">
                    <td className="py-2 pr-4 font-medium">
                      #{row.player.jersey_number} {row.player.name}
                    </td>
                    <td className="py-2 pr-4">{row.matches}</td>
                    <td className="py-2 pr-4">{row.goals}</td>
                    <td className="py-2 pr-4">{row.assists}</td>
                    <td className="py-2 pr-4">
                      {row.shotsOnTarget}/{row.shots}
                    </td>
                    <td className="py-2 pr-4">
                      {row.successfulPasses}/{row.passes}
                    </td>
                    <td className="py-2 pr-4">{row.dribbles}</td>
                    <td className="py-2 pr-4">{row.tackles}</td>
                    <td className="py-2 pr-4">{row.fouls}</td>
                    <td className="py-2 pr-4">{row.yellowCards}</td>
                    <td className="py-2 pr-4">{row.redCards}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Leaderboard({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: { label: string; value: string; hint?: string }[];
  empty: string;
}) {
  return (
    <section className={`${card} flex flex-col gap-3`}>
      <h2 className={sectionTitle}>{title}</h2>
      {rows.length === 0 ? (
        <p className="text-foreground/60 text-sm">{empty}</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {rows.map((row, i) => (
            <li key={row.label + i} className="flex items-center gap-3 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent text-xs font-semibold">
                {i + 1}
              </span>
              <span className="flex-1">{row.label}</span>
              <span className="font-semibold">{row.value}</span>
              {row.hint && <span className="text-foreground/50 text-xs">{row.hint}</span>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
