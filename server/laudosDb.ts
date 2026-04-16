import { eq, desc, and, like, or } from "drizzle-orm";
import { getDb } from "./db";
import {
  laudos, laudoFotos, laudoMedicoes, configuracoesTecnico,
  InsertLaudo, InsertLaudoFoto, InsertLaudoMedicao, InsertConfiguracoesTecnico,
} from "../drizzle/schema";

// ── Número automático ────────────────────────────────────────────────────────

export async function generateLaudoNumero(): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const year = new Date().getFullYear();
  const prefix = `LAU-${year}-`;

  const laudosThisYear = await db
    .select({ numero: laudos.numero })
    .from(laudos)
    .where(like(laudos.numero, `${prefix}%`));

  let maxNumber = 0;
  for (const l of laudosThisYear) {
    if (l.numero) {
      const parts = l.numero.split("-");
      if (parts.length >= 3) {
        const num = parseInt(parts[2] || "0");
        if (num > maxNumber) maxNumber = num;
      }
    }
  }

  return `${prefix}${String(maxNumber + 1).padStart(4, "0")}`;
}

// ── CRUD Laudos ──────────────────────────────────────────────────────────────

export async function listLaudos(params: {
  tipo?: string;
  status?: string;
  clienteId?: number;
  search?: string;
  criadoPor?: number;
  criadoPorTipo?: "admin" | "tecnico";
}) {
  const db = await getDb();
  if (!db) return [];

  const { clients } = await import("../drizzle/schema");

  const conditions: any[] = [];

  if (params.tipo) conditions.push(eq(laudos.tipo, params.tipo as any));
  if (params.status) conditions.push(eq(laudos.status, params.status as any));
  if (params.clienteId) conditions.push(eq(laudos.clienteId, params.clienteId));
  if (params.criadoPor) conditions.push(eq(laudos.criadoPor, params.criadoPor));
  if (params.criadoPorTipo) conditions.push(eq(laudos.criadoPorTipo, params.criadoPorTipo));
  if (params.search) {
    conditions.push(
      or(
        like(laudos.numero, `%${params.search}%`),
        like(laudos.titulo, `%${params.search}%`)
      )
    );
  }

  const rows = await db
    .select({
      id: laudos.id,
      numero: laudos.numero,
      tipo: laudos.tipo,
      titulo: laudos.titulo,
      status: laudos.status,
      dataInspecao: laudos.dataInspecao,
      clienteId: laudos.clienteId,
      clienteNome: clients.name,
      criadoPor: laudos.criadoPor,
      criadoPorTipo: laudos.criadoPorTipo,
      createdAt: laudos.createdAt,
    })
    .from(laudos)
    .leftJoin(clients, eq(laudos.clienteId, clients.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(laudos.createdAt));

  return rows;
}

export async function getLaudoById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const { clients } = await import("../drizzle/schema");

  const [laudo] = await db
    .select({
      id: laudos.id,
      numero: laudos.numero,
      tipo: laudos.tipo,
      titulo: laudos.titulo,
      clienteId: laudos.clienteId,
      clienteNome: clients.name,
      clienteEndereco: clients.address,
      osId: laudos.osId,
      status: laudos.status,
      objeto: laudos.objeto,
      metodologia: laudos.metodologia,
      equipamentosUtilizados: laudos.equipamentosUtilizados,
      condicoesLocal: laudos.condicoesLocal,
      constatacoes: laudos.constatacoes,
      conclusaoParecer: laudos.conclusaoParecer,
      conclusaoTexto: laudos.conclusaoTexto,
      recomendacoes: laudos.recomendacoes,
      normasReferencia: laudos.normasReferencia,
      validadeMeses: laudos.validadeMeses,
      dataInspecao: laudos.dataInspecao,
      criadoPor: laudos.criadoPor,
      criadoPorTipo: laudos.criadoPorTipo,
      createdAt: laudos.createdAt,
      updatedAt: laudos.updatedAt,
    })
    .from(laudos)
    .leftJoin(clients, eq(laudos.clienteId, clients.id))
    .where(eq(laudos.id, id))
    .limit(1);

  if (!laudo) return null;

  const fotos = await db
    .select()
    .from(laudoFotos)
    .where(eq(laudoFotos.laudoId, id))
    .orderBy(laudoFotos.ordem);

  const medicoes = await db
    .select()
    .from(laudoMedicoes)
    .where(eq(laudoMedicoes.laudoId, id))
    .orderBy(laudoMedicoes.ordem);

  return {
    ...laudo,
    constatacoes: laudo.constatacoes ? JSON.parse(laudo.constatacoes) : [],
    normasReferencia: laudo.normasReferencia ? JSON.parse(laudo.normasReferencia) : [],
    fotos,
    medicoes,
  };
}

