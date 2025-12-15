import { ClienteAgregado } from "@/types/evento";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, AlertTriangle, Zap } from "lucide-react";

interface TopClientesRiscoProps {
  clientes: ClienteAgregado[];
  isLoading: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  }).format(value);
};

const getBucketColor = (bucket: string | null) => {
  switch (bucket) {
    case "Crítico":
      return "bg-red-500/10 text-red-500 border-red-500/20";
    case "Alto":
      return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    case "Médio":
      return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    default:
      return "bg-green-500/10 text-green-500 border-green-500/20";
  }
};

export function TopClientesRisco({ clientes, isLoading }: TopClientesRiscoProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Top 20 Clientes em Risco
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (clientes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Top 20 Clientes em Risco
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Zap className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>Nenhum cliente em risco alto ou crítico</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Top 20 Clientes em Risco
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Inadimpl.</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.map((cliente) => (
                <TableRow key={cliente.cliente_id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{cliente.cliente_nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {cliente.cliente_cidade}/{cliente.cliente_uf}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{cliente.plano_nome}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{cliente.churn_risk_score}</span>
                      <Badge variant="outline" className={getBucketColor(cliente.churn_risk_bucket)}>
                        {cliente.churn_risk_bucket}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={cliente.inadimplencia_total > 0 ? "text-red-500 font-medium" : ""}>
                      {formatCurrency(cliente.inadimplencia_total)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
