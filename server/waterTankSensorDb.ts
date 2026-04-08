import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { waterTankSensors } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

export type SensorData = {
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

export async function createSensor(data: SensorData) {
  const db = await getDb();
  if (!db) throw new Error("DB indisponível");

  return db.insert(waterTankSensors).values({
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
  });
}

export async function updateSensor(
  id: number,
  adminId: number,
  data: Partial<Omit<SensorData, "clientId" | "adminId">>
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

  return db
    .delete(waterTankSensors)
    .where(and(eq(waterTankSensors.id, id), eq(waterTankSensors.adminId, adminId)));
}

export async function listSensorsWithStatus(adminId: number): Promise<Array<{
  id: number;
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
  createdAt: Date;
  currentLevel: number | null;
  lastUpdate: Date | null;
  status: string | null;
}>> {
  const db = await getDb();
  if (!db) return [];

  const [rows] = await db.execute(sql`
    SELECT
      s.id, s.clientId, c.name AS clientName,
      s.tankName, s.capacity, s.notes,
      s.deadVolumePct, s.alarm1Pct, s.alarm2Pct, s.alertPhone,
      s.active, s.createdAt,
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
    WHERE s.adminId = ${adminId}
    ORDER BY c.name, s.tankName
  `);

  return rows as any;
}
