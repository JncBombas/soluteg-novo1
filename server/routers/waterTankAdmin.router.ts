import { router, adminLocalProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  createSensor,
  updateSensor,
  deleteSensor,
  listSensorsWithStatus,
  getSensorById,
  getSensorReadingHistory,
  getSensorAlertLog,
} from "../waterTankSensorDb";

const sensorFields = {
  tankName: z.string().min(1).max(100),
  capacity: z.number().int().positive().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  deadVolumePct: z.number().int().min(0).max(99).optional(),
  alarm1Pct: z.number().int().min(0).max(100).optional(),
  alarm2Pct: z.number().int().min(0).max(100).optional(),
  alertPhone: z.string().max(30).nullable().optional(),
};

export const waterTankAdminRouter = router({
  listSensors: adminLocalProcedure
    .input(z.object({ adminId: z.number() }))
    .query(async ({ input }) => {
      return listSensorsWithStatus(input.adminId);
    }),

  createSensor: adminLocalProcedure
    .input(z.object({ adminId: z.number(), clientId: z.number(), ...sensorFields }))
    .mutation(async ({ input }) => {
      await createSensor({
        clientId: input.clientId,
        adminId: input.adminId,
        tankName: input.tankName,
        capacity: input.capacity ?? null,
        notes: input.notes ?? null,
        deadVolumePct: input.deadVolumePct ?? 0,
        alarm1Pct: input.alarm1Pct ?? 30,
        alarm2Pct: input.alarm2Pct ?? 15,
        alertPhone: input.alertPhone ?? null,
      });
      return { ok: true };
    }),

  updateSensor: adminLocalProcedure
    .input(z.object({ adminId: z.number(), sensorId: z.number(), ...sensorFields }))
    .mutation(async ({ input }) => {
      await updateSensor(input.sensorId, input.adminId, {
        tankName: input.tankName,
        capacity: input.capacity ?? null,
        notes: input.notes ?? null,
        deadVolumePct: input.deadVolumePct ?? 0,
        alarm1Pct: input.alarm1Pct ?? 30,
        alarm2Pct: input.alarm2Pct ?? 15,
        alertPhone: input.alertPhone ?? null,
      });
      return { ok: true };
    }),

  deleteSensor: adminLocalProcedure
    .input(z.object({ adminId: z.number(), sensorId: z.number() }))
    .mutation(async ({ input }) => {
      await deleteSensor(input.sensorId, input.adminId);
      return { ok: true };
    }),

  getSensorDashboard: adminLocalProcedure
    .input(z.object({ adminId: z.number(), sensorId: z.number() }))
    .query(async ({ input }) => {
      const sensor = await getSensorById(input.sensorId, input.adminId);
      if (!sensor) throw new Error("Sensor não encontrado");
      const [history, alerts] = await Promise.all([
        getSensorReadingHistory(sensor.clientId, sensor.tankName),
        getSensorAlertLog(input.sensorId),
      ]);
      return { sensor, history, alerts };
    }),
});
