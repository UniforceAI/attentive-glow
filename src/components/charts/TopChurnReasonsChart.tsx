import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Evento } from "@/types/evento";
import { ChartCard } from "@/components/dashboard/ChartCard";

interface TopChurnReasonsChartProps {
  eventos: Evento[];
}

const COLORS = [
  "hsl(0, 72%, 51%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 80%, 65%)",
  "hsl(217, 91%, 60%)",
  "hsl(340, 75%, 55%)",
  "hsl(142, 71%, 45%)",
  "hsl(199, 89%, 48%)",
];

export function TopChurnReasonsChart({ eventos }: TopChurnReasonsChartProps) {
  const chartData = useMemo(() => {
    const reasonCounts = new Map<string, number>();
    
    // Find atendimentos for churned/high-risk clients
    const highRiskClients = new Set<string>();
    eventos.forEach(e => {
      if (e.churn_risk_bucket === 'Alto' || e.churn_risk_bucket === 'Crítico' || e.servico_status === 'Cancelado') {
        highRiskClients.add(String(e.cliente_id));
      }
    });

    // Count motivos from atendimentos
    eventos.forEach(e => {
      if (e.event_type === 'ATENDIMENTO' && highRiskClients.has(String(e.cliente_id))) {
        const motivo = e.motivo_contato || e.categoria || 'Outros';
        reasonCounts.set(motivo, (reasonCounts.get(motivo) || 0) + 1);
      }
    });

    const sorted = Array.from(reasonCounts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);

    const total = sorted.reduce((sum, d) => sum + d.value, 0);
    
    return sorted.map(d => ({
      ...d,
      percent: total > 0 ? ((d.value / total) * 100).toFixed(1) : '0',
    }));
  }, [eventos]);

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.08) return null;

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central"
        fontSize={11}
        fontWeight={500}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <ChartCard 
      title="Top Motivos de Churn" 
      subtitle="Baseado em atendimentos de clientes em risco"
      height="h-[300px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            innerRadius={50}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[index % COLORS.length]}
                stroke="hsl(223, 47%, 8%)"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(223, 47%, 10%)', 
              border: '1px solid hsl(220, 20%, 25%)',
              borderRadius: '8px',
            }}
            formatter={(value: number, name: string) => [
              `${value} atendimentos (${chartData.find(d => d.name === name)?.percent}%)`,
              name
            ]}
          />
          <Legend 
            layout="vertical"
            align="right"
            verticalAlign="middle"
            wrapperStyle={{ paddingLeft: 20 }}
            formatter={(value) => (
              <span style={{ color: 'hsl(215, 20%, 65%)', fontSize: 11 }}>
                {value.length > 20 ? value.substring(0, 20) + '...' : value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}