import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { getLatestTankReadings, getAllTankHistories } from "../waterTankDb";

export const waterTankMonitoringRouter = router({
  getLatest: publicProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      if (!input.clientId) return [];
      const rows = await getLatestTankReadings(input.clientId);
      return rows.map((r) => ({
        id: r.id ?? 0,
        tankName: r.tankName,
        levelPercentage: r.currentLevel ?? null,
        capacity: r.capacity,
        notes: r.notes,
        recordedAt: r.measuredAt ?? null,
        deadVolumePct: r.deadVolumePct ?? 0,
        alarm1Pct: r.alarm1Pct ?? 30,
        alarm2Pct: r.alarm2Pct ?? 15,
      }));
    }),

  getAllHistory: publicProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      if (!input.clientId) return {};
      const raw = await getAllTankHistories(input.clientId);
      // Serialize dates as ISO strings for tRPC transport
      const result: Record<string, Array<{ level: number; time: string }>> = {};
      for (const [name, readings] of Object.entries(raw)) {
        result[name] = readings.map((r) => ({ level: r.level, time: new Date(r.time).toISOString() }));
      }
      return result;
    }),
});
