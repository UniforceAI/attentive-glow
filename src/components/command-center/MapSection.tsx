import { useMemo } from "react";
import { Evento, ClienteRisco, ClienteCobranca } from "@/types/evento";
import { MapPin, AlertTriangle, DollarSign, Wifi, ThumbsDown, RotateCcw } from "lucide-react";

interface MapSectionProps {
  filaRisco: ClienteRisco[];
  filaCobranca: ClienteCobranca[];
  eventos: Evento[];
  metric: 'churn' | 'vencido' | 'sinal' | 'detrator' | 'reincidencia';
  onMetricChange: (m: 'churn' | 'vencido' | 'sinal' | 'detrator' | 'reincidencia') => void;
}

const metrics = [
  { key: 'churn', label: 'Risco Churn', icon: AlertTriangle, color: 'text-red-400' },
  { key: 'vencido', label: 'R$ Vencido', icon: DollarSign, color: 'text-yellow-400' },
  { key: 'sinal', label: 'Sinal Crítico', icon: Wifi, color: 'text-blue-400' },
  { key: 'detrator', label: 'Detratores', icon: ThumbsDown, color: 'text-purple-400' },
  { key: 'reincidencia', label: 'Reincidência', icon: RotateCcw, color: 'text-orange-400' },
] as const;

export function MapSection({ filaRisco, filaCobranca, eventos, metric, onMetricChange }: MapSectionProps) {
  // Aggregate data by city for the heatmap visualization
  const cityData = useMemo(() => {
    const map = new Map<string, { count: number; lat: number; lng: number; total: number }>();
    
    const getRelevantData = () => {
      switch (metric) {
        case 'churn':
          return filaRisco.map(c => ({ cidade: c.cidade, lat: c.geo_lat, lng: c.geo_lng }));
        case 'vencido':
          return eventos.filter(e => e.cobranca_status === 'Vencido').map(e => ({ cidade: e.cliente_cidade, lat: e.geo_lat, lng: e.geo_lng }));
        case 'sinal':
          return eventos.filter(e => e.alerta_tipo === 'Sinal crítico').map(e => ({ cidade: e.cliente_cidade, lat: e.geo_lat, lng: e.geo_lng }));
        case 'detrator':
          return eventos.filter(e => e.event_type === 'NPS' && (e.nps_score || 0) <= 6).map(e => ({ cidade: e.cliente_cidade, lat: e.geo_lat, lng: e.geo_lng }));
        case 'reincidencia':
          return eventos.filter(e => e.reincidente_30d === true).map(e => ({ cidade: e.cliente_cidade, lat: e.geo_lat, lng: e.geo_lng }));
        default:
          return [];
      }
    };

    getRelevantData().forEach(item => {
      if (!item.cidade) return;
      const curr = map.get(item.cidade) || { count: 0, lat: item.lat || 0, lng: item.lng || 0, total: 0 };
      curr.count++;
      curr.total++;
      if (item.lat && item.lng) {
        curr.lat = item.lat;
        curr.lng = item.lng;
      }
      map.set(item.cidade, curr);
    });

    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filaRisco, filaCobranca, eventos, metric]);

  const maxCount = Math.max(...cityData.map(c => c.count), 1);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header with toggles */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Mapa de Concentração</h3>
        </div>
        <div className="flex items-center gap-2">
          {metrics.map(m => {
            const Icon = m.icon;
            return (
              <button
                key={m.key}
                onClick={() => onMetricChange(m.key as any)}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
                  metric === m.key 
                    ? `bg-muted ${m.color}` 
                    : 'text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <Icon className="h-3 w-3" />
                <span className="hidden md:inline">{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Map Visualization (simplified heatmap bars by city) */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {cityData.map((city, i) => (
            <div 
              key={city.name} 
              className="bg-muted/30 rounded-lg p-3 border border-border/50 hover:border-primary/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground truncate">{city.name}</span>
                <span className="text-xs font-bold text-destructive">{city.count}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-500 to-red-500 rounded-full transition-all"
                  style={{ width: `${(city.count / maxCount) * 100}%` }}
                />
              </div>
              {city.lat && city.lng && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  {city.lat.toFixed(2)}, {city.lng.toFixed(2)}
                </p>
              )}
            </div>
          ))}
        </div>

        {cityData.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum dado para a métrica selecionada
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span>Baixa concentração</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span>Média concentração</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Alta concentração</span>
          </div>
        </div>
      </div>
    </div>
  );
}
