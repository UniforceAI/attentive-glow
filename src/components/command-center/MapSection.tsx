import { useMemo, useState } from "react";
import { Evento, ClienteRisco, ClienteCobranca } from "@/types/evento";
import { AlertTriangle, DollarSign, Wifi, ThumbsDown, RotateCcw, Users, TrendingDown, Zap, Activity } from "lucide-react";

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

// Ceará cities with positions for bubble placement
const cearaCities = [
  { id: 'fortaleza', name: 'Fortaleza', x: 520, y: 100, priority: 1 },
  { id: 'caucaia', name: 'Caucaia', x: 450, y: 120, priority: 2 },
  { id: 'sobral', name: 'Sobral', x: 180, y: 140, priority: 1 },
  { id: 'juazeiro', name: 'Juazeiro', x: 280, y: 360, priority: 1 },
  { id: 'crato', name: 'Crato', x: 240, y: 390, priority: 2 },
  { id: 'maracanau', name: 'Maracanaú', x: 480, y: 140, priority: 2 },
  { id: 'iguatu', name: 'Iguatu', x: 300, y: 280, priority: 2 },
  { id: 'quixada', name: 'Quixadá', x: 400, y: 200, priority: 2 },
  { id: 'russas', name: 'Russas', x: 560, y: 180, priority: 2 },
  { id: 'crateus', name: 'Crateús', x: 160, y: 240, priority: 2 },
  { id: 'itapipoca', name: 'Itapipoca', x: 340, y: 100, priority: 3 },
  { id: 'aracati', name: 'Aracati', x: 600, y: 160, priority: 3 },
];

