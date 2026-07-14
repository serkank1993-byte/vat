"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { TeamAchievement, TeamRecord } from "@/lib/types";
import { dangerLink, input, secondaryButton } from "@/lib/ui";

export default function TeamRecordsPanel({ teamId }: { teamId: number }) {
  const [records, setRecords] = useState<TeamRecord[]>([]);
  const [achievements, setAchievements] = useState<TeamAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [recordTitle, setRecordTitle] = useState("");
  const [recordDetail, setRecordDetail] = useState("");
  const [achievementTitle, setAchievementTitle] = useState("");
  const [achievementYear, setAchievementYear] = useState("");

  async function loadData() {
    setLoading(true);
    const [recordsRes, achievementsRes] = await Promise.all([
      supabase.from("team_records").select("*").eq("team_id", teamId).order("created_at", { ascending: false }),
      supabase.from("team_achievements").select("*").eq("team_id", teamId).order("year", { ascending: false }),
    ]);
    if (recordsRes.error) setError(recordsRes.error.message);
    else setRecords(recordsRes.data ?? []);
    if (achievementsRes.error) setError(achievementsRes.error.message);
    else setAchievements(achievementsRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  async function handleAddRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!recordTitle.trim()) return;
    const { error } = await supabase
      .from("team_records")
      .insert({ team_id: teamId, title: recordTitle, detail: recordDetail || null });
    if (error) setError(error.message);
    else {
      setRecordTitle("");
      setRecordDetail("");
      loadData();
    }
  }

  async function handleDeleteRecord(id: number) {
    const { error } = await supabase.from("team_records").delete().eq("id", id);
    if (error) setError(error.message);
    else loadData();
  }

  async function handleAddAchievement(e: React.FormEvent) {
    e.preventDefault();
    if (!achievementTitle.trim()) return;
    const { error } = await supabase
      .from("team_achievements")
      .insert({ team_id: teamId, title: achievementTitle, year: achievementYear ? Number(achievementYear) : null });
    if (error) setError(error.message);
    else {
      setAchievementTitle("");
      setAchievementYear("");
      loadData();
    }
  }

  async function handleDeleteAchievement(id: number) {
    const { error } = await supabase.from("team_achievements").delete().eq("id", id);
    if (error) setError(error.message);
    else loadData();
  }

  return (
    <div className="flex flex-col gap-4 border-t border-border pt-4 mt-2">
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {loading ? (
        <p className="text-foreground/60 text-sm">Yükleniyor...</p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-foreground/80">Rekorlar</h3>
            <form onSubmit={handleAddRecord} className="flex flex-wrap gap-2">
              <input
                value={recordTitle}
                onChange={(e) => setRecordTitle(e.target.value)}
                placeholder="Başlık (ör. En Farklı Galibiyet)"
                className={`flex-1 min-w-[160px] text-sm ${input}`}
              />
              <input
                value={recordDetail}
                onChange={(e) => setRecordDetail(e.target.value)}
                placeholder="Detay (ör. 8-0)"
                className={`w-32 text-sm ${input}`}
              />
              <button type="submit" className={secondaryButton}>
                Ekle
              </button>
            </form>
            {records.length === 0 ? (
              <p className="text-foreground/50 text-xs">Henüz rekor eklenmedi.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {records.map((r) => (
                  <li key={r.id} className="flex items-center justify-between text-sm">
                    <span>
                      <span className="font-medium">{r.title}</span>
                      {r.detail && <span className="text-foreground/50"> · {r.detail}</span>}
                    </span>
                    <button onClick={() => handleDeleteRecord(r.id)} className={dangerLink}>
                      Sil
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-foreground/80">Geçmiş Başarılar</h3>
            <form onSubmit={handleAddAchievement} className="flex flex-wrap gap-2">
              <input
                value={achievementTitle}
                onChange={(e) => setAchievementTitle(e.target.value)}
                placeholder="Başlık (ör. İlçe Ligi Şampiyonu)"
                className={`flex-1 min-w-[160px] text-sm ${input}`}
              />
              <input
                value={achievementYear}
                onChange={(e) => setAchievementYear(e.target.value)}
                placeholder="Yıl"
                type="number"
                className={`w-24 text-sm ${input}`}
              />
              <button type="submit" className={secondaryButton}>
                Ekle
              </button>
            </form>
            {achievements.length === 0 ? (
              <p className="text-foreground/50 text-xs">Henüz başarı eklenmedi.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {achievements.map((a) => (
                  <li key={a.id} className="flex items-center justify-between text-sm">
                    <span>
                      {a.year && <span className="text-foreground/50">{a.year} · </span>}
                      <span className="font-medium">{a.title}</span>
                    </span>
                    <button onClick={() => handleDeleteAchievement(a.id)} className={dangerLink}>
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
