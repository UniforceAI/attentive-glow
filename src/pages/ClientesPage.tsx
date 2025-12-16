import { useMemo, useState } from "react";
import { useEventos } from "@/hooks/useEventos";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Search, Eye, PlayCircle, Plus } from "lucide-react";

const ClientesPage = () => {
  const { eventos } = useEventos();
  const [busca, setBusca] = useState("");
  const [bucketChurn, setBucketChurn] = useState("todos");
  const [bucketInad, setBucketInad] = useState("todos");
  const [statusServico, setStatusServico] = useState("todos");

  // Agregar clientes
  const clientes = useMemo(() => {
    const map = new Map<string, any>();

    eventos.forEach(e => {
      const clienteId = String(e.cliente_id);
      if (!map.has(clienteId)) {
        map.set(clienteId, {
          cliente_id: e.cliente_id,
          cliente_nome: e.cliente_nome,
          cliente_documento: e.cliente_documento,
          cliente_celular: e.cliente_celular,
          cliente_cidade: e.cliente_cidade,
          cliente_uf: e.cliente_uf,
          plano_nome: e.plano_nome,
          servico_status: e.servico_status,
          churn_risk_score: e.churn_risk_score,
          churn_risk_bucket: e.churn_risk_bucket,
          inadimplencia_total: 0,
          atendimentos_30d: 0,
          ultimo_evento: e.event_datetime,
        });
      }

      const c = map.get(clienteId)!;
      if (new Date(e.event_datetime) > new Date(c.ultimo_evento)) {
        c.ultimo_evento = e.event_datetime;
        c.churn_risk_score = e.churn_risk_score ?? c.churn_risk_score;
        c.churn_risk_bucket = e.churn_risk_bucket ?? c.churn_risk_bucket;
        c.servico_status = e.servico_status ?? c.servico_status;
      }

      if (e.event_type === 'COBRANCA' && (e.cobranca_status === 'Em Aberto' || e.cobranca_status === 'Vencido')) {
        c.inadimplencia_total += e.valor_cobranca || 0;
      }

      if (e.event_type === 'ATENDIMENTO') {
        c.atendimentos_30d++;
      }
    });

    return Array.from(map.values());
  }, [eventos]);

  // Filtrar clientes
  const clientesFiltrados = useMemo(() => {
    return clientes.filter(c => {
      if (busca && !c.cliente_nome.toLowerCase().includes(busca.toLowerCase()) &&
          !String(c.cliente_id).includes(busca) &&
          !c.cliente_documento?.includes(busca) &&
          !c.cliente_celular?.includes(busca)) {
        return false;
      }
      if (bucketChurn !== "todos" && c.churn_risk_bucket !== bucketChurn) return false;
      if (statusServico !== "todos" && c.servico_status !== statusServico) return false;
      return true;
    }).slice(0, 100);
  }, [clientes, busca, bucketChurn, bucketInad, statusServico]);

  const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
  const getBucketColor = (b: string | null) => {
    if (b === 'Crítico') return "bg-red-500/10 text-red-500";
    if (b === 'Alto') return "bg-orange-500/10 text-orange-500";
    if (b === 'Médio') return "bg-yellow-500/10 text-yellow-500";
    return "bg-green-500/10 text-green-500";
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              Clientes
            </h1>
            <p className="text-muted-foreground mt-1">Busca, filtros e segmentação</p>
          </div>

          {/* Filtros */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, ID, documento ou telefone..."
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={bucketChurn} onValueChange={setBucketChurn}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Risco Churn" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="Crítico">Crítico</SelectItem>
                    <SelectItem value="Alto">Alto</SelectItem>
                    <SelectItem value="Médio">Médio</SelectItem>
                    <SelectItem value="Baixo">Baixo</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusServico} onValueChange={setStatusServico}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="Liberado">Liberado</SelectItem>
                    <SelectItem value="Bloqueado">Bloqueado</SelectItem>
                    <SelectItem value="Suspenso">Suspenso</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tabela */}
          <Card>
            <CardHeader>
              <CardTitle>{clientesFiltrados.length} clientes encontrados</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Risco Churn</TableHead>
                      <TableHead>Inadimpl.</TableHead>
                      <TableHead>Tickets 30d</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientesFiltrados.map(c => (
                      <TableRow key={c.cliente_id}>
                        <TableCell className="font-mono text-sm">{c.cliente_id}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{c.cliente_nome}</p>
                            <p className="text-xs text-muted-foreground">{c.cliente_cidade}/{c.cliente_uf}</p>
                          </div>
                        </TableCell>
                        <TableCell>{c.plano_nome}</TableCell>
                        <TableCell>
                          <Badge variant={c.servico_status === 'Liberado' ? 'default' : 'secondary'}>
                            {c.servico_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{c.churn_risk_score}</span>
                            <Badge variant="outline" className={getBucketColor(c.churn_risk_bucket)}>
                              {c.churn_risk_bucket}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className={c.inadimplencia_total > 0 ? 'text-red-500 font-medium' : ''}>
                          {formatCurrency(c.inadimplencia_total)}
                        </TableCell>
                        <TableCell>{c.atendimentos_30d}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="sm" title="Ver 360"><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" title="Playbook"><PlayCircle className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" title="Add fila"><Plus className="h-4 w-4" /></Button>
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

export default ClientesPage;
