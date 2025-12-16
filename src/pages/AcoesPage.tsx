import { useMemo, useState } from "react";
import { useEventos } from "@/hooks/useEventos";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardList, CheckCircle, Wifi, CreditCard, Frown, RefreshCw, PlayCircle, XCircle, Clock, AlertTriangle, Phone, Mail, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ActionLog {
  id: string;
  datetime: string;
  usuario: string;
  cliente_id: string;
  cliente_nome: string;
  tipo_acao: string;
  resultado: 'success' | 'error';
  observacao: string;
  origem: string;
}

const AcoesPage = () => {
  const { eventos } = useEventos();
  const { toast } = useToast();
  const [completadas, setCompletadas] = useState<Set<string>>(new Set());
  const [falhou, setFalhou] = useState<Set<string>>(new Set());
  const [logs, setLogs] = useState<ActionLog[]>([]);

  // Fila de ações derivada dos eventos
  const filaAcoes = useMemo(() => {
    const acoes: any[] = [];
    const seen = new Set<string>();

    eventos.forEach(e => {
      if (e.acao_recomendada_1 && (e.churn_risk_bucket === 'Alto' || e.churn_risk_bucket === 'Crítico')) {
        const key = `${e.cliente_id}-${e.acao_recomendada_1}`;
        if (!seen.has(key)) {
          seen.add(key);
          acoes.push({
            id: key,
            cliente_id: String(e.cliente_id),
            cliente_nome: e.cliente_nome,
            acao_1: e.acao_recomendada_1,
            acao_2: e.acao_recomendada_2,
            acao_3: e.acao_recomendada_3,
            tipo: e.alerta_tipo || 'N/A',
            bucket: e.churn_risk_bucket,
            driver: e.alerta_tipo,
            valor: e.valor_mensalidade || 0,
          });
        }
      }
    });

    return acoes.slice(0, 100);
  }, [eventos]);

  const handleExecuteAction = (acao: any, actionType: string) => {
    const log: ActionLog = {
      id: `${Date.now()}-${acao.cliente_id}`,
      datetime: new Date().toISOString(),
      usuario: 'admin',
      cliente_id: acao.cliente_id,
      cliente_nome: acao.cliente_nome,
      tipo_acao: actionType,
      resultado: 'success',
      observacao: `Ação "${actionType}" executada`,
      origem: acao.driver || 'churn',
    };
    
    setLogs(prev => [log, ...prev]);
    toast({
      title: "Ação executada",
      description: `${actionType} para ${acao.cliente_nome}`,
    });
  };

  const handleConcluir = (acao: any) => {
    setCompletadas(prev => new Set(prev).add(acao.id));
    setFalhou(prev => {
      const newSet = new Set(prev);
      newSet.delete(acao.id);
      return newSet;
    });
    
    const log: ActionLog = {
      id: `${Date.now()}-${acao.cliente_id}`,
      datetime: new Date().toISOString(),
      usuario: 'admin',
      cliente_id: acao.cliente_id,
      cliente_nome: acao.cliente_nome,
      tipo_acao: 'concluir',
      resultado: 'success',
      observacao: 'Ação concluída e removida da fila',
      origem: acao.driver || 'churn',
    };
    
    setLogs(prev => [log, ...prev]);
    toast({
      title: "Concluído",
      description: `${acao.cliente_nome} removido da fila do dia`,
    });
  };

  const handleFalhou = (acao: any) => {
    setFalhou(prev => new Set(prev).add(acao.id));
    
    const log: ActionLog = {
      id: `${Date.now()}-${acao.cliente_id}`,
      datetime: new Date().toISOString(),
      usuario: 'admin',
      cliente_id: acao.cliente_id,
      cliente_nome: acao.cliente_nome,
      tipo_acao: 'falhou',
      resultado: 'error',
      observacao: 'Ação falhou - retry pendente',
      origem: acao.driver || 'churn',
    };
    
    setLogs(prev => [log, ...prev]);
    toast({
      title: "Falhou",
      description: `Ação para ${acao.cliente_nome} marcada como falha`,
      variant: "destructive",
    });
  };

  const handleCriarTarefa = (acao: any) => {
    toast({
      title: "Tarefa criada",
      description: `Tarefa adicionada para ${acao.cliente_nome}`,
    });
  };

  const filaAtiva = filaAcoes.filter(a => !completadas.has(a.id));

  const playbooks = [
    {
      titulo: "Playbook Rede",
      icon: Wifi,
      color: "border-orange-500",
      steps: [
        "1. Rodar diagnóstico remoto (ONU/PPPoE)",
        "2. Verificar sinal RX/TX/SNR",
        "3. Monitorar conexão por 24h",
        "4. Abrir OS preventiva se necessário",
        "5. Aplicar crédito proporcional",
        "6. Bônus de banda 72h para casos críticos",
      ]
    },
    {
      titulo: "Playbook Financeiro",
      icon: CreditCard,
      color: "border-red-500",
      steps: [
        "1. Enviar 2ª via + PIX copia/cola automaticamente",
        "2. Lembrete WhatsApp D-3",
        "3. Oferecer negociação (parcelamento curto)",
        "4. Sugerir migração para débito automático",
        "5. Aplicar bloqueio parcial conforme política",
        "6. Aviso ANATEL antes de suspensão",
      ]
    },
    {
      titulo: "Playbook Experiência",
      icon: Frown,
      color: "border-purple-500",
      steps: [
        "1. Retorno imediato ao cliente",
        "2. Pedido de desculpas formal",
        "3. Prioridade no atendimento",
        "4. Oferta de upgrade temporário",
        "5. Acompanhamento pós-resolução",
        "6. NPS de follow-up em 7 dias",
      ]
    },
    {
      titulo: "Playbook Reincidência",
      icon: RefreshCw,
      color: "border-blue-500",
      steps: [
        "1. Escalar automaticamente para N2",
        "2. Auditoria da instalação",
        "3. Diagnóstico completo de rede",
        "4. Verificar infraestrutura do cliente",
        "5. Acompanhamento semanal",
        "6. Revisão em 30 dias",
      ]
    },
  ];

  const getBucketColor = (bucket: string) => {
    if (bucket === 'Crítico') return 'bg-red-500/10 text-red-500 border-red-500/20';
    if (bucket === 'Alto') return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-3">
              <ClipboardList className="h-8 w-8 text-indigo-500" />
              Ações & Playbooks
            </h1>
            <p className="text-muted-foreground mt-1">Fila de ações, execução e logs</p>
          </div>

          <Tabs defaultValue="fila">
            <TabsList>
              <TabsTrigger value="fila">Fila de Ações ({filaAtiva.length})</TabsTrigger>
              <TabsTrigger value="logs">Logs de Execução ({logs.length})</TabsTrigger>
              <TabsTrigger value="playbooks">Playbooks</TabsTrigger>
            </TabsList>

            <TabsContent value="fila" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      Ações Recomendadas Hoje
                    </span>
                    <div className="flex gap-2">
                      <Badge variant="outline">{filaAtiva.length} pendentes</Badge>
                      <Badge variant="secondary">{completadas.size} concluídas</Badge>
                      {falhou.size > 0 && <Badge variant="destructive">{falhou.size} falhas</Badge>}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {filaAtiva.slice(0, 30).map(a => (
                      <div 
                        key={a.id} 
                        className={`flex items-start gap-3 p-4 rounded-lg border ${
                          falhou.has(a.id) ? 'border-destructive/50 bg-destructive/5' : 'border-border'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold">{a.cliente_nome}</span>
                            <Badge variant="outline" className={getBucketColor(a.bucket)}>
                              {a.bucket}
                            </Badge>
                            <Badge variant="secondary">{a.tipo}</Badge>
                            {falhou.has(a.id) && <Badge variant="destructive">Falhou</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            Driver: {a.driver} | MRR: R$ {a.valor?.toFixed(2)}
                          </p>
                          
                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-2">
                            {a.acao_1 && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleExecuteAction(a, a.acao_1)}
                              >
                                <Phone className="h-3 w-3 mr-1" />
                                {a.acao_1.slice(0, 25)}
                              </Button>
                            )}
                            {a.acao_2 && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleExecuteAction(a, a.acao_2)}
                              >
                                <Mail className="h-3 w-3 mr-1" />
                                {a.acao_2.slice(0, 25)}
                              </Button>
                            )}
                            {a.acao_3 && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleExecuteAction(a, a.acao_3)}
                              >
                                <Gift className="h-3 w-3 mr-1" />
                                {a.acao_3.slice(0, 25)}
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={() => handleConcluir(a)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Concluir
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleFalhou(a)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Falhou
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleCriarTarefa(a)}
                          >
                            <Clock className="h-4 w-4 mr-1" />
                            Agendar
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {filaAtiva.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        <CheckCircle className="h-12 w-12 mx-auto mb-3 text-success" />
                        <p className="text-lg font-medium">Todas as ações concluídas!</p>
                        <p className="text-sm">Não há ações pendentes para hoje.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logs">
              <Card>
                <CardHeader>
                  <CardTitle>Logs de Execução</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[500px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data/Hora</TableHead>
                          <TableHead>Usuário</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Ação</TableHead>
                          <TableHead>Resultado</TableHead>
                          <TableHead>Origem</TableHead>
                          <TableHead>Observação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.map(log => (
                          <TableRow key={log.id}>
                            <TableCell className="text-xs">
                              {new Date(log.datetime).toLocaleString('pt-BR')}
                            </TableCell>
                            <TableCell className="text-xs">{log.usuario}</TableCell>
                            <TableCell className="text-sm font-medium">{log.cliente_nome}</TableCell>
                            <TableCell className="text-sm">{log.tipo_acao}</TableCell>
                            <TableCell>
                              <Badge variant={log.resultado === 'success' ? 'default' : 'destructive'}>
                                {log.resultado === 'success' ? 'Sucesso' : 'Erro'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{log.origem}</TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                              {log.observacao}
                            </TableCell>
                          </TableRow>
                        ))}
                        {logs.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              Nenhum log de execução ainda
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="playbooks">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {playbooks.map(p => (
                  <Card key={p.titulo} className={`border-l-4 ${p.color}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <p.icon className="h-5 w-5" />
                        {p.titulo}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {p.steps.map((step, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default AcoesPage;