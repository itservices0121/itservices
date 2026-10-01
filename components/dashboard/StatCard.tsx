import { ElementType } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  badge?: string;
  icon: ElementType;
  /** Optional: click navigates to this href */
  href?: string;
  /** Variant controls icon background and accent */
  variant?: "primary" | "secondary" | "accent" | "muted";
  className?: string;
}

const variantMap: Record<
  NonNullable<StatCardProps["variant"]>,
  { iconBg: string; iconColor: string }
> = {
  primary: {
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  secondary: {
    iconBg: "bg-secondary",
    iconColor: "text-secondary-foreground",
  },
  accent: {
    iconBg: "bg-accent/20",
    iconColor: "text-accent-foreground",
  },
  muted: {
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
  },
};

/**
 * Shared stat card for all four dashboard pages.
 * Resting shadow: shadow-sm. Hover: shadow-md.
 * Radius: rounded-xl (20px from token scale).
 * No gradient backgrounds, no colored glow shadows.
 */
export function StatCard({
  label,
  value,
  badge,
  icon: Icon,
  href,
  variant = "primary",
  className,
}: StatCardProps) {
  const { iconBg, iconColor } = variantMap[variant];

  const cardContent = (
    <div
      className={cn(
        "bg-card border border-border rounded-xl p-6",
        "shadow-sm hover:shadow-md transition-shadow duration-200",
        "flex flex-col gap-4",
        href && "cursor-pointer",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn("p-2.5 rounded-lg", iconBg)}>
          <Icon className={cn("h-5 w-5", iconColor)} aria-hidden="true" />
        </div>
        {badge && (
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
            {badge}
          </span>
        )}
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
          {label}
        </p>
        <p className="text-3xl font-semibold text-foreground tracking-tight">
          {value}
        </p>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {cardContent}
      </Link>
    );
  }
  return cardContent;
}
