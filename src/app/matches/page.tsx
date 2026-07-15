"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import type { Competition, Match, Player, Team } from "@/lib/types";
import { card, chip, dangerLink, input, primaryButton, secondaryButton, sectionTitle } from "@/lib/ui";
import PageHeading from "@/app/components/PageHeading";
import EmptyState from "@/app/components/EmptyState";
import MatchCalendar from "@/app/components/MatchCalendar";
import { CalendarIcon } from "@/lib/icons";

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Planlandı",
  completed: "Tamamlandı",
  finished: "Tamamlandı",
};

const DEFAULT_COMPETITION_COLOR = "#059669";

function toDatetimeLocalValue(dateStr: string) {
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function MatchesPage() {
  const { session } = useSession();
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [opponentName, setOpponentName] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [location, setLocation] = useState("");
  const [teamId, setTeamId] = useState("");
  const [competitionId, setCompetitionId] = useState("");
  const [newCompName, setNewCompName] = useState("");
  const [newCompColor, setNewCompColor] = useState(DEFAULT_COMPETITION_COLOR);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"takvim" | "liste">("takvim");
  const [competitionFilter, setCompetitionFilter] = useState<number | "all">("all");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [isAdmin, setIsAdmin] = useState(false);
  const [myPlayer, setMyPlayer] = useState<Player | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editOpponentName, setEditOpponentName] = useState("");
  const [editMatchDate, setEditMatchDate] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editCompetitionId, setEditCompetitionId] = useState("");
  const [editStatus, setEditStatus] = useState<"scheduled" | "completed">("scheduled");
  const [editScoreFor, setEditScoreFor] = useState("");
  const [editScoreAgainst, setEditScoreAgainst] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);

  async function loadData() {
    setLoading(true);
    const [matchesRes, teamsRes, competitionsRes] = await Promise.all([
      supabase.from("matches").select("*").order("match_date", { ascending: false }),
      supabase.from("teams").select("*").order("name"),
      supabase.from("competitions").select("*").order("name"),
    ]);
    if (matchesRes.error) setError(matchesRes.error.message);
    else setMatches(matchesRes.data ?? []);
    if (teamsRes.data) setTeams(teamsRes.data);
    if (competitionsRes.data) setCompetitions(competitionsRes.data);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

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

  function canManageTeam(tid: number | null) {
    if (isAdmin) return true;
    return myPlayer?.role === "captain" && tid != null && myPlayer.team_id === tid;
  }

  useEffect(() => {
    if (!roleLoading && !isAdmin && myPlayer?.role === "captain" && myPlayer.team_id != null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTeamId(String(myPlayer.team_id));
    }
  }, [roleLoading, isAdmin, myPlayer]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!opponentName.trim() || !matchDate) return;
    const { error } = await supabase.from("matches").insert({
      opponent_name: opponentName,
      match_date: matchDate,
      location: location || null,
      team_id: teamId ? Number(teamId) : null,
      competition_id: competitionId ? Number(competitionId) : null,
    });
    if (error) setError(error.message);
    else {
      setOpponentName("");
      setMatchDate("");
      setLocation("");
      setCompetitionId("");
      setTeamId(!isAdmin && myPlayer?.team_id != null ? String(myPlayer.team_id) : "");
      loadData();
    }
  }

  async function handleDelete(id: number) {
    const { error } = await supabase.from("matches").delete().eq("id", id);
    if (error) setError(error.message);
    else {
      if (selectedMatchId === id) setSelectedMatchId(null);
      loadData();
    }
  }

  function startEdit(match: Match) {
    setEditingId(match.id);
    setEditOpponentName(match.opponent_name);
    setEditMatchDate(toDatetimeLocalValue(match.match_date));
    setEditLocation(match.location ?? "");
    setEditCompetitionId(match.competition_id ? String(match.competition_id) : "");
    setEditStatus(match.status === "completed" || match.status === "finished" ? "completed" : "scheduled");
    setEditScoreFor(match.score_for != null ? String(match.score_for) : "");
    setEditScoreAgainst(match.score_against != null ? String(match.score_against) : "");
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleSaveEdit(match: Match) {
    if (!editOpponentName.trim() || !editMatchDate) return;
    setSavingEdit(true);
    const { error } = await supabase
      .from("matches")
      .update({
        opponent_name: editOpponentName,
        match_date: editMatchDate,
        location: editLocation || null,
        competition_id: editCompetitionId ? Number(editCompetitionId) : null,
        status: editStatus,
        score_for: editStatus === "completed" && editScoreFor !== "" ? Number(editScoreFor) : null,
        score_against: editStatus === "completed" && editScoreAgainst !== "" ? Number(editScoreAgainst) : null,
      })
      .eq("id", match.id);
    setSavingEdit(false);
    if (error) setError(error.message);
    else {
      setEditingId(null);
      loadData();
    }
  }

  async function handleAddCompetition(e: React.FormEvent) {
    e.preventDefault();
    if (!newCompName.trim() || !teamId) return;
    const { error } = await supabase.from("competitions").insert({
      team_id: Number(teamId),
      name: newCompName,
      color: newCompColor || null,
    });
    if (error) setError(error.message);
    else {
      setNewCompName("");
      setNewCompColor(DEFAULT_COMPETITION_COLOR);
      loadData();
    }
  }

  async function handleDeleteCompetition(id: number) {
    const { error } = await supabase.from("competitions").delete().eq("id", id);
    if (error) setError(error.message);
    else {
      if (competitionFilter === id) setCompetitionFilter("all");
      loadData();
    }
  }

  function teamName(id: number | null) {
    return teams.find((t) => t.id === id)?.name ?? "—";
  }

  function competition(id: number | null) {
    return competitions.find((c) => c.id === id) ?? null;
  }

  const filteredMatches =
    competitionFilter === "all" ? matches : matches.filter((m) => m.competition_id === competitionFilter);

  function renderMatch(match: Match) {
    if (editingId === match.id) {
      return (
        <div key={match.id} className={`${card} flex flex-col gap-2`}>
          <div className="flex flex-wrap gap-2">
            <input
              value={editOpponentName}
              onChange={(e) => setEditOpponentName(e.target.value)}
              placeholder="Rakip"
              className={`flex-1 min-w-[140px] ${input}`}
            />
            <input
              value={editMatchDate}
              onChange={(e) => setEditMatchDate(e.target.value)}
              type="datetime-local"
              className={input}
            />
            <input
              value={editLocation}
              onChange={(e) => setEditLocation(e.target.value)}
              placeholder="Konum"
              className={`w-32 ${input}`}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={editCompetitionId}
              onChange={(e) => setEditCompetitionId(e.target.value)}
              className={input}
            >
              <option value="">Lig yok</option>
              {competitions
                .filter((c) => c.team_id === match.team_id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as "scheduled" | "completed")}
              className={input}
            >
              <option value="scheduled">Planlandı</option>
              <option value="completed">Tamamlandı</option>
            </select>
            {editStatus === "completed" && (
              <>
                <input
                  value={editScoreFor}
                  onChange={(e) => setEditScoreFor(e.target.value)}
                  type="number"
                  placeholder="Gol (biz)"
                  className={`w-24 ${input}`}
                />
                <input
                  value={editScoreAgainst}
                  onChange={(e) => setEditScoreAgainst(e.target.value)}
                  type="number"
                  placeholder="Gol (rakip)"
                  className={`w-24 ${input}`}
                />
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSaveEdit(match)}
              disabled={savingEdit}
              className={`self-start ${primaryButton}`}
            >
              {savingEdit ? "Kaydediliyor..." : "Kaydet"}
            </button>
            <button onClick={cancelEdit} className={`self-start ${secondaryButton}`}>
              İptal
            </button>
          </div>
        </div>
      );
    }

    const isCompleted = (match.status ?? "scheduled") === "completed" || match.status === "finished";
    const comp = competition(match.competition_id);
    return (
      <div key={match.id} className={`${card} flex items-center justify-between gap-3`}>
        <div className="flex flex-col gap-1.5">
          <span className="font-medium">
            {teamName(match.team_id)} - {match.opponent_name}
            {match.score_for != null && match.score_against != null && (
              <span className="ml-2 text-foreground/60">
                ({match.score_for}-{match.score_against})
              </span>
            )}
          </span>
          <div className="flex flex-wrap items-center gap-2 text-sm text-foreground/50">
            <span>
              {new Date(match.match_date).toLocaleString("tr-TR")}
              {match.location ? ` · ${match.location}` : ""}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                isCompleted ? "bg-accent/15 text-accent" : "bg-foreground/10 text-foreground/60"
              }`}
            >
              {STATUS_LABELS[match.status ?? "scheduled"] ?? match.status}
            </span>
            {comp && (
              <span
                className="rounded-full px-2.5 py-1 text-xs font-semibold text-white"
                style={{ backgroundColor: comp.color ?? DEFAULT_COMPETITION_COLOR }}
              >
                {comp.name}
              </span>
            )}
          </div>
        </div>
        {canManageTeam(match.team_id) && (
          <div className="flex items-center gap-3 shrink-0">
            <button onClick={() => startEdit(match)} className="text-sm text-accent hover:underline">
              Düzenle
            </button>
            <button onClick={() => handleDelete(match.id)} className={dangerLink}>
              Sil
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading icon={CalendarIcon} title="Fikstür" />

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setView("takvim")} className={chip(view === "takvim")}>
          Takvim
        </button>
        <button onClick={() => setView("liste")} className={chip(view === "liste")}>
          Liste
        </button>
      </div>

      {!roleLoading && (isAdmin || myPlayer?.role === "captain") && (
        <>
          <form onSubmit={handleAdd} className={`${card} flex flex-wrap gap-2`}>
            {isAdmin ? (
              <select
                value={teamId}
                onChange={(e) => {
                  setTeamId(e.target.value);
                  setCompetitionId("");
                }}
                className={input}
              >
                <option value="">Takım</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className={`flex items-center px-3 text-sm text-foreground/60 ${input} border-transparent`}>
                {teamName(myPlayer?.team_id ?? null)}
              </span>
            )}
            <input
              value={opponentName}
              onChange={(e) => setOpponentName(e.target.value)}
              placeholder="Rakip"
              className={`flex-1 min-w-[140px] ${input}`}
            />
            <input
              value={matchDate}
              onChange={(e) => setMatchDate(e.target.value)}
              type="datetime-local"
              className={input}
            />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Konum"
              className={`w-32 ${input}`}
            />
            <select value={competitionId} onChange={(e) => setCompetitionId(e.target.value)} className={input}>
              <option value="">Lig yok</option>
              {competitions
                .filter((c) => teamId && c.team_id === Number(teamId))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
            <button type="submit" className={primaryButton}>
              Ekle
            </button>
          </form>

          <div className={`${card} flex flex-col gap-3`}>
            <h2 className={sectionTitle}>Ligler & Turnuvalar</h2>
            {!teamId ? (
              <p className="text-sm text-foreground/50">Lig eklemek için önce yukarıdan bir takım seçin.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {competitions
                    .filter((c) => c.team_id === Number(teamId))
                    .map((c) => (
                      <span
                        key={c.id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: c.color ?? DEFAULT_COMPETITION_COLOR }}
                        />
                        {c.name}
                        <button
                          onClick={() => handleDeleteCompetition(c.id)}
                          className="text-foreground/40 hover:text-red-500 transition-colors duration-300"
                          aria-label={`${c.name} sil`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  {competitions.filter((c) => c.team_id === Number(teamId)).length === 0 && (
                    <span className="text-sm text-foreground/50">Henüz lig/turnuva eklenmedi.</span>
                  )}
                </div>
                <form onSubmit={handleAddCompetition} className="flex flex-wrap gap-2">
                  <input
                    value={newCompName}
                    onChange={(e) => setNewCompName(e.target.value)}
                    placeholder="Lig/Turnuva adı"
                    className={`flex-1 min-w-[160px] ${input}`}
                  />
                  <input
                    value={newCompColor}
                    onChange={(e) => setNewCompColor(e.target.value)}
                    type="color"
                    className="h-9 w-12 rounded-md border border-border p-1"
                  />
                  <button type="submit" className={secondaryButton}>
                    Ekle
                  </button>
                </form>
              </>
            )}
          </div>
        </>
      )}

      {competitions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setCompetitionFilter("all")} className={chip(competitionFilter === "all")}>
            Tümü
          </button>
          {competitions.map((c) => (
            <button
              key={c.id}
              onClick={() => setCompetitionFilter(c.id)}
              className={chip(competitionFilter === c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {loading ? (
        <p className="text-foreground/60">Yükleniyor...</p>
      ) : matches.length === 0 ? (
        <EmptyState icon={CalendarIcon} message="Henüz maç yok." />
      ) : filteredMatches.length === 0 ? (
        <EmptyState icon={CalendarIcon} message="Bu lige/turnuvaya ait maç yok." />
      ) : view === "takvim" ? (
        <div className="flex flex-col gap-4">
          <MatchCalendar
            matches={filteredMatches}
            teams={teams}
            competitions={competitions}
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            onSelectMatch={setSelectedMatchId}
          />
          {selectedMatchId != null &&
            (() => {
              const selected = filteredMatches.find((m) => m.id === selectedMatchId);
              if (!selected) return null;
              return (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <h2 className={sectionTitle}>Maç Detayı</h2>
                    <button
                      onClick={() => setSelectedMatchId(null)}
                      className="text-sm text-foreground/50 hover:text-foreground transition-colors duration-300"
                    >
                      Kapat
                    </button>
                  </div>
                  {renderMatch(selected)}
                </div>
              );
            })()}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{filteredMatches.map((match) => renderMatch(match))}</div>
      )}
    </div>
  );
}