export async function createLaudo(data: {
  tipo: string;
  titulo: string;
  clienteId?: number;
  osId?: number;
  normasReferencia?: any[];
  criadoPor?: number;
  criadoPorTipo?: "admin" | "tecnico";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const numero = await generateLaudoNumero();

  await db.insert(laudos).values({
    numero,
    tipo: data.tipo as any,
    titulo: data.titulo,
    clienteId: data.clienteId ?? null,
    osId: data.osId ?? null,
    normasReferencia: data.normasReferencia ? JSON.stringify(data.normasReferencia) : null,
    criadoPor: data.criadoPor ?? null,
    criadoPorTipo: data.criadoPorTipo ?? null,
    status: "rascunho",
  });

  const [novo] = await db
    .select({ id: laudos.id })
    .from(laudos)
    .where(eq(laudos.numero, numero))
    .limit(1);

  return { id: novo?.id ?? 0, numero };
}

export async function updateLaudo(id: number, data: Partial<{
  tipo: string;
  titulo: string;
  clienteId: number | null;
  osId: number | null;
  status: string;
  objeto: string;
  metodologia: string;
  equipamentosUtilizados: string;
  condicoesLocal: string;
  constatacoes: any[];
  conclusaoParecer: string;
  conclusaoTexto: string;
  recomendacoes: string;
  normasReferencia: any[];
  validadeMeses: number;
  dataInspecao: Date | null;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, any> = { ...data };

  if (data.constatacoes !== undefined) {
    updateData.constatacoes = JSON.stringify(data.constatacoes);
  }
  if (data.normasReferencia !== undefined) {
    updateData.normasReferencia = JSON.stringify(data.normasReferencia);
  }

  await db.update(laudos).set(updateData as any).where(eq(laudos.id, id));
}

export async function deleteLaudo(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(laudoFotos).where(eq(laudoFotos.laudoId, id));
  await db.delete(laudoMedicoes).where(eq(laudoMedicoes.laudoId, id));
  await db.delete(laudos).where(eq(laudos.id, id));
}

// ── Fotos ────────────────────────────────────────────────────────────────────

export async function getLaudoFotoById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [foto] = await db
    .select()
    .from(laudoFotos)
    .where(eq(laudoFotos.id, id))
    .limit(1);
  return foto ?? null;
}

export async function addLaudoFoto(data: {
  laudoId: number;
  url: string;
  legenda?: string;
  comentario?: string;
  classificacao?: "conforme" | "nao_conforme" | "atencao";
  ordem?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(laudoFotos).values({
    laudoId: data.laudoId,
    url: data.url,
    legenda: data.legenda ?? null,
    comentario: data.comentario ?? null,
    classificacao: data.classificacao ?? null,
    ordem: data.ordem ?? 0,
  });
}

export async function updateLaudoFoto(id: number, data: Partial<{
  legenda: string;
  comentario: string;
  classificacao: "conforme" | "nao_conforme" | "atencao";
  ordem: number;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(laudoFotos).set(data as any).where(eq(laudoFotos.id, id));
}

export async function removeLaudoFoto(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(laudoFotos).where(eq(laudoFotos.id, id));
}

// ── Medições ─────────────────────────────────────────────────────────────────

export async function addLaudoMedicao(data: {
  laudoId: number;
  descricao: string;
  unidade?: string;
  valorMedido?: string;
  valorReferencia?: string;
  resultado?: "aprovado" | "reprovado";
  ordem?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(laudoMedicoes).values({
    laudoId: data.laudoId,
    descricao: data.descricao,
    unidade: data.unidade ?? null,
    valorMedido: data.valorMedido ?? null,
    valorReferencia: data.valorReferencia ?? null,
    resultado: data.resultado ?? null,
    ordem: data.ordem ?? 0,
  });
}

export async function removeLaudoMedicao(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(laudoMedicoes).where(eq(laudoMedicoes.id, id));
}

// ── Configurações do Técnico ─────────────────────────────────────────────────

export async function getConfiguracoesTecnico() {
  const db = await getDb();
  if (!db) return null;

  const [config] = await db
    .select()
    .from(configuracoesTecnico)
    .orderBy(configuracoesTecnico.id)
    .limit(1);

  return config ?? null;
}

export async function upsertConfiguracoesTecnico(data: {
  nomeCompleto?: string;
  registroCrt?: string;
  especialidade?: string;
  empresa?: string;
  cidade?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getConfiguracoesTecnico();
  if (existing) {
    await db
      .update(configuracoesTecnico)
      .set(data as any)
      .where(eq(configuracoesTecnico.id, existing.id));
  } else {
    await db.insert(configuracoesTecnico).values(data as any);
  }
}
