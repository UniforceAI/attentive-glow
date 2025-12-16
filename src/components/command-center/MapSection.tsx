import { useMemo, useState } from "react";
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
  { key: 'churn', label: 'Risco Churn', icon: AlertTriangle, color: 'hsl(0, 84%, 60%)' },
  { key: 'vencido', label: 'R$ Vencido', icon: DollarSign, color: 'hsl(45, 93%, 47%)' },
  { key: 'sinal', label: 'Sinal Crítico', icon: Wifi, color: 'hsl(217, 91%, 60%)' },
  { key: 'detrator', label: 'Detratores', icon: ThumbsDown, color: 'hsl(271, 91%, 65%)' },
  { key: 'reincidencia', label: 'Reincidência', icon: RotateCcw, color: 'hsl(24, 95%, 53%)' },
] as const;

interface DataPoint {
  id: string;
  lat: number;
  lng: number;
  cliente: string;
  cidade: string;
  value: number;
  bucket?: string;
}

export function MapSection({ filaRisco, filaCobranca, eventos, metric, onMetricChange }: MapSectionProps) {
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);

  const dataPoints = useMemo((): DataPoint[] => {
    const points: DataPoint[] = [];
    
    switch (metric) {
      case 'churn':
        filaRisco.forEach(c => {
          if (c.geo_lat && c.geo_lng) {
            points.push({
              id: c.cliente_id,
              lat: c.geo_lat,
              lng: c.geo_lng,
              cliente: c.cliente_nome,
              cidade: c.cidade,
              value: c.score,
              bucket: c.bucket
            });
          }
        });
        break;
      case 'vencido':
        eventos.filter(e => e.cobranca_status === 'Vencido' && e.geo_lat && e.geo_lng).forEach(e => {
          points.push({
            id: `${e.cliente_id}-${e.event_id}`,
            lat: e.geo_lat!,
            lng: e.geo_lng!,
            cliente: e.cliente_nome,
            cidade: e.cliente_cidade || '',
            value: e.valor_cobranca || 0,
          });
        });
        break;
      case 'sinal':
        eventos.filter(e => e.alerta_tipo === 'Sinal crítico' && e.geo_lat && e.geo_lng).forEach(e => {
          points.push({
            id: `${e.cliente_id}-${e.event_id}`,
            lat: e.geo_lat!,
            lng: e.geo_lng!,
            cliente: e.cliente_nome,
            cidade: e.cliente_cidade || '',
            value: e.rx_dbm || 0,
          });
        });
        break;
      case 'detrator':
        eventos.filter(e => e.event_type === 'NPS' && (e.nps_score || 0) <= 6 && e.geo_lat && e.geo_lng).forEach(e => {
          points.push({
            id: `${e.cliente_id}-${e.event_id}`,
            lat: e.geo_lat!,
            lng: e.geo_lng!,
            cliente: e.cliente_nome,
            cidade: e.cliente_cidade || '',
            value: e.nps_score || 0,
          });
        });
        break;
      case 'reincidencia':
        eventos.filter(e => e.reincidente_30d === true && e.geo_lat && e.geo_lng).forEach(e => {
          points.push({
            id: `${e.cliente_id}-${e.event_id}`,
            lat: e.geo_lat!,
            lng: e.geo_lng!,
            cliente: e.cliente_nome,
            cidade: e.cliente_cidade || '',
            value: 1,
          });
        });
        break;
    }
    
    return points;
  }, [filaRisco, eventos, metric]);

  // Calculate bounds for the SVG viewBox
  const bounds = useMemo(() => {
    if (dataPoints.length === 0) {
      return { minLat: -23.7, maxLat: -23.4, minLng: -46.9, maxLng: -46.3 };
    }
    
    const lats = dataPoints.map(p => p.lat);
    const lngs = dataPoints.map(p => p.lng);
    
    const padding = 0.05;
    return {
      minLat: Math.min(...lats) - padding,
      maxLat: Math.max(...lats) + padding,
      minLng: Math.min(...lngs) - padding,
      maxLng: Math.max(...lngs) + padding,
    };
  }, [dataPoints]);

  // Convert geo coordinates to SVG coordinates
  const toSvgCoords = (lat: number, lng: number) => {
    const width = 800;
    const height = 400;
    const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * width;
    const y = height - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * height;
    return { x, y };
  };

  const currentMetric = metrics.find(m => m.key === metric)!;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header with toggles */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Mapa de Concentração</h3>
          <span className="text-xs text-muted-foreground ml-2">({dataPoints.length} pontos)</span>
        </div>
        <div className="flex items-center gap-1">
          {metrics.map(m => {
            const Icon = m.icon;
            return (
              <button
                key={m.key}
                onClick={() => onMetricChange(m.key as any)}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-all ${
                  metric === m.key 
                    ? 'bg-muted text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <Icon className="h-3 w-3" style={{ color: metric === m.key ? m.color : undefined }} />
                <span className="hidden lg:inline">{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SVG Map */}
      <div className="relative p-4">
        <svg 
          viewBox="0 0 800 400" 
          className="w-full h-[300px] md:h-[350px] bg-muted/20 rounded-lg"
          style={{ background: 'linear-gradient(180deg, hsl(var(--muted)/0.3) 0%, hsl(var(--muted)/0.1) 100%)' }}
        >
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Data points */}
          {dataPoints.map((point, i) => {
            const { x, y } = toSvgCoords(point.lat, point.lng);
            const isHovered = hoveredPoint?.id === point.id;
            const baseRadius = metric === 'churn' ? Math.max(6, (point.value / 100) * 15) : 8;
            
            return (
              <g key={point.id}>
                {/* Glow effect */}
                <circle
                  cx={x}
                  cy={y}
                  r={baseRadius + 4}
                  fill={currentMetric.color}
                  opacity={isHovered ? 0.4 : 0.15}
                  className="transition-opacity"
                />
                {/* Main circle */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? baseRadius + 2 : baseRadius}
                  fill={currentMetric.color}
                  stroke="hsl(var(--background))"
                  strokeWidth="2"
                  opacity={0.9}
                  className="cursor-pointer transition-all hover:opacity-100"
                  onMouseEnter={() => setHoveredPoint(point)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
                {/* Pulse animation for critical items */}
                {point.bucket === 'Crítico' && (
                  <circle
                    cx={x}
                    cy={y}
                    r={baseRadius}
                    fill="none"
                    stroke={currentMetric.color}
                    strokeWidth="2"
                    opacity="0.6"
                  >
                    <animate
                      attributeName="r"
                      from={baseRadius}
                      to={baseRadius + 12}
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      from="0.6"
                      to="0"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hoveredPoint && (
          <div 
            className="absolute z-10 bg-popover border border-border rounded-lg shadow-lg p-3 pointer-events-none"
            style={{
              left: '50%',
              top: '20px',
              transform: 'translateX(-50%)',
            }}
          >
            <p className="font-medium text-sm text-foreground">{hoveredPoint.cliente}</p>
            <p className="text-xs text-muted-foreground">{hoveredPoint.cidade}</p>
            <div className="flex items-center gap-2 mt-1">
              <span 
                className="inline-block w-2 h-2 rounded-full" 
                style={{ backgroundColor: currentMetric.color }}
              />
              <span className="text-xs font-medium">
                {metric === 'churn' && `Score: ${hoveredPoint.value} (${hoveredPoint.bucket})`}
                {metric === 'vencido' && `R$ ${hoveredPoint.value.toLocaleString('pt-BR')}`}
                {metric === 'sinal' && `${hoveredPoint.value} dBm`}
                {metric === 'detrator' && `NPS: ${hoveredPoint.value}`}
                {metric === 'reincidencia' && 'Reincidente'}
              </span>
            </div>
          </div>
        )}

        {dataPoints.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">Nenhum dado com coordenadas para a métrica selecionada</p>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 pt-3 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-full opacity-60" style={{ backgroundColor: currentMetric.color }} />
            <span>Ponto de alerta</span>
          </div>
          {metric === 'churn' && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="relative w-4 h-4">
                <div className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ backgroundColor: currentMetric.color }} />
                <div className="absolute inset-1 rounded-full" style={{ backgroundColor: currentMetric.color }} />
              </div>
              <span>Crítico (pulsando)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
