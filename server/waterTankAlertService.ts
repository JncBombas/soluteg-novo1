/**
 * waterTankAlertService.ts
 *
 * Verifica limiares de alarme após cada flush MQTT e dispara alertas WhatsApp.
 * Controle de estado via SensorAlertState — sem cooldown por tempo.
 *
 * Prioridade de disparos (descendo):
 *   sci → alarm2 → drop_step (progressivo em alarm1) → alarm1 → boia_fault
 *
 * Disparos (subindo):
 *   alarm3_boia → filling → level_restored
 */

import { sql } from "drizzle-orm";
import { getDb } from "./db";
import type { SensorAlertState, SensorZone } from "./mqttService";

const CONFIRM = 5;

type AlertType =
  | "alarm1"
  | "alarm2"
  | "alarm3_boia"
  | "sci_reserve"
  | "drop_step"
  | "filling"
  | "level_restored"
  | "boia_fault";

interface SensorConfig {
  id: number;
  clientName: string;
  clientPhone: string | null;
  tankType: "superior" | "inferior";
  deadVolumePct: number;
  alarm1Pct: number;
  alarm2Pct: number;
  alarm3BoiaPct: number;
  dropStepPct: number;
  alertPhone: string | null;
}

function determineZone(level: number, cfg: SensorConfig): SensorZone {
  if (cfg.deadVolumePct > 0 && level < cfg.deadVolumePct) return "sci";
  if (level < cfg.alarm2Pct) return "alarm2";
  if (level < cfg.alarm1Pct) return "alarm1";
  if (level > cfg.alarm3BoiaPct) return "boia_high";
  return "normal";
}

export async function checkAndSendAlerts(params: {
  sensorId: number;
  clientId: number;
  tankName: string;
  currentLevel: number;
  state: SensorAlertState;
  previousZone: SensorZone;
  isGoingDown: boolean;
  isGoingUp: boolean;
}): Promise<void> {
  const { sensorId, clientId, tankName, currentLevel, state, previousZone, isGoingDown, isGoingUp } = params;

  try {
    const db = await getDb();
    if (!db) return;

    const configResult = await db.execute(sql`
      SELECT
        s.id, s.tankType, s.deadVolumePct, s.alarm1Pct, s.alarm2Pct,
        s.alarm3BoiaPct, s.dropStepPct, s.alertPhone,
        c.name AS clientName, c.phone AS clientPhone
      FROM waterTankSensors s
      JOIN clients c ON c.id = s.clientId
      WHERE s.id = ${sensorId}
      LIMIT 1
    `);
    const configs = (configResult as unknown as [any[], any])[0] as any[];
    if (!configs.length) return;

    const cfg: SensorConfig = configs[0];
    const zone = determineZone(currentLevel, cfg);
    const tankLabel = cfg.tankType === "superior" ? "Superior" : "Inferior";

    async function fire(
      alertType: AlertType,
      triggerPct: number,
      direction: "down" | "up",
      observation: string | null,
    ) {
      const message = buildAlertMessage(alertType, cfg.tankType, cfg.clientName, tankName, currentLevel, triggerPct);

      const phones: string[] = [];
      if (cfg.clientPhone) phones.push(cfg.clientPhone);
      if (cfg.alertPhone && cfg.alertPhone !== cfg.clientPhone) phones.push(cfg.alertPhone);

      const { sendWhatsappToNumber } = await import("./whatsapp");
      for (const phone of phones) {
        try {
          await sendWhatsappToNumber(phone, message);
        } catch (err: any) {
          console.error(`[ALERTA CAIXA] Erro ao enviar para ${phone}:`, err?.message);
        }
      }

      await db.execute(sql`
        INSERT INTO waterTankAlertLog
          (sensorId, clientId, tankName, alertType, triggerPct, currentLevel, sentTo, direction, tankType, observation)
        VALUES
          (${sensorId}, ${clientId}, ${tankName}, ${alertType}, ${triggerPct},
           ${currentLevel}, ${phones.join(", ") || null}, ${direction}, ${cfg.tankType}, ${observation})
      `);

      console.log(`[ALERTA CAIXA] ${alertType.toUpperCase()} — ${tankName} (${cfg.tankType}): ${currentLevel}% | dir=${direction}`);
    }

    // ── DESCENDO ───────────────────────────────────────────────────────────────
    if (isGoingDown && state.consecutiveDownCount >= CONFIRM) {

      // SCI — reserva de incêndio
      if (zone === "sci" && previousZone !== "sci") {
        await fire("sci_reserve", cfg.deadVolumePct, "down", "Consumo da reserva SCI");
        state.currentZone = "sci";
      }

      // Alarm2 — nível crítico
      if (zone === "alarm2" && previousZone !== "alarm2" && previousZone !== "sci") {
        await fire("alarm2", cfg.alarm2Pct, "down", `Nível baixo — ${tankLabel}`);
        state.lastDropAlertLevel = currentLevel;
        state.currentZone = "alarm2";
      }

      // Alerta progressivo — apenas dentro de alarm1
      if (zone === "alarm1" && state.lastDropAlertLevel !== null) {
        if ((state.lastDropAlertLevel - currentLevel) >= cfg.dropStepPct) {
          await fire("drop_step", currentLevel, "down", `Nível baixo — ${tankLabel}`);
          state.lastDropAlertLevel = currentLevel;
        }
      }

      // Alarm1 — nível de atenção (inclui vinda de boia_high para cobrir dreno rápido pós-enchimento)
      if (zone === "alarm1" && (previousZone === "normal" || previousZone === "boia_high")) {
        await fire("alarm1", cfg.alarm1Pct, "down", `Nível baixo — ${tankLabel}`);
        state.lastDropAlertLevel = currentLevel;
        state.currentZone = "alarm1";
      }

      // Boia fault — cisterna continua baixando sem recuperação
      if (
        cfg.tankType === "inferior" &&
        zone === "alarm2" &&
        previousZone === "alarm2" &&
        state.consecutiveDownCount >= CONFIRM * 2
      ) {
        await fire("boia_fault", cfg.alarm2Pct, "down", "Nível baixo — Inferior");
      }
    }

    // ── SUBINDO ────────────────────────────────────────────────────────────────
    if (isGoingUp && state.consecutiveUpCount >= CONFIRM) {

      // Alarm3 boia — nível ultrapassou limite alto
      if (zone === "boia_high" && previousZone !== "boia_high") {
        await fire("alarm3_boia", cfg.alarm3BoiaPct, "up", `Nível alto — ${tankLabel}`);
        state.currentZone = "boia_high";
      }

      // Filling — estava em alarme e começou a encher
      if (previousZone !== "normal" && previousZone !== "boia_high" && !state.fillingNotified) {
        await fire("filling", cfg.alarm1Pct, "up", null);
        state.fillingNotified = true;
      }

      // Level restored — voltou ao normal
      if (zone === "normal" && previousZone !== "normal") {
        await fire("level_restored", cfg.alarm1Pct, "up", null);
        state.currentZone = "normal";
        state.lastDropAlertLevel = null;
        state.fillingNotified = false;
        state.consecutiveDownCount = 0;
      }
    }
  } catch (err: any) {
    console.error("[ALERTA CAIXA] Erro ao verificar alertas:", err?.message);
  }
}

