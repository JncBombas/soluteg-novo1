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
import AdminClients from "./pages/AdminClients";
import AdminEditClient from "./pages/AdminEditClient";
import AdminDocuments from "./pages/AdminDocuments";
import ClientProfile from "./pages/ClientProfile";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/admin/login"} component={AdminLogin} />
      <Route path={"/admin/dashboard"} component={AdminDashboard} />
      <Route path={"/admin/profile"} component={AdminProfile} />
      <Route path="/admin/relatorios" component={InspectionReports} />
      <Route path="/admin/clientes" component={AdminClients} />
      <Route path="/admin/clientes/editar/:id" component={AdminEditClient} />
      <Route path="/admin/documentos" component={AdminDocuments} />
      <Route path="/client/login" component={ClientLogin} />
      <Route path="/client/portal" component={ClientPortal} />
      <Route path="/client/profile" component={ClientProfile} />
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
