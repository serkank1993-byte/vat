import Link from "next/link";
import { cardInteractive, iconBadge, pageEyebrow, primaryButton, secondaryButton } from "@/lib/ui";
import {
  ActivityIcon,
  BarChartIcon,
  CalendarIcon,
  CheckCircleIcon,
  PlayCircleIcon,
  ShieldIcon,
  TacticsBoardIcon,
  UserIcon,
} from "@/lib/icons";

const SECTIONS = [
  { href: "/teams", title: "Takımlar", description: "Takımlarını oluştur ve yönet.", icon: ShieldIcon },
  { href: "/players", title: "Oyuncular", description: "Kadro ve forma numaralarını takip et.", icon: UserIcon },
  { href: "/matches", title: "Fikstür", description: "Fikstür ve maç sonuçlarını kaydet.", icon: CalendarIcon },
  { href: "/katilim", title: "Katılım", description: "Maça kimin geldiğini takip et.", icon: CheckCircleIcon },
  {
    href: "/taktik",
    title: "Taktik",
    description: "İlk 11, diziliş ve duran top pozisyonlarını belirle.",
    icon: TacticsBoardIcon,
  },
  { href: "/live", title: "Canlı Takip", description: "Sahada gerçek zamanlı olay girişi yap.", icon: ActivityIcon },
  {
    href: "/analysis",
    title: "Video Analiz",
    description: "Maç videosu üzerinden olay etiketle.",
    icon: PlayCircleIcon,
  },
  { href: "/dashboard", title: "İstatistikler", description: "Gol krallığı, asist ve pas isabeti.", icon: BarChartIcon },
];

export default function Home() {
  return (
    <div className="flex flex-col gap-10">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-accent/15 via-surface to-surface px-6 py-10 sm:px-10 sm:py-14">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent/20 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-4">
          <span className={pageEyebrow}>SahaIçi</span>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight max-w-2xl">
            Takımını yönet, maça hazırlan, performansı analiz et.
          </h1>
          <p className="text-foreground/70 max-w-xl text-base">
            Takımları, oyuncuları ve maçları tek yerden yönet; sahada veya video üzerinden taktik
            olayları etiketleyip diziliş ve duran top planlarını kur, performansı analiz et.
          </p>
          <div className="flex flex-wrap gap-3 mt-2">
            <Link href="/teams" className={primaryButton}>
              Takımları Yönet
            </Link>
            <Link href="/dashboard" className={secondaryButton}>
              İstatistikleri Gör
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href} className={`${cardInteractive} flex flex-col gap-3`}>
            <span className={iconBadge}>
              <s.icon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold text-lg">{s.title}</h2>
              <p className="text-sm text-foreground/60 mt-1">{s.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
