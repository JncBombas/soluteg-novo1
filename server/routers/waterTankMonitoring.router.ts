import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { getLatestTankReadings } from "../waterTankDb";

export const waterTankMonitoringRouter = router({
  getLatest: publicProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      if (!input.clientId) return [];
      const rows = await getLatestTankReadings(input.clientId);
      return rows.map((r) => ({
        id: r.id,
        tankName: r.tankName,
        levelPercentage: r.currentLevel,
        capacity: r.capacity,
        notes: r.notes,
        recordedAt: r.measuredAt,
      }));
    }),
});
