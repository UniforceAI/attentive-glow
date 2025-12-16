import { useMemo, useState } from "react";
import { Evento, ClienteRisco, ClienteCobranca } from "@/types/evento";
import { AlertTriangle, DollarSign, Wifi, ThumbsDown, RotateCcw, Users, TrendingDown, Activity } from "lucide-react";

interface MapSectionProps {
  filaRisco: ClienteRisco[];
  filaCobranca: ClienteCobranca[];
  eventos: Evento[];
  metric: 'churn' | 'vencido' | 'sinal' | 'detrator' | 'reincidencia';
  onMetricChange: (m: 'churn' | 'vencido' | 'sinal' | 'detrator' | 'reincidencia') => void;
}

const metrics = [
  { key: 'churn', label: 'Churn', icon: TrendingDown },
  { key: 'vencido', label: 'Vencido', icon: DollarSign },
  { key: 'sinal', label: 'Sinal', icon: Wifi },
  { key: 'detrator', label: 'NPS', icon: ThumbsDown },
  { key: 'reincidencia', label: 'Reincid.', icon: RotateCcw },
] as const;

// Ceará cities
const cearaCities = [
  { id: 'fortaleza', name: 'Fortaleza', x: 520, y: 100, priority: 1 },
  { id: 'caucaia', name: 'Caucaia', x: 450, y: 125, priority: 2 },
  { id: 'sobral', name: 'Sobral', x: 180, y: 140, priority: 1 },
  { id: 'juazeiro', name: 'Juazeiro', x: 280, y: 360, priority: 1 },
  { id: 'crato', name: 'Crato', x: 240, y: 385, priority: 2 },
  { id: 'maracanau', name: 'Maracanaú', x: 485, y: 135, priority: 2 },
  { id: 'iguatu', name: 'Iguatu', x: 300, y: 280, priority: 2 },
  { id: 'quixada', name: 'Quixadá', x: 400, y: 200, priority: 2 },
  { id: 'russas', name: 'Russas', x: 560, y: 175, priority: 2 },
  { id: 'crateus', name: 'Crateús', x: 160, y: 240, priority: 2 },
  { id: 'itapipoca', name: 'Itapipoca', x: 340, y: 105, priority: 3 },
  { id: 'aracati', name: 'Aracati', x: 600, y: 155, priority: 3 },
];

