/**
 * Módulo de IA para o módulo de Laudos Técnicos.
 *
 * Exporta duas funções principais:
 *   - sugerirNormasIA(laudoId)    → seleciona 3-6 trechos da biblioteca relevantes ao laudo
 *   - sugerirConclusaoIA(laudoId) → gera parecer, texto de conclusão e recomendações
 *
 * Usa a Claude API (claude-sonnet-4-6) via fetch direto.
 * Requer a env var ANTHROPIC_API_KEY.
 */

import { getLaudoById } from "./laudosDb";
import { listAllNormaTrechosParaIA } from "./laudosDb";

// ── Tipos retornados ──────────────────────────────────────────────────────────

export interface SugestaoNorma {
  trechoId: number;
  normaCodigo: string;
  numeroItem: string;
  tituloItem: string;
  textoCitado: string;
  justificativa: string; // explicação da IA sobre por que este trecho é relevante
}

export interface SugestaoConclusao {
  parecer: "conforme" | "nao_conforme" | "parcialmente_conforme";
  conclusao: string;
  recomendacoes: string;
}

// ── sugerirNormasIA ───────────────────────────────────────────────────────────

/**
 * Analisa o laudo e retorna de 3 a 6 trechos da biblioteca normativa
 * que a IA considera mais relevantes para fundamentá-lo.
 */
export async function sugerirNormasIA(laudoId: number): Promise<SugestaoNorma[]> {
  const laudo = await getLaudoById(laudoId);
  if (!laudo) throw new Error("Laudo não encontrado");

  // Carrega todos os trechos ativos da biblioteca para o contexto da IA
  const trechos = await listAllNormaTrechosParaIA();
  if (!trechos.length) throw new Error("Nenhum trecho normativo cadastrado na biblioteca");

  const systemPrompt =
    "Você é um assistente técnico especializado em laudos elétricos brasileiros. " +
    "Analise o laudo fornecido e sugira os trechos normativos mais relevantes da biblioteca disponível. " +
    "Responda APENAS com JSON válido, sem markdown, sem explicações fora do JSON.";

  const userPrompt =
    `LAUDO:\n` +
    `Tipo: ${laudo.tipo}\n` +
    `Título: ${laudo.titulo}\n` +
    `Objeto: ${laudo.objeto ?? ""}\n` +
    `Constatações: ${JSON.stringify((laudo as any).constatacoes ?? [])}\n\n` +
    `BIBLIOTECA DE TRECHOS DISPONÍVEIS:\n` +
    JSON.stringify(
      trechos.map((t: any) => ({
        id: t.id,
        normaCodigo: t.normaCodigo,
        numeroItem: t.numeroItem,
        tituloItem: t.tituloItem,
        texto: t.texto,
      }))
    ) +
    `\n\nSelecione de 3 a 6 trechos da biblioteca que sejam mais relevantes para fundamentar este laudo.\n` +
    `Retorne JSON no formato:\n` +
    `[\n` +
    `  {\n` +
    `    "trechoId": 123,\n` +
    `    "normaCodigo": "ABNT NBR 5410",\n` +
    `    "numeroItem": "5.1.3.1",\n` +
    `    "tituloItem": "Aterramento — Obrigatoriedade",\n` +
    `    "textoCitado": "texto completo do trecho",\n` +
    `    "justificativa": "Aplicável porque foi constatada ausência de aterramento no QDG"\n` +
    `  }\n` +
    `]`;

  const resposta = await chamarClaudeAPI(systemPrompt, userPrompt, 2000);

  try {
    const parsed = JSON.parse(resposta);
    if (!Array.isArray(parsed)) throw new Error("Esperado array");
    return parsed as SugestaoNorma[];
  } catch {
    throw new Error("Resposta da IA em formato inválido — não foi possível parsear JSON");
  }
}

// ── sugerirConclusaoIA ────────────────────────────────────────────────────────

/**
 * Analisa o laudo (constatações, tipo, objeto) e retorna uma sugestão de
 * conclusão técnica, parecer final e recomendações.
 */
export async function sugerirConclusaoIA(laudoId: number): Promise<SugestaoConclusao> {
  const laudo = await getLaudoById(laudoId);
  if (!laudo) throw new Error("Laudo não encontrado");

  const constatacoes: any[] = (laudo as any).constatacoes ?? [];
  const conformes    = constatacoes.filter((c: any) => c.status === "conforme").length;
  const naoConformes = constatacoes.filter((c: any) => c.status === "nao_conforme").length;
  const atencao      = constatacoes.filter((c: any) => c.status === "atencao").length;
  const total        = constatacoes.length;

  const systemPrompt =
    "Você é um técnico em eletrotécnica registrado no CREA/CRT redigindo um laudo técnico profissional. " +
    "Escreva textos técnicos formais em português brasileiro. " +
    "Responda APENAS com JSON válido, sem markdown.";

  const userPrompt =
    `DADOS DO LAUDO:\n` +
    `Tipo: ${laudo.tipo}\n` +
    `Título: ${laudo.titulo}\n` +
    `Objeto: ${laudo.objeto ?? ""}\n` +
    `Cliente: ${(laudo as any).clienteNome ?? ""}\n\n` +
    `CONSTATAÇÕES:\n` +
    `- Total: ${total}\n` +
    `- Conformes: ${conformes}\n` +
    `- Não conformes: ${naoConformes}\n` +
    `- Requer atenção: ${atencao}\n` +
    `- Detalhes: ${JSON.stringify(constatacoes)}\n\n` +
    `Gere um texto de conclusão técnica profissional para este laudo.\n` +
    `Retorne JSON no formato:\n` +
    `{\n` +
    `  "parecer": "conforme" | "nao_conforme" | "parcialmente_conforme",\n` +
    `  "conclusao": "texto da conclusão técnica (3-5 parágrafos)",\n` +
    `  "recomendacoes": "texto das recomendações ou string vazia se não houver não conformidades"\n` +
    `}`;

  const resposta = await chamarClaudeAPI(systemPrompt, userPrompt, 2000);

  try {
    const parsed = JSON.parse(resposta);
    return parsed as SugestaoConclusao;
  } catch {
    throw new Error("Resposta da IA em formato inválido — não foi possível parsear JSON");
  }
}

// ── Utilitário interno: chama a Claude API ────────────────────────────────────

async function chamarClaudeAPI(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada no servidor");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const erroTexto = await response.text().catch(() => "sem detalhes");
    throw new Error(`Erro na API Claude: ${response.status} — ${erroTexto}`);
  }

  const data: any = await response.json();
  const texto: string = data?.content?.[0]?.text ?? "";
  if (!texto) throw new Error("Resposta vazia da API Claude");

  // Remove cercas de markdown caso a IA as inclua mesmo instruída a não fazer
  return texto.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
}
