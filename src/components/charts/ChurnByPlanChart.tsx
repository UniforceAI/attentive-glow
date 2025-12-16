import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { Evento } from "@/types/evento";
import { ChartCard } from "@/components/dashboard/ChartCard";

interface ChurnByPlanChartProps {
  eventos: Evento[];
}

const COLORS = [
  "hsl(0, 72%, 51%)",
  "hsl(340, 75%, 55%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 80%, 65%)",
  "hsl(217, 91%, 60%)",
];

export function ChurnByPlanChart({ eventos }: ChurnByPlanChartProps) {
  const chartData = useMemo(() => {
    const planStats = new Map<string, { total: number; risco: number; churn: number }>();
    
    // Get unique services
    const services = new Map<number, Evento>();
    eventos.forEach(e => {
      if (!e.servico_id) return;
      const existing = services.get(e.servico_id);
      if (!existing || new Date(e.event_datetime) > new Date(existing.event_datetime)) {
        services.set(e.servico_id, e);
      }
    });

    // Calculate stats per plan
    services.forEach(e => {
      const plan = e.plano_nome || 'Sem Plano';
      if (!planStats.has(plan)) {
        planStats.set(plan, { total: 0, risco: 0, churn: 0 });
      }
      const stats = planStats.get(plan)!;
      stats.total++;
      if (e.churn_risk_bucket === 'Alto' || e.churn_risk_bucket === 'Crítico') {
        stats.risco++;
      }
      if (e.servico_status === 'Cancelado') {
        stats.churn++;
      }
    });

    return Array.from(planStats.entries())
      .map(([plan, stats]) => ({
        plano: plan.length > 15 ? plan.substring(0, 15) + '...' : plan,
        planoFull: plan,
        total: stats.total,
        risco: stats.risco,
        churn: stats.churn,
        taxaRisco: stats.total > 0 ? (stats.risco / stats.total) * 100 : 0,
        taxaChurn: stats.total > 0 ? (stats.churn / stats.total) * 100 : 0,
      }))
      .sort((a, b) => b.taxaRisco - a.taxaRisco)
      .slice(0, 8);
  }, [eventos]);

  return (
    <ChartCard 
      title="Cohort de Churn por Plano" 
      subtitle="Taxa de risco por tipo de plano"
      height="h-[300px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={chartData} 
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" horizontal={true} vertical={false} />
          <XAxis 
            type="number"
            tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `${value}%`}
          />
          <YAxis 
            type="category"
            dataKey="plano"
            tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={120}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(223, 47%, 10%)', 
              border: '1px solid hsl(220, 20%, 25%)',
              borderRadius: '8px',
            }}
            labelStyle={{ color: 'hsl(210, 40%, 98%)', fontWeight: 600 }}
            formatter={(value: number, name: string, props: any) => {
              const { payload } = props;
              if (name === 'taxaRisco') {
                return [`${value.toFixed(1)}% (${payload.risco}/${payload.total})`, 'Em Risco'];
              }
              return [value, name];
            }}
            labelFormatter={(label, payload) => payload[0]?.payload.planoFull || label}
          />
          <Bar 
            dataKey="taxaRisco" 
            radius={[0, 4, 4, 0]}
            maxBarSize={30}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={index} 
                fill={COLORS[index % COLORS.length]}
                fillOpacity={0.85}
              />
            ))}
            <LabelList 
              dataKey="taxaRisco" 
              position="right" 
              formatter={(value: number) => `${value.toFixed(0)}%`}
              fill="hsl(215, 20%, 65%)"
              fontSize={11}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}