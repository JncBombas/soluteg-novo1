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
  capacity?: number | null;
  notes?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB indisponível");

  return db.insert(waterTankMonitoring).values({
    clientId: data.clientId,
    adminId: data.adminId,
    tankName: data.tankName,
    currentLevel: data.currentLevel,
    capacity: data.capacity ?? null,
    notes: data.notes ?? null,
    status: computeStatus(data.currentLevel),
  });
}

export async function getLatestTankReadings(clientId: number): Promise<Array<{
  id: number;
  clientId: number;
  adminId: number;
  tankName: string;
  currentLevel: number;
  capacity: number | null;
  status: string;
  notes: string | null;
  measuredAt: Date;
  createdAt: Date;
}>> {
  const db = await getDb();
  if (!db) return [];

  // Latest reading per tank name using a subquery join (MySQL pattern)
  const [rows] = await db.execute(sql`
    SELECT w.*
    FROM waterTankMonitoring w
    INNER JOIN (
      SELECT tankName, MAX(measuredAt) AS latest
      FROM waterTankMonitoring
      WHERE clientId = ${clientId}
      GROUP BY tankName
    ) sub ON w.tankName = sub.tankName AND w.measuredAt = sub.latest
    WHERE w.clientId = ${clientId}
    ORDER BY w.tankName
  `);

  return rows as any;
}
