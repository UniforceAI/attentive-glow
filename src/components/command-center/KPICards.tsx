import { TrendingUp, TrendingDown, Users, UserPlus, UserMinus, DollarSign, AlertTriangle, Wifi, ThumbsDown } from "lucide-react";

interface KPICardsProps {
  kpis: any;
  sinalCritico: number;
  detratores: number;
  ltvStats: any;
}

const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { 
  style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 
}).format(v);

function KPICard({ title, value, delta, icon, variant = 'default' }: {
  title: string;
  value: string | number;
  delta?: number;
  icon: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'primary';
}) {
  const variantClasses = {
    default: 'bg-card border-border',
    success: 'bg-success/10 border-success/30',
    warning: 'bg-warning/10 border-warning/30',
    danger: 'bg-destructive/10 border-destructive/30',
    primary: 'bg-primary/10 border-primary/30',
  };

  const iconColors = {
    default: 'text-muted-foreground',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-destructive',
    primary: 'text-primary',
  };

  return (
    <div className={`rounded-xl border p-4 ${variantClasses[variant]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`${iconColors[variant]}`}>{icon}</span>
        {delta !== undefined && delta !== 0 && (
          <span className={`flex items-center text-xs font-medium ${delta > 0 ? 'text-success' : 'text-destructive'}`}>
            {delta > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{title}</p>
    </div>
  );
}

export function KPICards({ kpis, sinalCritico, detratores, ltvStats }: KPICardsProps) {
  if (!kpis) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
      <KPICard 
        title="Clientes Ativos" 
        value={kpis.clientesAtivos.value.toLocaleString('pt-BR')} 
        delta={kpis.clientesAtivos.delta}
        icon={<Users className="h-5 w-5" />} 
        variant="success"
      />
      <KPICard 
        title="Novos Clientes" 
        value={kpis.novosClientes.value.toLocaleString('pt-BR')} 
        delta={kpis.novosClientes.delta}
        icon={<UserPlus className="h-5 w-5" />} 
        variant="primary"
      />
      <KPICard 
        title="Churn (Rescisões)" 
        value={kpis.churnRescisoes.value.toLocaleString('pt-BR')} 
        delta={kpis.churnRescisoes.delta}
        icon={<UserMinus className="h-5 w-5" />} 
        variant="danger"
      />
      <KPICard 
        title="MRR Total" 
        value={formatCurrency(kpis.mrrTotal.value)} 
        delta={kpis.mrrTotal.delta}
        icon={<DollarSign className="h-5 w-5" />} 
        variant="primary"
      />
      <KPICard 
        title="MRR em Risco" 
        value={formatCurrency(kpis.mrrEmRiscoChurn.value)} 
        delta={kpis.mrrEmRiscoChurn.delta}
        icon={<AlertTriangle className="h-5 w-5" />} 
        variant="danger"
      />
      <KPICard 
        title="R$ Vencido" 
        value={formatCurrency(kpis.rVencido.value)} 
        delta={kpis.rVencido.delta}
        icon={<DollarSign className="h-5 w-5" />} 
        variant="warning"
      />
      <KPICard 
        title="% Sinal Crítico" 
        value={`${sinalCritico.toFixed(1)}%`} 
        icon={<Wifi className="h-5 w-5" />} 
        variant={sinalCritico > 10 ? 'danger' : 'default'}
      />
      <KPICard 
        title="% Detratores" 
        value={`${detratores.toFixed(1)}%`} 
        icon={<ThumbsDown className="h-5 w-5" />} 
        variant={detratores > 20 ? 'danger' : 'warning'}
      />
    </div>
  );
}
