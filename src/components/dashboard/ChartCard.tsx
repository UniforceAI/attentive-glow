import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  height?: string;
}

export function ChartCard({
  title,
  subtitle,
  children,
  className,
  action,
  height = "h-[300px]",
}: ChartCardProps) {
  return (
    <div className={cn(
      "rounded-xl border border-border/50 bg-card p-5 transition-all duration-300",
      className
    )}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className={height}>
        {children}
      </div>
    </div>
  );
}