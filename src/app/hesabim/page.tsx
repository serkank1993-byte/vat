"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import type { MatchAttendance, MatchEvent, Player } from "@/lib/types";
import { card, dangerLink, input, primaryButton, secondaryButton, sectionTitle } from "@/lib/ui";
import StatTile from "@/app/components/StatTile";
import PageHeading from "@/app/components/PageHeading";
import { UserCircleIcon } from "@/lib/icons";

const PENDING_TOKEN_KEY = "vat_pending_invite_token";

function AccountPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, loading: sessionLoading } = useSession();
  const [player, setPlayer] = useState<Player | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [attendance, setAttendance] = useState<MatchAttendance[]>([]);
  const [teamMatchCount, setTeamMatchCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [position, setPosition] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function loadPlayer(userId: string) {
    setLoading(true);

    const urlToken = searchParams.get("invite_token");
    const pendingToken = urlToken || localStorage.getItem(PENDING_TOKEN_KEY);
    if (pendingToken) {
      const { error: claimError } = await supabase.rpc("claim_player_invite", { p_token: pendingToken });
      if (claimError) {
        // "Invalid or already used invite token" is expected if an earlier call
        // already claimed it (e.g. a double-invocation) — safe to clear then.
        // Any other error is a genuine failure, so keep the token around for retry
        // instead of silently orphaning the invite.
        if (claimError.message.toLowerCase().includes("invalid or already used")) {
          localStorage.removeItem(PENDING_TOKEN_KEY);
          if (urlToken) router.replace("/hesabim");
        } else {
          setError(
            `Davet bağlama işlemi başarısız oldu: ${claimError.message}. Sayfayı yenileyerek tekrar deneyebilirsin.`,
          );
        }
      } else {
        localStorage.removeItem(PENDING_TOKEN_KEY);
        if (urlToken) router.replace("/hesabim");
      }
    }

    const { data: adminData } = await supabase.rpc("is_admin");
    setIsAdmin(Boolean(adminData));

    const { data, error } = await supabase.from("players").select("*").eq("user_id", userId).maybeSingle();
    if (error) setError(error.message);
    else if (data) {
      setPlayer(data);
      setName(data.name);
      setJerseyNumber(String(data.jersey_number));
      setPosition(data.position ?? "");
      const [eventsRes, attendanceRes, matchesRes] = await Promise.all([
        supabase.from("events").select("*").eq("player_id", data.id),
        supabase.from("match_attendance").select("*").eq("player_id", data.id),
        supabase.from("matches").select("id", { count: "exact", head: true }).eq("team_id", data.team_id),
      ]);
      if (eventsRes.error) setError(eventsRes.error.message);
      else setEvents(eventsRes.data ?? []);
      if (attendanceRes.error) setError(attendanceRes.error.message);
      else setAttendance(attendanceRes.data ?? []);
      setTeamMatchCount(matchesRes.count ?? 0);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  function countBy(eventType: string) {
    return events.filter((e) => e.event_type === eventType).length;
  }

  const totals = {
    goals: countBy("goal"),
    assists: countBy("assist"),
    passes: countBy("pass") + countBy("successful_pass"),
    successfulPasses: countBy("successful_pass"),
    shots: countBy("shot") + countBy("shot_on_target"),
    shotsOnTarget: countBy("shot_on_target"),
    tackles: countBy("tackle"),
    fouls: countBy("foul"),
  };
  const matchesPlayed = new Set(events.map((e) => e.match_id)).size;

  const attendingCount = attendance.filter((a) => a.status === "geliyor").length;
  const attendanceRate = teamMatchCount > 0 ? Math.round((attendingCount / teamMatchCount) * 100) : null;

  if (sessionLoading || loading) return <p className="text-foreground/60">Yükleniyor...</p>;

  if (!session) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeading icon={UserCircleIcon} title="Hesabım" />
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
        <PageHeading icon={UserCircleIcon} title="Hesabım" />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {isAdmin ? (
          <p className="text-foreground/70">
            Yönetici olarak giriş yaptın. Bu sayfa oyuncular içindir —{" "}
            <Link href="/teams" className="text-accent hover:underline">
              yönetim sayfalarına dön
            </Link>
            .
          </p>
        ) : (
          <p className="text-foreground/70">
            Hesabın henüz bir oyuncu kaydına bağlı değil. Kaptanından bir davet linki iste.
          </p>
        )}
        <button onClick={() => supabase.auth.signOut()} className={`self-start ${dangerLink}`}>
          Çıkış Yap
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeading icon={UserCircleIcon} title="Hesabım" />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatTile label="Gol" value={totals.goals} />
          <StatTile label="Asist" value={totals.assists} />
          <StatTile label="Şut (İsabetli)" value={`${totals.shotsOnTarget}/${totals.shots}`} />
          <StatTile label="Pas (İsabetli)" value={`${totals.successfulPasses}/${totals.passes}`} />
          <StatTile label="Müdahale" value={totals.tackles} />
          <StatTile label="Faul" value={totals.fouls} />
          <StatTile label="Maç Kaydı" value={matchesPlayed} />
          <StatTile label="Katılım Oranı" value={attendanceRate !== null ? `%${attendanceRate}` : "—"} />
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard" className={secondaryButton}>
            Takım İstatistiklerini Gör
          </Link>
          <Link href="/katilim" className={secondaryButton}>
            Maç Katılımlarım
          </Link>
        </div>
      </section>

      <button onClick={() => supabase.auth.signOut()} className={`self-start ${dangerLink}`}>
        Çıkış Yap
      </button>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<p className="text-foreground/60">Yükleniyor...</p>}>
      <AccountPageContent />
    </Suspense>
  );
}
