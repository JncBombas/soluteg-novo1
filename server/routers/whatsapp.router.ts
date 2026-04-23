import { adminLocalProcedure, router } from "../_core/trpc";
import { getWhatsappStatus, reconnectWhatsapp } from "../whatsapp";

export const whatsappRouter = router({

  getStatus: adminLocalProcedure.query(() => {
    return getWhatsappStatus();
  }),

  reconnect: adminLocalProcedure.mutation(async () => {
    await reconnectWhatsapp();
    return { ok: true };
  }),

});
