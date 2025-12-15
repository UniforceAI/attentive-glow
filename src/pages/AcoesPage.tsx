import { useMemo, useState } from "react";
import { useEventos } from "@/hooks/useEventos";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ClipboardList, CheckCircle, Wifi, CreditCard, Frown, RefreshCw, PlayCircle } from "lucide-react";

const AcoesPage = () => {
  const { eventos } = useEventos();
  const [completadas, setCompletadas] = useState<Set<string>>(new Set());

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
            cliente_id: e.cliente_id,
            cliente_nome: e.cliente_nome,
            acao: e.acao_recomendada_1,
            tipo: e.alerta_tipo,
            bucket: e.churn_risk_bucket,
          });
        }
      }
    });

    return acoes.slice(0, 50);
  }, [eventos]);

  const toggleCompletada = (id: string) => {
    const newSet = new Set(completadas);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setCompletadas(newSet);
  };

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
            <p className="text-muted-foreground mt-1">Fila de ações e biblioteca de playbooks</p>
          </div>

          <Tabs defaultValue="fila">
            <TabsList>
              <TabsTrigger value="fila">Fila de Ações</TabsTrigger>
              <TabsTrigger value="playbooks">Playbooks</TabsTrigger>
            </TabsList>

            <TabsContent value="fila" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Ações Recomendadas ({filaAcoes.length - completadas.size} pendentes)</span>
                    <Badge variant="outline">{completadas.size} concluídas</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {filaAcoes.map(a => (
                      <div 
                        key={a.id} 
                        className={`flex items-start gap-3 p-3 rounded-lg border ${completadas.has(a.id) ? 'bg-muted/50 opacity-60' : ''}`}
                      >
                        <Checkbox 
                          checked={completadas.has(a.id)}
                          onCheckedChange={() => toggleCompletada(a.id)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{a.cliente_nome}</span>
                            <Badge variant="outline" className={
                              a.bucket === 'Crítico' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'
                            }>
                              {a.bucket}
                            </Badge>
                            <Badge variant="secondary">{a.tipo}</Badge>
                          </div>
                          <p className={`text-sm ${completadas.has(a.id) ? 'line-through' : ''}`}>{a.acao}</p>
                        </div>
                        <Button variant="ghost" size="sm">
                          <PlayCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
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
