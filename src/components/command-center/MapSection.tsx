import { useMemo, useState } from "react";
import { Evento, ClienteRisco, ClienteCobranca } from "@/types/evento";
import { AlertTriangle, DollarSign, Wifi, ThumbsDown, RotateCcw, TrendingDown } from "lucide-react";

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

const cearaCities = [
  { id: 'fortaleza', name: 'Fortaleza', x: 78, y: 22, priority: 1 },
  { id: 'caucaia', name: 'Caucaia', x: 68, y: 26, priority: 2 },
  { id: 'sobral', name: 'Sobral', x: 28, y: 30, priority: 1 },
  { id: 'juazeiro', name: 'Juazeiro do Norte', x: 42, y: 82, priority: 1 },
  { id: 'crato', name: 'Crato', x: 36, y: 88, priority: 2 },
  { id: 'maracanau', name: 'Maracanaú', x: 72, y: 28, priority: 2 },
  { id: 'iguatu', name: 'Iguatu', x: 45, y: 62, priority: 2 },
  { id: 'quixada', name: 'Quixadá', x: 58, y: 42, priority: 2 },
  { id: 'russas', name: 'Russas', x: 82, y: 38, priority: 2 },
  { id: 'crateus', name: 'Crateús', x: 22, y: 52, priority: 2 },
  { id: 'itapipoca', name: 'Itapipoca', x: 50, y: 22, priority: 3 },
  { id: 'aracati', name: 'Aracati', x: 88, y: 34, priority: 3 },
];

