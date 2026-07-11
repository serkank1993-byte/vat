import Link from "next/link";
import { card, pageTitle } from "@/lib/ui";

const SECTIONS = [
  { href: "/teams", title: "Takımlar", description: "Takımlarını oluştur ve yönet." },
  { href: "/players", title: "Oyuncular", description: "Kadro ve forma numaralarını takip et." },
  { href: "/matches", title: "Maçlar", description: "Fikstür ve maç sonuçlarını kaydet." },
  { href: "/live", title: "Canlı Takip", description: "Sahada gerçek zamanlı olay girişi yap." },
  { href: "/analysis", title: "Video Analiz", description: "Maç videosu üzerinden olay etiketle." },
  { href: "/dashboard", title: "İstatistikler", description: "Gol krallığı, asist ve pas isabeti." },
];

export default function Home() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className={pageTitle}>SahaIçi — Video Taktik Analiz</h1>
        <p className="text-foreground/70">
          Takımları, oyuncuları ve maçları yönet; sahada veya video üzerinden taktik olayları
          etiketleyip performansı analiz et.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href} className={`${card} hover:border-accent transition-colors`}>
            <h2 className="font-semibold text-lg">{s.title}</h2>
            <p className="text-sm text-foreground/60 mt-1">{s.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
