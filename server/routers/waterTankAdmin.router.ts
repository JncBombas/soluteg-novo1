import { router, adminLocalProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  listSensorsWithStatus,
  listPendingSensors,
  assignSensor,
  updateSensor,
  deleteSensor,
  getSensorById,
  getSensorReadingHistory,
  getSensorAlertLog,
} from "../waterTankSensorDb";

const calibrationFields = {
  distVazia: z.number().int().positive().nullable().optional(),
  distCheia: z.number().int().positive().nullable().optional(),
};

const assignFields = {
  clientId: z.number().int().positive(),
  tankName: z.string().min(1).max(100),
  capacity: z.number().int().positive().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  deadVolumePct: z.number().int().min(0).max(99).optional(),
  alarm1Pct: z.number().int().min(0).max(100).optional(),
  alarm2Pct: z.number().int().min(0).max(100).optional(),
  alertPhone: z.string().max(30).nullable().optional(),
  ...calibrationFields,
};

const updateFields = {
  tankName: z.string().min(1).max(100),
  capacity: z.number().int().positive().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  deadVolumePct: z.number().int().min(0).max(99).optional(),
  alarm1Pct: z.number().int().min(0).max(100).optional(),
  alarm2Pct: z.number().int().min(0).max(100).optional(),
  alertPhone: z.string().max(30).nullable().optional(),
  ...calibrationFields,
};

export const waterTankAdminRouter = router({
  /** Sensors waiting for assignment (clientId is null) */
  listPending: adminLocalProcedure
    .input(z.object({ adminId: z.number() }))
    .query(async () => {
      return listPendingSensors();
    }),

  /** Sensors already assigned to a client under this admin */
  listSensors: adminLocalProcedure
    .input(z.object({ adminId: z.number() }))
    .query(async ({ input }) => {
      return listSensorsWithStatus(input.adminId);
    }),

  /** Assign a pending sensor to a client and name the tank */
  assignSensor: adminLocalProcedure
    .input(z.object({ adminId: z.number(), sensorId: z.number(), ...assignFields }))
    .mutation(async ({ input }) => {
      await assignSensor(input.sensorId, {
        clientId: input.clientId,
        adminId: input.adminId,
        tankName: input.tankName,
        capacity: input.capacity ?? null,
        notes: input.notes ?? null,
        deadVolumePct: input.deadVolumePct ?? 0,
        alarm1Pct: input.alarm1Pct ?? 30,
        alarm2Pct: input.alarm2Pct ?? 15,
        alertPhone: input.alertPhone ?? null,
        distVazia: input.distVazia ?? null,
        distCheia: input.distCheia ?? null,
      });
      return { ok: true };
    }),

  /** Update config of an already-assigned sensor */
  updateSensor: adminLocalProcedure
    .input(z.object({ adminId: z.number(), sensorId: z.number(), ...updateFields }))
    .mutation(async ({ input }) => {
      await updateSensor(input.sensorId, input.adminId, {
        tankName: input.tankName,
        capacity: input.capacity ?? null,
        notes: input.notes ?? null,
        deadVolumePct: input.deadVolumePct ?? 0,
        alarm1Pct: input.alarm1Pct ?? 30,
        alarm2Pct: input.alarm2Pct ?? 15,
        alertPhone: input.alertPhone ?? null,
        distVazia: input.distVazia ?? null,
        distCheia: input.distCheia ?? null,
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
    .input(z.object({ adminId: z.number(), sensorId: z.number(), days: z.number().positive().max(30).optional() }))
    .query(async ({ input }) => {
      const sensor = await getSensorById(input.sensorId, input.adminId);
      if (!sensor) throw new Error("Sensor não encontrado");
      const [history, alerts] = await Promise.all([
        getSensorReadingHistory(sensor.clientId, sensor.tankName, input.days ?? 1),
        getSensorAlertLog(input.sensorId),
      ]);
      return { sensor, history, alerts };
    }),
});
