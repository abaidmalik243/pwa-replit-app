import { LayoutDashboard, ShoppingBag, UtensilsCrossed, Users, Settings, LogOut, Volume2, VolumeX, FolderOpen, Receipt, TrendingUp, Building2, CreditCard, Table2, ChefHat, Calculator, BarChart3, Bike, Truck, MapPin, Tag, DollarSign, Layers, Package, Store, Trash2, RefreshCcw, Calendar, Clock, FileText, MessageSquare, Mail, Target, Smartphone, PieChart, Heart, UserCircle, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { LucideIcon } from "lucide-react";
import logoImage from "@assets/logo_1764330678819.jfif";

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
  roles?: string[];
}

export default function AdminSidebar({ soundEnabled = true, onToggleSound, onLogout, onNavigate }: AdminSidebarProps) {
  const [location] = useLocation();
  const { user, hasPermission } = useAuth();

  const menuItems: MenuItem[] = [
    // Role-specific dashboards - Admin can access all dashboards
    { icon: LayoutDashboard, label: "Admin Dashboard", path: "/admin", permissions: [], roles: ["admin"] },
    { icon: ClipboardList, label: "Staff Dashboard", path: "/admin/staff-dashboard", permissions: [], roles: ["staff", "admin"] },
    { icon: Bike, label: "Rider Dashboard", path: "/rider", permissions: [], roles: ["rider", "admin"] },
    // Analytics & Reports
    { icon: BarChart3, label: "Advanced Analytics", path: "/admin/analytics", permissions: ["reports.view_analytics"] },
    // Orders
    { icon: ShoppingBag, label: "Orders", path: "/admin/orders", permissions: ["orders.view"] },
    // POS - uses pos.view as the primary permission for viewing POS-related pages
    { icon: CreditCard, label: "POS", path: "/admin/pos", permissions: ["pos.view"] },
    { icon: Table2, label: "Tables", path: "/admin/pos-tables", permissions: ["pos.view"] },
    { icon: ChefHat, label: "Kitchen", path: "/admin/kitchen", permissions: ["pos.view_kitchen"] },
    { icon: Calculator, label: "Sessions", path: "/admin/pos-sessions", permissions: ["pos.view"] },
    { icon: PieChart, label: "POS Reports", path: "/admin/pos-reports", permissions: ["reports.view_sales"] },
    // Menu Management
    { icon: UtensilsCrossed, label: "Menu Items", path: "/admin/menu", permissions: ["menu.view"] },
    { icon: FolderOpen, label: "Categories", path: "/admin/categories", permissions: ["menu.view"] },
    { icon: Layers, label: "Variants", path: "/admin/variants", permissions: ["menu.view"] },
    // Settings & Branches
    { icon: Building2, label: "Branches", path: "/admin/branches", permissions: ["settings.branches"] },
    // Reports
    { icon: TrendingUp, label: "Demand", path: "/admin/demand", permissions: ["reports.view_analytics"] },
    { icon: FileText, label: "Reports", path: "/admin/reports", permissions: ["reports.view_sales"] },
    // Expense Management
    { icon: Receipt, label: "Expenses", path: "/admin/expenses", permissions: ["expenses.view"] },
    // Inventory & Suppliers
    { icon: Package, label: "Inventory", path: "/admin/inventory", permissions: ["inventory.view"] },
    { icon: Store, label: "Suppliers", path: "/admin/suppliers", permissions: ["suppliers.view"] },
    { icon: Trash2, label: "Wastage", path: "/admin/wastage", permissions: ["inventory.manage_wastage"] },
    // Refunds
    { icon: RefreshCcw, label: "Refunds", path: "/admin/refunds", permissions: ["refunds.view"] },
    // JazzCash Monitoring
    { icon: Smartphone, label: "JazzCash Monitoring", path: "/admin/jazzcash", permissions: ["jazzcash.view"] },
    // Delivery & Riders
    { icon: Bike, label: "Riders", path: "/admin/riders", permissions: ["delivery.view_riders"] },
    { icon: Truck, label: "Deliveries", path: "/admin/deliveries", permissions: ["delivery.view_deliveries"] },
    { icon: MapPin, label: "Rider Tracking", path: "/admin/rider-tracking", permissions: ["delivery.track_riders"] },
    // Marketing & Promos
    { icon: Tag, label: "Promo Codes", path: "/admin/promo-codes", permissions: ["marketing.view_promos"] },
    // Loyalty & Customers
    { icon: Heart, label: "Saved Customers", path: "/admin/customers", permissions: ["loyalty.view_customers"] },
    // Delivery Zones
    { icon: DollarSign, label: "Delivery Charges", path: "/admin/delivery-charges", permissions: ["delivery_zones.view"] },
    // Users & Shifts
    { icon: Users, label: "Users & Roles", path: "/admin/users", permissions: ["users.view"] },
    { icon: Calendar, label: "Shift Schedule", path: "/admin/shifts", permissions: ["shifts.view"] },
    { icon: Clock, label: "Attendance", path: "/admin/attendance", permissions: ["shifts.view_attendance"] },
    { icon: FileText, label: "Shift Reports", path: "/admin/shift-reports", permissions: ["shifts.view_reports"] },
    // Marketing Campaigns
    { icon: MessageSquare, label: "Marketing Campaigns", path: "/admin/marketing-campaigns", permissions: ["marketing.view_campaigns"] },
    { icon: Mail, label: "Message Templates", path: "/admin/message-templates", permissions: ["templates.view"] },
    { icon: Target, label: "Customer Segments", path: "/admin/customer-segments", permissions: ["segments.view"] },
    // System Settings
    { icon: Settings, label: "Settings", path: "/admin/settings", permissions: ["settings.view"] },
  ];

  const canAccessItem = (item: MenuItem): boolean => {
    // Check role-based access first
    if (item.roles && item.roles.length > 0) {
      if (!user?.role || !item.roles.includes(user.role)) {
        return false;
      }
    }
    
    // If no permissions required, user can access
    if (!item.permissions || item.permissions.length === 0) {
      return true;
    }
    
    // Admin bypasses permission checks
    if (user?.role === 'admin') {
      return true;
    }
    
    return hasPermission(item.permissions);
  };

  const visibleMenuItems = menuItems.filter(canAccessItem);

  return (
    <div className="flex flex-col h-full w-64 bg-sidebar border-r border-sidebar-border">
      <div className="p-4 flex items-center gap-2 flex-shrink-0">
        <img 
          src={logoImage} 
          alt="Kebabish Pizza" 
          className="h-12 md:h-14 w-auto object-contain" 
          data-testid="img-admin-logo"
        />
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
