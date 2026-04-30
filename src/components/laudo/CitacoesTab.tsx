/**
 * CitacoesTab — Aba de Fundamentação Normativa do laudo.
 *
 * Funcionalidades:
 * - Busca de trechos na biblioteca por palavra-chave (3+ chars)
 * - Resultados clicáveis com botão "Adicionar ao laudo"
 * - Lista das citações já adicionadas com textos editáveis e ordenação ↑↓
 * - Botão "Adicionar manualmente" para inserir citação livre (sem biblioteca)
 * - Salva aplicação no onBlur via citacoes.update (sem botão extra)
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus,
  Search,
  ChevronUp,
  ChevronDown,
  Trash2,
  Loader2,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface Citacao {
  id: number;
  laudoId: number;
  trechoId?: number | null;
  normaCodigo: string;
  numeroItem: string;
  tituloItem: string;
  textoCitado: string;
  aplicacao?: string | null;
  ordem: number;
}

interface TrechoResultado {
  id: number;
  normaId: number;
  normaCodigo: string;
  normaTitulo: string;
  numeroItem: string;
  tituloItem: string;
  texto: string;
  palavrasChave: string;
}

interface Props {
  laudoId: number;
  tipoLaudo: string;
  citacoes: Citacao[];
  isFinalized: boolean;
  isTecnico?: boolean;
  onCitacoesChange: (citacoes: Citacao[]) => void;
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function CitacoesTab({
  laudoId,
  tipoLaudo,
  citacoes,
  isFinalized,
  isTecnico = false,
  onCitacoesChange,
}: Props) {
  // ── Estado de busca
  const [busca, setBusca] = useState("");
  const [buscaAtiva, setBuscaAtiva] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<TrechoResultado[]>([]);

  // ── Estado do modal de inserção manual
  const [showManual, setShowManual] = useState(false);
  const [manualCodigo, setManualCodigo] = useState("");
  const [manualNumero, setManualNumero] = useState("");
  const [manualTitulo, setManualTitulo] = useState("");
  const [manualTexto, setManualTexto] = useState("");
  const [manualAplicacao, setManualAplicacao] = useState("");
  const [salvandoManual, setSalvandoManual] = useState(false);

  // IDs sendo salvos/removidos (para UI de loading)
  const [removendoId, setRemovendoId] = useState<number | null>(null);
  const [adicionandoId, setAdicionandoId] = useState<number | null>(null);

  // ── Procedures tRPC (prefixo diferente para admin vs técnico)
  const prefixoBusca = isTecnico ? "normasTrechosTecnico" : "normasTrechos";
  const prefixoCit = isTecnico ? "citacoesTecnico" : "citacoes";

  const searchMutation = (trpc.laudos as any)[`${prefixoBusca}.search`]?.useMutation
    ? undefined // fallback: queries não são mutations — veja abaixo
    : undefined;

  const addMutation = (trpc.laudos as any)[`${prefixoCit}.add`].useMutation({
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = (trpc.laudos as any)[`${prefixoCit}.update`].useMutation({
    onError: (e: any) => toast.error(e.message),
  });

  const removeMutation = (trpc.laudos as any)[`${prefixoCit}.remove`].useMutation({
    onError: (e: any) => toast.error(e.message),
  });

  // ── Busca de trechos (query com fetch manual via utils)
  const utils = trpc.useUtils();

  async function handleBuscar() {
    const termo = busca.trim();
    if (termo.length < 3) {
      toast.warning("Digite pelo menos 3 caracteres para buscar");
      return;
    }
    setBuscando(true);
    setBuscaAtiva(termo);
    try {
      const dados = await (utils.laudos as any)[`${prefixoBusca}.search`].fetch({
        busca: termo,
        tipoLaudo,
      });
      setResultados(dados ?? []);
      if (!dados?.length) toast.info("Nenhum trecho encontrado para esse termo");
    } catch (e: any) {
      toast.error(e.message ?? "Erro na busca");
    } finally {
      setBuscando(false);
    }
  }

  // ── Adicionar trecho da biblioteca ao laudo
  async function handleAdicionar(trecho: TrechoResultado) {
    setAdicionandoId(trecho.id);
    try {
      const resultado = await addMutation.mutateAsync({
        laudoId,
        trechoId: trecho.id,
        normaCodigo: trecho.normaCodigo,
        numeroItem: trecho.numeroItem,
        tituloItem: trecho.tituloItem,
        textoCitado: trecho.texto,
        ordem: citacoes.length,
      });
      if (resultado?.citacao) {
        onCitacoesChange([...citacoes, resultado.citacao as Citacao]);
        toast.success("Citação adicionada");
      }
    } catch {
      // erro já exibido pelo onError
    } finally {
      setAdicionandoId(null);
    }
  }

  // ── Salvar citação manual
  async function handleSalvarManual() {
    if (!manualCodigo.trim() || !manualNumero.trim() || !manualTitulo.trim() || !manualTexto.trim()) {
      toast.warning("Preencha todos os campos obrigatórios");
      return;
    }
    setSalvandoManual(true);
    try {
      const resultado = await addMutation.mutateAsync({
        laudoId,
        normaCodigo: manualCodigo.trim(),
        numeroItem: manualNumero.trim(),
        tituloItem: manualTitulo.trim(),
        textoCitado: manualTexto.trim(),
        aplicacao: manualAplicacao.trim() || undefined,
        ordem: citacoes.length,
      });
      if (resultado?.citacao) {
        onCitacoesChange([...citacoes, resultado.citacao as Citacao]);
        toast.success("Citação adicionada");
        setShowManual(false);
        setManualCodigo(""); setManualNumero(""); setManualTitulo(""); setManualTexto(""); setManualAplicacao("");
      }
    } catch {
      // erro já exibido pelo onError
    } finally {
      setSalvandoManual(false);
    }
  }

  // ── Salvar aplicação ao sair do campo (onBlur)
  function handleAplicacaoBlur(citacao: Citacao, novaAplicacao: string) {
    if (novaAplicacao === (citacao.aplicacao ?? "")) return; // sem mudança
    updateMutation.mutate({ id: citacao.id, aplicacao: novaAplicacao });
    onCitacoesChange(citacoes.map((c) => c.id === citacao.id ? { ...c, aplicacao: novaAplicacao } : c));
  }

  // ── Remover citação
  async function handleRemover(id: number) {
    setRemovendoId(id);
    try {
      await removeMutation.mutateAsync({ id });
      onCitacoesChange(citacoes.filter((c) => c.id !== id));
      toast.success("Citação removida");
    } catch {
      // erro já exibido
    } finally {
      setRemovendoId(null);
    }
  }

  // ── Reordenar ↑ ↓
  async function handleMover(index: number, direcao: "up" | "down") {
    const alvo = direcao === "up" ? index - 1 : index + 1;
    if (alvo < 0 || alvo >= citacoes.length) return;

    const nova = [...citacoes];
    [nova[index], nova[alvo]] = [nova[alvo], nova[index]];
    // Atualiza ordens
    const comOrdens = nova.map((c, i) => ({ ...c, ordem: i }));
    onCitacoesChange(comOrdens);

    // Persiste as duas ordens alteradas
    updateMutation.mutate({ id: comOrdens[index].id, ordem: comOrdens[index].ordem });
    updateMutation.mutate({ id: comOrdens[alvo].id, ordem: comOrdens[alvo].ordem });
  }

  return (
    <div className="space-y-6">
      {/* ── Cabeçalho ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Fundamentação Normativa</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cite trechos normativos que embasam as constatações deste laudo
          </p>
        </div>
        {!isFinalized && (
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowManual(true)}>
            <Plus className="h-4 w-4" />
            Adicionar manualmente
          </Button>
        )}
      </div>

      {/* ── Campo de busca ────────────────────────────────────────── */}
      {!isFinalized && (
        <Card>
          <CardContent className="pt-4">
            <Label className="text-sm font-medium mb-2 block">Buscar na biblioteca de normas</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Digite palavras-chave (ex: aterramento, EPI, quadro...)"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleBuscar} disabled={buscando} className="gap-2">
                {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Buscar
              </Button>
            </div>

            {/* Resultados da busca */}
            {resultados.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-muted-foreground">
                  {resultados.length} resultado{resultados.length !== 1 ? "s" : ""} para "{buscaAtiva}"
                </p>
                {resultados.map((r) => (
                  <div
                    key={r.id}
                    className="border rounded-lg p-3 bg-muted/30 hover:bg-muted/60 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 font-mono text-xs">
                            {r.normaCodigo}
                          </Badge>
                          <span className="text-xs text-muted-foreground">item {r.numeroItem}</span>
                        </div>
                        <p className="text-sm font-medium">{r.tituloItem}</p>
                        <p className="text-xs text-muted-foreground mt-1 italic line-clamp-2">
                          "{r.texto}"
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 gap-1 text-xs"
                        disabled={adicionandoId === r.id}
                        onClick={() => handleAdicionar(r)}
                      >
                        {adicionandoId === r.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <Plus className="h-3 w-3" />}
                        Adicionar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Lista de citações do laudo ────────────────────────────── */}
      {citacoes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground border-2 border-dashed rounded-lg">
          <BookOpen className="h-10 w-10 opacity-30" />
          <p className="text-sm">Nenhuma citação normativa adicionada</p>
          {!isFinalized && (
            <p className="text-xs">Use o campo de busca acima ou adicione manualmente</p>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Citações do laudo ({citacoes.length}):
          </p>
          <div className="space-y-3 mt-2">
            {citacoes.map((c, i) => (
              <div
                key={c.id}
                className="border rounded-lg p-4 bg-card hover:shadow-sm transition-shadow"
              >
                {/* Cabeçalho da citação */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-blue-600 text-white hover:bg-blue-700 font-mono text-xs">
                      {c.normaCodigo}
                    </Badge>
                    <span className="text-sm text-muted-foreground">item {c.numeroItem}</span>
                    <span className="text-sm font-medium">— {c.tituloItem}</span>
                  </div>
                  {!isFinalized && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        title="Mover para cima"
                        disabled={i === 0}
                        onClick={() => handleMover(i, "up")}
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        title="Mover para baixo"
                        disabled={i === citacoes.length - 1}
                        onClick={() => handleMover(i, "down")}
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        title="Remover citação"
                        disabled={removendoId === c.id}
                        onClick={() => handleRemover(c.id)}
                      >
                        {removendoId === c.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Bloco de citação — borda azul à esquerda */}
                <blockquote className="border-l-4 border-blue-500 pl-3 py-1 mb-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-r">
                  <p className="text-sm italic text-foreground/80 leading-relaxed">
                    "{c.textoCitado}"
                  </p>
                </blockquote>

                {/* Aplicação ao caso */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Aplicação ao caso (opcional):
                  </Label>
                  <Textarea
                    placeholder="Descreva como esta citação se aplica ao caso concreto..."
                    defaultValue={c.aplicacao ?? ""}
                    disabled={isFinalized}
                    rows={2}
                    className="text-sm resize-none"
                    onBlur={(e) => handleAplicacaoBlur(c, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Dialog: Inserção manual ───────────────────────────────── */}
      <Dialog open={showManual} onOpenChange={setShowManual}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar citação manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Código da norma *</Label>
                <Input
                  placeholder="Ex: ABNT NBR 5410"
                  value={manualCodigo}
                  onChange={(e) => setManualCodigo(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">Número do item *</Label>
                <Input
                  placeholder="Ex: 6.2.1"
                  value={manualNumero}
                  onChange={(e) => setManualNumero(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm">Título do item *</Label>
              <Input
                placeholder="Ex: Quadros de distribuição — Requisitos gerais"
                value={manualTitulo}
                onChange={(e) => setManualTitulo(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Texto citado *</Label>
              <Textarea
                placeholder="Transcrição do trecho normativo..."
                value={manualTexto}
                onChange={(e) => setManualTexto(e.target.value)}
                rows={4}
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-sm">Aplicação ao caso (opcional)</Label>
              <Textarea
                placeholder="Como este trecho se aplica ao laudo em questão..."
                value={manualAplicacao}
                onChange={(e) => setManualAplicacao(e.target.value)}
                rows={3}
                className="mt-1 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowManual(false)} disabled={salvandoManual}>
                Cancelar
              </Button>
              <Button onClick={handleSalvarManual} disabled={salvandoManual} className="gap-2">
                {salvandoManual ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Adicionar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