interface CityData {
  city: typeof cearaCities[0];
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export function MapSection({ filaRisco, filaCobranca, eventos, metric, onMetricChange }: MapSectionProps) {
  const [hoveredCity, setHoveredCity] = useState<CityData | null>(null);

  // Aggregate data per city
  const cityData = useMemo((): CityData[] => {
    const data: CityData[] = [];
    
    cearaCities.forEach((city, idx) => {
      // Simulated distribution - in real app would match cliente_cidade
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

      const severity = criticalCount > count * 0.4 ? 'critical' : 
                       criticalCount > count * 0.25 ? 'high' : 
                       criticalCount > count * 0.1 ? 'medium' : 'low';

      data.push({ city, count: Math.max(count, 1), severity });
    });

    return data.sort((a, b) => b.count - a.count);
  }, [filaRisco, eventos, metric]);

  const totalAlerts = cityData.reduce((sum, d) => sum + d.count, 0);
  const criticalCities = cityData.filter(d => d.severity === 'critical' || d.severity === 'high').length;

  const getBubbleColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'from-rose-500 to-red-600';
      case 'high': return 'from-amber-400 to-orange-500';
      case 'medium': return 'from-violet-400 to-purple-500';
      case 'low': return 'from-emerald-400 to-green-500';
      default: return 'from-slate-400 to-slate-500';
    }
  };

  const getBubbleShadow = (severity: string) => {
    switch (severity) {
      case 'critical': return 'shadow-rose-500/50';
      case 'high': return 'shadow-amber-500/50';
      case 'medium': return 'shadow-violet-500/40';
      case 'low': return 'shadow-emerald-500/40';
      default: return 'shadow-slate-500/30';
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(180deg, #1a1035 0%, #0f0a1e 100%)' }}>
      {/* Header gradient bar */}
      <div className="h-1.5 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500" />
      
      {/* Title */}
      <div className="text-center pt-5 pb-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400 font-medium">
          Mapa de Concentração — Ceará
        </p>
      </div>

      {/* Map Container */}
      <div className="relative px-4 pb-4">
        <svg 
          viewBox="0 0 700 420" 
          className="w-full h-[380px] md:h-[420px]"
        >
          <defs>
            {/* Ceará state silhouette path */}
            <path 
              id="cearaShape"
              d="M100,80 Q180,40 320,50 Q480,40 600,70 Q660,110 640,180 Q620,260 590,330 Q520,400 400,420 Q280,430 180,400 Q120,360 90,300 Q60,220 70,150 Q80,100 100,80 Z"
            />
            
            <filter id="mapGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="15" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grid pattern */}
          <pattern id="dotGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.5" fill="#3b2d5c" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#dotGrid)" opacity="0.5" />

          {/* State silhouette - subtle glow */}
          <use 
            href="#cearaShape" 
            fill="none" 
            stroke="url(#stateGradient)"
            strokeWidth="1"
            opacity="0.3"
          />
          <use 
            href="#cearaShape" 
            fill="#2a1f4e" 
            opacity="0.3"
          />

          <linearGradient id="stateGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#d946ef" stopOpacity="0.3" />
          </linearGradient>

          {/* Subtle internal lines suggesting regions */}
          <path 
            d="M350,50 Q360,200 350,400" 
            stroke="#4c3a7a" 
            strokeWidth="0.5" 
            fill="none" 
            opacity="0.4"
          />
          <path 
            d="M100,200 Q350,220 640,200" 
            stroke="#4c3a7a" 
            strokeWidth="0.5" 
            fill="none" 
            opacity="0.4"
          />
        </svg>

        {/* Bubble markers overlaid on map */}
        <div className="absolute inset-0 px-4">
          {cityData.map((data, i) => {
            const isHovered = hoveredCity?.city.id === data.city.id;
            const size = data.city.priority === 1 ? 'lg' : data.city.priority === 2 ? 'md' : 'sm';
            
            return (
              <div
                key={data.city.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300"
                style={{
                  left: `${(data.city.x / 700) * 100}%`,
                  top: `${(data.city.y / 420) * 100}%`,
                  zIndex: isHovered ? 50 : 10 + (12 - i),
                  transform: `translate(-50%, -50%) scale(${isHovered ? 1.15 : 1})`,
                }}
                onMouseEnter={() => setHoveredCity(data)}
                onMouseLeave={() => setHoveredCity(null)}
              >
                {/* Speech bubble shape */}
                <div className={`
                  relative flex items-center justify-center
                  bg-gradient-to-br ${getBubbleColor(data.severity)}
                  rounded-full shadow-lg ${getBubbleShadow(data.severity)}
                  ${size === 'lg' ? 'w-14 h-14 text-base' : size === 'md' ? 'w-11 h-11 text-sm' : 'w-9 h-9 text-xs'}
                  font-bold text-white
                  transition-all duration-200
                  ${isHovered ? 'ring-2 ring-white/30' : ''}
                `}>
                  {data.count}
                  
                  {/* Bubble pointer */}
                  <div 
                    className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 
                    border-l-[6px] border-l-transparent 
                    border-r-[6px] border-r-transparent 
                    border-t-[8px]
                    ${data.severity === 'critical' ? 'border-t-red-600' :
                      data.severity === 'high' ? 'border-t-orange-500' :
                      data.severity === 'medium' ? 'border-t-purple-500' :
                      'border-t-green-500'
                    }`}
                  />
                </div>

                {/* City name label */}
                {(size === 'lg' || isHovered) && (
                  <div className={`
                    absolute top-full mt-3 left-1/2 -translate-x-1/2 whitespace-nowrap
                    text-[10px] font-medium text-slate-300 bg-slate-900/80 
                    px-2 py-0.5 rounded-full backdrop-blur-sm
                    ${isHovered ? 'opacity-100' : 'opacity-80'}
                  `}>
                    {data.city.name}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Hover tooltip */}
        {hoveredCity && (
          <div 
            className="absolute z-[100] pointer-events-none animate-fade-in"
            style={{
              left: `${(hoveredCity.city.x / 700) * 100}%`,
              top: `${(hoveredCity.city.y / 420) * 100 - 18}%`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="bg-slate-900/95 backdrop-blur-md border border-violet-500/30 rounded-xl shadow-2xl shadow-violet-500/20 px-4 py-3 min-w-[180px]">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${getBubbleColor(hoveredCity.severity)}`} />
                <span className="font-semibold text-white">{hoveredCity.city.name}</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Alertas</span>
                  <span className="text-white font-medium">{hoveredCity.count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Severidade</span>
                  <span className={`font-medium capitalize
                    ${hoveredCity.severity === 'critical' ? 'text-rose-400' :
                      hoveredCity.severity === 'high' ? 'text-amber-400' :
                      hoveredCity.severity === 'medium' ? 'text-violet-400' :
                      'text-emerald-400'
                    }`}>
                    {hoveredCity.severity === 'critical' ? 'Crítico' :
                     hoveredCity.severity === 'high' ? 'Alto' :
                     hoveredCity.severity === 'medium' ? 'Médio' : 'Baixo'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom stats bar */}
      <div className="border-t border-violet-500/20 bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Metric pills */}
          <div className="flex gap-1.5">
            {metrics.map(m => {
              const Icon = m.icon;
              const isActive = metric === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => onMetricChange(m.key as any)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                    transition-all duration-200
                    ${isActive 
                      ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30' 
                      : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }
                  `}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Summary stats */}
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-violet-500/10">
                <Activity className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <div className="text-lg font-bold text-white">{totalAlerts}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Total</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-500/10">
                <AlertTriangle className="h-4 w-4 text-rose-400" />
              </div>
              <div>
                <div className="text-lg font-bold text-white">{criticalCities}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Críticos</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10">
                <Users className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <div className="text-lg font-bold text-white">{cityData.length}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Cidades</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
