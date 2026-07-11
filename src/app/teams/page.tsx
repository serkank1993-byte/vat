"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Team } from "@/lib/types";

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
      <h1 className="text-2xl font-semibold">Teams</h1>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Team name"
          className="flex-1 rounded-md border border-black/10 dark:border-white/20 px-3 py-2 bg-transparent"
        />
        <button
          type="submit"
          className="rounded-md bg-foreground text-background px-4 py-2 font-medium"
        >
          Add
        </button>
      </form>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : teams.length === 0 ? (
        <p className="text-black/60 dark:text-white/60">No teams yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {teams.map((team) => (
            <li
              key={team.id}
              className="flex items-center justify-between rounded-md border border-black/10 dark:border-white/10 px-4 py-2"
            >
              <span>{team.name}</span>
              <button
                onClick={() => handleDelete(team.id)}
                className="text-sm text-red-600 hover:underline"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