function buildAlertMessage(
  type: AlertType,
  tankType: "superior" | "inferior",
  clientName: string,
  tankName: string,
  currentLevel: number,
  triggerPct: number,
): string {
  const base = `Cliente: ${clientName}\nCaixa: ${tankName}\nNível atual: ${currentLevel}%`;

  switch (type) {
    case "alarm1":
      return `⚠️ ALERTA — Caixa d'Água\n${base}\nNível atingiu o limiar de atenção.`;

    case "alarm2":
      return `🚨 NÍVEL CRÍTICO — Caixa d'Água\n${base}\nAcionar abastecimento urgente.`;

    case "drop_step":
      return `📉 NÍVEL CAINDO — Caixa d'Água\n${base}\nSem recuperação desde o último alerta.`;

    case "alarm3_boia":
      if (tankType === "superior") {
        return `🔧 NÍVEL ALTO — Caixa d'Água\n${base}\nBoia de corte pode não ter desligado a bomba de recalque.`;
      }
      return `🔧 NÍVEL ALTO — Cisterna\n${base}\nBoia de corte da entrada pode não ter fechado.`;

    case "boia_fault":
      return `🔧 FALHA DE BOIA — Cisterna\n${base}\nCisterna continua baixando — boia de proteção da bomba pode não ter desligado.`;

    case "filling":
      if (tankType === "superior") {
        return `📈 ENCHENDO — Caixa d'Água\n${base}\nReservatório começou a encher.`;
      }
      return `📈 ENCHENDO — Cisterna\n${base}\nAbastecimento normalizado.`;

    case "level_restored":
      return `✅ NÍVEL RESTAURADO — Caixa d'Água\n${base}\nNível voltou ao normal.`;

    case "sci_reserve":
      return `🔴 EMERGÊNCIA SCI\n${base}\nReserva de incêndio sendo consumida. Acionar abastecimento IMEDIATAMENTE.`;
  }
}
