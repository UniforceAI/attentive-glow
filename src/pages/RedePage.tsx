import { useMemo } from "react";
import { useEventos } from "@/hooks/useEventos";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Wifi, AlertTriangle, Clock, Activity, Eye, Wrench, Bell } from "lucide-react";

const RedePage = () => {
  const { eventos } = useEventos();

  const sinais = useMemo(() => eventos.filter(e => e.event_type === 'SINAL'), [eventos]);

  // KPIs
  const kpis = useMemo(() => {
    const criticos = sinais.filter(s => 
      (s.packet_loss_pct && s.packet_loss_pct >= 2) ||
      (s.latency_ms && s.latency_ms >= 60) ||
      (s.downtime_min_24h && s.downtime_min_24h >= 30) ||
      (s.snr_db && s.snr_db <= 20)
    );
    const latencias = sinais.filter(s => s.latency_ms).map(s => s.latency_ms!);
    const losses = sinais.filter(s => s.packet_loss_pct).map(s => s.packet_loss_pct!);
    const downtimes = sinais.filter(s => s.downtime_min_24h).map(s => s.downtime_min_24h!);

    return {
      total: sinais.length,
      criticos: criticos.length,
      latenciaMedia: latencias.length > 0 ? latencias.reduce((a, b) => a + b, 0) / latencias.length : 0,
      lossMedia: losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0,
      downtimeTotal: downtimes.reduce((a, b) => a + b, 0),
    };
  }, [sinais]);

  // Clientes com sinal crítico
  const clientesCriticos = useMemo(() => {
    return sinais
      .filter(s => 
        (s.packet_loss_pct && s.packet_loss_pct >= 2) ||
        (s.latency_ms && s.latency_ms >= 60) ||
        (s.downtime_min_24h && s.downtime_min_24h >= 30) ||
        (s.snr_db && s.snr_db <= 20)
      )
      .map(s => ({
        cliente_id: s.cliente_id,
        cliente_nome: s.cliente_nome,
        rx_dbm: s.rx_dbm,
        tx_dbm: s.tx_dbm,
        snr_db: s.snr_db,
        latency_ms: s.latency_ms,
        packet_loss_pct: s.packet_loss_pct,
        downtime_min_24h: s.downtime_min_24h,
        churn_risk_bucket: s.churn_risk_bucket,
        acao: s.acao_recomendada_1,
      }))
      .slice(0, 50);
  }, [sinais]);

  const isCritical = (value: number | null, threshold: number, reverse = false) => {
    if (value === null) return false;
    return reverse ? value <= threshold : value >= threshold;
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-3">
              <Wifi className="h-8 w-8 text-cyan-500" />
              Saúde de Rede
            </h1>
            <p className="text-muted-foreground mt-1">Monitoramento de sinal e qualidade da conexão</p>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "Leituras de Sinal", value: kpis.total, icon: Activity },
              { label: "Sinal Crítico", value: kpis.criticos, icon: AlertTriangle, color: "text-red-500" },
              { label: "Latência Média", value: `${kpis.latenciaMedia.toFixed(0)}ms`, icon: Clock },
              { label: "Packet Loss", value: `${kpis.lossMedia.toFixed(2)}%`, icon: Wifi },
              { label: "Downtime Total", value: `${kpis.downtimeTotal.toFixed(0)}min`, icon: Clock },
            ].map(k => (
              <Card key={k.label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <k.icon className={`h-4 w-4 ${k.color || 'text-muted-foreground'}`} />
                    <p className="text-xs text-muted-foreground uppercase">{k.label}</p>
                  </div>
                  <p className={`text-2xl font-bold ${k.color || ''}`}>{k.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Regras de Sinal Crítico */}
          <Card className="border-l-4 border-red-500">
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-2">Critérios de Sinal Crítico:</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">packet_loss ≥ 2%</Badge>
                <Badge variant="outline">latência ≥ 60ms</Badge>
                <Badge variant="outline">downtime ≥ 30min</Badge>
                <Badge variant="outline">SNR ≤ 20dB</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Clientes Críticos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Clientes com Sinal Crítico
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>RX (dBm)</TableHead>
                      <TableHead>TX (dBm)</TableHead>
                      <TableHead>SNR (dB)</TableHead>
                      <TableHead>Latência</TableHead>
                      <TableHead>Loss</TableHead>
                      <TableHead>Downtime</TableHead>
                      <TableHead>Risco</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientesCriticos.map((c, i) => (
                      <TableRow key={`${c.cliente_id}-${i}`}>
                        <TableCell className="font-medium">{c.cliente_nome}</TableCell>
                        <TableCell>{c.rx_dbm?.toFixed(1) || '-'}</TableCell>
                        <TableCell>{c.tx_dbm?.toFixed(1) || '-'}</TableCell>
                        <TableCell className={isCritical(c.snr_db, 20, true) ? 'text-red-500 font-bold' : ''}>
                          {c.snr_db?.toFixed(1) || '-'}
                        </TableCell>
                        <TableCell className={isCritical(c.latency_ms, 60) ? 'text-red-500 font-bold' : ''}>
                          {c.latency_ms?.toFixed(0) || '-'}ms
                        </TableCell>
                        <TableCell className={isCritical(c.packet_loss_pct, 2) ? 'text-red-500 font-bold' : ''}>
                          {c.packet_loss_pct?.toFixed(2) || '-'}%
                        </TableCell>
                        <TableCell className={isCritical(c.downtime_min_24h, 30) ? 'text-red-500 font-bold' : ''}>
                          {c.downtime_min_24h?.toFixed(0) || '-'}min
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            c.churn_risk_bucket === 'Crítico' ? 'bg-red-500/10 text-red-500' :
                            c.churn_risk_bucket === 'Alto' ? 'bg-orange-500/10 text-orange-500' : ''
                          }>
                            {c.churn_risk_bucket}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="sm" title="Abrir OS"><Wrench className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" title="Monitorar 24h"><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" title="Aviso proativo"><Bell className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default RedePage;