interface CityData {
  city: typeof cearaCities[0];
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export function MapSection({ filaRisco, filaCobranca, eventos, metric, onMetricChange }: MapSectionProps) {
  const [hoveredCity, setHoveredCity] = useState<CityData | null>(null);

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

  const getBubbleStyle = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 shadow-red-500/40';
      case 'high': return 'bg-amber-500 shadow-amber-500/40';
      case 'medium': return 'bg-sky-500 shadow-sky-500/40';
      case 'low': return 'bg-emerald-500 shadow-emerald-500/40';
      default: return 'bg-slate-500 shadow-slate-500/40';
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-700/50 bg-[#1a2332]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#1e2a3a] border-b border-slate-700/40">
        <div>
          <h3 className="font-medium text-white text-sm">Ceará — Mapa de Alertas</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">{totalAlerts} alertas ativos</p>
        </div>
        <div className="flex gap-1">
          {metrics.map(m => {
            const Icon = m.icon;
            return (
              <button
                key={m.key}
                onClick={() => onMetricChange(m.key as any)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all
                  ${metric === m.key 
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Map Container */}
      <div 
        className="relative h-[420px] md:h-[480px]"
        style={{
          background: `
            linear-gradient(180deg, #1a2332 0%, #151d2a 100%)
          `
        }}
      >
        {/* Street Grid Pattern - Horizontal lines */}
        <div className="absolute inset-0 opacity-[0.08]">
          {[...Array(20)].map((_, i) => (
            <div 
              key={`h-${i}`} 
              className="absolute w-full h-px bg-slate-400"
              style={{ top: `${(i + 1) * 5}%` }}
            />
          ))}
        </div>
        
        {/* Street Grid Pattern - Vertical lines */}
        <div className="absolute inset-0 opacity-[0.08]">
          {[...Array(20)].map((_, i) => (
            <div 
              key={`v-${i}`} 
              className="absolute h-full w-px bg-slate-400"
              style={{ left: `${(i + 1) * 5}%` }}
            />
          ))}
        </div>

        {/* Main Roads - Thicker lines */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* BR-116: Fortaleza to Juazeiro */}
          <path d="M78,22 Q60,45 42,82" stroke="#2d4a5e" strokeWidth="0.8" fill="none" strokeLinecap="round"/>
          {/* BR-222: Fortaleza to Sobral */}
          <path d="M78,22 L28,30" stroke="#2d4a5e" strokeWidth="0.8" fill="none" strokeLinecap="round"/>
          {/* CE-040: Costa Leste */}
          <path d="M78,22 L88,34" stroke="#2d4a5e" strokeWidth="0.6" fill="none" strokeLinecap="round"/>
          {/* BR-020: Fortaleza to Crateús */}
          <path d="M78,22 Q50,35 22,52" stroke="#2d4a5e" strokeWidth="0.6" fill="none" strokeLinecap="round"/>
          {/* Iguatu connection */}
          <path d="M45,62 L42,82" stroke="#2d4a5e" strokeWidth="0.5" fill="none" strokeLinecap="round"/>
          {/* Russas connection */}
          <path d="M82,38 L58,42" stroke="#2d4a5e" strokeWidth="0.5" fill="none" strokeLinecap="round"/>
          
          {/* Secondary roads */}
          <path d="M68,26 L72,28" stroke="#253545" strokeWidth="0.4" fill="none"/>
          <path d="M72,28 L78,22" stroke="#253545" strokeWidth="0.4" fill="none"/>
          <path d="M50,22 L68,26" stroke="#253545" strokeWidth="0.4" fill="none"/>
          <path d="M58,42 L45,62" stroke="#253545" strokeWidth="0.4" fill="none"/>
          <path d="M36,88 L42,82" stroke="#253545" strokeWidth="0.4" fill="none"/>
        </svg>

        {/* State outline - very subtle */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path 
            d="M15,15 Q30,8 50,10 Q70,8 90,18 Q95,30 92,50 Q88,70 80,85 Q60,98 40,98 Q25,95 15,80 Q8,60 10,40 Q12,25 15,15 Z"
            fill="none"
            stroke="#3b5068"
            strokeWidth="0.3"
            strokeDasharray="1,1"
            opacity="0.5"
          />
        </svg>

        {/* City Markers */}
        {cityData.map((data) => {
          const isHovered = hoveredCity?.city.id === data.city.id;
          const size = data.city.priority === 1 ? 44 : data.city.priority === 2 ? 36 : 28;
          
          return (
            <div
              key={data.city.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
              style={{
                left: `${data.city.x}%`,
                top: `${data.city.y}%`,
                zIndex: isHovered ? 50 : data.city.priority === 1 ? 30 : 20,
              }}
              onMouseEnter={() => setHoveredCity(data)}
              onMouseLeave={() => setHoveredCity(null)}
            >
              {/* Clean circular badge */}
              <div 
                className={`
                  flex items-center justify-center rounded-full
                  font-semibold text-white shadow-lg
                  transition-transform duration-150 ease-out
                  ${getBubbleStyle(data.severity)}
                  ${isHovered ? 'scale-110' : 'scale-100'}
                `}
                style={{ 
                  width: size, 
                  height: size,
                  fontSize: data.city.priority === 1 ? 14 : data.city.priority === 2 ? 12 : 10
                }}
              >
                {data.count}
              </div>

              {/* City label */}
              {(data.city.priority === 1 || isHovered) && (
                <div 
                  className={`
                    absolute left-1/2 -translate-x-1/2 whitespace-nowrap
                    text-[10px] font-medium px-2 py-0.5 rounded
                    transition-opacity duration-150
                    ${isHovered ? 'bg-slate-800 text-white' : 'text-slate-400'}
                  `}
                  style={{ top: size + 4 }}
                >
                  {data.city.name}
                </div>
              )}
            </div>
          );
        })}

        {/* Tooltip */}
        {hoveredCity && (
          <div 
            className="absolute z-[100] pointer-events-none"
            style={{
              left: `${hoveredCity.city.x}%`,
              top: `${hoveredCity.city.y - 12}%`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="bg-slate-900 border border-slate-600/50 rounded-lg shadow-xl px-3 py-2 min-w-[140px]">
              <div className="font-medium text-white text-sm">{hoveredCity.city.name}</div>
              <div className="flex justify-between text-xs mt-1.5">
                <span className="text-slate-400">Alertas</span>
                <span className="text-white">{hoveredCity.count}</span>
              </div>
              <div className="flex justify-between text-xs mt-0.5">
                <span className="text-slate-400">Nível</span>
                <span className={`
                  ${hoveredCity.severity === 'critical' ? 'text-red-400' :
                    hoveredCity.severity === 'high' ? 'text-amber-400' :
                    hoveredCity.severity === 'medium' ? 'text-sky-400' : 'text-emerald-400'}
                `}>
                  {hoveredCity.severity === 'critical' ? 'Crítico' :
                   hoveredCity.severity === 'high' ? 'Alto' :
                   hoveredCity.severity === 'medium' ? 'Médio' : 'Baixo'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-[#1e2a3a] border-t border-slate-700/40">
        <div className="flex gap-5">
          {[
            { color: 'bg-red-500', label: 'Crítico' },
            { color: 'bg-amber-500', label: 'Alto' },
            { color: 'bg-sky-500', label: 'Médio' },
            { color: 'bg-emerald-500', label: 'Baixo' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
              <span className="text-[11px] text-slate-400">{item.label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-slate-500" />
          <span className="text-xs text-slate-400">{cityData.filter(d => d.severity === 'critical' || d.severity === 'high').length} cidades em alerta</span>
        </div>
      </div>
    </div>
  );
}