interface CityData {
  city: typeof cearaCities[0];
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export function MapSection({ filaRisco, filaCobranca, eventos, metric, onMetricChange }: MapSectionProps) {
  const [hoveredCity, setHoveredCity] = useState<CityData | null>(null);

  // Road network
  const roads = useMemo(() => {
    const r: { x1: number; y1: number; x2: number; y2: number; type: 'highway' | 'main' | 'secondary' | 'local' }[] = [];
    
    // Major highways
    r.push({ x1: 520, y1: 100, x2: 280, y2: 360, type: 'highway' }); // BR-116
    r.push({ x1: 520, y1: 100, x2: 180, y2: 140, type: 'highway' }); // BR-222
    r.push({ x1: 180, y1: 140, x2: 100, y2: 120, type: 'highway' });
    r.push({ x1: 520, y1: 100, x2: 600, y2: 155, type: 'highway' }); // CE-040
    r.push({ x1: 520, y1: 100, x2: 340, y2: 180, type: 'highway' }); // BR-020
    r.push({ x1: 340, y1: 180, x2: 160, y2: 240, type: 'highway' });
    r.push({ x1: 600, y1: 155, x2: 560, y2: 175, type: 'highway' });
    r.push({ x1: 560, y1: 175, x2: 400, y2: 200, type: 'highway' });
    r.push({ x1: 300, y1: 280, x2: 280, y2: 360, type: 'highway' });

    // Main roads
    [[450, 125, 485, 135], [485, 135, 520, 100], [340, 105, 450, 125], [400, 200, 300, 280], [240, 385, 280, 360]].forEach(([x1, y1, x2, y2]) => {
      r.push({ x1, y1, x2, y2, type: 'main' });
    });

    // Secondary roads
    for (let i = 0; i < 25; i++) {
      const city = cearaCities[Math.floor(Math.random() * cearaCities.length)];
      const angle = Math.random() * Math.PI * 2;
      const len = 30 + Math.random() * 50;
      r.push({
        x1: city.x + (Math.random() - 0.5) * 30,
        y1: city.y + (Math.random() - 0.5) * 30,
        x2: city.x + Math.cos(angle) * len,
        y2: city.y + Math.sin(angle) * len,
        type: 'secondary'
      });
    }

    // Local streets
    for (let i = 0; i < 60; i++) {
      const city = cearaCities[Math.floor(Math.random() * cearaCities.length)];
      const spread = city.priority === 1 ? 40 : 25;
      const angle = Math.random() * Math.PI * 2;
      const len = 10 + Math.random() * 20;
      const sx = city.x + (Math.random() - 0.5) * spread;
      const sy = city.y + (Math.random() - 0.5) * spread;
      r.push({ x1: sx, y1: sy, x2: sx + Math.cos(angle) * len, y2: sy + Math.sin(angle) * len, type: 'local' });
    }

    return r;
  }, []);

  // City data
  const cityData = useMemo((): CityData[] => {
    return cearaCities.map((city) => {
      let count = 0;
      let criticalCount = 0;
      
      switch (metric) {
        case 'churn':
          count = Math.floor(filaRisco.length / cearaCities.length) + (city.priority === 1 ? 15 : city.priority === 2 ? 8 : 3);
          criticalCount = Math.floor(count * 0.3);
          break;
        case 'vencido':
          count = Math.floor(eventos.filter(e => e.cobranca_status === 'Vencido').length / cearaCities.length) + (city.priority === 1 ? 20 : 5);
          criticalCount = Math.floor(count * 0.25);
          break;
        case 'sinal':
          count = Math.floor(eventos.filter(e => e.alerta_tipo === 'Sinal crítico').length / cearaCities.length) + (city.priority === 1 ? 10 : 3);
          criticalCount = Math.floor(count * 0.4);
          break;
        case 'detrator':
          count = Math.floor(eventos.filter(e => (e.nps_score || 10) <= 6).length / cearaCities.length) + (city.priority === 1 ? 12 : 4);
          criticalCount = Math.floor(count * 0.35);
          break;
        case 'reincidencia':
          count = Math.floor(eventos.filter(e => e.reincidente_30d).length / cearaCities.length) + (city.priority === 1 ? 8 : 2);
          criticalCount = Math.floor(count * 0.5);
          break;
      }

      const severity: 'critical' | 'high' | 'medium' | 'low' = 
        criticalCount > count * 0.4 ? 'critical' : 
        criticalCount > count * 0.25 ? 'high' : 
        criticalCount > count * 0.1 ? 'medium' : 'low';

      return { city, count: Math.max(count, 1), severity };
    }).sort((a, b) => b.count - a.count);
  }, [filaRisco, eventos, metric]);

  const totalAlerts = cityData.reduce((sum, d) => sum + d.count, 0);
  const criticalCities = cityData.filter(d => d.severity === 'critical' || d.severity === 'high').length;

  const getBubbleColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-amber-500';
      case 'medium': return 'bg-cyan-500';
      case 'low': return 'bg-emerald-500';
      default: return 'bg-slate-500';
    }
  };

  const getPointerColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-t-red-500';
      case 'high': return 'border-t-amber-500';
      case 'medium': return 'border-t-cyan-500';
      case 'low': return 'border-t-emerald-500';
      default: return 'border-t-slate-500';
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-700/50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700/50 px-5 py-3">
        <div>
          <h3 className="font-semibold text-white text-sm">Mapa de Concentração — Ceará</h3>
          <p className="text-[11px] text-slate-400">{totalAlerts} alertas em {cityData.length} cidades</p>
        </div>
        <div className="flex gap-1.5">
          {metrics.map(m => {
            const Icon = m.icon;
            const isActive = metric === m.key;
            return (
              <button
                key={m.key}
                onClick={() => onMetricChange(m.key as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
                  ${isActive ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Map */}
      <div className="relative">
        <svg viewBox="0 0 700 440" className="w-full h-[400px] md:h-[460px]" style={{ background: '#0c1929' }}>
          <defs>
            <filter id="roadGlow">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id="hwGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0891b2" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Grid */}
          <pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse">
            <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#1e3a5f" strokeWidth="0.3" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" opacity="0.5" />

          {/* State outline */}
          <path 
            d="M100,70 Q200,35 350,45 Q500,35 620,75 Q670,130 640,220 Q610,320 560,380 Q450,430 320,440 Q200,435 130,390 Q80,330 65,250 Q55,160 80,100 Q90,80 100,70 Z"
            fill="rgba(14, 165, 233, 0.03)"
            stroke="#0891b2"
            strokeWidth="0.8"
            strokeOpacity="0.25"
          />

          {/* Roads */}
          {roads.filter(r => r.type === 'local').map((r, i) => (
            <line key={`l-${i}`} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke="#0e7490" strokeWidth="0.4" strokeOpacity="0.3" />
          ))}
          {roads.filter(r => r.type === 'secondary').map((r, i) => (
            <line key={`s-${i}`} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke="#0891b2" strokeWidth="0.8" strokeOpacity="0.4" />
          ))}
          {roads.filter(r => r.type === 'main').map((r, i) => (
            <line key={`m-${i}`} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke="#0ea5e9" strokeWidth="1.2" strokeOpacity="0.5" filter="url(#roadGlow)" />
          ))}
          {roads.filter(r => r.type === 'highway').map((r, i) => (
            <g key={`h-${i}`}>
              <line x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke="#06b6d4" strokeWidth="3" strokeOpacity="0.15" />
              <line x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke="url(#hwGrad)" strokeWidth="2" strokeLinecap="round" filter="url(#roadGlow)" />
            </g>
          ))}

          {/* City dots */}
          {cearaCities.map(c => (
            <circle key={c.id} cx={c.x} cy={c.y} r="3" fill="#22d3ee" opacity="0.4" />
          ))}
        </svg>

        {/* Bubble markers */}
        <div className="absolute inset-0">
          {cityData.map((data, i) => {
            const isHovered = hoveredCity?.city.id === data.city.id;
            const size = data.city.priority === 1 ? 'lg' : data.city.priority === 2 ? 'md' : 'sm';
            
            return (
              <div
                key={data.city.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform duration-200"
                style={{
                  left: `${(data.city.x / 700) * 100}%`,
                  top: `${(data.city.y / 440) * 100}%`,
                  zIndex: isHovered ? 50 : 10,
                  transform: `translate(-50%, -50%) scale(${isHovered ? 1.15 : 1})`,
                }}
                onMouseEnter={() => setHoveredCity(data)}
                onMouseLeave={() => setHoveredCity(null)}
              >
                <div className={`
                  relative flex items-center justify-center rounded-full shadow-lg
                  ${getBubbleColor(data.severity)}
                  ${size === 'lg' ? 'w-12 h-12 text-sm' : size === 'md' ? 'w-10 h-10 text-xs' : 'w-8 h-8 text-[10px]'}
                  font-bold text-white
                  ${isHovered ? 'ring-2 ring-white/40' : ''}
                `}>
                  {data.count}
                  <div className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 
                    border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[7px]
                    ${getPointerColor(data.severity)}`} 
                  />
                </div>
                {(size === 'lg' || isHovered) && (
                  <div className="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-medium text-slate-300 bg-slate-800/90 px-2 py-0.5 rounded">
                    {data.city.name}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Tooltip */}
        {hoveredCity && (
          <div 
            className="absolute z-[100] pointer-events-none"
            style={{
              left: `${(hoveredCity.city.x / 700) * 100}%`,
              top: `${(hoveredCity.city.y / 440) * 100 - 15}%`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="bg-slate-800/95 backdrop-blur border border-slate-600/50 rounded-xl shadow-xl px-4 py-3 min-w-[160px]">
              <div className="font-semibold text-white text-sm mb-1">{hoveredCity.city.name}</div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Alertas</span>
                <span className="text-white font-medium">{hoveredCity.count}</span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-slate-400">Status</span>
                <span className={`font-medium ${
                  hoveredCity.severity === 'critical' ? 'text-red-400' :
                  hoveredCity.severity === 'high' ? 'text-amber-400' :
                  hoveredCity.severity === 'medium' ? 'text-cyan-400' : 'text-emerald-400'
                }`}>
                  {hoveredCity.severity === 'critical' ? 'Crítico' :
                   hoveredCity.severity === 'high' ? 'Alto' :
                   hoveredCity.severity === 'medium' ? 'Médio' : 'Baixo'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="flex items-center justify-between border-t border-slate-700/50 px-5 py-3 bg-slate-800/30">
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs text-slate-400">Crítico</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-xs text-slate-400">Alto</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-cyan-500" />
            <span className="text-xs text-slate-400">Médio</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-400">Baixo</span>
          </div>
        </div>
        <div className="flex gap-5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-semibold text-white">{totalAlerts}</span>
            <span className="text-[10px] text-slate-500">alertas</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold text-white">{criticalCities}</span>
            <span className="text-[10px] text-slate-500">críticos</span>
          </div>
        </div>
      </div>
    </div>
  );
}
