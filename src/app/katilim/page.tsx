"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import type { AttendanceStatus, Match, MatchAttendance, Player, Team } from "@/lib/types";
import { card, chip, input, pageTitle, sectionTitle } from "@/lib/ui";

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
      return;
    }
    const { data, error } = await supabase
      .from("match_attendance")
      .select("*")
      .eq("match_id", Number(forMatchId));
    if (error) setError(error.message);
    else setAttendance(data ?? []);
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
        <h1 className={pageTitle}>Katılım</h1>
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
      <h1 className={pageTitle}>Katılım</h1>
      {error && <p className="text-red-600 text-sm">{error}</p>}

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
          <div className={`${card} flex gap-6 text-sm`}>
            <span className="text-accent font-semibold">{counts.geliyor} Geliyor</span>
            <span className="text-red-600 font-semibold">{counts.gelmiyor} Gelmiyor</span>
            <span className="text-foreground/60 font-semibold">{counts.belirsiz} Belirsiz</span>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className={sectionTitle}>Kadro</h2>
            {rosterForSelectedMatch.length === 0 ? (
              <p className="text-foreground/60 text-sm">Bu maçın takımı için oyuncu bulunamadı.</p>
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
                                ? "text-red-600"
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
        </>
      )}
    </div>
  );
}
