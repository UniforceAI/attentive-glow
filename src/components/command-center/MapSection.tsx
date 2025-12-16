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

interface DataPoint {
  id: string;
  x: number;
  y: number;
  cliente: string;
  cidade: string;
  value: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export function MapSection({ filaRisco, filaCobranca, eventos, metric, onMetricChange }: MapSectionProps) {
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);

  // Generate realistic road network
  const roads = useMemo(() => {
    const r: { x1: number; y1: number; x2: number; y2: number; type: 'highway' | 'main' | 'secondary' | 'local' }[] = [];
    
    // Highways - major arteries
    const highways = [
      { x1: 0, y1: 180, x2: 700, y2: 200, curve: 20 },
      { x1: 150, y1: 0, x2: 180, y2: 450, curve: 15 },
      { x1: 0, y1: 350, x2: 700, y2: 320, curve: -25 },
      { x1: 450, y1: 0, x2: 420, y2: 450, curve: -10 },
      { x1: 0, y1: 80, x2: 550, y2: 60, curve: 15 },
    ];
    highways.forEach(h => r.push({ ...h, type: 'highway' }));

    // Main roads - connect highways
    for (let i = 0; i < 12; i++) {
      const startX = 50 + Math.random() * 600;
      const startY = 30 + Math.random() * 380;
      const length = 80 + Math.random() * 150;
      const angle = Math.random() * Math.PI;
      r.push({
        x1: startX,
        y1: startY,
        x2: startX + Math.cos(angle) * length,
        y2: startY + Math.sin(angle) * length,
        type: 'main'
      });
    }

    // Secondary roads - neighborhood connectors
    for (let i = 0; i < 25; i++) {
      const startX = 30 + Math.random() * 640;
      const startY = 20 + Math.random() * 400;
      const length = 40 + Math.random() * 80;
      const angle = Math.random() * Math.PI * 2;
      r.push({
        x1: startX,
        y1: startY,
        x2: startX + Math.cos(angle) * length,
        y2: startY + Math.sin(angle) * length,
        type: 'secondary'
      });
    }

    // Local streets - fine grid
    for (let i = 0; i < 60; i++) {
      const startX = 20 + Math.random() * 660;
      const startY = 10 + Math.random() * 420;
      const length = 15 + Math.random() * 40;
      const angle = Math.random() * Math.PI * 2;
      r.push({
        x1: startX,
        y1: startY,
        x2: startX + Math.cos(angle) * length,
        y2: startY + Math.sin(angle) * length,
        type: 'local'
      });
    }

    return r;
  }, []);

  // City blocks / districts
  const blocks = useMemo(() => {
    const b: { x: number; y: number; w: number; h: number; opacity: number }[] = [];
    for (let i = 0; i < 40; i++) {
      b.push({
        x: 20 + Math.random() * 620,
        y: 15 + Math.random() * 390,
        w: 20 + Math.random() * 50,
        h: 15 + Math.random() * 40,
        opacity: 0.02 + Math.random() * 0.06
      });
    }
    return b;
  }, []);

  // Landmarks / POIs
  const landmarks = useMemo(() => [
    { x: 350, y: 220, name: 'Centro', size: 'lg' },
    { x: 180, y: 120, name: 'Norte', size: 'md' },
    { x: 520, y: 150, name: 'Leste', size: 'md' },
    { x: 150, y: 320, name: 'Oeste', size: 'md' },
    { x: 400, y: 380, name: 'Sul', size: 'md' },
  ], []);

