"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Team } from "@/lib/types";
import { card, dangerLink, input, pageTitle, primaryButton } from "@/lib/ui";

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadTeams() {
    setLoading(true);
    const { data, error } = await supabase
      .from("teams")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setTeams(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTeams();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const { error } = await supabase.from("teams").insert({ name });
    if (error) setError(error.message);
    else {
      setName("");
      loadTeams();
    }
  }

  async function handleDelete(id: number) {
    const { error } = await supabase.from("teams").delete().eq("id", id);
    if (error) setError(error.message);
    else loadTeams();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className={pageTitle}>Takımlar</h1>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Takım adı"
          className={`flex-1 ${input}`}
        />
        <button type="submit" className={primaryButton}>
          Ekle
        </button>
      </form>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {loading ? (
        <p className="text-foreground/60">Yükleniyor...</p>
      ) : teams.length === 0 ? (
        <p className="text-foreground/60">Henüz takım yok.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {teams.map((team) => (
            <li key={team.id} className={`${card} flex items-center justify-between py-3`}>
              <span className="font-medium">{team.name}</span>
              <button onClick={() => handleDelete(team.id)} className={dangerLink}>
                Sil
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
