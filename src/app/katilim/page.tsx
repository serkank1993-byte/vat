"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import type { AttendanceStatus, Match, MatchAttendance, MatchVote, Player, Team } from "@/lib/types";
import { card, chip, input, secondaryButton, sectionTitle } from "@/lib/ui";
import PageHeading from "@/app/components/PageHeading";
import EmptyState from "@/app/components/EmptyState";
import { CheckCircleIcon, MinusCircleIcon, ShieldIcon, UserIcon, XCircleIcon } from "@/lib/icons";

const STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: "geliyor", label: "Geliyorum" },
  { value: "gelmiyor", label: "Gelemiyorum" },
  { value: "belirsiz", label: "Belirsiz" },
];

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  geliyor: "Geliyor",
  gelmiyor: "Gelmiyor",
  belirsiz: "Belirsiz",
};

export default function AttendancePage() {
  const { session, loading: sessionLoading } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [ownPlayerId, setOwnPlayerId] = useState<number | null>(null);

  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [attendance, setAttendance] = useState<MatchAttendance[]>([]);
  const [votes, setVotes] = useState<MatchVote[]>([]);
  const [matchId, setMatchId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadBaseData(userId: string) {
    setLoading(true);
    const [adminRes, playersRes, teamsRes, matchesRes] = await Promise.all([
      supabase.rpc("is_admin"),
      supabase.from("players").select("*"),
      supabase.from("teams").select("*"),
      supabase.from("matches").select("*").order("match_date", { ascending: false }),
    ]);
    setIsAdmin(Boolean(adminRes.data));
    if (playersRes.error) setError(playersRes.error.message);
    else {
      setPlayers(playersRes.data ?? []);
      setOwnPlayerId(playersRes.data?.find((p) => p.user_id === userId)?.id ?? null);
    }
    if (teamsRes.data) setTeams(teamsRes.data);
    if (matchesRes.error) setError(matchesRes.error.message);
    else setMatches(matchesRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (session) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadBaseData(session.user.id);
    } else if (!sessionLoading) {
      setLoading(false);
    }
  }, [session, sessionLoading]);

  async function loadAttendance(forMatchId: string) {
    if (!forMatchId) {
      setAttendance([]);
      setVotes([]);
      return;
    }
    const [attRes, votesRes] = await Promise.all([
      supabase.from("match_attendance").select("*").eq("match_id", Number(forMatchId)),
      supabase.from("match_votes").select("*").eq("match_id", Number(forMatchId)),
    ]);
    if (attRes.error) setError(attRes.error.message);
    else setAttendance(attRes.data ?? []);
    if (votesRes.error) setError(votesRes.error.message);
    else setVotes(votesRes.data ?? []);
  }

  function handleSelectMatch(id: string) {
    setMatchId(id);
    loadAttendance(id);
  }

  const selectedMatch = matches.find((m) => m.id === Number(matchId));

  const rosterForSelectedMatch = useMemo(() => {
    if (!selectedMatch) return [];
    return players.filter((p) => p.team_id === selectedMatch.team_id);
  }, [selectedMatch, players]);

  function statusFor(playerId: number): AttendanceStatus {
    return attendance.find((a) => a.player_id === playerId)?.status ?? "belirsiz";
  }

  function canEdit(playerId: number) {
    return isAdmin || playerId === ownPlayerId;
  }

  const myPlayer = players.find((p) => p.id === ownPlayerId) ?? null;

  function canManageTeam(tid: number | null) {
    if (isAdmin) return true;
    return myPlayer?.role === "captain" && tid != null && myPlayer.team_id === tid;
  }

  function hasResponded(playerId: number) {
    return attendance.some((a) => a.player_id === playerId);
  }

  const nonResponders = useMemo(
    () => rosterForSelectedMatch.filter((p) => !hasResponded(p.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rosterForSelectedMatch, attendance],
  );

  const [copiedReminder, setCopiedReminder] = useState(false);

  async function handleCopyReminder() {
    if (!selectedMatch || nonResponders.length === 0) return;
    const dateLabel = new Date(selectedMatch.match_date).toLocaleDateString("tr-TR");
    const names = nonResponders.map((p) => `#${p.jersey_number} ${p.name}`).join(", ");
    const message = `${teamName(selectedMatch.team_id)} - ${selectedMatch.opponent_name} (${dateLabel}) maçı için henüz katılım bildirmeyenler: ${names}`;
    await navigator.clipboard.writeText(message);
    setCopiedReminder(true);
    setTimeout(() => setCopiedReminder(false), 2000);
  }

  const myVote = votes.find((v) => v.voter_player_id === ownPlayerId) ?? null;

  // Maçın adamı: her oyuncunun aldığı oy sayısı, çoktan aza sıralı.
  const voteTally = useMemo(() => {
    const counts = new Map<number, number>();
    for (const v of votes) counts.set(v.voted_player_id, (counts.get(v.voted_player_id) ?? 0) + 1);
    return rosterForSelectedMatch
      .map((p) => ({ player: p, count: counts.get(p.id) ?? 0 }))
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [votes, rosterForSelectedMatch]);

  const topVotes = voteTally[0]?.count ?? 0;

  async function handleVote(votedPlayerId: number) {
    if (!selectedMatch || ownPlayerId == null) return;
    // İyimser güncelleme
    setVotes((prev) => {
      const rest = prev.filter((v) => v.voter_player_id !== ownPlayerId);
      return [
        ...rest,
        {
          id: myVote?.id ?? -Date.now(),
          match_id: selectedMatch.id,
          voter_player_id: ownPlayerId,
          voted_player_id: votedPlayerId,
          created_at: new Date().toISOString(),
        },
      ];
    });
    const { error } = await supabase
      .from("match_votes")
      .upsert(
        { match_id: selectedMatch.id, voter_player_id: ownPlayerId, voted_player_id: votedPlayerId },
        { onConflict: "match_id,voter_player_id" },
      );
    if (error) {
      setError(error.message);
      loadAttendance(matchId);
    }
  }

  async function setStatus(playerId: number, status: AttendanceStatus) {
    const existing = attendance.find((a) => a.player_id === playerId);
    setAttendance((prev) => {
      const rest = prev.filter((a) => a.player_id !== playerId);
      return [
        ...rest,
        {
          id: existing?.id ?? -Date.now(),
          match_id: Number(matchId),
          player_id: playerId,
          status,
          responded_at: new Date().toISOString(),
          created_at: existing?.created_at ?? new Date().toISOString(),
        },
      ];
    });

    const { error } = await supabase
      .from("match_attendance")
      .upsert(
        {
          match_id: Number(matchId),
          player_id: playerId,
          status,
          responded_at: new Date().toISOString(),
        },
        { onConflict: "match_id,player_id" },
      );
    if (error) {
      setError(error.message);
      loadAttendance(matchId);
    }
  }

  function teamName(id: number | null) {
    return teams.find((t) => t.id === id)?.name ?? "—";
  }

  const counts = useMemo(() => {
    const result = { geliyor: 0, gelmiyor: 0, belirsiz: 0 };
    for (const p of rosterForSelectedMatch) {
      result[statusFor(p.id)]++;
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterForSelectedMatch, attendance]);

  if (sessionLoading || loading) return <p className="text-foreground/60">Yükleniyor...</p>;

  if (!session) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeading icon={CheckCircleIcon} title="Katılım" />
        <p className="text-foreground/70">
          Bu sayfayı görmek için giriş yapmalısın.{" "}
          <Link href="/giris" className="text-accent hover:underline">
            Giriş yap
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading icon={CheckCircleIcon} title="Katılım" />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <select value={matchId} onChange={(e) => handleSelectMatch(e.target.value)} className={`self-start ${input}`}>
        <option value="">Maç seç</option>
        {matches.map((m) => (
          <option key={m.id} value={m.id}>
            {teamName(m.team_id)} - {m.opponent_name} ({new Date(m.match_date).toLocaleDateString("tr-TR")})
          </option>
        ))}
      </select>

      {selectedMatch && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className={`${card} flex items-center gap-3`}>
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                <CheckCircleIcon className="h-4 w-4" />
              </span>
              <div>
                <div className="text-xl font-semibold leading-none">{counts.geliyor}</div>
                <div className="text-xs text-foreground/50 mt-1">Geliyor</div>
              </div>
            </div>
            <div className={`${card} flex items-center gap-3`}>
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/15 text-red-600 dark:text-red-400">
                <XCircleIcon className="h-4 w-4" />
              </span>
              <div>
                <div className="text-xl font-semibold leading-none">{counts.gelmiyor}</div>
                <div className="text-xs text-foreground/50 mt-1">Gelmiyor</div>
              </div>
            </div>
            <div className={`${card} flex items-center gap-3`}>
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground/10 text-foreground/60">
                <MinusCircleIcon className="h-4 w-4" />
              </span>
              <div>
                <div className="text-xl font-semibold leading-none">{counts.belirsiz}</div>
                <div className="text-xs text-foreground/50 mt-1">Belirsiz</div>
              </div>
            </div>
          </div>

          {canManageTeam(selectedMatch.team_id) && nonResponders.length > 0 && (
            <div className={`${card} flex flex-col gap-2`}>
              <h2 className={sectionTitle}>Henüz Yanıt Vermeyenler ({nonResponders.length})</h2>
              <div className="flex flex-wrap gap-2">
                {nonResponders.map((p) => (
                  <span
                    key={p.id}
                    className="rounded-full bg-foreground/10 px-3 py-1 text-sm text-foreground/70"
                  >
                    #{p.jersey_number} {p.name}
                  </span>
                ))}
              </div>
              <button onClick={handleCopyReminder} className={`self-start ${secondaryButton}`}>
                {copiedReminder ? "Kopyalandı" : "Hatırlatma Metnini Kopyala"}
              </button>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <h2 className={sectionTitle}>Kadro</h2>
            {rosterForSelectedMatch.length === 0 ? (
              <EmptyState icon={UserIcon} message="Bu maçın takımı için oyuncu bulunamadı." />
            ) : (
              <ul className="flex flex-col gap-2">
                {rosterForSelectedMatch.map((p) => {
                  const status = statusFor(p.id);
                  const editable = canEdit(p.id);
                  return (
                    <li key={p.id} className={`${card} flex items-center justify-between py-3`}>
                      <span className="font-medium">
                        #{p.jersey_number} {p.name}
                      </span>
                      {editable ? (
                        <div className="flex gap-2">
                          {STATUS_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => setStatus(p.id, opt.value)}
                              className={`${chip(status === opt.value)} py-1.5 px-3 text-sm`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span
                          className={`text-sm font-medium ${
                            status === "geliyor"
                              ? "text-accent"
                              : status === "gelmiyor"
                                ? "text-red-600 dark:text-red-400"
                                : "text-foreground/50"
                          }`}
                        >
                          {STATUS_LABELS[status]}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <h2 className={sectionTitle}>Maçın Adamı</h2>
            {ownPlayerId != null && myPlayer?.team_id === selectedMatch.team_id ? (
              <div className={`${card} flex flex-col gap-3`}>
                <p className="text-sm text-foreground/60">
                  Bu maçta en beğendiğin takım arkadaşını seç.
                  {myVote && (
                    <>
                      {" "}
                      Oyun:{" "}
                      <span className="font-medium text-accent">
                        {rosterForSelectedMatch.find((p) => p.id === myVote.voted_player_id)?.name ?? "—"}
                      </span>
                    </>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  {rosterForSelectedMatch
                    .filter((p) => p.id !== ownPlayerId)
                    .map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleVote(p.id)}
                        className={`${chip(myVote?.voted_player_id === p.id)} py-1.5 px-3 text-sm`}
                      >
                        #{p.jersey_number} {p.name}
                      </button>
                    ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-foreground/50">
                Oy verebilmek için bu takımın oyuncusu olarak giriş yapmalısın.
              </p>
            )}

            {voteTally.length > 0 && (
              <div className={`${card} flex flex-col gap-2`}>
                <h3 className="text-sm font-semibold text-foreground/70">Oy Durumu</h3>
                <ul className="flex flex-col gap-2">
                  {voteTally.map(({ player, count }) => (
                    <li key={player.id} className="flex items-center gap-3">
                      {count === topVotes && (
                        <ShieldIcon className="h-4 w-4 shrink-0 text-accent" />
                      )}
                      <span className={`flex-1 text-sm ${count === topVotes ? "font-semibold" : ""}`}>
                        #{player.jersey_number} {player.name}
                      </span>
                      <span className="text-sm tabular-nums text-foreground/60">{count} oy</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
