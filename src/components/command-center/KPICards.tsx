import { TrendingUp, TrendingDown, Users, UserPlus, UserMinus, DollarSign, AlertTriangle, Wifi, ThumbsDown, Banknote, Shield } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface KPICardsProps {
  kpis: any;
  sinalCritico: number;
  detratores: number;
  ltvStats: any;
}

const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { 
  style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 
}).format(v);

function KPICard({ title, value, delta, icon, variant = 'default', tooltip }: {
  title: string;
  value: string | number;
  delta?: number;
  icon: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'primary';
  tooltip?: string;
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

  const card = (
    <div className={`rounded-xl border p-3 ${variantClasses[variant]} cursor-help min-w-0`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`${iconColors[variant]}`}>{icon}</span>
        {delta !== undefined && delta !== 0 && (
          <span className={`flex items-center text-[10px] font-medium ${delta > 0 ? 'text-success' : 'text-destructive'}`}>
            {delta > 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-lg font-bold text-foreground truncate">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{title}</p>
    </div>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{card}</TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-sm">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return card;
}

export function KPICards({ kpis, sinalCritico, detratores, ltvStats }: KPICardsProps) {
  if (!kpis) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2">
      <KPICard 
        title="Clientes Ativos" 
        value={kpis.clientesAtivos.value.toLocaleString('pt-BR')} 
        delta={kpis.clientesAtivos.delta}
        icon={<Users className="h-5 w-5" />} 
        variant="success"
        tooltip="Total de clientes com serviço ativo no período. Delta MoM."
      />
      <KPICard 
        title="Novos Clientes" 
        value={kpis.novosClientes.value.toLocaleString('pt-BR')} 
        delta={kpis.novosClientes.delta}
        icon={<UserPlus className="h-5 w-5" />} 
        variant="primary"
        tooltip="Clientes que entraram na base no mês. Delta MoM."
      />
      <KPICard 
        title="Churn (Rescisões)" 
        value={kpis.churnRescisoes.value.toLocaleString('pt-BR')} 
        delta={kpis.churnRescisoes.delta}
        icon={<UserMinus className="h-5 w-5" />} 
        variant="danger"
        tooltip="Clientes que cancelaram no mês. Acompanhe para identificar tendências."
      />
      <KPICard 
        title="MRR Total" 
        value={formatCurrency(kpis.mrrTotal.value)} 
        delta={kpis.mrrTotal.delta}
        icon={<DollarSign className="h-5 w-5" />} 
        variant="primary"
        tooltip="Receita Recorrente Mensal total da base ativa."
      />
      <KPICard 
        title="Faturamento Recebido" 
        value={formatCurrency(kpis.faturamentoRecebido.value)} 
        delta={kpis.faturamentoRecebido.delta}
        icon={<Banknote className="h-5 w-5" />} 
        variant="success"
        tooltip="Valor efetivamente recebido no mês. Diferença com MRR indica inadimplência."
      />
      <KPICard 
        title="MRR em Risco" 
        value={formatCurrency(kpis.mrrEmRiscoChurn.value)} 
        delta={kpis.mrrEmRiscoChurn.delta}
        icon={<AlertTriangle className="h-5 w-5" />} 
        variant="danger"
        tooltip="MRR de clientes com risco Alto/Crítico de churn. Priorize ações de retenção."
      />
      <KPICard 
        title="LTV em Risco" 
        value={formatCurrency(kpis.ltvEmRiscoChurn.value)} 
        delta={kpis.ltvEmRiscoChurn.delta}
        icon={<Shield className="h-5 w-5" />} 
        variant="danger"
        tooltip="Valor de vida útil dos clientes em risco de churn. Impacto potencial no longo prazo."
      />
      <KPICard 
        title="R$ Vencido" 
        value={formatCurrency(kpis.rVencido.value)} 
        delta={kpis.rVencido.delta}
        icon={<DollarSign className="h-5 w-5" />} 
        variant="warning"
        tooltip="Total de cobranças vencidas. Acione fila de cobrança para recuperação."
      />
      <KPICard 
        title="% Sinal Crítico" 
        value={`${sinalCritico.toFixed(1)}%`} 
        icon={<Wifi className="h-5 w-5" />} 
        variant={sinalCritico > 10 ? 'danger' : 'default'}
        tooltip="% de eventos de sinal com problemas críticos. Priorize manutenção preventiva."
      />
      <KPICard 
        title="% Detratores" 
        value={`${detratores.toFixed(1)}%`} 
        icon={<ThumbsDown className="h-5 w-5" />} 
        variant={detratores > 20 ? 'danger' : 'warning'}
        tooltip="% de respostas NPS ≤6. Clientes insatisfeitos com alto risco de churn."
      />
    </div>
  );
}
