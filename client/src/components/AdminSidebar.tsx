import { LayoutDashboard, ShoppingBag, UtensilsCrossed, Users, Settings, LogOut, Volume2, VolumeX, FolderOpen, Receipt, TrendingUp, Building2, CreditCard, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Link, useLocation } from "wouter";

interface AdminSidebarProps {
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  onLogout?: () => void;
}

export default function AdminSidebar({ soundEnabled = true, onToggleSound, onLogout }: AdminSidebarProps) {
  const [location] = useLocation();

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
    { icon: ShoppingBag, label: "Orders", path: "/admin/orders" },
    { icon: CreditCard, label: "POS", path: "/admin/pos" },
    { icon: Table2, label: "Tables", path: "/admin/pos-tables" },
    { icon: UtensilsCrossed, label: "Menu Items", path: "/admin/menu" },
    { icon: FolderOpen, label: "Categories", path: "/admin/categories" },
    { icon: Building2, label: "Branches", path: "/admin/branches" },
    { icon: TrendingUp, label: "Demand", path: "/admin/demand" },
    { icon: Receipt, label: "Expenses", path: "/admin/expenses" },
    { icon: Users, label: "Users & Roles", path: "/admin/users" },
    { icon: Settings, label: "Settings", path: "/admin/settings" },
  ];

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      <div className="p-6 flex items-center gap-2">
        <span className="text-2xl">🍕</span>
        <h2 className="text-xl font-bold text-sidebar-primary" data-testid="text-admin-logo">Kebabish Pizza</h2>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <Link key={item.path} href={item.path}>
              <Button
                variant="ghost"
                className={`w-full justify-start gap-3 ${isActive ? 'bg-sidebar-accent' : ''}`}
                data-testid={`button-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Button>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 space-y-2">
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
