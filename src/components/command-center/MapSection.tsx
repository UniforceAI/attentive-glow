import { useMemo, useState } from "react";
import { Evento, ClienteRisco, ClienteCobranca } from "@/types/evento";
import { MapPin, AlertTriangle, DollarSign, Wifi, ThumbsDown, RotateCcw, Zap } from "lucide-react";

interface MapSectionProps {
  filaRisco: ClienteRisco[];
  filaCobranca: ClienteCobranca[];
  eventos: Evento[];
  metric: 'churn' | 'vencido' | 'sinal' | 'detrator' | 'reincidencia';
  onMetricChange: (m: 'churn' | 'vencido' | 'sinal' | 'detrator' | 'reincidencia') => void;
}

const metrics = [
  { key: 'churn', label: 'Churn', icon: AlertTriangle, gradient: 'from-rose-500 to-red-600', glow: 'shadow-rose-500/50' },
  { key: 'vencido', label: 'Vencido', icon: DollarSign, gradient: 'from-amber-400 to-orange-500', glow: 'shadow-amber-500/50' },
  { key: 'sinal', label: 'Sinal', icon: Wifi, gradient: 'from-cyan-400 to-blue-500', glow: 'shadow-cyan-500/50' },
  { key: 'detrator', label: 'NPS', icon: ThumbsDown, gradient: 'from-violet-400 to-purple-600', glow: 'shadow-violet-500/50' },
  { key: 'reincidencia', label: 'Reincid.', icon: RotateCcw, gradient: 'from-orange-400 to-rose-500', glow: 'shadow-orange-500/50' },
] as const;

