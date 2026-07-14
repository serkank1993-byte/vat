import type { ComponentType } from "react";
import { emptyState } from "@/lib/ui";

export default function EmptyState({
  icon: Icon,
  message,
}: {
  icon: ComponentType<{ className?: string }>;
  message: string;
}) {
  return (
    <div className={emptyState}>
      <Icon className="h-8 w-8 text-foreground/30" />
      <p>{message}</p>
    </div>
  );
}
