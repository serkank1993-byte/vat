"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { card, input, primaryButton } from "@/lib/ui";
import PageHeading from "@/app/components/PageHeading";
import { ShieldIcon } from "@/lib/icons";

const PENDING_BOOTSTRAP_KEY = "vat_pending_admin_bootstrap";

export default function AdminSetupPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [alreadySetUp, setAlreadySetUp] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  useEffect(() => {
    supabase.rpc("admin_exists").then(({ data }) => {
      setAlreadySetUp(Boolean(data));
      setChecking(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/giris` },
    });
    if (error) {
      setError(error.message);
      setSubmitting(false);
      return;
    }

    if (data.session) {
      const { error: bootstrapError } = await supabase.rpc("bootstrap_first_admin");
      setSubmitting(false);
      if (bootstrapError) setError(bootstrapError.message);
      else router.push("/teams");
    } else if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError("Bu e-posta adresiyle zaten bir hesap var. Giriş yapmayı deneyin.");
      setSubmitting(false);
    } else {
      localStorage.setItem(PENDING_BOOTSTRAP_KEY, "1");
      setSubmitting(false);
      setAwaitingConfirmation(true);
    }
  }

  if (checking) return <p className="text-foreground/60">Yükleniyor...</p>;

  if (alreadySetUp) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeading icon={ShieldIcon} title="Yönetici Kurulumu" />
        <p className="text-foreground/70">
          Zaten bir yönetici hesabı var. Giriş yapmak için{" "}
          <a href="/giris" className="text-accent hover:underline">
            buraya tıkla
          </a>
          .
        </p>
      </div>
    );
  }

  if (awaitingConfirmation) {
    return (
      <div className={`${card} max-w-sm`}>
        <p className="text-sm">
          E-postana gönderilen onay linkine tıkla, ardından giriş yaparak yönetici hesabın otomatik
          oluşturulacak.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-sm">
      <PageHeading icon={ShieldIcon} title="Yönetici Kurulumu" />
      <p className="text-sm text-foreground/70">
        Bu, uygulamanın ilk ve tek yönetici hesabını oluşturur. Bu sayfa, bir yönetici hesabı
        oluşturulduktan sonra tekrar kullanılamaz.
      </p>
      <form onSubmit={handleSubmit} className={`${card} flex flex-col gap-3`}>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
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
          {submitting ? "Oluşturuluyor..." : "Yönetici Hesabı Oluştur"}
        </button>
      </form>
    </div>
  );
}
