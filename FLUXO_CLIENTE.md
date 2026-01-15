# Fluxo de Cadastro e Edição de Cliente - Backend

## Visão Geral

O sistema de clientes funciona com:
- **Tabela `clients`**: Armazena dados dos clientes
- **Tabela `clientDocuments`**: Armazena documentos dos clientes
- **tRPC Routers**: Procedures para CRUD de clientes
- **Validação com Zod**: Schemas para validar dados de entrada

---

## 1. Estrutura da Tabela `clients`

```sql
CREATE TABLE clients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  adminId INT NOT NULL,           -- Admin que criou o cliente
  name VARCHAR(255) NOT NULL,     -- Nome do cliente
  email VARCHAR(320),             -- Email (opcional)
  username VARCHAR(100) UNIQUE,   -- Login do cliente
  password VARCHAR(255),          -- Senha criptografada (bcrypt)
  cnpjCpf VARCHAR(20),           -- CNPJ ou CPF
  phone VARCHAR(20),             -- Telefone
  address TEXT,                  -- Endereço
  type ENUM('com_portal', 'sem_portal'), -- com_portal: acesso ao painel | sem_portal: apenas cadastro
  active INT DEFAULT 1,          -- 1 = ativo, 0 = inativo
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW() ON UPDATE NOW(),
  lastLogin TIMESTAMP            -- Último login
);
```

**Campos importantes:**
- `adminId`: Cada cliente pertence a um admin
- `username`: Identificador único para login
- `password`: Armazenada com hash bcrypt
- `type`: Define se cliente tem acesso ao portal ou não
- `active`: Controla se cliente pode fazer login

---

## 2. Fluxo de Cadastro de Cliente

### 2.1 Frontend → Backend

**Arquivo:** `client/src/pages/AdminClients.tsx`

O frontend envia uma requisição tRPC:

```typescript
const { mutate: createClient } = trpc.clients.create.useMutation({
  onSuccess: () => {
    // Recarrega lista de clientes
    utils.clients.list.invalidate();
  }
});

createClient({
  adminId: currentAdmin.id,
  name: "João Silva",
  email: "joao@example.com",
  username: "joao_silva",
  password: "senha123",
  cnpjCpf: "12345678901234",
  phone: "(13) 98130-1010",
  address: "Rua A, 123",
  type: "com_portal"
});
```

### 2.2 Validação (Zod Schema)

**Arquivo:** `server/validation.ts`

```typescript
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
```

### 2.3 Procedure tRPC (Create)

**Arquivo:** `server/routers.ts` (linhas 221-244)

```typescript
create: publicProcedure
  .input(z.object({
    adminId: z.number(),
    name: z.string().min(1),
    email: z.string().email().optional(),
    username: z.string().min(3).max(100),
    password: z.string().min(6),
    cnpjCpf: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    type: z.enum(["com_portal", "sem_portal"]).default("com_portal"),
  }))
  .mutation(async ({ input }) => {
    const { password, ...clientData } = input;
    
    // 1. Criptografa a senha com bcrypt
    const hashedPassword = await hashPassword(password);
    
    // 2. Insere o cliente no banco
    const result = await db.createClient({
      ...clientData,
      password: hashedPassword,
      active: 1,  // Cliente inicia ativo
    });
    
    return { success: true, message: "Cliente criado com sucesso" };
  }),
```

### 2.4 Função de Banco de Dados (Create)

**Arquivo:** `server/db.ts` (linhas 400-406)

```typescript
export async function createClient(client: InsertClient) {
  if (!client.adminId) {
    throw new Error("Admin ID é obrigatório");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create client: database not available");
    return;
  }

  const result = await db.insert(clients).values(client);
  return result;
}
```

**Fluxo:**
1. Valida com Zod schema
2. Criptografa a senha
3. Insere no banco de dados
4. Retorna sucesso

---

## 3. Fluxo de Edição de Cliente

### 3.1 Frontend → Backend

**Arquivo:** `client/src/pages/AdminEditClient.tsx`

```typescript
const { mutate: updateClient } = trpc.clients.update.useMutation({
  onSuccess: () => {
    utils.clients.list.invalidate();
  }
});

updateClient({
  id: clientId,
  name: "João Silva Atualizado",
  email: "novo@example.com",
  phone: "(13) 99999-9999",
  address: "Rua B, 456",
  cnpjCpf: "98765432101234"
});
```

### 3.2 Procedure tRPC (Update)

**Arquivo:** `server/routers.ts` (linhas 246-259)

```typescript
update: publicProcedure
  .input(z.object({
    id: z.number(),
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    cnpjCpf: z.string().optional(),
  }))
  .mutation(async ({ input }) => {
    const { id, ...updateData } = input;
    
    // Atualiza apenas os campos fornecidos
    await db.updateClient(id, updateData);
    
    return { success: true, message: "Cliente atualizado com sucesso" };
  }),
```

### 3.3 Função de Banco de Dados (Update)

**Arquivo:** `server/db.ts` (linhas 432-436)

```typescript
export async function updateClient(id: number, data: Partial<InsertClient>) {
  const db = await getDb();
  if (!db) return;

  await db.update(clients).set(data).where(eq(clients.id, id));
}
```

**Fluxo:**
1. Valida dados com Zod schema
2. Atualiza apenas campos fornecidos
3. Retorna sucesso

---

## 4. Outras Operações

### 4.1 Listar Clientes de um Admin

**Procedure:** `clients.list`

```typescript
list: publicProcedure
  .input(z.object({ adminId: z.number() }))
  .query(async ({ input }) => {
    return await db.getClientsByAdminId(input.adminId);
  }),
```

