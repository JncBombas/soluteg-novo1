import { describe, it, expect } from "vitest";
import {
  validateChecklistResponses,
  getRequiredFieldsForType,
  getChecklistTypeLabel,
  isValidChecklistType,
  type ChecklistType,
} from "./checklistValidation";

describe("Validação Inteligente de Checklists", () => {
  describe("Validação de Bomba de Recalque", () => {
    it("deve aceitar checklist completo de bomba de recalque", () => {
      const responses = {
        tensao: "220V",
        fases: "Trifásico",
        num_bombas: 2,
        corrente_bomba_1: 8.5,
        corrente_bomba_2: 9.2,
      };

      const result = validateChecklistResponses("bomba_recalque", responses);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("deve rejeitar bomba de recalque sem tensão", () => {
      const responses = {
        fases: "Trifásico",
        num_bombas: 2,
        corrente_bomba_1: 8.5,
        corrente_bomba_2: 9.2,
      };

      const result = validateChecklistResponses("bomba_recalque", responses);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining("tensao"));
    });

    it("deve rejeitar bomba de recalque sem fases", () => {
      const responses = {
        tensao: "220V",
        num_bombas: 2,
        corrente_bomba_1: 8.5,
        corrente_bomba_2: 9.2,
      };

      const result = validateChecklistResponses("bomba_recalque", responses);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining("fases"));
    });

    it("deve validar campos dinâmicos baseado em num_bombas", () => {
      const responses = {
        tensao: "220V",
        fases: "Trifásico",
        num_bombas: 3,
        corrente_bomba_1: 8.5,
        corrente_bomba_2: 9.2,
        // Falta corrente_bomba_3
      };

      const result = validateChecklistResponses("bomba_recalque", responses);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining("corrente_bomba_3"));
    });

    it("deve aceitar bomba de recalque com 1 bomba", () => {
      const responses = {
        tensao: "220V",
        fases: "Monofásico",
        num_bombas: 1,
        corrente_bomba_1: 5.0,
      };

      const result = validateChecklistResponses("bomba_recalque", responses);
      expect(result.isValid).toBe(true);
    });

    it("deve aceitar bomba de recalque com 0 bombas (sem campos dinâmicos)", () => {
      const responses = {
        tensao: "220V",
        fases: "Trifásico",
        num_bombas: 0,
      };

      const result = validateChecklistResponses("bomba_recalque", responses);
      expect(result.isValid).toBe(true);
    });
  });

  describe("Validação de Dreno", () => {
    it("deve aceitar checklist completo de dreno", () => {
      const responses = {
        tipo_dreno: "Sumidouro",
        profundidade: 2.5,
      };

      const result = validateChecklistResponses("dreno", responses);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("deve rejeitar dreno sem tipo", () => {
      const responses = {
        profundidade: 2.5,
      };

      const result = validateChecklistResponses("dreno", responses);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining("tipo_dreno"));
    });

    it("deve rejeitar dreno sem profundidade", () => {
      const responses = {
        tipo_dreno: "Sumidouro",
      };

      const result = validateChecklistResponses("dreno", responses);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining("profundidade"));
    });
  });

  describe("Validação de Gerador", () => {
    it("deve aceitar checklist completo de gerador", () => {
      const responses = {
        potencia_kva: 50,
        combustivel: "Diesel",
        horas_funcionamento: 1200,
      };

      const result = validateChecklistResponses("gerador", responses);
      expect(result.isValid).toBe(true);
    });

    it("deve rejeitar gerador incompleto", () => {
      const responses = {
        potencia_kva: 50,
        // Faltam combustivel e horas_funcionamento
      };

      const result = validateChecklistResponses("gerador", responses);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Utilitários", () => {
    it("deve retornar campos obrigatórios para bomba de recalque", () => {
      const fields = getRequiredFieldsForType("bomba_recalque");
      expect(fields).toContain("tensao");
      expect(fields).toContain("fases");
      expect(fields).toContain("num_bombas");
    });

    it("deve retornar rótulo amigável para tipo", () => {
      expect(getChecklistTypeLabel("bomba_recalque")).toBe("Bomba de Recalque");
      expect(getChecklistTypeLabel("dreno")).toBe("Dreno");
      expect(getChecklistTypeLabel("gerador")).toBe("Gerador");
    });

    it("deve validar tipos de checklist válidos", () => {
      expect(isValidChecklistType("bomba_recalque")).toBe(true);
      expect(isValidChecklistType("dreno")).toBe(true);
      expect(isValidChecklistType("tipo_invalido")).toBe(false);
    });

    it("deve rejeitar tipos inválidos", () => {
      expect(isValidChecklistType("xyz")).toBe(false);
      expect(isValidChecklistType("")).toBe(false);
    });
  });

  describe("Casos de Uso Reais", () => {
    it("deve permitir salvamento parcial de checklist em progresso", () => {
      // Usuário preenche apenas alguns campos
      const responses = {
        tensao: "220V",
        fases: "Trifásico",
        // Ainda não preencheu num_bombas
      };

      // Validação com modo "draft" (não obrigatório)
      // Em produção, poderia ter um parâmetro isDraft
      const result = validateChecklistResponses("bomba_recalque", responses);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining("num_bombas"));
    });

    it("deve validar múltiplas bombas corretamente", () => {
      const responses = {
        tensao: "380V",
        fases: "Trifásico",
        num_bombas: 5,
        corrente_bomba_1: 10,
        corrente_bomba_2: 10,
        corrente_bomba_3: 10,
        corrente_bomba_4: 10,
        corrente_bomba_5: 10,
      };

      const result = validateChecklistResponses("bomba_recalque", responses);
      expect(result.isValid).toBe(true);
    });

    it("deve fornecer mensagens de erro claras", () => {
      const responses = {
        tensao: "220V",
        num_bombas: 2,
        // Faltam: fases, corrente_bomba_1, corrente_bomba_2
      };

      const result = validateChecklistResponses("bomba_recalque", responses);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
      
      // Mensagens devem ser legíveis
      result.errors.forEach(error => {
        expect(error).toMatch(/Campo obrigatório|baseado em/);
      });
    });
  });
});
