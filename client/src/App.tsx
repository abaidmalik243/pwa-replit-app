import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import CustomerHome from "@/pages/customer-home";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminMenu from "@/pages/admin-menu";
import AdminUsers from "@/pages/admin-users";
import AdminCategories from "@/pages/admin-categories";
import AdminBranches from "@/pages/admin-branches";
import AdminExpenses from "@/pages/admin-expenses";
import AdminSettings from "@/pages/admin-settings";
import AdminDemand from "@/pages/admin-demand";

function Router() {
  return (
    <Switch>
      <Route path="/" component={CustomerHome} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/orders" component={AdminDashboard} />
      <Route path="/admin/menu" component={AdminMenu} />
      <Route path="/admin/demand" component={AdminDemand} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/categories" component={AdminCategories} />
      <Route path="/admin/branches" component={AdminBranches} />
      <Route path="/admin/expenses" component={AdminExpenses} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
