import { LayoutDashboard, ShoppingBag, UtensilsCrossed, Users, Settings, LogOut, Volume2, VolumeX, FolderOpen, Receipt, TrendingUp, Building2, CreditCard, Table2, ChefHat, Calculator, BarChart3, Bike, Truck, MapPin, Tag, DollarSign, Layers, Package, Store, Trash2, RefreshCcw, Calendar, Clock, FileText, MessageSquare, Mail, Target, Smartphone, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { LucideIcon } from "lucide-react";

interface AdminSidebarProps {
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  onLogout?: () => void;
  onNavigate?: () => void;
}

interface MenuItem {
  icon: LucideIcon;
  label: string;
  path: string;
  permissions?: string[];
}

export default function AdminSidebar({ soundEnabled = true, onToggleSound, onLogout, onNavigate }: AdminSidebarProps) {
  const [location] = useLocation();
  const { user, hasPermission } = useAuth();

  const menuItems: MenuItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
    { icon: BarChart3, label: "Advanced Analytics", path: "/admin/analytics", permissions: ["analytics.view"] },
    { icon: ShoppingBag, label: "Orders", path: "/admin/orders", permissions: ["orders.view"] },
    { icon: CreditCard, label: "POS", path: "/admin/pos", permissions: ["pos.view"] },
    { icon: Table2, label: "Tables", path: "/admin/pos-tables", permissions: ["pos.view"] },
    { icon: ChefHat, label: "Kitchen", path: "/admin/kitchen", permissions: ["pos.view"] },
    { icon: Calculator, label: "Sessions", path: "/admin/pos-sessions", permissions: ["pos.view"] },
    { icon: PieChart, label: "POS Reports", path: "/admin/pos-reports", permissions: ["pos.view", "reports.view"] },
    { icon: UtensilsCrossed, label: "Menu Items", path: "/admin/menu", permissions: ["menu.view"] },
    { icon: FolderOpen, label: "Categories", path: "/admin/categories", permissions: ["menu.view"] },
    { icon: Layers, label: "Variants", path: "/admin/variants", permissions: ["menu.view"] },
    { icon: Building2, label: "Branches", path: "/admin/branches", permissions: ["settings.view"] },
    { icon: TrendingUp, label: "Demand", path: "/admin/demand", permissions: ["analytics.view"] },
    { icon: FileText, label: "Reports", path: "/admin/reports", permissions: ["reports.view"] },
    { icon: Receipt, label: "Expenses", path: "/admin/expenses", permissions: ["expenses.view"] },
    { icon: Package, label: "Inventory", path: "/admin/inventory", permissions: ["inventory.view"] },
    { icon: Store, label: "Suppliers", path: "/admin/suppliers", permissions: ["inventory.view"] },
    { icon: Trash2, label: "Wastage", path: "/admin/wastage", permissions: ["inventory.view"] },
    { icon: RefreshCcw, label: "Refunds", path: "/admin/refunds", permissions: ["orders.view"] },
    { icon: Smartphone, label: "JazzCash Monitoring", path: "/admin/jazzcash", permissions: ["settings.view"] },
    { icon: Bike, label: "Riders", path: "/admin/riders", permissions: ["deliveries.view"] },
    { icon: Truck, label: "Deliveries", path: "/admin/deliveries", permissions: ["deliveries.view"] },
    { icon: MapPin, label: "Rider Tracking", path: "/admin/rider-tracking", permissions: ["deliveries.view"] },
    { icon: Tag, label: "Promo Codes", path: "/admin/promo-codes", permissions: ["loyalty.view"] },
    { icon: DollarSign, label: "Delivery Charges", path: "/admin/delivery-charges", permissions: ["settings.view"] },
    { icon: Users, label: "Users & Roles", path: "/admin/users", permissions: ["users.view"] },
    { icon: Calendar, label: "Shift Schedule", path: "/admin/shifts", permissions: ["users.view"] },
    { icon: Clock, label: "Attendance", path: "/admin/attendance", permissions: ["users.view"] },
    { icon: FileText, label: "Shift Reports", path: "/admin/shift-reports", permissions: ["users.view", "reports.view"] },
    { icon: MessageSquare, label: "Marketing Campaigns", path: "/admin/marketing-campaigns", permissions: ["marketing.view"] },
    { icon: Mail, label: "Message Templates", path: "/admin/message-templates", permissions: ["marketing.view"] },
    { icon: Target, label: "Customer Segments", path: "/admin/customer-segments", permissions: ["marketing.view"] },
    { icon: Settings, label: "Settings", path: "/admin/settings", permissions: ["settings.view"] },
  ];

  const canAccessItem = (item: MenuItem): boolean => {
    if (!item.permissions || item.permissions.length === 0) {
      return true;
    }
    if (user?.role === 'admin') {
      return true;
    }
    return hasPermission(item.permissions);
  };

  const visibleMenuItems = menuItems.filter(canAccessItem);

  return (
    <div className="flex flex-col h-full w-64 bg-sidebar border-r border-sidebar-border">
      <div className="p-6 flex items-center gap-2 flex-shrink-0">
        <span className="text-2xl">🍕</span>
        <h2 className="text-xl font-bold text-sidebar-primary" data-testid="text-admin-logo">Kebabish Pizza</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        <nav className="px-3 py-2 space-y-1">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <Link key={item.path} href={item.path}>
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-3 ${isActive ? 'bg-sidebar-accent' : ''}`}
                  data-testid={`button-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={onNavigate}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-3 space-y-2 flex-shrink-0 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3"
          onClick={onToggleSound}
          data-testid="button-toggle-sound"
        >
          {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          <span>Sound {soundEnabled ? 'On' : 'Off'}</span>
        </Button>
        
        <Separator />
        
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-destructive hover:text-destructive"
          onClick={onLogout}
          data-testid="button-logout"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </Button>
      </div>
    </div>
  );
}
