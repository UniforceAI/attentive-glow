import { useMemo } from "react";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { Evento } from "@/types/evento";
import { ChartCard } from "@/components/dashboard/ChartCard";

interface ChurnByNeighborhoodChartProps {
  eventos: Evento[];
}

const COLORS = [
  "#ef4444", "#f97316", "#eab308", "#84cc16", 
  "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
  "#8b5cf6", "#d946ef", "#ec4899", "#f43f5e"
];

export function ChurnByNeighborhoodChart({ eventos }: ChurnByNeighborhoodChartProps) {
  const chartData = useMemo(() => {
    const cityStats = new Map<string, { total: number; risco: number; mrr: number }>();
    
    const services = new Map<number, Evento>();
    eventos.forEach(e => {
      if (!e.servico_id) return;
      const existing = services.get(e.servico_id);
      if (!existing || new Date(e.event_datetime) > new Date(existing.event_datetime)) {
        services.set(e.servico_id, e);
      }
    });

    services.forEach(e => {
      const city = e.cliente_cidade || 'Não informado';
      if (!cityStats.has(city)) {
        cityStats.set(city, { total: 0, risco: 0, mrr: 0 });
      }
      const stats = cityStats.get(city)!;
      stats.total++;
      stats.mrr += e.valor_mensalidade || 0;
      if (e.churn_risk_bucket === 'Alto' || e.churn_risk_bucket === 'Crítico') {
        stats.risco++;
      }
    });

    return Array.from(cityStats.entries())
      .map(([city, stats]) => ({
        name: city,
        size: stats.risco,
        total: stats.total,
        mrr: stats.mrr,
        taxaRisco: stats.total > 0 ? (stats.risco / stats.total) * 100 : 0,
      }))
      .filter(d => d.size > 0)
      .sort((a, b) => b.size - a.size)
      .slice(0, 15);
  }, [eventos]);

  const CustomTreemapContent = (props: any) => {
    const { x, y, width, height, name, taxaRisco, index, depth } = props;
    
    if (depth !== 1 || width < 30 || height < 25) return null;

    const colorIndex = index % COLORS.length;
    
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: COLORS[colorIndex],
            fillOpacity: 0.85,
            stroke: 'hsl(223, 47%, 8%)',
            strokeWidth: 2,
          }}
          rx={4}
        />
        {width > 60 && height > 40 && (
          <>
            <text
              x={x + width / 2}
              y={y + height / 2 - 6}
              textAnchor="middle"
              fill="#fff"
              fontSize={11}
              fontWeight={500}
            >
              {name.length > 12 ? name.substring(0, 12) + '...' : name}
            </text>
            <text
              x={x + width / 2}
              y={y + height / 2 + 10}
              textAnchor="middle"
              fill="rgba(255,255,255,0.8)"
              fontSize={10}
            >
              {taxaRisco?.toFixed(0)}% risco
            </text>
          </>
        )}
      </g>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <ChartCard 
      title="Cohort de Churn por Cidade" 
      subtitle="Concentração geográfica de risco"
      height="h-[300px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={chartData}
          dataKey="size"
          aspectRatio={4 / 3}
          stroke="hsl(223, 47%, 8%)"
          content={<CustomTreemapContent />}
        >
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(223, 47%, 10%)', 
              border: '1px solid hsl(220, 20%, 25%)',
              borderRadius: '8px',
            }}
            formatter={(value: any, name: string, props: any) => {
              const { payload } = props;
              return null;
            }}
            content={({ payload }) => {
              if (!payload || !payload.length) return null;
              const data = payload[0].payload;
              return (
                <div className="bg-card border border-border p-3 rounded-lg shadow-lg">
                  <p className="font-semibold text-foreground">{data.name}</p>
                  <p className="text-sm text-muted-foreground">{data.size} clientes em risco</p>
                  <p className="text-sm text-muted-foreground">{data.total} total</p>
                  <p className="text-sm text-destructive">{data.taxaRisco.toFixed(1)}% taxa de risco</p>
                  <p className="text-sm text-success">{formatCurrency(data.mrr)} MRR</p>
                </div>
              );
            }}
          />
        </Treemap>
      </ResponsiveContainer>
    </ChartCard>
  );
}