/**
 * mqttService.ts
 *
 * Responsabilidades:
 *  1. Conectar ao broker MQTT e subscrever em soluteg/sensor/+/level
 *  2. Auto-registrar sensores novos como "pendentes" (sem cliente atribuído)
 *  3. Processar leituras de sensores já atribuídos: salvar no DB + SSE + alertas
 *
 * Variáveis de ambiente necessárias:
 *  MQTT_BROKER_URL  — ex: mqtt://broker.hivemq.com ou mqtts://xyz.s1.eu.hivemq.cloud:8883
 *  MQTT_USERNAME    — (opcional) usuário do broker
 *  MQTT_PASSWORD    — (opcional) senha do broker
 *
 * Tópico esperado: soluteg/sensor/{deviceId}/level
 * Payload JSON:    { "level_pct": 73 }
 *
 * No ESP32, configure apenas:
 *   const char* DEVICE_ID = "sensor_01";  // ou use WiFi.macAddress()
 *   topic = "soluteg/sensor/" + DEVICE_ID + "/level"
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
        client.subscribe("soluteg/sensor/+/level", (err) => {
          if (err) console.error("[MQTT] Erro ao subscrever:", err);
          else console.log("[MQTT] Subscrito em soluteg/sensor/+/level");
        });
      });

      client.on("message", async (topic: string, message: Buffer) => {
        try {
          // Formato: soluteg/sensor/{deviceId}/level
          const parts = topic.split("/");
          if (parts.length !== 4 || parts[0] !== "soluteg" || parts[1] !== "sensor" || parts[3] !== "level") return;

          const deviceId = parts[2];
          if (!deviceId) return;

          const payload = JSON.parse(message.toString());
          const currentLevel = Math.max(0, Math.min(100, Math.round(Number(payload.level_pct))));

          if (isNaN(currentLevel)) {
            console.warn(`[MQTT] Payload inválido do sensor ${deviceId}:`, payload);
            return;
          }

          const { upsertSensorDevice, getAssignedSensorByDeviceId } = await import("./waterTankSensorDb");

          // Always update lastSeenAt (auto-register on first contact)
          await upsertSensorDevice(deviceId);

          // Check if sensor has been assigned by admin
          const sensor = await getAssignedSensorByDeviceId(deviceId);
          if (!sensor) {
            console.log(`[MQTT] Sensor ${deviceId} aguardando atribuição — leitura ignorada`);
            return;
          }

          const { saveWaterTankReading } = await import("./waterTankDb");
          await saveWaterTankReading({
            clientId: sensor.clientId,
            adminId: sensor.adminId,
            tankName: sensor.tankName,
            currentLevel,
          });

          broadcastTankUpdate(sensor.clientId, {
            type: "level_update",
            tankName: sensor.tankName,
            currentLevel,
            measuredAt: new Date().toISOString(),
          });

          // Verificar e disparar alertas WhatsApp se necessário
          const { checkAndSendAlerts } = await import("./waterTankAlertService");
          checkAndSendAlerts(sensor.id, sensor.clientId, sensor.tankName, currentLevel).catch(
            (e: Error) => console.error("[MQTT] Erro ao verificar alertas:", e.message),
          );

          console.log(`[MQTT] ${deviceId} → ${sensor.tankName} (cliente ${sensor.clientId}): ${currentLevel}%`);
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
