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

// ── Buffer de leituras (30 s) ─────────────────────────────────────────────────
// Acumula leituras brutas por deviceId e persiste apenas o maior valor no intervalo.
const BUFFER_MS = 30_000;

type BufferEntry = {
  maxLevel: number;
  timer: ReturnType<typeof setTimeout>;
  sensor: {
    id: number;
    clientId: number;
    adminId: number;
    tankName: string;
    deadVolumePct: number;
    alarm1Pct: number;
    alarm2Pct: number;
  };
};

const readingBuffer = new Map<string, BufferEntry>();

async function flushBuffer(deviceId: string) {
  const entry = readingBuffer.get(deviceId);
  if (!entry) return;
  readingBuffer.delete(deviceId);

  const { saveWaterTankReading } = await import("./waterTankDb");
  await saveWaterTankReading({
    clientId: entry.sensor.clientId,
    adminId: entry.sensor.adminId,
    tankName: entry.sensor.tankName,
    currentLevel: entry.maxLevel,
  });

  broadcastTankUpdate(entry.sensor.clientId, {
    type: "level_update",
    tankName: entry.sensor.tankName,
    currentLevel: entry.maxLevel,
    measuredAt: new Date().toISOString(),
  });

  const { checkAndSendAlerts } = await import("./waterTankAlertService");
  checkAndSendAlerts(entry.sensor.id, entry.sensor.clientId, entry.sensor.tankName, entry.maxLevel).catch(
    (e: Error) => console.error("[MQTT] Erro ao verificar alertas:", e.message),
  );

  console.log(`[MQTT] flush ${deviceId} → ${entry.sensor.tankName}: ${entry.maxLevel}% (max de 30 s)`);
}

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

          const { upsertSensorDevice, getAssignedSensorByDeviceId } = await import("./waterTankSensorDb");

          // Always update lastSeenAt (auto-register on first contact)
          await upsertSensorDevice(deviceId);

          // Check if sensor has been assigned by admin
          const sensor = await getAssignedSensorByDeviceId(deviceId);
          if (!sensor) {
            console.log(`[MQTT] Sensor ${deviceId} aguardando atribuição — leitura ignorada`);
            return;
          }

          // Support both payload formats:
          //   { "distance_cm": 67 }  → server converts using sensor calibration
          //   { "level_pct": 73 }    → used directly (legacy / pre-calibrated)
          let currentLevel: number;
          if (payload.distance_cm != null && sensor.distVazia != null && sensor.distCheia != null) {
            const dist = Number(payload.distance_cm);
            const raw = (sensor.distVazia - dist) / (sensor.distVazia - sensor.distCheia) * 100;
            currentLevel = Math.max(0, Math.min(100, Math.round(raw)));
            console.log(`[MQTT] ${deviceId} dist=${dist}cm → ${currentLevel}% (cal: vazia=${sensor.distVazia} cheia=${sensor.distCheia})`);
          } else if (payload.level_pct != null) {
            currentLevel = Math.max(0, Math.min(100, Math.round(Number(payload.level_pct))));
          } else if (payload.distance_cm != null) {
            console.warn(`[MQTT] Sensor ${deviceId} enviou distance_cm mas calibração não configurada — configure dist. vazia/cheia no portal`);
            return;
          } else {
            console.warn(`[MQTT] Payload inválido do sensor ${deviceId}:`, payload);
            return;
          }

          if (isNaN(currentLevel)) return;

          // Buffer: acumula pelo BUFFER_MS e persiste o maior valor
          const existing = readingBuffer.get(deviceId);
          if (existing) {
            if (currentLevel > existing.maxLevel) existing.maxLevel = currentLevel;
            console.log(`[MQTT] ${deviceId} buffered ${currentLevel}% (max=${existing.maxLevel}%)`);
          } else {
            const timer = setTimeout(() => flushBuffer(deviceId), BUFFER_MS);
            readingBuffer.set(deviceId, { maxLevel: currentLevel, timer, sensor });
            console.log(`[MQTT] ${deviceId} buffer iniciado ${currentLevel}% — flush em ${BUFFER_MS / 1000}s`);
          }
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
