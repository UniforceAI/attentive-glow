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

// Dynamically extract cities from data instead of hardcoded list
const extractCitiesFromData = (eventos: Evento[]): typeof baseCities => {
  const cityMap = new Map<string, { count: number; lat: number; lng: number }>();
  
  eventos.forEach(e => {
    const cidade = e.cliente_cidade;
    if (!cidade) return;
    
    const existing = cityMap.get(cidade);
    if (existing) {
      existing.count++;
    } else {
      // Use geo_lat/geo_lng if available, otherwise use default position
      cityMap.set(cidade, {
        count: 1,
        lat: e.geo_lat || -5.2 + (Math.random() - 0.5) * 3,
        lng: e.geo_lng || -39.3 + (Math.random() - 0.5) * 3,
      });
    }
  });

  return Array.from(cityMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)
    .map(([name, data], i) => ({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      lat: data.lat,
      lng: data.lng,
      priority: i < 3 ? 1 : i < 8 ? 2 : 3,
    }));
};

const baseCities: { id: string; name: string; lat: number; lng: number; priority: number }[] = [];

// Seeded random for consistent but varied positions per metric
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const getOffsetForMetric = (cityId: string, metric: string, cityIndex: number): { lat: number; lng: number } => {
  const metricSeeds: Record<string, number> = {
    churn: 1, vencido: 7, sinal: 13, detrator: 19, reincidencia: 31
  };
  const seed = (metricSeeds[metric] || 1) * (cityIndex + 1) * 17;
  
  const latOffset = (seededRandom(seed) - 0.5) * 0.25;
  const lngOffset = (seededRandom(seed + 100) - 0.5) * 0.25;
  
  return { lat: latOffset, lng: lngOffset };
};

interface CityData {
  city: { id: string; name: string; lat: number; lng: number; priority: number };
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  offset: { lat: number; lng: number };
}

export function MapSection({ filaRisco, filaCobranca, eventos, metric, onMetricChange }: MapSectionProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);

  // Extract cities dynamically from data
  const dataCities = useMemo(() => extractCitiesFromData(eventos), [eventos]);

  // Get unique UFs from data for title
  const uniqueUFs = useMemo(() => {
    const ufs = new Set<string>();
    eventos.forEach(e => {
      if (e.cliente_uf) ufs.add(e.cliente_uf);
    });
    return Array.from(ufs);
  }, [eventos]);

  const cityData = useMemo((): CityData[] => {
    return dataCities.map((city, idx) => {
      let count = 0;
      let criticalCount = 0;
      
      // Filter events by city
      const cityEvents = eventos.filter(e => e.cliente_cidade === city.name);
      
      switch (metric) {
        case 'churn':
          count = cityEvents.filter(e => e.churn_risk_bucket === 'Alto' || e.churn_risk_bucket === 'Crítico').length;
          criticalCount = cityEvents.filter(e => e.churn_risk_bucket === 'Crítico').length;
          break;
        case 'vencido':
          count = cityEvents.filter(e => e.cobranca_status === 'Vencido').length;
          criticalCount = cityEvents.filter(e => (e.dias_atraso || 0) > 30).length;
          break;
        case 'sinal':
          count = cityEvents.filter(e => e.event_type === 'SINAL' && e.alerta_tipo === 'Sinal crítico').length;
          criticalCount = cityEvents.filter(e => (e.packet_loss_pct || 0) > 5).length;
          break;
        case 'detrator':
          count = cityEvents.filter(e => e.event_type === 'NPS' && (e.nps_score || 10) <= 6).length;
          criticalCount = cityEvents.filter(e => (e.nps_score || 10) <= 4).length;
          break;
        case 'reincidencia':
          count = cityEvents.filter(e => e.reincidente_30d).length;
          criticalCount = cityEvents.filter(e => e.reincidente_30d && e.churn_risk_bucket === 'Crítico').length;
          break;
      }

      const severity: 'critical' | 'high' | 'medium' | 'low' = 
        count === 0 ? 'low' :
        criticalCount > count * 0.35 ? 'critical' : 
        criticalCount > count * 0.2 ? 'high' : 
        criticalCount > count * 0.1 ? 'medium' : 'low';

      const offset = getOffsetForMetric(city.id, metric, idx);
      return { city, count: Math.max(count, 0), severity, offset };
    }).filter(d => d.count > 0);
  }, [dataCities, eventos, metric]);

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

  const mapTitle = uniqueUFs.length > 0 ? uniqueUFs.join(', ') : 'Região';

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-700/50 bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-800/50 border-b border-slate-700/40">
        <div>
          <h3 className="font-medium text-white text-sm">{mapTitle} — Mapa de Alertas</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">{totalAlerts} alertas em {cityData.length} cidades</p>
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
