"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { card, input, primaryButton } from "@/lib/ui";
import PageHeading from "@/app/components/PageHeading";
import { ArrowRightCircleIcon } from "@/lib/icons";

const PENDING_BOOTSTRAP_KEY = "vat_pending_admin_bootstrap";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setSubmitting(false);
      return;
    }

    if (localStorage.getItem(PENDING_BOOTSTRAP_KEY)) {
      await supabase.rpc("bootstrap_first_admin");
      localStorage.removeItem(PENDING_BOOTSTRAP_KEY);
    }

    const { data: isAdmin } = await supabase.rpc("is_admin");
    setSubmitting(false);
    router.push(isAdmin ? "/teams" : "/hesabim");
  }

  return (
    <div className="flex flex-col gap-6 max-w-sm">
      <PageHeading icon={ArrowRightCircleIcon} title="Giriş Yap" />
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={input}
          />
        </label>
        <button type="submit" disabled={submitting} className={primaryButton}>
          {submitting ? "Giriş yapılıyor..." : "Giriş Yap"}
        </button>
      </form>
      <p className="text-sm text-foreground/60">
        Hesabın yok mu? Kaptanından bir davet linki istemen gerekiyor.
      </p>
    </div>
  );
}
