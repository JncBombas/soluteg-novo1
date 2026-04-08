import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminProfile from "./pages/AdminProfile";
import InspectionReports from "./pages/InspectionReports";
import ClientLogin from "./pages/ClientLogin";
import ClientPortal from "./pages/ClientPortal";
import WaterTankMonitoring from "./pages/WaterTankMonitoring";
import AdminClients from "./pages/AdminClients";
import EditClient from "./pages/EditClient";
import AdminDocuments from "./pages/AdminDocuments";
import AdminManageDocuments from "./pages/AdminManageDocuments";
import AdminEditCustomLabel from "./pages/AdminEditCustomLabel";
import ClientProfile from "./pages/ClientProfile";
import AdminWorkOrders from "./pages/AdminWorkOrders";
import AdminCreateWorkOrderNew from "./pages/AdminCreateWorkOrderNew";
import AdminViewWorkOrder from "./pages/AdminViewWorkOrder";
import AdminWorkOrderDetail from "./pages/AdminWorkOrderDetail";
import AdminWorkOrderDashboard from "./pages/AdminWorkOrderDashboard";
import AdminWorkOrderKanban from "./pages/AdminWorkOrderKanban";
import AdminEditWorkOrder from "./pages/AdminEditWorkOrder";
import AdminMassMessage from "./pages/AdminMassMessage";
import ReportClientRegistration from "./pages/ReportClientRegistration";
import ReportInspectionVisit from "./pages/ReportInspectionVisit";
import ReportInspectionVisit2 from "./pages/ReportInspectionVisit2";
import AdminBudgets from "./pages/AdminBudgets";
import AdminBudgetDetail from "./pages/AdminBudgetDetail";
import BudgetApproval from "./pages/BudgetApproval";
import AdminTechnicians from "./pages/AdminTechnicians";
import AdminWaterTanks from "./pages/AdminWaterTanks";
import TechnicianLogin from "./pages/TechnicianLogin";
import TechnicianPortal from "./pages/TechnicianPortal";
import TechnicianWorkOrderDetail from "./pages/TechnicianWorkOrderDetail";


function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/admin/login"} component={AdminLogin} />
      <Route path={"/admin/dashboard"} component={AdminDashboard} />
        <Route path="/admin/profile" component={AdminProfile} />
      <Route path="/admin/relatorios" component={InspectionReports} />
      <Route path="/admin/clientes" component={AdminClients} />
      <Route path="/admin/mensagens" component={AdminMassMessage} />
      <Route path="/admin/clientes/editar/:id" component={EditClient} />
      <Route path="/admin/documentos/enviar" component={AdminDocuments} />
      <Route path="/admin/documentos" component={AdminManageDocuments} />
      <Route path="/admin/edit-custom-label" component={AdminEditCustomLabel} />
      <Route path="/admin/work-orders" component={AdminWorkOrders} />
      <Route path="/admin/work-orders/dashboard" component={AdminWorkOrderDashboard} />
      <Route path="/admin/work-orders/kanban" component={AdminWorkOrderKanban} />
      <Route path="/admin/work-orders/new" component={AdminCreateWorkOrderNew} />
      <Route path="/admin/work-orders/:id" component={AdminWorkOrderDetail} />
      <Route path="/admin/work-orders/:id/edit" component={AdminEditWorkOrder} />
      <Route path="/admin/orcamentos" component={AdminBudgets} />
      <Route path="/admin/orcamentos/novo" component={AdminBudgetDetail} />
      <Route path="/admin/orcamentos/:id" component={AdminBudgetDetail} />
      <Route path="/orcamento/:token" component={BudgetApproval} />
      <Route path="/relatorios/cadastro-cliente" component={ReportClientRegistration} />
      <Route path="/relatorios/visita-inspecao" component={ReportInspectionVisit} />
      <Route path="/relatorios/visita-inspecao-2" component={ReportInspectionVisit2} />

      <Route path="/client/login" component={ClientLogin} />
      <Route path="/client/portal" component={ClientPortal} />
      <Route path="/client/water-tank" component={WaterTankMonitoring} />
      <Route path="/client/profile" component={ClientProfile} />
      <Route path="/admin/tecnicos" component={AdminTechnicians} />
      <Route path="/admin/sensores-agua" component={AdminWaterTanks} />
      <Route path="/technician/login" component={TechnicianLogin} />
      <Route path="/technician/portal" component={TechnicianPortal} />
      <Route path="/technician/work-orders/:id" component={TechnicianWorkOrderDetail} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
