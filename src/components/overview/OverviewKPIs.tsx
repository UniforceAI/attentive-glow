import { KPIData } from "@/types/evento";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Server,
  DollarSign,
  AlertTriangle,
  CreditCard,
  Headphones,
  Clock,
  Star,
} from "lucide-react";

interface OverviewKPIsProps {
  kpis: KPIData;
  isLoading: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
};

export function OverviewKPIs({ kpis, isLoading }: OverviewKPIsProps) {
  const kpiCards = [
    {
      label: "Clientes Ativos",
      value: kpis.clientesAtivos,
      format: "number",
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Serviços",
      value: `${kpis.servicosLiberados} / ${kpis.servicosBloqueados} / ${kpis.servicosSuspensos}`,
      format: "text",
      subLabel: "Lib / Bloq / Susp",
      icon: Server,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "MRR Estimado",
      value: kpis.mrr,
      format: "currency",
      icon: DollarSign,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "R$ em Risco (Churn)",
      value: kpis.mrrEmRisco,
      format: "currency",
      icon: AlertTriangle,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      label: "Inadimplência",
      value: kpis.inadimplenciaTotal,
      format: "currency",
      icon: CreditCard,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      label: "Ticket N1/100",
      value: kpis.ticketN1Por100,
      format: "decimal",
      icon: Headphones,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      label: "Tempo Médio (min)",
      value: kpis.tempoMedioAtendimento,
      format: "decimal",
      icon: Clock,
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
    },
    {
      label: "NPS",
      value: kpis.nps,
      format: "nps",
      subLabel: `${kpis.promotores}P / ${kpis.neutros}N / ${kpis.detratores}D`,
      icon: Star,
      color: kpis.nps >= 50 ? "text-green-500" : kpis.nps >= 0 ? "text-yellow-500" : "text-red-500",
      bgColor: kpis.nps >= 50 ? "bg-green-500/10" : kpis.nps >= 0 ? "bg-yellow-500/10" : "bg-red-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {kpiCards.map((kpi) => (
        <Card key={kpi.label} className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {kpi.label}
                </p>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <p className="text-2xl font-bold">
                    {kpi.format === "currency" && formatCurrency(kpi.value as number)}
                    {kpi.format === "number" && formatNumber(kpi.value as number)}
                    {kpi.format === "decimal" && formatNumber(kpi.value as number)}
                    {kpi.format === "nps" && `${Number(kpi.value) > 0 ? "+" : ""}${kpi.value}`}
                    {kpi.format === "text" && kpi.value}
                  </p>
                )}
                {kpi.subLabel && (
                  <p className="text-xs text-muted-foreground">{kpi.subLabel}</p>
                )}
              </div>
              <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
