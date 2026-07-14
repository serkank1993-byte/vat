import type { ComponentType } from "react";
import { iconBadge, pageTitle } from "@/lib/ui";

export default function PageHeading({
  icon: Icon,
  title,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={iconBadge}>
        <Icon className="h-5 w-5" />
      </span>
      <h1 className={pageTitle}>{title}</h1>
    </div>
  );
}
