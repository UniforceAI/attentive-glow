import { useMemo, useState } from "react";
import { Evento, ClienteRisco, ClienteCobranca } from "@/types/evento";
import { MapPin, AlertTriangle, DollarSign, Wifi, ThumbsDown, RotateCcw, Navigation2, Layers } from "lucide-react";

interface MapSectionProps {
  filaRisco: ClienteRisco[];
  filaCobranca: ClienteCobranca[];
  eventos: Evento[];
  metric: 'churn' | 'vencido' | 'sinal' | 'detrator' | 'reincidencia';
  onMetricChange: (m: 'churn' | 'vencido' | 'sinal' | 'detrator' | 'reincidencia') => void;
}

const metrics = [
  { key: 'churn', label: 'Churn', icon: AlertTriangle },
  { key: 'vencido', label: 'Vencido', icon: DollarSign },
  { key: 'sinal', label: 'Sinal', icon: Wifi },
  { key: 'detrator', label: 'NPS', icon: ThumbsDown },
  { key: 'reincidencia', label: 'Reincid.', icon: RotateCcw },
] as const;

// Brazil states with approximate SVG coordinates and paths
const brazilStates: Record<string, { cx: number; cy: number; path: string; name: string }> = {
  'AC': { cx: 95, cy: 235, path: 'M70,220 L120,215 L125,250 L75,255 Z', name: 'Acre' },
  'AM': { cx: 170, cy: 185, path: 'M100,140 L240,130 L250,220 L110,235 Z', name: 'Amazonas' },
  'AP': { cx: 310, cy: 95, path: 'M290,60 L340,55 L350,120 L295,125 Z', name: 'Amapá' },
  'PA': { cx: 320, cy: 175, path: 'M250,120 L420,110 L430,230 L255,240 Z', name: 'Pará' },
  'RO': { cx: 150, cy: 265, path: 'M120,245 L185,240 L190,290 L125,295 Z', name: 'Rondônia' },
  'RR': { cx: 195, cy: 95, path: 'M165,50 L230,45 L235,130 L170,135 Z', name: 'Roraima' },
  'TO': { cx: 375, cy: 260, path: 'M350,210 L400,205 L410,310 L355,315 Z', name: 'Tocantins' },
  'MA': { cx: 430, cy: 175, path: 'M395,140 L475,130 L485,215 L400,225 Z', name: 'Maranhão' },
  'PI': { cx: 460, cy: 230, path: 'M430,190 L495,185 L500,275 L435,280 Z', name: 'Piauí' },
  'CE': { cx: 520, cy: 175, path: 'M490,145 L555,140 L560,210 L495,215 Z', name: 'Ceará' },
  'RN': { cx: 565, cy: 175, path: 'M545,155 L595,150 L600,200 L550,205 Z', name: 'Rio Grande do Norte' },
  'PB': { cx: 575, cy: 210, path: 'M545,195 L610,190 L615,230 L550,235 Z', name: 'Paraíba' },
  'PE': { cx: 560, cy: 245, path: 'M510,225 L615,220 L620,265 L515,270 Z', name: 'Pernambuco' },
  'AL': { cx: 580, cy: 280, path: 'M555,265 L610,260 L615,300 L560,305 Z', name: 'Alagoas' },
  'SE': { cx: 565, cy: 310, path: 'M545,295 L590,290 L595,330 L550,335 Z', name: 'Sergipe' },
  'BA': { cx: 480, cy: 320, path: 'M410,265 L560,255 L570,390 L420,400 Z', name: 'Bahia' },
  'MT': { cx: 260, cy: 305, path: 'M185,260 L360,250 L370,360 L195,370 Z', name: 'Mato Grosso' },
  'GO': { cx: 375, cy: 355, path: 'M330,320 L430,315 L440,400 L340,405 Z', name: 'Goiás' },
  'DF': { cx: 395, cy: 365, path: 'M385,355 L410,353 L412,378 L387,380 Z', name: 'Distrito Federal' },
  'MS': { cx: 275, cy: 400, path: 'M230,365 L330,360 L340,450 L240,455 Z', name: 'Mato Grosso do Sul' },
  'MG': { cx: 455, cy: 405, path: 'M390,365 L540,355 L550,455 L400,465 Z', name: 'Minas Gerais' },
  'ES': { cx: 545, cy: 420, path: 'M525,395 L575,390 L580,450 L530,455 Z', name: 'Espírito Santo' },
  'RJ': { cx: 510, cy: 465, path: 'M475,445 L545,440 L550,490 L480,495 Z', name: 'Rio de Janeiro' },
  'SP': { cx: 410, cy: 465, path: 'M350,440 L475,435 L480,505 L355,510 Z', name: 'São Paulo' },
  'PR': { cx: 355, cy: 505, path: 'M305,485 L420,480 L425,540 L310,545 Z', name: 'Paraná' },
  'SC': { cx: 355, cy: 555, path: 'M320,540 L400,537 L405,580 L325,583 Z', name: 'Santa Catarina' },
  'RS': { cx: 330, cy: 605, path: 'M280,575 L395,570 L400,650 L285,655 Z', name: 'Rio Grande do Sul' },
};

