import { useMemo, useState } from "react";
import { Evento, ClienteRisco, ClienteCobranca } from "@/types/evento";
import { AlertTriangle, DollarSign, Wifi, ThumbsDown, RotateCcw, Navigation2, Layers } from "lucide-react";

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

// Ceará regions/cities with approximate positions
const cearaRegions = [
  { id: 'fortaleza', name: 'Fortaleza', cx: 520, cy: 120, size: 'lg' },
  { id: 'caucaia', name: 'Caucaia', cx: 460, cy: 135, size: 'md' },
  { id: 'maracanau', name: 'Maracanaú', cx: 485, cy: 155, size: 'md' },
  { id: 'juazeiro', name: 'Juazeiro do Norte', cx: 280, cy: 380, size: 'lg' },
  { id: 'sobral', name: 'Sobral', cx: 200, cy: 150, size: 'lg' },
  { id: 'crato', name: 'Crato', cx: 260, cy: 400, size: 'md' },
  { id: 'itapipoca', name: 'Itapipoca', cx: 350, cy: 110, size: 'sm' },
  { id: 'maranguape', name: 'Maranguape', cx: 470, cy: 170, size: 'sm' },
  { id: 'iguatu', name: 'Iguatu', cx: 280, cy: 320, size: 'md' },
  { id: 'quixada', name: 'Quixadá', cx: 380, cy: 220, size: 'sm' },
  { id: 'caninde', name: 'Canindé', cx: 340, cy: 180, size: 'sm' },
  { id: 'aracati', name: 'Aracati', cx: 580, cy: 200, size: 'sm' },
  { id: 'russas', name: 'Russas', cx: 520, cy: 230, size: 'sm' },
  { id: 'limoeiro', name: 'Limoeiro do Norte', cx: 490, cy: 260, size: 'sm' },
  { id: 'tiangua', name: 'Tianguá', cx: 140, cy: 130, size: 'sm' },
  { id: 'crateus', name: 'Crateús', cx: 180, cy: 250, size: 'md' },
];

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

  // Generate Ceará road network
  const roads = useMemo(() => {
    const r: { x1: number; y1: number; x2: number; y2: number; type: 'highway' | 'main' | 'secondary' | 'local' }[] = [];
    
    // BR-116 (Fortaleza - Juazeiro)
    r.push({ x1: 520, y1: 120, x2: 280, y2: 380, type: 'highway' });
    // BR-222 (Fortaleza - Sobral - Tianguá)
    r.push({ x1: 520, y1: 120, x2: 200, y2: 150, type: 'highway' });
    r.push({ x1: 200, y1: 150, x2: 140, y2: 130, type: 'highway' });
    // CE-060 (Fortaleza - Baturité)
    r.push({ x1: 520, y1: 120, x2: 450, y2: 200, type: 'highway' });
    // BR-020 (Fortaleza - Canindé - Crateús)
    r.push({ x1: 520, y1: 120, x2: 340, y2: 180, type: 'highway' });
    r.push({ x1: 340, y1: 180, x2: 180, y2: 250, type: 'highway' });
    // CE-040 (Fortaleza - Aracati)
    r.push({ x1: 520, y1: 120, x2: 580, y2: 200, type: 'highway' });
    // BR-304 (Aracati - Russas - Limoeiro)
    r.push({ x1: 580, y1: 200, x2: 520, y2: 230, type: 'highway' });
    r.push({ x1: 520, y1: 230, x2: 490, y2: 260, type: 'highway' });
    // CE-292 (Iguatu - Juazeiro)
    r.push({ x1: 280, y1: 320, x2: 280, y2: 380, type: 'highway' });

    // Main roads connecting cities
    const mainConnections = [
      [460, 135, 485, 155], [485, 155, 470, 170], [350, 110, 200, 150],
      [380, 220, 340, 180], [380, 220, 280, 320], [260, 400, 280, 380],
      [520, 230, 380, 220], [490, 260, 280, 320],
    ];
    mainConnections.forEach(([x1, y1, x2, y2]) => {
      r.push({ x1, y1, x2, y2, type: 'main' });
    });

    // Secondary roads - create a network
    for (let i = 0; i < 30; i++) {
      const region = cearaRegions[Math.floor(Math.random() * cearaRegions.length)];
      const length = 40 + Math.random() * 60;
      const angle = Math.random() * Math.PI * 2;
      r.push({
        x1: region.cx + (Math.random() - 0.5) * 40,
        y1: region.cy + (Math.random() - 0.5) * 40,
        x2: region.cx + Math.cos(angle) * length,
        y2: region.cy + Math.sin(angle) * length,
        type: 'secondary'
      });
    }

    // Local streets around cities
    for (let i = 0; i < 80; i++) {
      const region = cearaRegions[Math.floor(Math.random() * cearaRegions.length)];
      const spread = region.size === 'lg' ? 50 : region.size === 'md' ? 30 : 20;
      const length = 10 + Math.random() * 25;
      const angle = Math.random() * Math.PI * 2;
      const startX = region.cx + (Math.random() - 0.5) * spread;
      const startY = region.cy + (Math.random() - 0.5) * spread;
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

  // City blocks around main cities
  const blocks = useMemo(() => {
    const b: { x: number; y: number; w: number; h: number; opacity: number }[] = [];
    cearaRegions.forEach(region => {
      const count = region.size === 'lg' ? 12 : region.size === 'md' ? 6 : 3;
      const spread = region.size === 'lg' ? 45 : region.size === 'md' ? 25 : 15;
      for (let i = 0; i < count; i++) {
        b.push({
          x: region.cx + (Math.random() - 0.5) * spread * 2,
          y: region.cy + (Math.random() - 0.5) * spread * 2,
          w: 8 + Math.random() * 15,
          h: 6 + Math.random() * 12,
          opacity: 0.03 + Math.random() * 0.05
        });
      }
    });
    return b;
  }, []);

  const dataPoints = useMemo((): DataPoint[] => {
    const points: DataPoint[] = [];
    
    const generatePointNearCity = (index: number): { x: number; y: number; cidade: string } => {
      // Weight distribution - more points around Fortaleza
      const weights = cearaRegions.map(r => r.size === 'lg' ? 4 : r.size === 'md' ? 2 : 1);
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      let rand = Math.random() * totalWeight;
      let region = cearaRegions[0];
      
      for (let i = 0; i < cearaRegions.length; i++) {
        rand -= weights[i];
        if (rand <= 0) {
          region = cearaRegions[i];
          break;
        }
      }
      
      const spread = region.size === 'lg' ? 40 : region.size === 'md' ? 25 : 15;
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * spread;
      
      return {
        x: region.cx + Math.cos(angle) * dist,
        y: region.cy + Math.sin(angle) * dist,
        cidade: region.name
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
        filaRisco.slice(0, 50).forEach((c, i) => {
          const pos = generatePointNearCity(i);
          points.push({
            id: c.cliente_id,
            x: pos.x,
            y: pos.y,
            cliente: c.cliente_nome,
            cidade: c.cidade || pos.cidade,
            value: c.score,
            severity: getSeverity(c.score)
          });
        });
        break;
      case 'vencido':
        eventos.filter(e => e.cobranca_status === 'Vencido').slice(0, 50).forEach((e, i) => {
          const pos = generatePointNearCity(i);
          points.push({
            id: `${e.cliente_id}-${e.event_id}`,
            x: pos.x,
            y: pos.y,
            cliente: e.cliente_nome,
            cidade: e.cliente_cidade || pos.cidade,
            value: e.valor_cobranca || 0,
            severity: (e.dias_atraso || 0) > 30 ? 'critical' : (e.dias_atraso || 0) > 15 ? 'high' : 'medium'
          });
        });
        break;
      case 'sinal':
        eventos.filter(e => e.alerta_tipo === 'Sinal crítico').slice(0, 50).forEach((e, i) => {
          const pos = generatePointNearCity(i);
          points.push({
            id: `${e.cliente_id}-${e.event_id}`,
            x: pos.x,
            y: pos.y,
            cliente: e.cliente_nome,
            cidade: e.cliente_cidade || pos.cidade,
            value: Math.abs(e.rx_dbm || -25),
            severity: (e.rx_dbm || -20) < -28 ? 'critical' : 'high'
          });
        });
        break;
      case 'detrator':
        eventos.filter(e => e.event_type === 'NPS' && (e.nps_score || 10) <= 6).slice(0, 50).forEach((e, i) => {
          const pos = generatePointNearCity(i);
          points.push({
            id: `${e.cliente_id}-${e.event_id}`,
            x: pos.x,
            y: pos.y,
            cliente: e.cliente_nome,
            cidade: e.cliente_cidade || pos.cidade,
            value: e.nps_score || 0,
            severity: (e.nps_score || 0) <= 3 ? 'critical' : 'high'
          });
        });
        break;
      case 'reincidencia':
        eventos.filter(e => e.reincidente_30d === true).slice(0, 50).forEach((e, i) => {
          const pos = generatePointNearCity(i);
          points.push({
            id: `${e.cliente_id}-${e.event_id}`,
            x: pos.x,
            y: pos.y,
            cliente: e.cliente_nome,
            cidade: e.cliente_cidade || pos.cidade,
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
            <h3 className="font-semibold text-white text-sm">Mapa de Operações — Ceará</h3>
            <p className="text-[11px] text-slate-400">{stats.total} alertas • {stats.critical} críticos • {stats.high} altos</p>
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
          viewBox="0 0 700 480" 
          className="w-full h-[420px] md:h-[500px]"
          style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d1f35 50%, #0a1628 100%)' }}
        >
          <defs>
            <filter id="roadGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
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

            <linearGradient id="highwayGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0891b2" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#06b6d4" stopOpacity="1" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0.9" />
            </linearGradient>

            {/* Ceará state outline (simplified) */}
            <clipPath id="cearaClip">
              <path d="M80,80 Q150,50 300,60 Q450,50 600,80 Q650,120 620,200 Q600,280 580,350 Q500,420 400,450 Q300,460 220,440 Q150,400 120,350 Q90,280 80,200 Q70,120 80,80 Z" />
            </clipPath>
          </defs>

          {/* Background grid */}
          <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1e3a5f" strokeWidth="0.3" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" opacity="0.4" />

          {/* Ceará state subtle outline */}
          <path 
            d="M80,80 Q150,50 300,60 Q450,50 600,80 Q650,120 620,200 Q600,280 580,350 Q500,420 400,450 Q300,460 220,440 Q150,400 120,350 Q90,280 80,200 Q70,120 80,80 Z"
            fill="rgba(14, 165, 233, 0.03)"
            stroke="#0891b2"
            strokeWidth="1"
            strokeOpacity="0.2"
          />

          {/* City blocks */}
          {blocks.map((block, i) => (
            <rect
              key={`block-${i}`}
              x={block.x}
              y={block.y}
              width={block.w}
              height={block.h}
              fill="#0ea5e9"
              opacity={block.opacity}
              rx="1"
            />
          ))}

          {/* Local streets */}
          {roads.filter(r => r.type === 'local').map((road, i) => (
            <line
              key={`local-${i}`}
              x1={road.x1}
              y1={road.y1}
              x2={road.x2}
              y2={road.y2}
              stroke="#0e7490"
              strokeWidth="0.5"
              strokeOpacity="0.3"
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

          {/* Highways */}
          {roads.filter(r => r.type === 'highway').map((road, i) => (
            <g key={`highway-${i}`}>
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

          {/* City labels */}
          {cearaRegions.map((region) => (
            <g key={region.id}>
              <circle
                cx={region.cx}
                cy={region.cy}
                r={region.size === 'lg' ? 18 : region.size === 'md' ? 12 : 8}
                fill="#0ea5e9"
                opacity="0.08"
              />
              <circle
                cx={region.cx}
                cy={region.cy}
                r="3"
                fill="#22d3ee"
                opacity="0.6"
              />
              <text
                x={region.cx}
                y={region.cy + (region.size === 'lg' ? 28 : region.size === 'md' ? 22 : 18)}
                textAnchor="middle"
                fill="#64748b"
                fontSize={region.size === 'lg' ? "10" : "8"}
                fontWeight="500"
                className="select-none"
              >
                {region.name}
              </text>
            </g>
          ))}

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
              top: `${(hoveredPoint.y / 480) * 100}%`,
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
                  <span className="text-slate-200">{hoveredPoint.cidade}</span>
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

        {/* Corner stats */}
        <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-sm rounded-xl px-4 py-3 border border-slate-700/50">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Ceará</div>
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
        <span className="text-[11px] text-slate-500">Passe o mouse para detalhes</span>
      </div>
    </div>
  );
}