interface DataPoint {
  id: string;
  x: number;
  y: number;
  cliente: string;
  cidade: string;
  value: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Brazil-inspired abstract regions for visual appeal
const regions = [
  { id: 'norte', path: 'M120 40 Q180 20 240 50 Q280 80 260 120 Q220 140 160 130 Q100 110 120 40', name: 'Norte' },
  { id: 'nordeste', path: 'M260 50 Q340 30 380 80 Q400 140 360 180 Q300 160 260 120 Q240 80 260 50', name: 'Nordeste' },
  { id: 'centro', path: 'M160 130 Q220 140 260 120 Q300 160 280 220 Q220 260 160 230 Q120 180 160 130', name: 'Centro-Oeste' },
  { id: 'sudeste', path: 'M280 220 Q340 200 380 240 Q400 300 340 340 Q280 320 260 280 Q260 240 280 220', name: 'Sudeste' },
  { id: 'sul', path: 'M220 280 Q260 280 280 320 Q300 380 240 400 Q180 390 180 340 Q190 300 220 280', name: 'Sul' },
];

export function MapSection({ filaRisco, filaCobranca, eventos, metric, onMetricChange }: MapSectionProps) {
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  const dataPoints = useMemo((): DataPoint[] => {
    const points: DataPoint[] = [];
    
    // Generate visually distributed points across the map regions
    const generatePoint = (index: number, total: number, baseX: number, baseY: number, spread: number): { x: number; y: number } => {
      const angle = (index / total) * Math.PI * 2 + Math.random() * 0.5;
      const radius = spread * (0.3 + Math.random() * 0.7);
      return {
        x: baseX + Math.cos(angle) * radius,
        y: baseY + Math.sin(angle) * radius
      };
    };

    const regionCenters = [
      { x: 180, y: 80 },   // Norte
      { x: 340, y: 100 },  // Nordeste
      { x: 220, y: 180 },  // Centro-Oeste
      { x: 320, y: 270 },  // Sudeste
      { x: 240, y: 350 },  // Sul
    ];

    const getSeverity = (score: number): 'low' | 'medium' | 'high' | 'critical' => {
      if (score >= 80) return 'critical';
      if (score >= 60) return 'high';
      if (score >= 40) return 'medium';
      return 'low';
    };
    
    switch (metric) {
      case 'churn':
        filaRisco.slice(0, 25).forEach((c, i) => {
          const region = regionCenters[i % regionCenters.length];
          const pos = generatePoint(i, 25, region.x, region.y, 60);
          points.push({
            id: c.cliente_id,
            ...pos,
            cliente: c.cliente_nome,
            cidade: c.cidade,
            value: c.score,
            severity: getSeverity(c.score)
          });
        });
        break;
      case 'vencido':
        eventos.filter(e => e.cobranca_status === 'Vencido').slice(0, 25).forEach((e, i) => {
          const region = regionCenters[i % regionCenters.length];
          const pos = generatePoint(i, 25, region.x, region.y, 60);
          points.push({
            id: `${e.cliente_id}-${e.event_id}`,
            ...pos,
            cliente: e.cliente_nome,
            cidade: e.cliente_cidade || '',
            value: e.valor_cobranca || 0,
            severity: (e.dias_atraso || 0) > 30 ? 'critical' : (e.dias_atraso || 0) > 15 ? 'high' : 'medium'
          });
        });
        break;
      case 'sinal':
        eventos.filter(e => e.alerta_tipo === 'Sinal crítico').slice(0, 25).forEach((e, i) => {
          const region = regionCenters[i % regionCenters.length];
          const pos = generatePoint(i, 25, region.x, region.y, 60);
          points.push({
            id: `${e.cliente_id}-${e.event_id}`,
            ...pos,
            cliente: e.cliente_nome,
            cidade: e.cliente_cidade || '',
            value: Math.abs(e.rx_dbm || -25),
            severity: (e.rx_dbm || -20) < -28 ? 'critical' : 'high'
          });
        });
        break;
      case 'detrator':
        eventos.filter(e => e.event_type === 'NPS' && (e.nps_score || 10) <= 6).slice(0, 25).forEach((e, i) => {
          const region = regionCenters[i % regionCenters.length];
          const pos = generatePoint(i, 25, region.x, region.y, 60);
          points.push({
            id: `${e.cliente_id}-${e.event_id}`,
            ...pos,
            cliente: e.cliente_nome,
            cidade: e.cliente_cidade || '',
            value: e.nps_score || 0,
            severity: (e.nps_score || 0) <= 3 ? 'critical' : 'high'
          });
        });
        break;
      case 'reincidencia':
        eventos.filter(e => e.reincidente_30d === true).slice(0, 25).forEach((e, i) => {
          const region = regionCenters[i % regionCenters.length];
          const pos = generatePoint(i, 25, region.x, region.y, 60);
          points.push({
            id: `${e.cliente_id}-${e.event_id}`,
            ...pos,
            cliente: e.cliente_nome,
            cidade: e.cliente_cidade || '',
            value: 1,
            severity: 'high'
          });
        });
        break;
    }
    
    return points;
  }, [filaRisco, eventos, metric]);

  const currentMetric = metrics.find(m => m.key === metric)!;

  const severityColors = {
    critical: { fill: 'hsl(0, 84%, 60%)', ring: 'hsl(0, 84%, 70%)' },
    high: { fill: 'hsl(25, 95%, 53%)', ring: 'hsl(25, 95%, 63%)' },
    medium: { fill: 'hsl(45, 93%, 47%)', ring: 'hsl(45, 93%, 57%)' },
    low: { fill: 'hsl(142, 71%, 45%)', ring: 'hsl(142, 71%, 55%)' },
  };

  // Count points per region for heatmap effect
  const regionHeat = useMemo(() => {
    const heat: Record<string, number> = {};
    regions.forEach(r => {
      const regionIndex = regions.indexOf(r);
      const center = [
        { x: 180, y: 80 },
        { x: 340, y: 100 },
        { x: 220, y: 180 },
        { x: 320, y: 270 },
        { x: 240, y: 350 },
      ][regionIndex];
      
      heat[r.id] = dataPoints.filter(p => 
        Math.abs(p.x - center.x) < 80 && Math.abs(p.y - center.y) < 80
      ).length;
    });
    return heat;
  }, [dataPoints]);

  const maxHeat = Math.max(...Object.values(regionHeat), 1);

  return (
    <div className="bg-gradient-to-br from-card via-card to-muted/30 border border-border rounded-2xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-5 py-4 bg-gradient-to-r from-transparent via-muted/20 to-transparent">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl bg-gradient-to-br ${currentMetric.gradient} shadow-lg ${currentMetric.glow}`}>
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Mapa de Concentração</h3>
            <p className="text-xs text-muted-foreground">{dataPoints.length} alertas ativos</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
          {metrics.map(m => {
            const Icon = m.icon;
            const isActive = metric === m.key;
            return (
              <button
                key={m.key}
                onClick={() => onMetricChange(m.key as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-300 ${
                  isActive 
                    ? `bg-gradient-to-r ${m.gradient} text-white shadow-lg ${m.glow}` 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Map Area */}
      <div className="relative p-6">
        <svg 
          viewBox="0 0 500 440" 
          className="w-full h-[320px] md:h-[380px]"
        >
          {/* Background gradient */}
          <defs>
            <linearGradient id="mapBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--muted))" stopOpacity="0.1" />
              <stop offset="50%" stopColor="hsl(var(--muted))" stopOpacity="0.05" />
              <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity="0.15" />
            </linearGradient>
            
            {/* Glow filter */}
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            {/* Pulse animation gradient */}
            <radialGradient id="pulseGradient">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.6" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </radialGradient>

            {/* Region gradients based on heat */}
            {regions.map((region, i) => {
              const heat = regionHeat[region.id] || 0;
              const intensity = heat / maxHeat;
              return (
                <linearGradient key={region.id} id={`region-${region.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={`hsl(var(--primary))`} stopOpacity={0.05 + intensity * 0.15} />
                  <stop offset="100%" stopColor={`hsl(var(--primary))`} stopOpacity={0.02 + intensity * 0.1} />
                </linearGradient>
              );
            })}
          </defs>

          {/* Map background */}
          <rect x="0" y="0" width="500" height="440" fill="url(#mapBg)" rx="16" />

          {/* Decorative grid */}
          <g opacity="0.15">
            {[...Array(10)].map((_, i) => (
              <line key={`h-${i}`} x1="0" y1={i * 44} x2="500" y2={i * 44} stroke="hsl(var(--border))" strokeWidth="0.5" />
            ))}
            {[...Array(12)].map((_, i) => (
              <line key={`v-${i}`} x1={i * 45} y1="0" x2={i * 45} y2="440" stroke="hsl(var(--border))" strokeWidth="0.5" />
            ))}
          </g>

          {/* Regions */}
          {regions.map((region) => {
            const isHovered = hoveredRegion === region.id;
            const heat = regionHeat[region.id] || 0;
            return (
              <g key={region.id}>
                <path
                  d={region.path}
                  fill={`url(#region-${region.id})`}
                  stroke="hsl(var(--border))"
                  strokeWidth={isHovered ? 2 : 1}
                  strokeOpacity={isHovered ? 0.8 : 0.3}
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoveredRegion(region.id)}
                  onMouseLeave={() => setHoveredRegion(null)}
                />
                {heat > 0 && (
                  <text
                    x={region.id === 'norte' ? 180 : region.id === 'nordeste' ? 330 : region.id === 'centro' ? 210 : region.id === 'sudeste' ? 320 : 230}
                    y={region.id === 'norte' ? 85 : region.id === 'nordeste' ? 110 : region.id === 'centro' ? 185 : region.id === 'sudeste' ? 280 : 345}
                    textAnchor="middle"
                    className="text-[10px] font-medium fill-muted-foreground pointer-events-none"
                    opacity={isHovered ? 1 : 0.5}
                  >
                    {heat} alertas
                  </text>
                )}
              </g>
            );
          })}

          {/* Connection lines between nearby critical points */}
          {dataPoints.filter(p => p.severity === 'critical').map((point, i, arr) => {
            const nextPoint = arr[(i + 1) % arr.length];
            if (!nextPoint || i === arr.length - 1) return null;
            return (
              <line
                key={`line-${point.id}`}
                x1={point.x}
                y1={point.y}
                x2={nextPoint.x}
                y2={nextPoint.y}
                stroke={severityColors.critical.fill}
                strokeWidth="1"
                strokeOpacity="0.2"
                strokeDasharray="4 4"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="0"
                  to="8"
                  dur="1s"
                  repeatCount="indefinite"
                />
              </line>
            );
          })}

          {/* Data points */}
          {dataPoints.map((point, i) => {
            const isHovered = hoveredPoint?.id === point.id;
            const colors = severityColors[point.severity];
            const baseSize = point.severity === 'critical' ? 10 : point.severity === 'high' ? 8 : 6;
            
            return (
              <g 
                key={point.id}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint(point)}
                onMouseLeave={() => setHoveredPoint(null)}
                style={{ 
                  animation: `fade-in 0.5s ease-out ${i * 0.03}s both`,
                }}
              >
                {/* Outer pulse ring for critical */}
                {point.severity === 'critical' && (
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={baseSize}
                    fill="none"
                    stroke={colors.ring}
                    strokeWidth="2"
                  >
                    <animate
                      attributeName="r"
                      from={baseSize}
                      to={baseSize + 15}
                      dur="2s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      from="0.6"
                      to="0"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}

                {/* Glow */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isHovered ? baseSize + 8 : baseSize + 4}
                  fill={colors.fill}
                  opacity={isHovered ? 0.4 : 0.2}
                  filter="url(#glow)"
                  className="transition-all duration-300"
                />

                {/* Main marker */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isHovered ? baseSize + 3 : baseSize}
                  fill={colors.fill}
                  stroke="hsl(var(--background))"
                  strokeWidth="2"
                  className="transition-all duration-300"
                  filter={isHovered ? "url(#glow)" : undefined}
                />

                {/* Inner highlight */}
                <circle
                  cx={point.x - baseSize * 0.2}
                  cy={point.y - baseSize * 0.2}
                  r={baseSize * 0.3}
                  fill="white"
                  opacity="0.4"
                />
              </g>
            );
          })}
        </svg>

        {/* Floating tooltip */}
        {hoveredPoint && (
          <div 
            className="absolute z-20 animate-scale-in"
            style={{
              left: `${(hoveredPoint.x / 500) * 100}%`,
              top: `${(hoveredPoint.y / 440) * 100 - 5}%`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="bg-popover/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl p-3 min-w-[180px]">
              <div className="flex items-start gap-2">
                <div 
                  className="w-3 h-3 rounded-full mt-0.5 shadow-lg"
                  style={{ backgroundColor: severityColors[hoveredPoint.severity].fill }}
                />
                <div className="flex-1">
                  <p className="font-semibold text-sm text-foreground leading-tight">{hoveredPoint.cliente}</p>
                  <p className="text-xs text-muted-foreground">{hoveredPoint.cidade}</p>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-border/50">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {metric === 'churn' && 'Score de Risco'}
                    {metric === 'vencido' && 'Valor Vencido'}
                    {metric === 'sinal' && 'Sinal dBm'}
                    {metric === 'detrator' && 'NPS Score'}
                    {metric === 'reincidencia' && 'Status'}
                  </span>
                  <span className="font-bold" style={{ color: severityColors[hoveredPoint.severity].fill }}>
                    {metric === 'churn' && `${hoveredPoint.value}%`}
                    {metric === 'vencido' && `R$ ${hoveredPoint.value.toLocaleString('pt-BR')}`}
                    {metric === 'sinal' && `-${hoveredPoint.value} dBm`}
                    {metric === 'detrator' && hoveredPoint.value}
                    {metric === 'reincidencia' && 'Reincidente'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4">
          {[
            { label: 'Crítico', severity: 'critical' as const },
            { label: 'Alto', severity: 'high' as const },
            { label: 'Médio', severity: 'medium' as const },
          ].map(item => (
            <div key={item.severity} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full shadow-md"
                style={{ backgroundColor: severityColors[item.severity].fill }}
              />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}