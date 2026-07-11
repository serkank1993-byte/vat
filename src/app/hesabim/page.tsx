"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import type { MatchStat, Player } from "@/lib/types";
import { card, dangerLink, input, pageTitle, primaryButton, secondaryButton, sectionTitle } from "@/lib/ui";

const PENDING_TOKEN_KEY = "vat_pending_invite_token";

export default function AccountPage() {
  const { session, loading: sessionLoading } = useSession();
  const [player, setPlayer] = useState<Player | null>(null);
  const [stats, setStats] = useState<MatchStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [position, setPosition] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function loadPlayer(userId: string) {
    setLoading(true);

    const pendingToken = localStorage.getItem(PENDING_TOKEN_KEY);
    if (pendingToken) {
      await supabase.rpc("claim_player_invite", { p_token: pendingToken });
      localStorage.removeItem(PENDING_TOKEN_KEY);
    }

    const { data, error } = await supabase.from("players").select("*").eq("user_id", userId).maybeSingle();
    if (error) setError(error.message);
    else if (data) {
      setPlayer(data);
      setName(data.name);
      setJerseyNumber(String(data.jersey_number));
      setPosition(data.position ?? "");
      const statsRes = await supabase
        .from("match_stats")
        .select("*")
        .eq("player_id", data.id)
        .order("created_at", { ascending: false });
      if (statsRes.error) setError(statsRes.error.message);
      else setStats(statsRes.data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (session) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadPlayer(session.user.id);
    } else if (!sessionLoading) {
      setLoading(false);
    }
  }, [session, sessionLoading]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!player) return;
    setSaving(true);
    setSaved(false);
    const { error } = await supabase
      .from("players")
      .update({
        name,
        jersey_number: Number(jerseyNumber),
        position: position || null,
      })
      .eq("id", player.id);
    setSaving(false);
    if (error) setError(error.message);
    else {
      setSaved(true);
      setPlayer({ ...player, name, jersey_number: Number(jerseyNumber), position: position || null });
    }
  }

  const totals = stats.reduce(
    (acc, s) => ({
      goals: acc.goals + (s.goals ?? 0),
      assists: acc.assists + (s.assists ?? 0),
      passes: acc.passes + (s.passes ?? 0),
      successfulPasses: acc.successfulPasses + (s.successful_passes ?? 0),
      shots: acc.shots + (s.shots ?? 0),
      shotsOnTarget: acc.shotsOnTarget + (s.shots_on_target ?? 0),
      tackles: acc.tackles + (s.tackles ?? 0),
      fouls: acc.fouls + (s.fouls ?? 0),
    }),
    { goals: 0, assists: 0, passes: 0, successfulPasses: 0, shots: 0, shotsOnTarget: 0, tackles: 0, fouls: 0 },
  );

  if (sessionLoading || loading) return <p className="text-foreground/60">Yükleniyor...</p>;

  if (!session) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className={pageTitle}>Hesabım</h1>
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

  if (!player) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className={pageTitle}>Hesabım</h1>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <p className="text-foreground/70">
          Hesabın henüz bir oyuncu kaydına bağlı değil. Koçundan/kaptanından bir davet linki iste.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className={pageTitle}>Hesabım</h1>
      {error && <p className="text-red-600 text-sm">{error}</p>}

      <section className="flex flex-col gap-3">
        <h2 className={sectionTitle}>Profil</h2>
        <form onSubmit={handleSave} className={`${card} flex flex-col gap-3 max-w-sm`}>
          <label className="flex flex-col gap-1 text-sm">
            Ad Soyad
            <input value={name} onChange={(e) => setName(e.target.value)} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Forma Numarası
            <input
              type="number"
              value={jerseyNumber}
              onChange={(e) => setJerseyNumber(e.target.value)}
              className={input}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Mevki
            <input value={position} onChange={(e) => setPosition(e.target.value)} className={input} />
          </label>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className={primaryButton}>
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
            {saved && <span className="text-sm text-accent">Kaydedildi.</span>}
          </div>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={sectionTitle}>İstatistiklerim</h2>
        <div className={`${card} grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm`}>
          <Stat label="Gol" value={totals.goals} />
          <Stat label="Asist" value={totals.assists} />
          <Stat label="Şut (İsabetli)" value={`${totals.shotsOnTarget}/${totals.shots}`} />
          <Stat label="Pas (İsabetli)" value={`${totals.successfulPasses}/${totals.passes}`} />
          <Stat label="Müdahale" value={totals.tackles} />
          <Stat label="Faul" value={totals.fouls} />
          <Stat label="Maç Kaydı" value={stats.length} />
        </div>
        <Link href="/dashboard" className={`self-start ${secondaryButton}`}>
          Takım İstatistiklerini Gör
        </Link>
      </section>

      <button onClick={() => supabase.auth.signOut()} className={`self-start ${dangerLink}`}>
        Çıkış Yap
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-foreground/60 text-xs uppercase tracking-wide">{label}</span>
      <span className="text-xl font-semibold">{value}</span>
    </div>
  );
}
