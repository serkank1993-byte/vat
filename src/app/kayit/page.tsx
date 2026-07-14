"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { card, input, primaryButton } from "@/lib/ui";
import PageHeading from "@/app/components/PageHeading";
import { UserIcon } from "@/lib/icons";

const PENDING_TOKEN_KEY = "vat_pending_invite_token";

type InvitedPlayer = { id: number; name: string; jersey_number: number };

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [player, setPlayer] = useState<InvitedPlayer | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLookupError("Davet linki eksik veya geçersiz.");
      setLoading(false);
      return;
    }
    supabase
      .rpc("get_player_by_invite_token", { p_token: token })
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setLookupError(error.message);
        else if (!data) setLookupError("Bu davet linki geçersiz veya zaten kullanılmış.");
        else setPlayer(data as InvitedPlayer);
        setLoading(false);
      });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      setSubmitting(false);
      return;
    }

    if (data.session) {
      const { error: claimError } = await supabase.rpc("claim_player_invite", { p_token: token });
      setSubmitting(false);
      if (claimError) setError(claimError.message);
      else router.push("/hesabim");
    } else {
      localStorage.setItem(PENDING_TOKEN_KEY, token);
      setSubmitting(false);
      setAwaitingConfirmation(true);
    }
  }

  if (loading) return <p className="text-foreground/60">Yükleniyor...</p>;
  if (lookupError) return <p className="text-red-600 text-sm">{lookupError}</p>;

  if (awaitingConfirmation) {
    return (
      <div className={`${card} max-w-sm`}>
        <p className="text-sm">
          E-postana gönderilen onay linkine tıkla, ardından giriş yaparak profiline otomatik
          bağlanacaksın.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-sm">
      <PageHeading icon={UserIcon} title="Hesap Oluştur" />
      {player && (
        <p className="text-sm text-foreground/70">
          <span className="font-medium">
            #{player.jersey_number} {player.name}
          </span>{" "}
          için hesap oluşturuyorsun.
        </p>
      )}
      <form onSubmit={handleSubmit} className={`${card} flex flex-col gap-3`}>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <label className="flex flex-col gap-1 text-sm">
          E-posta
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Şifre
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={input}
          />
        </label>
        <button type="submit" disabled={submitting} className={primaryButton}>
          {submitting ? "Oluşturuluyor..." : "Hesap Oluştur"}
        </button>
      </form>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<p className="text-foreground/60">Yükleniyor...</p>}>
      <SignupForm />
    </Suspense>
  );
}
