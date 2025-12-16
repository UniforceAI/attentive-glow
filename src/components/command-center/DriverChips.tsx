import { Wifi, DollarSign, RotateCcw, ThumbsDown } from "lucide-react";
import { FilterState } from "@/types/evento";

interface DriverChipsProps {
  stats: {
    drivers: Record<string, number>;
    total: number;
    principal: string;
  };
  activeDriver: FilterState['driver'];
  onDriverClick: (driver: FilterState['driver']) => void;
}

const drivers = [
  { key: 'instabilidade', label: 'Instabilidade', icon: Wifi, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { key: 'financeiro', label: 'Financeiro', icon: DollarSign, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { key: 'reincidencia', label: 'Reincidência', icon: RotateCcw, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { key: 'detrator', label: 'Detrator NPS', icon: ThumbsDown, color: 'bg-red-500/20 text-red-400 border-red-500/30' },
] as const;

export function DriverChips({ stats, activeDriver, onDriverClick }: DriverChipsProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onDriverClick('all')}
        className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
          activeDriver === 'all' 
            ? 'bg-primary text-primary-foreground border-primary' 
            : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
        }`}
      >
        Todos ({stats.total})
      </button>
      {drivers.map(d => {
        const count = stats.drivers[d.key] || 0;
        const isActive = activeDriver === d.key;
        const Icon = d.icon;
        
        return (
          <button
            key={d.key}
            onClick={() => onDriverClick(d.key as FilterState['driver'])}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border transition-all ${
              isActive 
                ? d.color + ' ring-1 ring-offset-1 ring-offset-background' 
                : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
            }`}
          >
            <Icon className="h-3 w-3" />
            <span>{d.label}</span>
            <span className="font-semibold">({count})</span>
          </button>
        );
      })}
    </div>
  );
}
