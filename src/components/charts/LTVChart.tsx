import { useMemo } from "react";
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Evento } from "@/types/evento";
import { ChartCard } from "@/components/dashboard/ChartCard";

interface LTVChartProps {
  eventos: Evento[];
}

export function LTVChart({ eventos }: LTVChartProps) {
  const data = useMemo(() => {
    const services = new Map<string, Evento>();
    eventos.forEach(e => {
      if (!e.servico_id) return;
      const serviceId = String(e.servico_id);
      const existing = services.get(serviceId);
      if (!existing || new Date(e.event_datetime) > new Date(existing.event_datetime)) {
        services.set(serviceId, e);
      }
    });

    let totalLTV = 0;
    let ltvBaixo = 0;
    let ltvMedio = 0;
    let ltvAlto = 0;
    let ltvCritico = 0;
    let countBaixo = 0;
    let countMedio = 0;
    let countAlto = 0;
    let countCritico = 0;

    services.forEach(e => {
      if (e.servico_status !== 'Liberado' || !e.valor_mensalidade) return;
      const ltv = e.valor_mensalidade * 24; // 24 month avg lifetime
      totalLTV += ltv;

      switch (e.churn_risk_bucket) {
        case 'Baixo':
          ltvBaixo += ltv;
          countBaixo++;
          break;
        case 'Médio':
          ltvMedio += ltv;
          countMedio++;
          break;
        case 'Alto':
          ltvAlto += ltv;
          countAlto++;
          break;
        case 'Crítico':
          ltvCritico += ltv;
          countCritico++;
          break;
      }
    });

    const avgLTV = services.size > 0 ? totalLTV / services.size : 0;

    return {
      avgLTV,
      totalLTV,
      segments: [
        { 
          name: 'Crítico', 
          value: ltvCritico, 
          count: countCritico,
          fill: 'hsl(0, 72%, 51%)',
          pct: totalLTV > 0 ? (ltvCritico / totalLTV) * 100 : 0,
        },
        { 
          name: 'Alto', 
          value: ltvAlto, 
          count: countAlto,
          fill: 'hsl(38, 92%, 50%)',
          pct: totalLTV > 0 ? (ltvAlto / totalLTV) * 100 : 0,
        },
        { 
          name: 'Médio', 
          value: ltvMedio, 
          count: countMedio,
          fill: 'hsl(280, 80%, 65%)',
          pct: totalLTV > 0 ? (ltvMedio / totalLTV) * 100 : 0,
        },
        { 
          name: 'Baixo', 
          value: ltvBaixo, 
          count: countBaixo,
          fill: 'hsl(142, 71%, 45%)',
          pct: totalLTV > 0 ? (ltvBaixo / totalLTV) * 100 : 0,
        },
      ],
    };
  }, [eventos]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  };

  return (
    <ChartCard 
      title="LTV por Risco de Churn" 
      subtitle={`LTV médio: ${formatCurrency(data.avgLTV)}`}
      height="h-[300px]"
    >
      <div className="flex items-center h-full">
        <div className="w-1/2 h-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart 
              cx="50%" 
              cy="50%" 
              innerRadius="30%" 
              outerRadius="90%" 
              barSize={15}
              data={data.segments}
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar
                background={{ fill: 'hsl(220, 20%, 15%)' }}
                dataKey="pct"
                cornerRadius={4}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(223, 47%, 10%)', 
                  border: '1px solid hsl(220, 20%, 25%)',
                  borderRadius: '8px',
                }}
                formatter={(value: number, name: string, props: any) => {
                  const { payload } = props;
                  return [`${formatCurrency(payload.value)} (${payload.count} clientes)`, payload.name];
                }}
              />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
        <div className="w-1/2 space-y-3 pr-4">
          {data.segments.map((segment, index) => (
            <div key={segment.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: segment.fill }}
                />
                <span className="text-sm text-muted-foreground">{segment.name}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">
                  {formatCurrency(segment.value)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {segment.pct.toFixed(1)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}