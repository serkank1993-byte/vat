import { card } from "@/lib/ui";

export default function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className={card}>
      <div className="text-xs font-medium uppercase tracking-wide text-foreground/60">{label}</div>
      <div className="text-3xl font-semibold tracking-tight mt-1">{value}</div>
      {hint && <div className="text-xs text-foreground/50 mt-1">{hint}</div>}
    </div>
  );
}
