import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Standard list/detail page header: title + optional subtitle on the left,
 * optional primary action on the right. Replaces the `h1 text-[26px] …` block
 * copy-pasted across every list page.
 */
export function PageHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-3",
        className,
      )}
    >
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-[var(--muted)]">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
