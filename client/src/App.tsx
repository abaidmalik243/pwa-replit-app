import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthProvider } from "@/context/AuthContext";
import NotFound from "@/pages/not-found";
import CustomerHome from "@/pages/customer-home";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import TermsConditions from "@/pages/terms-conditions";
import PrivacyPolicy from "@/pages/privacy-policy";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminMenu from "@/pages/admin-menu";
import AdminUsers from "@/pages/admin-users";
import AdminCategories from "@/pages/admin-categories";
import AdminBranches from "@/pages/admin-branches";
import AdminExpenses from "@/pages/admin-expenses";
import AdminSettings from "@/pages/admin-settings";
import AdminDemand from "@/pages/admin-demand";
import PosMain from "@/pages/pos-main";
import PosTables from "@/pages/pos-tables";
import KitchenDisplay from "@/pages/kitchen-display";
import PosSessions from "@/pages/pos-sessions";
import PosReports from "@/pages/pos-reports";
import Reports from "@/pages/reports";
import AdminRiders from "@/pages/admin-riders";
import AdminDeliveries from "@/pages/admin-deliveries";
import AdminRiderTracking from "@/pages/admin-rider-tracking";
import AdminPromoCodes from "@/pages/admin-promo-codes";
import AdminDeliveryCharges from "@/pages/admin-delivery-charges";
import AdminVariants from "@/pages/admin-variants";
import RiderDashboard from "@/pages/rider-dashboard";

function Router() {
  return (
    <Switch>
      <Route path="/" component={CustomerHome} />
      <Route path="/login" component={Login} />
      <Route path="/admin/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/terms-conditions" component={TermsConditions} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/admin/pos">
        <ProtectedRoute requireRole={["admin", "staff"]}>
          <PosMain />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/pos-tables">
        <ProtectedRoute requireRole={["admin", "staff"]}>
          <PosTables />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/kitchen">
        <ProtectedRoute requireRole={["admin", "staff"]}>
          <KitchenDisplay />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/pos-sessions">
        <ProtectedRoute requireRole={["admin", "staff"]}>
          <PosSessions />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/pos-reports">
        <ProtectedRoute requireRole={["admin", "staff"]}>
          <PosReports />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/reports">
        <ProtectedRoute requireRole={["admin", "staff"]}>
          <Reports />
        </ProtectedRoute>
      </Route>
      <Route path="/admin">
        <ProtectedRoute requireRole={["admin", "staff"]}>
          <AdminDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/orders">
        <ProtectedRoute requireRole={["admin", "staff"]}>
          <AdminDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/menu">
        <ProtectedRoute requireRole={["admin", "staff"]}>
          <AdminMenu />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/demand">
        <ProtectedRoute requireRole={["admin", "staff"]}>
          <AdminDemand />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute requireRole={["admin"]}>
          <AdminUsers />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/categories">
        <ProtectedRoute requireRole={["admin", "staff"]}>
          <AdminCategories />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/branches">
        <ProtectedRoute requireRole={["admin"]}>
          <AdminBranches />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/expenses">
        <ProtectedRoute requireRole={["admin", "staff"]}>
          <AdminExpenses />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/riders">
        <ProtectedRoute requireRole={["admin", "staff"]}>
          <AdminRiders />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/deliveries">
        <ProtectedRoute requireRole={["admin", "staff"]}>
          <AdminDeliveries />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/rider-tracking">
        <ProtectedRoute requireRole={["admin", "staff"]}>
          <AdminRiderTracking />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/promo-codes">
        <ProtectedRoute requireRole={["admin"]}>
          <AdminPromoCodes />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/delivery-charges">
        <ProtectedRoute requireRole={["admin"]}>
          <AdminDeliveryCharges />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/variants">
        <ProtectedRoute requireRole={["admin", "staff"]}>
          <AdminVariants />
        </ProtectedRoute>
      </Route>
      <Route path="/rider">
        <ProtectedRoute requireRole={["rider"]}>
          <RiderDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/settings">
        <ProtectedRoute requireRole={["admin"]}>
          <AdminSettings />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
