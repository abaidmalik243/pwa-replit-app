import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthProvider } from "@/context/AuthContext";
import { SocketProvider } from "@/context/SocketContext";
import { LanguageProvider } from "@/context/LanguageContext";
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
import CustomerAccount from "@/pages/customer-account";
import CustomerAddresses from "@/pages/customer-addresses";
import CustomerFavorites from "@/pages/customer-favorites";
import CustomerLoyalty from "@/pages/customer-loyalty";
import CustomerOrders from "@/pages/customer-orders";
import CustomerCheckout from "@/pages/customer-checkout";
import AdminInventory from "@/pages/admin-inventory";
import AdminSuppliers from "@/pages/admin-suppliers";
import AdminRefunds from "@/pages/admin-refunds";
import AdminWastage from "@/pages/admin-wastage";
import PaymentResult from "@/pages/payment-result";
import AdminJazzCash from "@/pages/admin-jazzcash";
import AdminAnalytics from "@/pages/admin-analytics";
import AdminOrders from "@/pages/admin-orders";
import AdminShifts from "@/pages/admin-shifts";
import StaffAttendance from "@/pages/staff-attendance";
import AdminShiftReports from "@/pages/admin-shift-reports";
import AdminMarketingCampaigns from "@/pages/admin-marketing-campaigns";
import AdminMarketingCampaignDetail from "@/pages/admin-marketing-campaign-detail";
import AdminMessageTemplates from "@/pages/admin-message-templates";
import AdminCustomerSegments from "@/pages/admin-customer-segments";
import AdminSeedData from "@/pages/admin-seed-data";
import AdminCloneToProduction from "@/pages/admin-clone-to-production";
import AdminCustomers from "@/pages/admin-customers";

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
      <Route path="/payment-result" component={PaymentResult} />
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
          <AdminOrders />
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
      <Route path="/admin/customers">
        <ProtectedRoute requireRole={["admin", "staff"]}>
          <AdminCustomers />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/seed-data">
        <ProtectedRoute requireRole={["admin"]}>
          <AdminSeedData />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/clone-to-production">
        <ProtectedRoute requireRole={["admin"]}>
          <AdminCloneToProduction />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/inventory">
        <ProtectedRoute requireRole={["admin", "staff"]}>
          <AdminInventory />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/suppliers">
        <ProtectedRoute requireRole={["admin", "staff"]}>
          <AdminSuppliers />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/refunds">
        <ProtectedRoute requireRole={["admin", "staff"]}>
          <AdminRefunds />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/wastage">
        <ProtectedRoute requireRole={["admin", "staff"]}>
          <AdminWastage />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/jazzcash">
        <ProtectedRoute requireRole={["admin"]}>
          <AdminJazzCash />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/analytics">
        <ProtectedRoute requireRole={["admin"]}>
          <AdminAnalytics />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/shifts">
        <ProtectedRoute requireRole={["admin", "staff"]}>
          <AdminShifts />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/attendance">
        <ProtectedRoute requireRole={["admin", "staff"]}>
          <StaffAttendance />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/shift-reports">
        <ProtectedRoute requireRole={["admin", "staff"]}>
          <AdminShiftReports />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/marketing-campaigns/:id">
        <ProtectedRoute requireRole={["admin"]}>
          <AdminMarketingCampaignDetail />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/marketing-campaigns">
        <ProtectedRoute requireRole={["admin"]}>
          <AdminMarketingCampaigns />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/message-templates">
        <ProtectedRoute requireRole={["admin"]}>
          <AdminMessageTemplates />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/customer-segments">
        <ProtectedRoute requireRole={["admin"]}>
          <AdminCustomerSegments />
        </ProtectedRoute>
      </Route>
      <Route path="/account">
        <ProtectedRoute requireRole={["customer"]}>
          <CustomerAccount />
        </ProtectedRoute>
      </Route>
      <Route path="/account/addresses">
        <ProtectedRoute requireRole={["customer"]}>
          <CustomerAddresses />
        </ProtectedRoute>
      </Route>
      <Route path="/account/favorites">
        <ProtectedRoute requireRole={["customer"]}>
          <CustomerFavorites />
        </ProtectedRoute>
      </Route>
      <Route path="/account/loyalty">
        <ProtectedRoute requireRole={["customer"]}>
          <CustomerLoyalty />
        </ProtectedRoute>
      </Route>
      <Route path="/account/orders">
        <ProtectedRoute requireRole={["customer"]}>
          <CustomerOrders />
        </ProtectedRoute>
      </Route>
      <Route path="/checkout">
        <CustomerCheckout />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <SocketProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </SocketProvider>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
