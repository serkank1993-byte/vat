"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/useSession";

const PUBLIC_PATHS = ["/giris", "/kayit", "/yonetici-kurulum"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, loading } = useSession();
  const isPublic = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (!loading && !session && !isPublic) {
      router.replace("/giris");
    }
  }, [loading, session, isPublic, router]);

  if (isPublic) return <>{children}</>;
  if (loading || !session) return <p className="text-foreground/60">Yükleniyor...</p>;
  return <>{children}</>;
}
