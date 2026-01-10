import { z } from "zod";

// Schemas para validação de clientes
export const createClientSchema = z.object({
  adminId: z.number().int().positive(),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido").or(z.literal("")).optional(),
  username: z.string().min(1),
  password: z.string().min(1),
  cnpjCpf: z.string().min(11, "CNPJ/CPF é obrigatório"),
  phone: z.string().min(10, "Telefone é obrigatório"),
  address: z.string().optional(),
  type: z.enum(["com_portal", "sem_portal"]).default("com_portal"),
});

export const updateClientSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  username: z.string().min(3).optional(),
  cnpjCpf: z.string().min(11).optional(),
  phone: z.string().min(10).optional(),
  address: z.string().optional(),
  type: z.enum(["com_portal", "sem_portal"]).optional(),
});

// Schemas para validação de documentos
export const createDocumentSchema = z.object({
  adminId: z.number().int().positive(),
  clientId: z.number().int().positive(),
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  documentType: z.enum([
    "vistoria",
    "visita",
    "nota_fiscal",
    "servico",
    "relatorio_servico",
    "relatorio_visita",
    "outro",
  ]),
  fileUrl: z.string().url("URL do arquivo inválida"),
  fileKey: z.string(),
  fileSize: z.number().positive(),
  mimeType: z.string(),
});

export const updateDocumentSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  documentType: z
    .enum([
      "vistoria",
      "visita",
      "nota_fiscal",
      "servico",
      "relatorio_servico",
      "relatorio_visita",
      "outro",
    ])
    .optional(),
});

// Schemas para validação de ordens de serviço
export const createWorkOrderSchema = z.object({
  adminId: z.number().int().positive(),
  clientId: z.number().int().positive(),
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  status: z.enum(["aberta", "em_andamento", "concluida", "cancelada"]).default("aberta"),
  priority: z.enum(["baixa", "media", "alta"]).default("media"),
  scheduledDate: z.string().optional(),
  estimatedHours: z.number().positive().optional(),
});

export const updateWorkOrderSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["aberta", "em_andamento", "concluida", "cancelada"]).optional(),
  priority: z.enum(["baixa", "media", "alta"]).optional(),
  scheduledDate: z.string().optional(),
  estimatedHours: z.number().positive().optional(),
  completedHours: z.number().positive().optional(),
});

// Schemas para validação de login
export const clientLoginSchema = z.object({
  username: z.string().min(1, "Username é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export const adminLoginSchema = z.object({
  username: z.string().min(1, "Username é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

// Type exports para usar nos endpoints
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>;
export type UpdateWorkOrderInput = z.infer<typeof updateWorkOrderSchema>;
export type ClientLoginInput = z.infer<typeof clientLoginSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
