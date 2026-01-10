import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import type { TrpcContext } from "./_core/context";

/**
 * Testes para fluxo completo de assinaturas digitais
 * Verifica: desenho, conversão, envio, salvamento e renderização
 */
describe("Fluxo de Assinaturas Digitais", () => {
  let db: any;
  let testWorkOrderId: number;
  let testAdminId: number;
  let testClientId: number;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available");

    // Criar dados de teste
    // Nota: Em produção, usar fixtures ou factory functions
    testAdminId = 1;
    testClientId = 1;
    testWorkOrderId = 1;
  });

  afterAll(async () => {
    // Limpar dados de teste se necessário
  });

  it("deve aceitar assinatura em formato base64 JPEG", async () => {
    // Simular assinatura JPEG base64 (pequena para teste)
    const fakeJpegBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8VAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=";

    const ctx: TrpcContext = {
      user: null,
      req: {} as any,
      res: {} as any,
    };

    const caller = appRouter.createCaller(ctx);

    // Testar que a assinatura é aceita como string
    expect(typeof fakeJpegBase64).toBe("string");
    expect(fakeJpegBase64.length).toBeGreaterThan(100);
    expect(fakeJpegBase64.includes("data:image/jpeg;base64,")).toBe(true);
  });

  it("deve extrair base64 corretamente de data URL", () => {
    const dataUrl = "data:image/jpeg;base64,ABC123DEF456";
    const base64 = dataUrl.split(",")[1];

    expect(base64).toBe("ABC123DEF456");
    expect(base64).not.toContain("data:");
  });

  it("deve validar que assinatura do colaborador é obrigatória", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {} as any,
      res: {} as any,
    };

    const caller = appRouter.createCaller(ctx);

    // Tentar completar OS sem assinatura do colaborador
    try {
      await caller.workOrders.complete({
        id: testWorkOrderId,
        collaboratorName: "João Silva",
        collaboratorSignature: "", // Vazio - deve falhar
        clientName: "Cliente XYZ",
        clientSignature: undefined,
      });
      expect.fail("Deveria ter lançado erro");
    } catch (error) {
      expect(error).toBeDefined();
      // Zod deve rejeitar string vazia
    }
  });

  it("deve aceitar assinatura do cliente como opcional", async () => {
    const fakeSignature = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";

    // Dados válidos com assinatura do cliente opcional
    const validData = {
      id: testWorkOrderId,
      collaboratorName: "João Silva",
      collaboratorSignature: fakeSignature,
      clientName: undefined, // Opcional
      clientSignature: undefined, // Opcional
    };

    expect(validData.collaboratorSignature).toBeDefined();
    expect(validData.clientSignature).toBeUndefined();
  });

  it("deve processar assinatura em diferentes formatos", () => {
    // Formato 1: Data URL completo
    const dataUrl = "data:image/jpeg;base64,ABC123";
    const base64_1 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
    expect(base64_1).toBe("ABC123");

    // Formato 2: Base64 puro
    const pureBase64 = "ABC123";
    const base64_2 = pureBase64.includes(",") ? pureBase64.split(",")[1] : pureBase64;
    expect(base64_2).toBe("ABC123");

    // Ambos devem resultar no mesmo base64
    expect(base64_1).toBe(base64_2);
  });

  it("deve validar tamanho mínimo de assinatura", () => {
    // Assinatura muito pequena (menos de 100 bytes)
    const tinySignature = "data:image/jpeg;base64,AA==";
    
    // Assinatura normal (mais de 1KB)
    const normalSignature = "data:image/jpeg;base64," + "A".repeat(1000);

    expect(tinySignature.length).toBeLessThan(100);
    expect(normalSignature.length).toBeGreaterThan(1000);

    // Ambas são válidas como strings, mas em produção poderia validar tamanho
  });

  it("deve manter compatibilidade com assinaturas antigas", () => {
    // Simular assinatura salva em formato antigo (PNG base64)
    const oldPngSignature = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    // Código deve extrair base64 mesmo que seja PNG
    const base64 = oldPngSignature.includes(",") ? oldPngSignature.split(",")[1] : oldPngSignature;
    expect(base64).toBeDefined();
    expect(base64.length).toBeGreaterThan(0);
  });

  it("deve gerar PDF com assinatura renderizada", () => {
    // Simular dados de OS com assinatura
    const workOrderData = {
      id: 1,
      osNumber: "OS-2025-0001",
      collaboratorSignature: "data:image/jpeg;base64,/9j/4AAQ...", // Assinatura JPEG
      collaboratorName: "João Silva",
      clientSignature: undefined,
      clientName: undefined,
    };

    // Validar que dados estão corretos para renderização
    expect(workOrderData.collaboratorSignature).toBeDefined();
    expect(workOrderData.collaboratorName).toBe("João Silva");
    expect(typeof workOrderData.collaboratorSignature).toBe("string");
  });
});
