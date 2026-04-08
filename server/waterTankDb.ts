import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { waterTankMonitoring } from "../drizzle/schema";

function computeStatus(level: number): "otimo" | "bom" | "alerta" | "critico" {
  if (level >= 75) return "otimo";
  if (level >= 50) return "bom";
  if (level >= 25) return "alerta";
  return "critico";
}

export async function saveWaterTankReading(data: {
  clientId: number;
  adminId: number;
  tankName: string;
  currentLevel: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB indisponível");

  return db.insert(waterTankMonitoring).values({
    clientId: data.clientId,
    adminId: data.adminId,
    tankName: data.tankName,
    currentLevel: data.currentLevel,
    status: computeStatus(data.currentLevel),
  });
}

export async function getLatestTankReadings(clientId: number): Promise<Array<{
  id: number | null;
  tankName: string;
  currentLevel: number | null;
  capacity: number | null;
  status: string | null;
  notes: string | null;
  measuredAt: Date | null;
  deadVolumePct: number;
  alarm1Pct: number;
  alarm2Pct: number;
}>> {
  const db = await getDb();
  if (!db) return [];

  const [rows] = await db.execute(sql`
    SELECT
      latest.id,
      s.tankName,
      latest.currentLevel,
      COALESCE(s.capacity, latest.capacity) AS capacity,
      latest.status,
      COALESCE(s.notes, latest.notes) AS notes,
      latest.measuredAt,
      s.deadVolumePct,
      s.alarm1Pct,
      s.alarm2Pct
    FROM waterTankSensors s
    LEFT JOIN (
      SELECT w1.*
      FROM waterTankMonitoring w1
      INNER JOIN (
        SELECT tankName, MAX(measuredAt) AS maxAt
        FROM waterTankMonitoring
        WHERE clientId = ${clientId}
        GROUP BY tankName
      ) w2 ON w1.tankName = w2.tankName AND w1.measuredAt = w2.maxAt
      WHERE w1.clientId = ${clientId}
    ) latest ON latest.tankName = s.tankName
    WHERE s.clientId = ${clientId} AND s.active = 1
    ORDER BY s.tankName
  `);

  return rows as any;
}
