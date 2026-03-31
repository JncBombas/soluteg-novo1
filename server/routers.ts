import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";

import { authRouter } from "./routers/auth.router";
import { reportsRouter } from "./routers/reports.router";
import { usersRouter } from "./routers/users.router";
import { adminAuthRouter } from "./routers/adminAuth.router";
import { clientsRouter } from "./routers/clients.router";
import { documentsRouter } from "./routers/documents.router";
import { clientProfileRouter } from "./routers/clientProfile.router";
import { adminProfileRouter } from "./routers/adminProfile.router";
import { adminDocumentsRouter } from "./routers/adminDocuments.router";
import { workOrdersRouter } from "./routers/workOrders.router";
import { checklistsRouter } from "./routers/checklists.router";
import { budgetsRouter } from "./routers/budgets.router";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  reports: reportsRouter,
  users: usersRouter,
  adminAuth: adminAuthRouter,
  clients: clientsRouter,
  documents: documentsRouter,
  clientProfile: clientProfileRouter,
  adminProfile: adminProfileRouter,
  adminDocuments: adminDocumentsRouter,
  workOrders: workOrdersRouter,
  checklists: checklistsRouter,
  budgets: budgetsRouter,
});

export type AppRouter = typeof appRouter;
