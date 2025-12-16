import { useMemo, useState, useEffect, useRef } from "react";
import { Evento, ClienteRisco, ClienteCobranca } from "@/types/evento";
import { AlertTriangle, DollarSign, Wifi, ThumbsDown, RotateCcw, TrendingDown } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Custom CSS for labeled markers
const markerStyles = `
  .city-marker {
    display: flex;
    flex-direction: column;
    align-items: center;
    pointer-events: auto;
  }
  .city-bubble {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-weight: 700;
    font-size: 13px;
    color: white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    border: 2px solid rgba(255,255,255,0.3);
    cursor: pointer;
    transition: transform 0.15s ease;
  }
  .city-bubble:hover {
    transform: scale(1.15);
  }
  .city-label {
    margin-top: 4px;
    font-size: 10px;
    color: white;
    background: rgba(15, 23, 42, 0.85);
    padding: 2px 6px;
    border-radius: 4px;
    white-space: nowrap;
    font-weight: 500;
  }
`;

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

// Seeded random for consistent but varied positions per metric
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const getOffsetForMetric = (cityId: string, metric: string): { lat: number; lng: number } => {
  const metricSeeds: Record<string, number> = {
    churn: 1, vencido: 7, sinal: 13, detrator: 19, reincidencia: 31
  };
  const cityIndex = cearaCities.findIndex(c => c.id === cityId);
  const seed = (metricSeeds[metric] || 1) * (cityIndex + 1) * 17;
  
  const latOffset = (seededRandom(seed) - 0.5) * 0.35;
  const lngOffset = (seededRandom(seed + 100) - 0.5) * 0.35;
  
  return { lat: latOffset, lng: lngOffset };
};

interface CityData {
  city: typeof cearaCities[0];
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  offset: { lat: number; lng: number };
}

export function MapSection({ filaRisco, filaCobranca, eventos, metric, onMetricChange }: MapSectionProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);

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

      const offset = getOffsetForMetric(city.id, metric);
      return { city, count: Math.max(count, 1), severity, offset };
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

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [-5.2, -39.3],
      zoom: 7,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update markers when data changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    cityData.forEach((data) => {
      const color = getMarkerColor(data.severity);
      const size = data.city.priority === 1 ? 42 : data.city.priority === 2 ? 34 : 26;

      const icon = L.divIcon({
        className: 'city-marker',
        html: `
          <div class="city-bubble" style="width: ${size}px; height: ${size}px; background: ${color};">
            ${data.count}
          </div>
          <div class="city-label">${data.city.name}</div>
        `,
        iconSize: [size, size + 20],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([data.city.lat + data.offset.lat, data.city.lng + data.offset.lng], { icon })
        .addTo(mapInstanceRef.current!);

      marker.bindPopup(`
        <div style="text-align: center; padding: 4px;">
          <div style="font-weight: bold; font-size: 16px; color: ${color};">${data.count}</div>
          <div style="font-size: 12px; color: #94a3b8;">${data.city.name}</div>
          <div style="font-size: 11px; margin-top: 4px; color: ${color};">
            ${data.severity === 'critical' ? 'Crítico' :
              data.severity === 'high' ? 'Alto' :
              data.severity === 'medium' ? 'Médio' : 'Baixo'}
          </div>
        </div>
      `, {
        className: 'dark-popup',
      });

      markersRef.current.push(marker as any);
    });
  }, [cityData]);

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
        <div ref={mapRef} className="h-full w-full" style={{ background: '#1a2332' }} />

        {/* CSS overrides */}
        <style>{`
          ${markerStyles}
          .leaflet-container {
            font-family: inherit;
            background: #1a2332;
          }
          .dark-popup .leaflet-popup-content-wrapper {
            background: rgba(15, 23, 42, 0.95);
            border: 1px solid rgba(100, 116, 139, 0.3);
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            color: white;
          }
          .dark-popup .leaflet-popup-tip {
            background: rgba(15, 23, 42, 0.95);
          }
          .dark-popup .leaflet-popup-close-button {
            color: #94a3b8 !important;
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
