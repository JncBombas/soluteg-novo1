import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { waterTankSensors } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

// ── Auto-discovery ────────────────────────────────────────────────────────────

/**
 * Called every time a sensor publishes a message.
 * Creates the sensor record on first contact; updates lastSeenAt on subsequent messages.
 */
export async function upsertSensorDevice(deviceId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.execute(sql`
    INSERT INTO waterTankSensors (deviceId, lastSeenAt, active)
    VALUES (${deviceId}, NOW(), 1)
    ON DUPLICATE KEY UPDATE lastSeenAt = NOW()
  `);
}

/**
 * Returns sensor config if the device is fully assigned (clientId + tankName set).
 * Returns null if pending (not yet assigned by admin).
 */
export async function getAssignedSensorByDeviceId(deviceId: string): Promise<{
  id: number;
  clientId: number;
  adminId: number;
  tankName: string;
  deadVolumePct: number;
  alarm1Pct: number;
  alarm2Pct: number;
} | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.execute(sql`
    SELECT id, clientId, adminId, tankName, deadVolumePct, alarm1Pct, alarm2Pct
    FROM waterTankSensors
    WHERE deviceId = ${deviceId}
      AND clientId IS NOT NULL
      AND tankName IS NOT NULL
      AND active = 1
    LIMIT 1
  `);
  const rows = (result as unknown as [any[], any])[0] as any[];
  return rows[0] ?? null;
}

// ── Pending sensors ───────────────────────────────────────────────────────────

export async function listPendingSensors(): Promise<Array<{
  id: number;
  deviceId: string;
  lastSeenAt: Date | null;
  createdAt: Date;
}>> {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT id, deviceId, lastSeenAt, createdAt
    FROM waterTankSensors
    WHERE clientId IS NULL
    ORDER BY lastSeenAt DESC, createdAt DESC
  `);
  return (result as unknown as [any[], any])[0] as any[];
}

// ── Assigned sensors ──────────────────────────────────────────────────────────

export async function listSensorsWithStatus(adminId: number): Promise<Array<{
  id: number;
  deviceId: string | null;
  clientId: number;
  clientName: string;
  tankName: string;
  capacity: number | null;
  notes: string | null;
  deadVolumePct: number;
  alarm1Pct: number;
  alarm2Pct: number;
  alertPhone: string | null;
  active: number;
  lastSeenAt: Date | null;
  createdAt: Date;
  currentLevel: number | null;
  lastUpdate: Date | null;
  status: string | null;
}>> {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT
      s.id, s.deviceId, s.clientId, c.name AS clientName,
      s.tankName, s.capacity, s.notes,
      s.deadVolumePct, s.alarm1Pct, s.alarm2Pct, s.alertPhone,
      s.active, s.lastSeenAt, s.createdAt,
      latest.currentLevel, latest.measuredAt AS lastUpdate, latest.status
    FROM waterTankSensors s
    LEFT JOIN clients c ON c.id = s.clientId
    LEFT JOIN (
      SELECT w1.*
      FROM waterTankMonitoring w1
      INNER JOIN (
        SELECT clientId, tankName, MAX(measuredAt) AS maxAt
        FROM waterTankMonitoring
        GROUP BY clientId, tankName
      ) w2 ON w1.clientId = w2.clientId AND w1.tankName = w2.tankName AND w1.measuredAt = w2.maxAt
    ) latest ON latest.clientId = s.clientId AND latest.tankName = s.tankName
    WHERE s.adminId = ${adminId} AND s.clientId IS NOT NULL
    ORDER BY c.name, s.tankName
  `);

  return (result as unknown as [any[], any])[0] as any[];
}

// ── Assign / update / delete ──────────────────────────────────────────────────

export type AssignData = {
  clientId: number;
  adminId: number;
  tankName: string;
  capacity?: number | null;
  notes?: string | null;
  deadVolumePct?: number;
  alarm1Pct?: number;
  alarm2Pct?: number;
  alertPhone?: string | null;
};

export async function assignSensor(sensorId: number, data: AssignData) {
  const db = await getDb();
  if (!db) throw new Error("DB indisponível");

  return db
    .update(waterTankSensors)
    .set({
      clientId: data.clientId,
      adminId: data.adminId,
      tankName: data.tankName,
      capacity: data.capacity ?? null,
      notes: data.notes ?? null,
      deadVolumePct: data.deadVolumePct ?? 0,
      alarm1Pct: data.alarm1Pct ?? 30,
      alarm2Pct: data.alarm2Pct ?? 15,
      alertPhone: data.alertPhone ?? null,
      active: 1,
    })
    .where(eq(waterTankSensors.id, sensorId));
}

export async function updateSensor(
  id: number,
  adminId: number,
  data: Partial<Omit<AssignData, "clientId" | "adminId">>,
) {
  const db = await getDb();
  if (!db) throw new Error("DB indisponível");

  return db
    .update(waterTankSensors)
    .set({ ...data })
    .where(and(eq(waterTankSensors.id, id), eq(waterTankSensors.adminId, adminId)));
}

export async function deleteSensor(id: number, adminId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB indisponível");

  // Pending sensors (adminId IS NULL) or sensors owned by this admin can be deleted
  await db.execute(sql`
    DELETE FROM waterTankSensors
    WHERE id = ${id} AND (adminId IS NULL OR adminId = ${adminId})
  `);
}

// ── Dashboard helpers (unchanged) ─────────────────────────────────────────────

export async function getSensorById(sensorId: number, adminId: number): Promise<{
  id: number;
  deviceId: string | null;
  clientId: number;
  clientName: string;
  clientPhone: string | null;
  tankName: string;
  capacity: number | null;
  notes: string | null;
  deadVolumePct: number;
  alarm1Pct: number;
  alarm2Pct: number;
  alertPhone: string | null;
  active: number;
  createdAt: Date;
} | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.execute(sql`
    SELECT s.id, s.deviceId, s.clientId, c.name AS clientName, c.phone AS clientPhone,
           s.tankName, s.capacity, s.notes,
           s.deadVolumePct, s.alarm1Pct, s.alarm2Pct, s.alertPhone,
           s.active, s.createdAt
    FROM waterTankSensors s
    LEFT JOIN clients c ON c.id = s.clientId
    WHERE s.id = ${sensorId} AND s.adminId = ${adminId}
    LIMIT 1
  `);
  const rows = (result as unknown as [any[], any])[0] as any[];
  return rows[0] ?? null;
}

export async function getSensorReadingHistory(
  clientId: number,
  tankName: string,
  limit = 200,
): Promise<Array<{ id: number; currentLevel: number; measuredAt: Date }>> {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT id, currentLevel, measuredAt
    FROM waterTankMonitoring
    WHERE clientId = ${clientId} AND tankName = ${tankName}
    ORDER BY measuredAt DESC
    LIMIT ${limit}
  `);
  const rows = (result as unknown as [any[], any])[0] as any[];
  return rows.reverse();
}

export async function getSensorAlertLog(
  sensorId: number,
  limit = 50,
): Promise<Array<{
  id: number;
  alertType: string;
  triggerPct: number;
  currentLevel: number;
  sentTo: string | null;
  sentAt: Date;
}>> {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT id, alertType, triggerPct, currentLevel, sentTo, sentAt
    FROM waterTankAlertLog
    WHERE sensorId = ${sensorId}
    ORDER BY sentAt DESC
    LIMIT ${limit}
  `);
  return (result as unknown as [any[], any])[0] as any[];
}