  const dataPoints = useMemo((): DataPoint[] => {
    const points: DataPoint[] = [];
    
    const generatePoint = (index: number, total: number): { x: number; y: number } => {
      // Cluster points around city centers
      const centers = [
        { x: 350, y: 220, weight: 0.35 },
        { x: 180, y: 120, weight: 0.2 },
        { x: 520, y: 150, weight: 0.15 },
        { x: 150, y: 320, weight: 0.15 },
        { x: 400, y: 380, weight: 0.15 },
      ];
      
      // Pick center based on weight
      let rand = Math.random();
      let center = centers[0];
      for (const c of centers) {
        rand -= c.weight;
        if (rand <= 0) {
          center = c;
          break;
        }
      }
      
      const spread = 60 + Math.random() * 40;
      const angle = Math.random() * Math.PI * 2;
      return {
        x: center.x + Math.cos(angle) * spread * Math.random(),
        y: center.y + Math.sin(angle) * spread * Math.random()
      };
    };

    const getSeverity = (score: number): 'low' | 'medium' | 'high' | 'critical' => {
      if (score >= 80) return 'critical';
      if (score >= 60) return 'high';
      if (score >= 40) return 'medium';
      return 'low';
    };
    
    switch (metric) {
      case 'churn':
        filaRisco.slice(0, 35).forEach((c, i) => {
          const pos = generatePoint(i, 35);
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
        eventos.filter(e => e.cobranca_status === 'Vencido').slice(0, 35).forEach((e, i) => {
          const pos = generatePoint(i, 35);
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
        eventos.filter(e => e.alerta_tipo === 'Sinal crítico').slice(0, 35).forEach((e, i) => {
          const pos = generatePoint(i, 35);
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
        eventos.filter(e => e.event_type === 'NPS' && (e.nps_score || 10) <= 6).slice(0, 35).forEach((e, i) => {
          const pos = generatePoint(i, 35);
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
        eventos.filter(e => e.reincidente_30d === true).slice(0, 35).forEach((e, i) => {
          const pos = generatePoint(i, 35);
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
    total: dataPoints.length
  }), [dataPoints]);

  return (
    <div className="bg-[#0a1628] border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700/50 px-5 py-3 bg-gradient-to-r from-slate-900/50 via-slate-800/30 to-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <Navigation2 className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Mapa de Operações</h3>
            <p className="text-[11px] text-slate-400">{stats.total} pontos ativos na região</p>
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
          viewBox="0 0 700 450" 
          className="w-full h-[400px] md:h-[480px]"
          style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d1f35 50%, #0a1628 100%)' }}
        >
          <defs>
            {/* Road glow effect */}
            <filter id="roadGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            
            {/* Point glow */}
            <filter id="pointGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Critical pulse glow */}
            <filter id="criticalGlow" x="-150%" y="-150%" width="400%" height="400%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Gradient for highway */}
            <linearGradient id="highwayGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0891b2" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#06b6d4" stopOpacity="1" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* City blocks background */}
          {blocks.map((block, i) => (
            <rect
              key={`block-${i}`}
              x={block.x}
              y={block.y}
              width={block.w}
              height={block.h}
              fill="#0ea5e9"
              opacity={block.opacity}
              rx="2"
            />
          ))}

          {/* Local streets - finest layer */}
          {roads.filter(r => r.type === 'local').map((road, i) => (
            <line
              key={`local-${i}`}
              x1={road.x1}
              y1={road.y1}
              x2={road.x2}
              y2={road.y2}
              stroke="#0e7490"
              strokeWidth="0.5"
              strokeOpacity="0.25"
              strokeLinecap="round"
            />
          ))}

          {/* Secondary roads */}
          {roads.filter(r => r.type === 'secondary').map((road, i) => (
            <line
              key={`secondary-${i}`}
              x1={road.x1}
              y1={road.y1}
              x2={road.x2}
              y2={road.y2}
              stroke="#0891b2"
              strokeWidth="1"
              strokeOpacity="0.4"
              strokeLinecap="round"
            />
          ))}

          {/* Main roads */}
          {roads.filter(r => r.type === 'main').map((road, i) => (
            <line
              key={`main-${i}`}
              x1={road.x1}
              y1={road.y1}
              x2={road.x2}
              y2={road.y2}
              stroke="#0ea5e9"
              strokeWidth="1.5"
              strokeOpacity="0.6"
              strokeLinecap="round"
              filter="url(#roadGlow)"
            />
          ))}

          {/* Highways - most prominent */}
          {roads.filter(r => r.type === 'highway').map((road, i) => (
            <g key={`highway-${i}`}>
              {/* Glow layer */}
              <line
                x1={road.x1}
                y1={road.y1}
                x2={road.x2}
                y2={road.y2}
                stroke="#06b6d4"
                strokeWidth="4"
                strokeOpacity="0.15"
                strokeLinecap="round"
              />
              {/* Main road */}
              <line
                x1={road.x1}
                y1={road.y1}
                x2={road.x2}
                y2={road.y2}
                stroke="url(#highwayGradient)"
                strokeWidth="2.5"
                strokeLinecap="round"
                filter="url(#roadGlow)"
              />
            </g>
          ))}

          {/* Landmark labels */}
          {landmarks.map((lm, i) => (
            <g key={`landmark-${i}`}>
              <circle
                cx={lm.x}
                cy={lm.y}
                r={lm.size === 'lg' ? 25 : 18}
                fill="#0ea5e9"
                opacity="0.05"
              />
              <text
                x={lm.x}
                y={lm.y + 4}
                textAnchor="middle"
                fill="#64748b"
                fontSize={lm.size === 'lg' ? "11" : "9"}
                fontWeight="500"
                className="select-none"
              >
                {lm.name}
              </text>
            </g>
          ))}

          {/* Connection lines between critical points */}
          {dataPoints
            .filter(p => p.severity === 'critical')
            .slice(0, 6)
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
                  strokeOpacity="0.3"
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

          {/* Data points - layered by severity */}
          {/* Low severity first (back) */}
          {dataPoints.filter(p => p.severity === 'low').map((point, i) => (
            <g 
              key={`low-${point.id}`}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredPoint(point)}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <circle
                cx={point.x}
                cy={point.y}
                r="5"
                fill={severityColors.low}
                opacity="0.8"
              />
            </g>
          ))}

          {/* Medium severity */}
          {dataPoints.filter(p => p.severity === 'medium').map((point, i) => (
            <g 
              key={`medium-${point.id}`}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredPoint(point)}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <circle
                cx={point.x}
                cy={point.y}
                r="7"
                fill={severityColors.medium}
                opacity="0.15"
                filter="url(#pointGlow)"
              />
              <circle
                cx={point.x}
                cy={point.y}
                r="5"
                fill={severityColors.medium}
                opacity="0.9"
              />
            </g>
          ))}

          {/* High severity */}
          {dataPoints.filter(p => p.severity === 'high').map((point, i) => (
            <g 
              key={`high-${point.id}`}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredPoint(point)}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <circle
                cx={point.x}
                cy={point.y}
                r="10"
                fill={severityColors.high}
                opacity="0.2"
                filter="url(#pointGlow)"
              />
              <circle
                cx={point.x}
                cy={point.y}
                r="6"
                fill={severityColors.high}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="1"
              />
            </g>
          ))}

          {/* Critical - top layer with animation */}
          {dataPoints.filter(p => p.severity === 'critical').map((point, i) => (
            <g 
              key={`critical-${point.id}`}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredPoint(point)}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              {/* Outer pulse ring */}
              <circle
                cx={point.x}
                cy={point.y}
                r="12"
                fill="none"
                stroke={severityColors.critical}
                strokeWidth="1.5"
                opacity="0.5"
              >
                <animate
                  attributeName="r"
                  from="8"
                  to="20"
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
              {/* Glow */}
              <circle
                cx={point.x}
                cy={point.y}
                r="14"
                fill={severityColors.critical}
                opacity="0.15"
                filter="url(#criticalGlow)"
              />
              {/* Inner ring */}
              <circle
                cx={point.x}
                cy={point.y}
                r="9"
                fill={severityColors.critical}
                opacity="0.3"
              />
              {/* Core */}
              <circle
                cx={point.x}
                cy={point.y}
                r="6"
                fill={severityColors.critical}
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="1.5"
              />
            </g>
          ))}
        </svg>

        {/* Hover tooltip */}
        {hoveredPoint && (
          <div 
            className="absolute z-30 pointer-events-none animate-fade-in"
            style={{
              left: `${(hoveredPoint.x / 700) * 100}%`,
              top: `${(hoveredPoint.y / 450) * 100}%`,
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
                  <span className="text-slate-400">Cidade</span>
                  <span className="text-slate-200">{hoveredPoint.cidade || 'N/A'}</span>
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

        {/* Corner stats panel */}
        <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-sm rounded-xl px-4 py-3 border border-slate-700/50">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Alertas</div>
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

        {/* Layer button (decorative) */}
        <button className="absolute bottom-4 right-4 p-2 bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-700/50 hover:bg-slate-700/80 transition-colors">
          <Layers className="h-4 w-4 text-slate-400" />
        </button>
      </div>

      {/* Bottom legend bar */}
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
        <span className="text-[11px] text-slate-500">Passe o mouse sobre os pontos para detalhes</span>
      </div>
    </div>
  );
}
