"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { card, input, pageTitle, primaryButton } from "@/lib/ui";

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
    setSubmitting(false);
    if (error) setError(error.message);
    else router.push("/hesabim");
  }

  return (
    <div className="flex flex-col gap-6 max-w-sm">
      <h1 className={pageTitle}>Giriş Yap</h1>
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
