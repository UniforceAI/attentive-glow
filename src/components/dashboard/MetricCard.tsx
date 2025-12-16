import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  trendLabel?: string;
  icon?: ReactNode;
  variant?: "default" | "primary" | "success" | "warning" | "danger" | "purple";
  size?: "sm" | "md" | "lg";
  className?: string;
  glowing?: boolean;
}

const variantStyles = {
  default: "border-border/50",
  primary: "border-primary/30 bg-primary/5",
  success: "border-success/30 bg-success/5",
  warning: "border-warning/30 bg-warning/5",
  danger: "border-destructive/30 bg-destructive/5",
  purple: "border-accent/30 bg-accent/5",
};

const iconVariantStyles = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/20 text-primary",
  success: "bg-success/20 text-success",
  warning: "bg-warning/20 text-warning",
  danger: "bg-destructive/20 text-destructive",
  purple: "bg-accent/20 text-accent",
};

export function MetricCard({
  title,
  value,
  subtitle,
  trend,
  trendLabel,
  icon,
  variant = "default",
  size = "md",
  className,
  glowing = false,
}: MetricCardProps) {
  const TrendIcon = trend === undefined ? null : trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend === undefined ? "" : trend > 0 ? "text-success" : trend < 0 ? "text-destructive" : "text-muted-foreground";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card p-4 transition-all duration-300 stat-card",
        variantStyles[variant],
        glowing && variant === "danger" && "pulse-danger",
        size === "sm" && "p-3",
        size === "lg" && "p-6",
        className
      )}
    >
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5 pointer-events-none" />
      
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-muted-foreground font-medium truncate",
            size === "sm" ? "text-xs" : size === "lg" ? "text-sm" : "text-xs"
          )}>
            {title}
          </p>
          
          <p className={cn(
            "font-bold mt-1 tracking-tight",
            size === "sm" ? "text-xl" : size === "lg" ? "text-4xl" : "text-2xl"
          )}>
            {value}
          </p>

          {(trend !== undefined || subtitle) && (
            <div className="flex items-center gap-2 mt-2">
              {trend !== undefined && TrendIcon && (
                <div className={cn("flex items-center gap-1 text-xs font-medium", trendColor)}>
                  <TrendIcon className="h-3 w-3" />
                  <span>{Math.abs(trend).toFixed(1)}%</span>
                </div>
              )}
              {trendLabel && (
                <span className="text-xs text-muted-foreground">{trendLabel}</span>
              )}
              {subtitle && !trendLabel && (
                <span className="text-xs text-muted-foreground">{subtitle}</span>
              )}
            </div>
          )}
        </div>

        {icon && (
          <div className={cn(
            "flex-shrink-0 rounded-lg p-2.5",
            iconVariantStyles[variant]
          )}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}