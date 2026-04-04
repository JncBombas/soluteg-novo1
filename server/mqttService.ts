/**
 * mqttService.ts
 *
 * Responsabilidades:
 *  1. Conectar ao broker MQTT e subscrever em soluteg/clients/+/tanks/+/level
 *  2. A cada mensagem: salvar no DB e fazer broadcast via SSE para o cliente dono da caixa
 *  3. Gerenciar conexões SSE abertas do portal do cliente
 *
 * Variáveis de ambiente necessárias:
 *  MQTT_BROKER_URL  — ex: mqtt://broker.hivemq.com ou mqtts://xyz.s1.eu.hivemq.cloud:8883
 *  MQTT_USERNAME    — (opcional) usuário do broker
 *  MQTT_PASSWORD    — (opcional) senha do broker
 *
 * Tópico esperado: soluteg/clients/{clientId}/tanks/{tankName}/level
 * Payload JSON:    { "level_pct": 73, "capacity_L": 1000 }
 */

import type { Response } from "express";

// Map de conexões SSE abertas: clientId → conjunto de Response objects
const sseClients = new Map<number, Set<Response>>();

export function addSseClient(clientId: number, res: Response): void {
  if (!sseClients.has(clientId)) sseClients.set(clientId, new Set());
  sseClients.get(clientId)!.add(res);
}

export function removeSseClient(clientId: number, res: Response): void {
  sseClients.get(clientId)?.delete(res);
  if (sseClients.get(clientId)?.size === 0) sseClients.delete(clientId);
}

export function broadcastTankUpdate(clientId: number, data: object): void {
  const clients = sseClients.get(clientId);
  if (!clients?.size) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try {
      res.write(payload);
    } catch {
      // Conexão fechada — será limpa no evento "close" do request
    }
  }
}

export function initMqtt(): void {
  const brokerUrl = process.env.MQTT_BROKER_URL;

  if (!brokerUrl) {
    console.log("[MQTT] MQTT_BROKER_URL não configurado — serviço MQTT desabilitado");
    return;
  }

  import("mqtt")
    .then((mqttLib) => {
      const options = {
        username: process.env.MQTT_USERNAME || undefined,
        password: process.env.MQTT_PASSWORD || undefined,
        reconnectPeriod: 5_000,
        connectTimeout: 10_000,
      };

      const client = mqttLib.connect(brokerUrl, options);

      client.on("connect", () => {
        console.log("[MQTT] Conectado:", brokerUrl);
        client.subscribe("soluteg/clients/+/tanks/+/level", (err) => {
          if (err) console.error("[MQTT] Erro ao subscrever:", err);
          else console.log("[MQTT] Subscrito em soluteg/clients/+/tanks/+/level");
        });
      });

      client.on("message", async (topic: string, message: Buffer) => {
        try {
          // Formato esperado: soluteg/clients/{clientId}/tanks/{tankName}/level
          const parts = topic.split("/");
          if (parts.length !== 6) return;

          const clientId = parseInt(parts[2]);
          const tankName = decodeURIComponent(parts[4]);

          if (isNaN(clientId) || !tankName) return;

          const payload = JSON.parse(message.toString());
          const currentLevel = Math.max(0, Math.min(100, Math.round(Number(payload.level_pct))));
          const capacity = payload.capacity_L != null ? Math.round(Number(payload.capacity_L)) : null;

          if (isNaN(currentLevel)) {
            console.warn(`[MQTT] Payload inválido no tópico ${topic}:`, payload);
            return;
          }

          const { getClientById } = await import("./db");
          const clientRecord = await getClientById(clientId);
          if (!clientRecord) {
            console.warn(`[MQTT] Cliente ${clientId} não encontrado`);
            return;
          }

          const { saveWaterTankReading } = await import("./waterTankDb");
          await saveWaterTankReading({
            clientId,
            adminId: clientRecord.adminId,
            tankName,
            currentLevel,
            capacity,
          });

          broadcastTankUpdate(clientId, {
            type: "level_update",
            tankName,
            currentLevel,
            capacity,
            measuredAt: new Date().toISOString(),
          });

          console.log(`[MQTT] ${tankName} (cliente ${clientId}): ${currentLevel}%`);
        } catch (err) {
          console.error("[MQTT] Erro ao processar mensagem:", err);
        }
      });

      client.on("error", (err: Error) => console.error("[MQTT] Erro:", err.message));
      client.on("reconnect", () => console.log("[MQTT] Reconectando..."));
      client.on("offline", () => console.log("[MQTT] Offline"));
    })
    .catch((err) => {
      console.error("[MQTT] Falha ao carregar biblioteca mqtt:", err);
    });
}