interface DataPoint {
  id: string;
  x: number;
  y: number;
  uf: string;
  cliente: string;
  cidade: string;
  value: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export function MapSection({ filaRisco, filaCobranca, eventos, metric, onMetricChange }: MapSectionProps) {
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);
  const [hoveredState, setHoveredState] = useState<string | null>(null);

  // Count events per state for heatmap
  const stateStats = useMemo(() => {
    const stats: Record<string, { total: number; critical: number; high: number }> = {};
    eventos.forEach(e => {
      const uf = e.cliente_uf;
      if (uf && brazilStates[uf]) {
        if (!stats[uf]) stats[uf] = { total: 0, critical: 0, high: 0 };
        stats[uf].total++;
        
        if (metric === 'churn' && (e.churn_risk_score || 0) >= 80) stats[uf].critical++;
        else if (metric === 'churn' && (e.churn_risk_score || 0) >= 60) stats[uf].high++;
        else if (metric === 'vencido' && (e.dias_atraso || 0) >= 30) stats[uf].critical++;
        else if (metric === 'vencido' && (e.dias_atraso || 0) >= 15) stats[uf].high++;
      }
    });
    return stats;
  }, [eventos, metric]);

  const maxTotal = Math.max(...Object.values(stateStats).map(s => s.total), 1);

