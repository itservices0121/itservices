import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

/**
 * Shared page header for all four dashboard roles.
 * Uses the token type scale: title=text-2xl font-semibold,
 * eyebrow=text-xs uppercase tracking-wide.
 * No gradient text, no italic-as-emphasis, no font-black.
 */
export function DashboardHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  className,
}: DashboardHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-border",
        className
      )}
    >
      <div className="space-y-1">
        {eyebrow && (
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>

      {actions && (
        <div className="flex flex-shrink-0 items-center gap-3">{actions}</div>
      )}
    </div>
  );
}
