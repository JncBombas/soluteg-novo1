/**
 * waterTankAlertService.ts
 *
 * Verifica limiares de alarme após cada leitura MQTT e dispara WhatsApp
 * se um limiar for cruzado e o cooldown (4h) tiver expirado.
 *
 * Prioridade de alertas:
 *   sci_reserve  → nível abaixo do volume morto SCI (EMERGÊNCIA)
 *   alarm2       → nível abaixo do 2° limiar (CRÍTICO)
 *   alarm1       → nível abaixo do 1° limiar (ALERTA)
 */

import { sql } from "drizzle-orm";
import { getDb } from "./db";

const COOLDOWN_HOURS = 4;

type AlertType = "alarm1" | "alarm2" | "sci_reserve";

interface SensorConfig {
  id: number;
  clientName: string;
  clientPhone: string | null;
  deadVolumePct: number;
  alarm1Pct: number;
  alarm2Pct: number;
  alertPhone: string | null;
}

export async function checkAndSendAlerts(
  sensorId: number,
  clientId: number,
  tankName: string,
  currentLevel: number
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    // Fetch sensor config + client phone in one query
    const configResult = await db.execute(sql`
      SELECT
        s.id, s.deadVolumePct, s.alarm1Pct, s.alarm2Pct, s.alertPhone,
        c.name AS clientName, c.phone AS clientPhone
      FROM waterTankSensors s
      JOIN clients c ON c.id = s.clientId
      WHERE s.id = ${sensorId}
      LIMIT 1
    `);
    const configs = (configResult as unknown as [any[], any])[0] as any[];
    if (!configs.length) return;

    const cfg: SensorConfig = configs[0];

    // Determine highest active alert tier
    let activeAlert: AlertType | null = null;
    let triggerPct = 0;

    if (cfg.deadVolumePct > 0 && currentLevel < cfg.deadVolumePct) {
      activeAlert = "sci_reserve";
      triggerPct = cfg.deadVolumePct;
    } else if (cfg.alarm2Pct > 0 && currentLevel < cfg.alarm2Pct) {
      activeAlert = "alarm2";
      triggerPct = cfg.alarm2Pct;
    } else if (cfg.alarm1Pct > 0 && currentLevel < cfg.alarm1Pct) {
      activeAlert = "alarm1";
      triggerPct = cfg.alarm1Pct;
    }

    if (!activeAlert) return; // No alarm triggered

    // Check cooldown: was the same alert type sent within COOLDOWN_HOURS?
    const cooldownResult = await db.execute(sql`
      SELECT id FROM waterTankAlertLog
      WHERE sensorId = ${sensorId}
        AND alertType = ${activeAlert}
        AND sentAt > DATE_SUB(NOW(), INTERVAL ${COOLDOWN_HOURS} HOUR)
      LIMIT 1
    `);
    const recent = (cooldownResult as unknown as [any[], any])[0] as any[];
    if (recent.length > 0) return; // Still in cooldown

    // Build the WhatsApp message
    const message = buildAlertMessage(activeAlert, cfg.clientName, tankName, currentLevel, triggerPct);

    // Collect recipients
    const phones: string[] = [];
    if (cfg.clientPhone) phones.push(cfg.clientPhone);
    if (cfg.alertPhone && cfg.alertPhone !== cfg.clientPhone) phones.push(cfg.alertPhone);

    // Send WhatsApp messages
    const { sendWhatsappToNumber } = await import("./whatsapp");
    for (const phone of phones) {
      try {
        await sendWhatsappToNumber(phone, message);
      } catch (err: any) {
        console.error(`[ALERTA CAIXA] Erro ao enviar para ${phone}:`, err?.message);
      }
    }

    // Log the alert
    await db.execute(sql`
      INSERT INTO waterTankAlertLog (sensorId, clientId, tankName, alertType, triggerPct, currentLevel, sentTo)
      VALUES (${sensorId}, ${clientId}, ${tankName}, ${activeAlert}, ${triggerPct}, ${currentLevel}, ${phones.join(", ") || null})
    `);

    console.log(`[ALERTA CAIXA] ${activeAlert.toUpperCase()} — ${tankName} (cliente ${clientId}): ${currentLevel}% < ${triggerPct}%`);
  } catch (err: any) {
    console.error("[ALERTA CAIXA] Erro ao verificar alertas:", err?.message);
  }
}

function buildAlertMessage(
  type: AlertType,
  clientName: string,
  tankName: string,
  currentLevel: number,
  triggerPct: number
): string {
  const base = `*Cliente:* ${clientName}\n*Caixa:* ${tankName}\n*Nível atual:* ${currentLevel}%`;

  switch (type) {
    case "sci_reserve":
      return (
        `🔴 *EMERGÊNCIA — RESERVA DE INCÊNDIO*\n` +
        `${base}\n` +
        `*Reserva SCI configurada:* ${triggerPct}%\n\n` +
        `⚠️ A reserva do Sistema de Combate a Incêndio está sendo consumida!\n` +
        `Providencie abastecimento IMEDIATO.`
      );
    case "alarm2":
      return (
        `🚨 *NÍVEL CRÍTICO — Caixa d'Água*\n` +
        `${base}\n` +
        `*Limiar crítico:* ${triggerPct}%\n\n` +
        `Ação URGENTE: acionar abastecimento imediatamente.`
      );
    case "alarm1":
    default:
      return (
        `⚠️ *ALERTA — Caixa d'Água*\n` +
        `${base}\n` +
        `*Limiar de alerta:* ${triggerPct}%\n\n` +
        `Recomenda-se verificar o abastecimento em breve.`
      );
  }
}