  const dataPoints = useMemo((): DataPoint[] => {
    const points: DataPoint[] = [];
    
    const generatePointInState = (uf: string, index: number): { x: number; y: number } | null => {
      const state = brazilStates[uf];
      if (!state) return null;
      
      const spread = 25;
      const angle = (index * 137.5 * Math.PI / 180); // Golden angle for nice distribution
      const radius = 5 + (index % 5) * 4;
      return {
        x: state.cx + Math.cos(angle) * radius,
        y: state.cy + Math.sin(angle) * radius
      };
    };

    const getSeverity = (score: number): 'low' | 'medium' | 'high' | 'critical' => {
      if (score >= 80) return 'critical';
      if (score >= 60) return 'high';
      if (score >= 40) return 'medium';
      return 'low';
    };
    
    const stateCounters: Record<string, number> = {};
    
    const processEvent = (e: any, getValue: () => { value: number; severity: 'low' | 'medium' | 'high' | 'critical' }) => {
      const uf = e.cliente_uf;
      if (!uf || !brazilStates[uf]) return;
      
      stateCounters[uf] = (stateCounters[uf] || 0) + 1;
      if (stateCounters[uf] > 8) return; // Max 8 points per state for visibility
      
      const pos = generatePointInState(uf, stateCounters[uf]);
      if (!pos) return;
      
      const { value, severity } = getValue();
      points.push({
        id: `${e.cliente_id}-${e.event_id}`,
        ...pos,
        uf,
        cliente: e.cliente_nome,
        cidade: e.cliente_cidade || '',
        value,
        severity
      });
    };

    switch (metric) {
      case 'churn':
        filaRisco.slice(0, 100).forEach((c, i) => {
          const uf = eventos.find(e => String(e.cliente_id) === String(c.cliente_id))?.cliente_uf;
          if (!uf || !brazilStates[uf]) return;
          stateCounters[uf] = (stateCounters[uf] || 0) + 1;
          if (stateCounters[uf] > 8) return;
          const pos = generatePointInState(uf, stateCounters[uf]);
          if (!pos) return;
          points.push({
            id: c.cliente_id,
            ...pos,
            uf,
            cliente: c.cliente_nome,
            cidade: c.cidade,
            value: c.score,
            severity: getSeverity(c.score)
          });
        });
        break;
      case 'vencido':
        eventos.filter(e => e.cobranca_status === 'Vencido').slice(0, 100).forEach(e => {
          processEvent(e, () => ({
            value: e.valor_cobranca || 0,
            severity: (e.dias_atraso || 0) > 30 ? 'critical' : (e.dias_atraso || 0) > 15 ? 'high' : 'medium'
          }));
        });
        break;
      case 'sinal':
        eventos.filter(e => e.alerta_tipo === 'Sinal crítico').slice(0, 100).forEach(e => {
          processEvent(e, () => ({
            value: Math.abs(e.rx_dbm || -25),
            severity: (e.rx_dbm || -20) < -28 ? 'critical' : 'high'
          }));
        });
        break;
      case 'detrator':
        eventos.filter(e => e.event_type === 'NPS' && (e.nps_score || 10) <= 6).slice(0, 100).forEach(e => {
          processEvent(e, () => ({
            value: e.nps_score || 0,
            severity: (e.nps_score || 0) <= 3 ? 'critical' : 'high'
          }));
        });
        break;
      case 'reincidencia':
        eventos.filter(e => e.reincidente_30d === true).slice(0, 100).forEach(e => {
          processEvent(e, () => ({
            value: 1,
            severity: 'high'
          }));
        });
        break;
    }
    
    return points;
  }, [filaRisco, eventos, metric]);

  const severityColors = {
    critical: '#ef4444',
    high: '#f59e0b', 
    medium: '#eab308',
    low: '#22c55e',
  };

  const stats = useMemo(() => ({
    critical: dataPoints.filter(p => p.severity === 'critical').length,
    high: dataPoints.filter(p => p.severity === 'high').length,
    medium: dataPoints.filter(p => p.severity === 'medium').length,
    low: dataPoints.filter(p => p.severity === 'low').length,
    total: dataPoints.length,
    states: Object.keys(stateStats).length
  }), [dataPoints, stateStats]);

  const getStateColor = (uf: string) => {
    const stat = stateStats[uf];
    if (!stat) return 'rgba(14, 165, 233, 0.03)';
    const intensity = stat.total / maxTotal;
    if (stat.critical > 0) return `rgba(239, 68, 68, ${0.1 + intensity * 0.25})`;
    if (stat.high > 0) return `rgba(245, 158, 11, ${0.08 + intensity * 0.2})`;
    return `rgba(14, 165, 233, ${0.05 + intensity * 0.15})`;
  };

