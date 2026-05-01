import { z } from "zod";
import { publicProcedure, router } from "./trpc";

// Router de sistema — apenas health check. Infraestrutura de notificação Forge removida (não usada).
export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),
});