**Função DB:**
```typescript
export async function getClientsByAdminId(adminId: number): Promise<Client[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(clients)
    .where(eq(clients.adminId, adminId))
    .orderBy(desc(clients.createdAt));
}
```

### 4.2 Obter Cliente por ID

**Procedure:** `clients.getById`

```typescript
getById: publicProcedure
  .input(z.object({ id: z.number() }))
  .query(async ({ input }) => {
    return await db.getClientById(input.id);
  }),
```

### 4.3 Atualizar Senha

**Procedure:** `clients.updatePassword`

```typescript
updatePassword: publicProcedure
  .input(z.object({
    id: z.number(),
    newPassword: z.string().min(6),
  }))
  .mutation(async ({ input }) => {
    const hashedPassword = await hashPassword(input.newPassword);
    await db.updateClientPassword(input.id, hashedPassword);
    return { success: true, message: "Senha atualizada com sucesso" };
  }),
```

### 4.4 Deletar Cliente

**Procedure:** `clients.delete`

```typescript
delete: publicProcedure
  .input(z.object({ id: z.number() }))
  .mutation(async ({ input }) => {
    await db.deleteClient(input.id);
    return { success: true, message: "Cliente deletado com sucesso" };
  }),
```

**Função DB:**
```typescript
export async function deleteClient(id: number) {
  const db = await getDb();
  if (!db) return;

  // Primeiro deleta documentos do cliente
  await db.delete(clientDocuments).where(eq(clientDocuments.clientId, id));

  // Depois deleta o cliente
  await db.delete(clients).where(eq(clients.id, id));
}
```

---

## 5. Login de Cliente

### 5.1 Endpoint REST (não tRPC)

**Arquivo:** `server/_core/index.ts` (linhas 40-85)

```typescript
app.post("/api/client-login", async (req, res) => {
  try {
    const { clientLoginSchema } = await import("../validation");
    const validation = clientLoginSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ message: "Dados inválidos" });
    }

    const { username, password } = validation.data;
    const { getClientByUsername, updateClientLastLogin } = await import("../db");

    // 1. Busca cliente por username
    const client = await getClientByUsername(username);
    if (!client) {
      return res.status(401).json({ message: "Usuário ou senha inválidos" });
    }

    // 2. Verifica senha
    const isValid = await comparePassword(password, client.password);
    if (!isValid) {
      return res.status(401).json({ message: "Usuário ou senha inválidos" });
    }

    // 3. Verifica se cliente está ativo
    if (!client.active) {
      return res.status(403).json({ message: "Cliente inativo" });
    }

    // 4. Verifica se tem acesso ao portal
    if (client.type === "sem_portal") {
      return res.status(403).json({ 
        message: "Este cliente não possui acesso ao portal" 
      });
    }

    // 5. Atualiza último login
    await updateClientLastLogin(client.id);

    // 6. Retorna token e dados do cliente
    return res.json({
      token: `client-${client.id}`,
      clientId: client.id,
      name: client.name,
      email: client.email,
    });
  } catch (error) {
    console.error("Client login error:", error);
    res.status(500).json({ message: "Erro ao fazer login" });
  }
});
```

---

## 6. Tipos TypeScript

**Arquivo:** `drizzle/schema.ts`

```typescript
export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;
```

**Tipos de Validação:** `server/validation.ts`

```typescript
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type ClientLoginInput = z.infer<typeof clientLoginSchema>;
```

---

## 7. Segurança

### Criptografia de Senha
- Usa **bcrypt** para hash de senhas
- Funções: `hashPassword()` e `comparePassword()`
- Nunca armazena senha em texto plano

### Validação
- Todos os inputs validados com **Zod**
- Schemas definem tipos e restrições
- Erros de validação retornam 400

### Acesso
- Clientes podem ter `type: "com_portal"` ou `sem_portal"`
- Login bloqueado para clientes inativos
- Cada cliente pertence a um admin específico

---

## 8. Resumo do Fluxo

```
Frontend (React)
    ↓
tRPC Mutation/Query
    ↓
Validação (Zod)
    ↓
Procedure (server/routers.ts)
    ↓
Função DB (server/db.ts)
    ↓
MySQL Database
    ↓
Retorna resultado
    ↓
Frontend atualiza UI
```

---

## 9. Endpoints Disponíveis

| Operação | Tipo | Endpoint | Autenticação |
|----------|------|----------|--------------|
| Listar | Query | `clients.list` | Public |
| Criar | Mutation | `clients.create` | Public |
| Atualizar | Mutation | `clients.update` | Public |
| Deletar | Mutation | `clients.delete` | Public |
| Obter por ID | Query | `clients.getById` | Public |
| Obter por Username | Query | `clients.getByUsername` | Public |
| Atualizar Senha | Mutation | `clients.updatePassword` | Public |
| Login | REST POST | `/api/client-login` | Public |

---

## 10. Exemplo de Uso Completo

### Criar Cliente
```typescript
// Frontend
const { mutate } = trpc.clients.create.useMutation();

mutate({
  adminId: 1,
  name: "Empresa XYZ",
  email: "contato@xyz.com",
  username: "xyz_empresa",
  password: "senha_segura_123",
  cnpjCpf: "12345678000190",
  phone: "(11) 3000-0000",
  address: "Av. Paulista, 1000",
  type: "com_portal"
});
```

### Atualizar Cliente
```typescript
// Frontend
const { mutate } = trpc.clients.update.useMutation();

mutate({
  id: 5,
  phone: "(11) 3001-0000",
  address: "Av. Paulista, 2000"
});
```

### Login de Cliente
```typescript
// Frontend (fetch REST)
const response = await fetch("/api/client-login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    username: "xyz_empresa",
    password: "senha_segura_123"
  })
});

const { token, clientId, name } = await response.json();
```
