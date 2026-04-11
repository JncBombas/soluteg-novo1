import { router, protectedClientProcedure } from "../_core/trpc";
import { z } from "zod";
import { getLatestTankReadings, getAllTankHistories, getClientAlertLog } from "../waterTankDb";
import { getSensorReadingHistory } from "../waterTankSensorDb";

export const waterTankMonitoringRouter = router({
  getLatest: protectedClientProcedure
    .query(async ({ ctx }) => {
      const rows = await getLatestTankReadings(ctx.clientId);
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

  getAllHistory: protectedClientProcedure
    .query(async ({ ctx }) => {
      const raw = await getAllTankHistories(ctx.clientId);
      // Serialize dates as ISO strings for tRPC transport
      const result: Record<string, Array<{ level: number; time: string }>> = {};
      for (const [name, readings] of Object.entries(raw)) {
        result[name] = readings.map((r) => ({ level: r.level, time: new Date(r.time).toISOString() }));
      }
      return result;
    }),

  getAlarmHistory: protectedClientProcedure
    .input(z.object({ tankName: z.string() }))
    .query(async ({ input, ctx }) => {
      return getClientAlertLog(ctx.clientId, input.tankName);
    }),

  /** Histórico downsampled de uma caixa específica — usado pelo gráfico interativo */
  getTankHistory: protectedClientProcedure
    .input(z.object({
      tankName: z.string(),
      days: z.number().positive().max(30).optional(),
    }))
    .query(async ({ input, ctx }) => {
      const rows = await getSensorReadingHistory(ctx.clientId, input.tankName, input.days ?? 1);
      return rows.map((r) => ({
        nivel: r.currentLevel,
        time: new Date(r.measuredAt).toISOString(),
      }));
    }),
});
