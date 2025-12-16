import { useMemo, useState, useEffect } from "react";
import { Evento, ClienteRisco, ClienteCobranca } from "@/types/evento";
import { AlertTriangle, DollarSign, Wifi, ThumbsDown, RotateCcw, TrendingDown } from "lucide-react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

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

// Real coordinates for Ceará cities
const cearaCities = [
  { id: 'fortaleza', name: 'Fortaleza', lat: -3.7172, lng: -38.5433, priority: 1 },
  { id: 'caucaia', name: 'Caucaia', lat: -3.7361, lng: -38.6531, priority: 2 },
  { id: 'sobral', name: 'Sobral', lat: -3.6894, lng: -40.3481, priority: 1 },
  { id: 'juazeiro', name: 'Juazeiro do Norte', lat: -7.2131, lng: -39.3150, priority: 1 },
  { id: 'crato', name: 'Crato', lat: -7.2356, lng: -39.4097, priority: 2 },
  { id: 'maracanau', name: 'Maracanaú', lat: -3.8769, lng: -38.6253, priority: 2 },
  { id: 'iguatu', name: 'Iguatu', lat: -6.3597, lng: -39.2986, priority: 2 },
  { id: 'quixada', name: 'Quixadá', lat: -4.9706, lng: -39.0147, priority: 2 },
  { id: 'russas', name: 'Russas', lat: -4.9403, lng: -37.9756, priority: 2 },
  { id: 'crateus', name: 'Crateús', lat: -5.1783, lng: -40.6778, priority: 2 },
  { id: 'itapipoca', name: 'Itapipoca', lat: -3.4944, lng: -39.5786, priority: 3 },
  { id: 'aracati', name: 'Aracati', lat: -4.5617, lng: -37.7697, priority: 3 },
  { id: 'tiangua', name: 'Tianguá', lat: -3.7294, lng: -40.9925, priority: 3 },
  { id: 'caninde', name: 'Canindé', lat: -4.3589, lng: -39.3117, priority: 3 },
];

interface CityData {
  city: typeof cearaCities[0];
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Component to handle map dark theme
function DarkMapStyle() {
  const map = useMap();
  
  useEffect(() => {
    const container = map.getContainer();
    container.style.background = '#1a2332';
  }, [map]);
  
  return null;
}

export function MapSection({ filaRisco, filaCobranca, eventos, metric, onMetricChange }: MapSectionProps) {
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);

  const cityData = useMemo((): CityData[] => {
    return cearaCities.map((city) => {
      let count = 0;
      let criticalCount = 0;
      
      switch (metric) {
        case 'churn':
          count = Math.floor(filaRisco.length / cearaCities.length) + (city.priority === 1 ? 18 : city.priority === 2 ? 10 : 4);
          criticalCount = Math.floor(count * (city.priority === 1 ? 0.4 : 0.25));
          break;
        case 'vencido':
          count = Math.floor(eventos.filter(e => e.cobranca_status === 'Vencido').length / cearaCities.length) + (city.priority === 1 ? 22 : 6);
          criticalCount = Math.floor(count * 0.3);
          break;
        case 'sinal':
          count = Math.floor(eventos.filter(e => e.alerta_tipo === 'Sinal crítico').length / cearaCities.length) + (city.priority === 1 ? 12 : 4);
          criticalCount = Math.floor(count * 0.35);
          break;
        case 'detrator':
          count = Math.floor(eventos.filter(e => (e.nps_score || 10) <= 6).length / cearaCities.length) + (city.priority === 1 ? 14 : 5);
          criticalCount = Math.floor(count * 0.3);
          break;
        case 'reincidencia':
          count = Math.floor(eventos.filter(e => e.reincidente_30d).length / cearaCities.length) + (city.priority === 1 ? 10 : 3);
          criticalCount = Math.floor(count * 0.45);
          break;
      }

      const severity: 'critical' | 'high' | 'medium' | 'low' = 
        criticalCount > count * 0.35 ? 'critical' : 
        criticalCount > count * 0.2 ? 'high' : 
        criticalCount > count * 0.1 ? 'medium' : 'low';

      return { city, count: Math.max(count, 1), severity };
    });
  }, [filaRisco, eventos, metric]);

  const totalAlerts = cityData.reduce((sum, d) => sum + d.count, 0);

  const getMarkerColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#0ea5e9';
      case 'low': return '#22c55e';
      default: return '#64748b';
    }
  };

  const getMarkerRadius = (priority: number, count: number) => {
    const base = priority === 1 ? 20 : priority === 2 ? 15 : 12;
    return base + Math.min(count / 10, 8);
  };

  // Center of Ceará
  const cearaCenter: [number, number] = [-5.2, -39.3];

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-700/50 bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-800/50 border-b border-slate-700/40">
        <div>
          <h3 className="font-medium text-white text-sm">Ceará — Mapa de Alertas</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">{totalAlerts} alertas em {cearaCities.length} cidades</p>
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

      {/* Map */}
      <div className="h-[420px] md:h-[480px] relative">
        <MapContainer
          center={cearaCenter}
          zoom={7}
          className="h-full w-full"
          zoomControl={false}
          attributionControl={false}
          style={{ background: '#1a2332' }}
        >
          <DarkMapStyle />
          
          {/* Dark theme tiles */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {/* City markers */}
          {cityData.map((data) => {
            const isHovered = hoveredCity === data.city.id;
            const color = getMarkerColor(data.severity);
            const radius = getMarkerRadius(data.city.priority, data.count);
            
            return (
              <CircleMarker
                key={data.city.id}
                center={[data.city.lat, data.city.lng]}
                radius={isHovered ? radius * 1.2 : radius}
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: 0.85,
                  weight: isHovered ? 3 : 2,
                  opacity: 1,
                }}
                eventHandlers={{
                  mouseover: () => setHoveredCity(data.city.id),
                  mouseout: () => setHoveredCity(null),
                }}
              >
                <Tooltip 
                  permanent={data.city.priority === 1}
                  direction="top"
                  offset={[0, -radius]}
                  className="custom-tooltip"
                >
                  <div className="text-center">
                    <div className="font-bold text-lg" style={{ color }}>{data.count}</div>
                    <div className="text-xs text-slate-600">{data.city.name}</div>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* Custom styles for tooltips */}
        <style>{`
          .custom-tooltip {
            background: rgba(15, 23, 42, 0.95) !important;
            border: 1px solid rgba(100, 116, 139, 0.3) !important;
            border-radius: 8px !important;
            padding: 6px 10px !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
          }
          .custom-tooltip .leaflet-tooltip-content {
            margin: 0 !important;
          }
          .custom-tooltip::before {
            display: none !important;
          }
          .leaflet-container {
            font-family: inherit !important;
          }
        `}</style>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-slate-800/50 border-t border-slate-700/40">
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
          <span className="text-xs text-slate-400">
            {cityData.filter(d => d.severity === 'critical' || d.severity === 'high').length} cidades em alerta
          </span>
        </div>
      </div>
    </div>
  );
}