  return (
    <div className="bg-[#0a1628] border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700/50 px-5 py-3 bg-gradient-to-r from-slate-900/50 via-slate-800/30 to-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <Navigation2 className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Mapa Brasil - Área de Atuação</h3>
            <p className="text-[11px] text-slate-400">{stats.states} estados • {stats.total} alertas ativos</p>
          </div>
        </div>
        
        {/* Metric toggles */}
        <div className="flex items-center gap-1 bg-slate-800/50 rounded-xl p-1 border border-slate-700/50">
          {metrics.map(m => {
            const Icon = m.icon;
            const isActive = metric === m.key;
            return (
              <button
                key={m.key}
                onClick={() => onMetricChange(m.key as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Map Container */}
      <div className="relative">
        <svg 
          viewBox="0 0 700 700" 
          className="w-full h-[450px] md:h-[520px]"
          style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d1f35 50%, #0a1628 100%)' }}
        >
          <defs>
            <filter id="stateGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            
            <filter id="pointGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="criticalGlow" x="-150%" y="-150%" width="400%" height="400%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* State border gradient */}
            <linearGradient id="stateBorder" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0891b2" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Grid background */}
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e3a5f" strokeWidth="0.3" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" opacity="0.5" />

          {/* Brazil States */}
          {Object.entries(brazilStates).map(([uf, state]) => {
            const isHovered = hoveredState === uf;
            const hasStat = stateStats[uf];
            
            return (
              <g key={uf}>
                {/* State shape */}
                <path
                  d={state.path}
                  fill={getStateColor(uf)}
                  stroke={isHovered ? '#22d3ee' : '#0891b2'}
                  strokeWidth={isHovered ? 2 : 0.8}
                  strokeOpacity={isHovered ? 1 : 0.4}
                  className="cursor-pointer transition-all duration-200"
                  onMouseEnter={() => setHoveredState(uf)}
                  onMouseLeave={() => setHoveredState(null)}
                  filter={isHovered ? 'url(#stateGlow)' : undefined}
                />
                
                {/* State label */}
                <text
                  x={state.cx}
                  y={state.cy}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={isHovered ? '#22d3ee' : '#64748b'}
                  fontSize="10"
                  fontWeight="600"
                  className="pointer-events-none select-none transition-colors duration-200"
                >
                  {uf}
                </text>
                
                {/* State count badge */}
                {hasStat && hasStat.total > 0 && (
                  <g>
                    <circle
                      cx={state.cx + 18}
                      cy={state.cy - 12}
                      r="10"
                      fill={hasStat.critical > 0 ? '#ef4444' : hasStat.high > 0 ? '#f59e0b' : '#0ea5e9'}
                      opacity="0.9"
                    />
                    <text
                      x={state.cx + 18}
                      y={state.cy - 11}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize="8"
                      fontWeight="bold"
                      className="pointer-events-none"
                    >
                      {hasStat.total > 99 ? '99+' : hasStat.total}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Connection lines between critical points */}
          {dataPoints
            .filter(p => p.severity === 'critical')
            .slice(0, 8)
            .map((point, i, arr) => {
              if (i === arr.length - 1) return null;
              const next = arr[i + 1];
              return (
                <line
                  key={`conn-${i}`}
                  x1={point.x}
                  y1={point.y}
                  x2={next.x}
                  y2={next.y}
                  stroke="#ef4444"
                  strokeWidth="1"
                  strokeOpacity="0.25"
                  strokeDasharray="5,5"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="0"
                    to="10"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </line>
              );
            })}

          {/* Data points by severity */}
          {/* Low severity */}
          {dataPoints.filter(p => p.severity === 'low').map((point) => (
            <g 
              key={`low-${point.id}`}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredPoint(point)}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <circle cx={point.x} cy={point.y} r="4" fill={severityColors.low} opacity="0.8" />
            </g>
          ))}

          {/* Medium severity */}
          {dataPoints.filter(p => p.severity === 'medium').map((point) => (
            <g 
              key={`medium-${point.id}`}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredPoint(point)}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <circle cx={point.x} cy={point.y} r="6" fill={severityColors.medium} opacity="0.2" filter="url(#pointGlow)" />
              <circle cx={point.x} cy={point.y} r="4" fill={severityColors.medium} opacity="0.9" />
            </g>
          ))}

          {/* High severity */}
          {dataPoints.filter(p => p.severity === 'high').map((point) => (
            <g 
              key={`high-${point.id}`}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredPoint(point)}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <circle cx={point.x} cy={point.y} r="9" fill={severityColors.high} opacity="0.2" filter="url(#pointGlow)" />
              <circle cx={point.x} cy={point.y} r="5" fill={severityColors.high} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            </g>
          ))}

          {/* Critical - with pulse animation */}
          {dataPoints.filter(p => p.severity === 'critical').map((point) => (
            <g 
              key={`critical-${point.id}`}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredPoint(point)}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <circle cx={point.x} cy={point.y} r="10" fill="none" stroke={severityColors.critical} strokeWidth="1.5" opacity="0.5">
                <animate attributeName="r" from="6" to="16" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx={point.x} cy={point.y} r="12" fill={severityColors.critical} opacity="0.15" filter="url(#criticalGlow)" />
              <circle cx={point.x} cy={point.y} r="5" fill={severityColors.critical} stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
            </g>
          ))}
        </svg>

        {/* Hover tooltip */}
        {hoveredPoint && (
          <div 
            className="absolute z-30 pointer-events-none animate-fade-in"
            style={{
              left: `${(hoveredPoint.x / 700) * 100}%`,
              top: `${(hoveredPoint.y / 700) * 100}%`,
              transform: 'translate(-50%, -130%)',
            }}
          >
            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-600/50 rounded-xl shadow-2xl px-4 py-3 min-w-[200px]">
              <div className="flex items-center gap-2 mb-2">
                <div 
                  className="w-3 h-3 rounded-full shadow-lg"
                  style={{ 
                    backgroundColor: severityColors[hoveredPoint.severity],
                    boxShadow: `0 0 8px ${severityColors[hoveredPoint.severity]}80`
                  }}
                />
                <span className="font-semibold text-white text-sm">{hoveredPoint.cliente}</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Cidade/UF</span>
                  <span className="text-slate-200">{hoveredPoint.cidade || '-'} / {hoveredPoint.uf}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status</span>
                  <span 
                    className="font-medium capitalize"
                    style={{ color: severityColors[hoveredPoint.severity] }}
                  >
                    {hoveredPoint.severity === 'critical' ? 'Crítico' : 
                     hoveredPoint.severity === 'high' ? 'Alto' :
                     hoveredPoint.severity === 'medium' ? 'Médio' : 'Baixo'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* State tooltip */}
        {hoveredState && stateStats[hoveredState] && (
          <div className="absolute top-4 left-4 bg-slate-900/95 backdrop-blur-md border border-cyan-500/30 rounded-xl shadow-2xl px-4 py-3">
            <div className="text-cyan-400 font-semibold">{brazilStates[hoveredState].name}</div>
            <div className="text-slate-400 text-xs mt-1">
              {stateStats[hoveredState].total} eventos
              {stateStats[hoveredState].critical > 0 && (
                <span className="text-red-400 ml-2">• {stateStats[hoveredState].critical} críticos</span>
              )}
            </div>
          </div>
        )}

        {/* Corner stats panel */}
        <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-sm rounded-xl px-4 py-3 border border-slate-700/50">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Total Alertas</div>
          <div className="text-2xl font-bold text-cyan-400">{stats.total}</div>
          <div className="flex gap-2 mt-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[10px] text-slate-400">{stats.critical}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-[10px] text-slate-400">{stats.high}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-[10px] text-slate-400">{stats.medium}</span>
            </div>
          </div>
        </div>

        {/* Layer button */}
        <button className="absolute bottom-4 right-4 p-2 bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-700/50 hover:bg-slate-700/80 transition-colors">
          <Layers className="h-4 w-4 text-slate-400" />
        </button>
      </div>

      {/* Bottom legend */}
      <div className="flex items-center justify-between border-t border-slate-700/50 px-5 py-3 bg-gradient-to-r from-slate-900/80 via-slate-800/50 to-slate-900/80">
        <div className="flex gap-5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/40" />
            <span className="text-xs text-slate-400">Crítico</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500 shadow-lg shadow-amber-500/40" />
            <span className="text-xs text-slate-400">Alto</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-xs text-slate-400">Médio</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-slate-400">Baixo</span>
          </div>
        </div>
        <span className="text-[11px] text-slate-500">{stats.states} estados com cobertura</span>
      </div>
    </div>
  );
}
