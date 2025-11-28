import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import UserRoleTable, { UserData } from "@/components/UserRoleTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, X, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { PageLoader } from "@/components/ui/page-loader";
import { ShoppingCart, UtensilsCrossed, Users, BarChart3, Package, Truck, Megaphone, Settings, CreditCard, Heart, Receipt, RefreshCcw, Clock, MapPin, MessageSquare, Smartphone, UserCircle, Store } from "lucide-react";
import type { User, Branch } from "@shared/schema";

// Singleton AudioContext for delete notification sounds
let audioContextInstance: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  try {
    if (!audioContextInstance || audioContextInstance.state === 'closed') {
      audioContextInstance = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextInstance;
  } catch (e) {
    return null;
  }
};

// Delete notification sound (short beep)
const playDeleteSound = async () => {
  try {
    const audioContext = getAudioContext();
    if (!audioContext) return;
    
    // Resume context if suspended (required for Safari and Chrome autoplay policy)
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 440; // A4 note
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    // Silently fail if audio is not supported
  }
};

const PERMISSION_MODULES = [
  {
    id: "orders",
    label: "Orders Management",
    icon: ShoppingCart,
    permissions: [
      { id: "orders.view", label: "View Orders", description: "View all orders" },
      { id: "orders.create", label: "Create Orders", description: "Create new orders" },
      { id: "orders.update_status", label: "Update Status", description: "Change order status" },
      { id: "orders.assign", label: "Assign Orders", description: "Assign orders to riders" },
      { id: "orders.cancel", label: "Cancel Orders", description: "Cancel orders" },
      { id: "orders.refund", label: "Process Refunds", description: "Process order refunds" },
    ],
  },
  {
    id: "menu",
    label: "Menu Management",
    icon: UtensilsCrossed,
    permissions: [
      { id: "menu.view", label: "View Menu", description: "View menu items" },
      { id: "menu.create", label: "Create Items", description: "Add new menu items" },
      { id: "menu.edit", label: "Edit Items", description: "Modify menu items" },
      { id: "menu.delete", label: "Delete Items", description: "Remove menu items" },
      { id: "menu.manage_categories", label: "Manage Categories", description: "Create/edit categories" },
      { id: "menu.manage_variants", label: "Manage Variants", description: "Configure item variants" },
    ],
  },
  {
    id: "users",
    label: "Users & Roles",
    icon: Users,
    permissions: [
      { id: "users.view", label: "View Users", description: "View user list" },
      { id: "users.create", label: "Create Users", description: "Add new users" },
      { id: "users.edit", label: "Edit Users", description: "Modify user details" },
      { id: "users.delete", label: "Delete Users", description: "Remove users" },
      { id: "users.manage_permissions", label: "Manage Permissions", description: "Assign user permissions" },
    ],
  },
  {
    id: "pos",
    label: "Point of Sale",
    icon: CreditCard,
    permissions: [
      { id: "pos.view", label: "View POS", description: "Access POS pages" },
      { id: "pos.access", label: "Access POS Terminal", description: "Use POS terminal" },
      { id: "pos.manage_tables", label: "Manage Tables", description: "Configure table layout" },
      { id: "pos.apply_discounts", label: "Apply Discounts", description: "Apply order discounts" },
      { id: "pos.void_items", label: "Void Items", description: "Remove items from orders" },
      { id: "pos.manage_cash", label: "Cash Management", description: "Handle cash drawer" },
      { id: "pos.view_kitchen", label: "Kitchen Display", description: "Access kitchen display" },
    ],
  },
  {
    id: "delivery",
    label: "Deliveries & Riders",
    icon: Truck,
    permissions: [
      { id: "delivery.view_riders", label: "View Riders", description: "View rider list" },
      { id: "delivery.manage_riders", label: "Manage Riders", description: "Add/edit riders" },
      { id: "delivery.assign_orders", label: "Assign Deliveries", description: "Assign orders to riders" },
      { id: "delivery.track_riders", label: "Track Riders", description: "View rider locations" },
      { id: "delivery.view_deliveries", label: "View Deliveries", description: "View all deliveries" },
    ],
  },
  {
    id: "inventory",
    label: "Inventory Management",
    icon: Package,
    permissions: [
      { id: "inventory.view", label: "View Inventory", description: "View stock levels" },
      { id: "inventory.adjust_stock", label: "Adjust Stock", description: "Modify stock quantities" },
      { id: "inventory.receive_stock", label: "Receive Stock", description: "Record stock receipts" },
      { id: "inventory.view_audit", label: "View Audit Logs", description: "View stock history" },
      { id: "inventory.manage_wastage", label: "Manage Wastage", description: "Record wastage" },
    ],
  },
  {
    id: "suppliers",
    label: "Supplier Management",
    icon: Store,
    permissions: [
      { id: "suppliers.view", label: "View Suppliers", description: "View supplier list" },
      { id: "suppliers.create", label: "Add Suppliers", description: "Add new suppliers" },
      { id: "suppliers.edit", label: "Edit Suppliers", description: "Modify supplier details" },
      { id: "suppliers.delete", label: "Delete Suppliers", description: "Remove suppliers" },
    ],
  },
  {
    id: "marketing",
    label: "Marketing & Promos",
    icon: Megaphone,
    permissions: [
      { id: "marketing.view_campaigns", label: "View Campaigns", description: "View marketing campaigns" },
      { id: "marketing.manage_campaigns", label: "Manage Campaigns", description: "Create/edit campaigns" },
      { id: "marketing.view_promos", label: "View Promo Codes", description: "View promotional codes" },
      { id: "marketing.manage_promos", label: "Manage Promo Codes", description: "Create/edit promo codes" },
      { id: "marketing.send_notifications", label: "Send Notifications", description: "Send push notifications" },
    ],
  },
  {
    id: "reports",
    label: "Analytics & Reports",
    icon: BarChart3,
    permissions: [
      { id: "reports.view_sales", label: "View Sales Reports", description: "Access sales data" },
      { id: "reports.view_analytics", label: "View Analytics", description: "Access analytics dashboard" },
      { id: "reports.view_customer", label: "Customer Reports", description: "View customer insights" },
      { id: "reports.view_inventory", label: "Inventory Reports", description: "View stock reports" },
      { id: "reports.export_data", label: "Export Data", description: "Export report data" },
    ],
  },
  {
    id: "loyalty",
    label: "Loyalty & Customers",
    icon: Heart,
    permissions: [
      { id: "loyalty.view_customers", label: "View Customers", description: "View customer list" },
      { id: "loyalty.manage_points", label: "Manage Points", description: "Adjust loyalty points" },
      { id: "loyalty.view_rewards", label: "View Rewards", description: "View reward redemptions" },
      { id: "loyalty.manage_tiers", label: "Manage Tiers", description: "Configure loyalty tiers" },
    ],
  },
  {
    id: "expenses",
    label: "Expense Management",
    icon: Receipt,
    permissions: [
      { id: "expenses.view", label: "View Expenses", description: "View all expenses" },
      { id: "expenses.create", label: "Create Expenses", description: "Add new expenses" },
      { id: "expenses.edit", label: "Edit Expenses", description: "Modify expense records" },
      { id: "expenses.delete", label: "Delete Expenses", description: "Remove expenses" },
      { id: "expenses.approve", label: "Approve Expenses", description: "Approve pending expenses" },
      { id: "expenses.view_reports", label: "Expense Reports", description: "View expense reports" },
    ],
  },
  {
    id: "refunds",
    label: "Refund Management",
    icon: RefreshCcw,
    permissions: [
      { id: "refunds.view", label: "View Refunds", description: "View all refund requests" },
      { id: "refunds.create", label: "Request Refunds", description: "Create new refund requests" },
      { id: "refunds.approve", label: "Approve Refunds", description: "Approve refund requests" },
      { id: "refunds.process", label: "Process Refunds", description: "Execute refund transactions" },
      { id: "refunds.reject", label: "Reject Refunds", description: "Reject refund requests" },
      { id: "refunds.view_reports", label: "Refund Reports", description: "View refund analytics" },
    ],
  },
  {
    id: "settings",
    label: "System Settings",
    icon: Settings,
    permissions: [
      { id: "settings.view", label: "View Settings", description: "View system settings" },
      { id: "settings.general", label: "General Settings", description: "Modify general settings" },
      { id: "settings.branches", label: "Manage Branches", description: "Add/edit branches" },
      { id: "settings.payments", label: "Payment Settings", description: "Configure payments" },
      { id: "settings.integrations", label: "Integrations", description: "Manage integrations" },
      { id: "settings.backup", label: "Backup & Clone", description: "Database operations" },
    ],
  },
  {
    id: "shifts",
    label: "Staff & Shifts",
    icon: Clock,
    permissions: [
      { id: "shifts.view", label: "View Shifts", description: "View shift schedules" },
      { id: "shifts.create", label: "Create Shifts", description: "Create new shifts" },
      { id: "shifts.edit", label: "Edit Shifts", description: "Modify shift schedules" },
      { id: "shifts.delete", label: "Delete Shifts", description: "Remove shifts" },
      { id: "shifts.view_attendance", label: "View Attendance", description: "View attendance records" },
      { id: "shifts.manage_attendance", label: "Manage Attendance", description: "Clock in/out staff" },
      { id: "shifts.view_reports", label: "Shift Reports", description: "View shift analytics" },
    ],
  },
  {
    id: "delivery_zones",
    label: "Delivery Zones & Charges",
    icon: MapPin,
    permissions: [
      { id: "delivery_zones.view", label: "View Zones", description: "View delivery zones" },
      { id: "delivery_zones.create", label: "Create Zones", description: "Add new delivery zones" },
      { id: "delivery_zones.edit", label: "Edit Zones", description: "Modify zone settings" },
      { id: "delivery_zones.delete", label: "Delete Zones", description: "Remove delivery zones" },
      { id: "delivery_zones.manage_charges", label: "Manage Charges", description: "Set delivery pricing" },
    ],
  },
  {
    id: "segments",
    label: "Customer Segments",
    icon: UserCircle,
    permissions: [
      { id: "segments.view", label: "View Segments", description: "View customer segments" },
      { id: "segments.create", label: "Create Segments", description: "Create new segments" },
      { id: "segments.edit", label: "Edit Segments", description: "Modify segment rules" },
      { id: "segments.delete", label: "Delete Segments", description: "Remove segments" },
    ],
  },
  {
    id: "templates",
    label: "Message Templates",
    icon: MessageSquare,
    permissions: [
      { id: "templates.view", label: "View Templates", description: "View message templates" },
      { id: "templates.create", label: "Create Templates", description: "Create new templates" },
      { id: "templates.edit", label: "Edit Templates", description: "Modify templates" },
      { id: "templates.delete", label: "Delete Templates", description: "Remove templates" },
    ],
  },
  {
    id: "jazzcash",
    label: "JazzCash Monitoring",
    icon: Smartphone,
    permissions: [
      { id: "jazzcash.view", label: "View Transactions", description: "View JazzCash transactions" },
      { id: "jazzcash.view_config", label: "View Config", description: "View JazzCash settings" },
      { id: "jazzcash.manage_config", label: "Manage Config", description: "Configure JazzCash" },
      { id: "jazzcash.view_stats", label: "View Statistics", description: "View payment analytics" },
    ],
  },
];

const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  admin: PERMISSION_MODULES.flatMap(m => m.permissions.map(p => p.id)),
  staff: [
    "orders.view", "orders.create", "orders.update_status",
    "menu.view",
    "pos.view", "pos.access", "pos.apply_discounts", "pos.view_kitchen",
    "inventory.view",
    "reports.view_sales",
    "shifts.view", "shifts.view_attendance",
  ],
  customer: [],
};

interface PermissionsSectionProps {
  permissions: string[];
  onPermissionsChange: (perms: string[]) => void;
}

function PermissionsSection({ permissions, onPermissionsChange }: PermissionsSectionProps) {
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  
  const totalPerms = PERMISSION_MODULES.flatMap(m => m.permissions).length;
  
  const getModuleState = useCallback((moduleId: string): "none" | "partial" | "all" => {
    const module = PERMISSION_MODULES.find(m => m.id === moduleId);
    if (!module) return "none";
    const modulePermIds = module.permissions.map(p => p.id);
    const selectedCount = modulePermIds.filter(id => permissions.includes(id)).length;
    if (selectedCount === 0) return "none";
    if (selectedCount === modulePermIds.length) return "all";
    return "partial";
  }, [permissions]);
  
  const handleToggleModule = useCallback((moduleId: string) => {
    const module = PERMISSION_MODULES.find(m => m.id === moduleId);
    if (!module) return;
    const modulePermIds = module.permissions.map(p => p.id);
    const selectedCount = modulePermIds.filter(id => permissions.includes(id)).length;
    const isAllSelected = selectedCount === modulePermIds.length;
    
    if (isAllSelected) {
      onPermissionsChange(permissions.filter(p => !modulePermIds.includes(p)));
    } else {
      const newPerms = Array.from(new Set([...permissions, ...modulePermIds]));
      onPermissionsChange(newPerms);
    }
  }, [permissions, onPermissionsChange]);
  
  const handleTogglePermission = useCallback((permId: string) => {
    if (permissions.includes(permId)) {
      onPermissionsChange(permissions.filter(p => p !== permId));
    } else {
      onPermissionsChange([...permissions, permId]);
    }
  }, [permissions, onPermissionsChange]);
  
  const handleSelectAll = useCallback(() => {
    onPermissionsChange(PERMISSION_MODULES.flatMap(m => m.permissions.map(p => p.id)));
  }, [onPermissionsChange]);
  
  const handleClearAll = useCallback(() => {
    onPermissionsChange([]);
  }, [onPermissionsChange]);
  
  return (
    <div className="space-y-3">
      {/* Header - Stacks on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <Label className="text-base font-semibold">Permissions</Label>
          <Badge variant="secondary" className="text-xs">
            {permissions.length}/{totalPerms}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={handleSelectAll}
            data-testid="button-select-all-perms"
            className="flex-1 sm:flex-none"
          >
            Select All
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={handleClearAll}
            data-testid="button-clear-all-perms"
            className="flex-1 sm:flex-none"
          >
            Clear All
          </Button>
        </div>
      </div>
      
      {/* Permissions Accordion */}
      <div className="rounded-lg border overflow-hidden">
        <Accordion 
          type="multiple" 
          className="w-full"
          value={expandedModules}
          onValueChange={setExpandedModules}
        >
          {PERMISSION_MODULES.map((module) => {
            const moduleState = getModuleState(module.id);
            const selectedCount = module.permissions.filter(p => permissions.includes(p.id)).length;
            const Icon = module.icon;
            
            return (
              <AccordionItem key={module.id} value={module.id} className="border-b last:border-b-0">
                <div className="flex items-center px-3 sm:px-4 py-2 hover:bg-muted/50 gap-2">
                  <Checkbox
                    checked={moduleState === "all"}
                    onCheckedChange={() => handleToggleModule(module.id)}
                    className={`shrink-0 ${moduleState === "partial" ? "opacity-50" : ""}`}
                    data-testid={`checkbox-module-${module.id}`}
                  />
                  <AccordionTrigger className="flex-1 hover:no-underline py-0 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm sm:text-base truncate">{module.label}</span>
                      <Badge variant="outline" className="text-xs shrink-0 ml-auto">
                        {selectedCount}/{module.permissions.length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                </div>
                <AccordionContent className="pb-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-1 px-3 sm:px-4 pb-3 pt-1">
                    {module.permissions.map((perm) => (
                      <label 
                        key={perm.id} 
                        className="flex items-start gap-2 p-2 rounded hover:bg-muted/30 cursor-pointer transition-colors"
                      >
                        <Checkbox
                          checked={permissions.includes(perm.id)}
                          onCheckedChange={() => handleTogglePermission(perm.id)}
                          data-testid={`checkbox-perm-${perm.id}`}
                          className="mt-0.5 shrink-0"
                        />
                        <div className="grid gap-0.5 leading-none min-w-0">
                          <span className="text-sm font-medium">
                            {perm.label}
                          </span>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {perm.description}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </div>
  );
}

const userFormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  fullName: z.string().min(2, "Full name is required"),
  phone: z.string().optional(),
  role: z.enum(["admin", "staff", "customer"]),
  branchId: z.string().optional(),
  isActive: z.boolean().default(true),
  permissions: z.array(z.string()).default([]),
}).refine((data) => {
  if (data.role === "staff" && !data.branchId) {
    return false;
  }
  return true;
}, {
  message: "Branch assignment is required for staff role",
  path: ["branchId"],
});

type UserForm = z.infer<typeof userFormSchema>;

export default function AdminUsers() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const { toast } = useToast();
  const { logout, user: authUser } = useAuth();

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: dbUsers = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  // Create branch lookup map
  const branchMap = branches.reduce((acc, branch) => {
    acc[branch.id] = branch.name;
    return acc;
  }, {} as Record<string, string>);

  // Map and filter users
  const allUsers: UserData[] = dbUsers.map((u) => ({
    id: u.id,
    name: u.fullName,
    email: u.email,
    phone: u.phone || undefined,
    role: u.role as "admin" | "manager" | "staff" | "customer" | "rider",
    isActive: u.isActive,
    branchId: u.branchId || undefined,
    branchName: u.branchId ? branchMap[u.branchId] : undefined,
  }));

  // Apply filters
  const filteredUsers = useMemo(() => {
    return allUsers.filter((user) => {
      // Search filter (name, email, phone)
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        (user.phone && user.phone.toLowerCase().includes(searchLower));

      // Role filter
      const matchesRole = roleFilter === "all" || user.role === roleFilter;

      // Branch filter
      const matchesBranch = branchFilter === "all" || 
        (branchFilter === "no-branch" ? !user.branchId : user.branchId === branchFilter);

      // Status filter
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "active" ? user.isActive : !user.isActive);

      return matchesSearch && matchesRole && matchesBranch && matchesStatus;
    });
  }, [allUsers, searchQuery, roleFilter, branchFilter, statusFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / pageSize);

  // Auto-clamp currentPage when data changes
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredUsers.slice(startIndex, startIndex + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  // Reset to first page when filters change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // Count active filters
  const activeFilterCount = [
    roleFilter !== "all",
    branchFilter !== "all",
    statusFilter !== "all",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearchQuery("");
    setRoleFilter("all");
    setBranchFilter("all");
    setStatusFilter("all");
    setCurrentPage(1);
  };

  const form = useForm<UserForm>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      fullName: "",
      phone: "",
      role: "staff",
      branchId: "",
      isActive: true,
      permissions: [],
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: UserForm) => {
      const res = await apiRequest("/api/users", "POST", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({ title: "User created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<UserForm> }) => {
      const res = await apiRequest(`/api/users/${id}`, "PUT", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditingUser(null);
      form.reset();
      toast({ title: "User updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      // Don't close dialog on error
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest(`/api/users/${id}`, "DELETE");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      // Play delete sound
      playDeleteSound();
      toast({ 
        title: "User Deleted", 
        description: "The user has been removed from the system.",
        variant: "destructive"
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = (user: UserData) => {
    const dbUser = dbUsers.find((u) => u.id === user.id);
    if (dbUser) {
      setEditingUser(dbUser);
      const role = dbUser.role as "admin" | "staff" | "customer";
      setShowPermissions(role === "admin" || role === "staff");
      form.reset({
        username: dbUser.username,
        email: dbUser.email,
        fullName: dbUser.fullName,
        phone: dbUser.phone || "",
        role,
        branchId: dbUser.branchId || "",
        isActive: dbUser.isActive,
        permissions: dbUser.permissions || [],
      });
    }
  };

  const handleDelete = (userId: string) => {
    deleteMutation.mutate(userId);
  };

  const onSubmit = (data: UserForm) => {
    if (editingUser) {
      const updateData = { ...data };
      // Remove password if empty
      if (!updateData.password || updateData.password.trim() === "") {
        delete updateData.password;
      }
      // Remove empty branchId
      if (updateData.branchId === "") {
        updateData.branchId = undefined;
      }
      updateMutation.mutate({ id: editingUser.id, data: updateData });
    } else {
      const createData = { ...data };
      // Remove empty branchId
      if (createData.branchId === "") {
        createData.branchId = undefined;
      }
      createMutation.mutate(createData);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className={`fixed md:static inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <AdminSidebar
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
          onLogout={logout}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader 
          breadcrumbs={["Admin", "Users & Roles"]} 
          userName={authUser?.fullName || "Admin User"}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">Users & Roles</h1>
              <p className="text-muted-foreground text-sm md:text-base">
                Manage user accounts and role assignments ({filteredUsers.length} of {allUsers.length})
              </p>
            </div>
            <Dialog open={isAddDialogOpen || !!editingUser} onOpenChange={(open) => {
              if (!open) {
                setIsAddDialogOpen(false);
                setEditingUser(null);
                form.reset();
                setShowPermissions(true);
              }
            }}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setIsAddDialogOpen(true);
                  setShowPermissions(true);
                }} data-testid="button-add-user">
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden p-4 sm:p-6">
                <DialogHeader className="space-y-1 sm:space-y-2 flex-shrink-0">
                  <DialogTitle className="text-lg sm:text-xl">{editingUser ? "Edit User" : "Add New User"}</DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm">
                    {editingUser ? "Update user account details and permissions." : "Create a new user account with role and branch assignment."}
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto pr-2 sm:pr-4">
                      <div className="space-y-3 sm:space-y-4 pb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <FormField
                            control={form.control}
                            name="fullName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm">Full Name</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid="input-fullname" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm">Username</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid="input-username" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm">Email</FormLabel>
                                <FormControl>
                                  <Input type="email" {...field} data-testid="input-email" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm">{editingUser ? "New Password (optional)" : "Password"}</FormLabel>
                                <FormControl>
                                  <Input type="password" {...field} data-testid="input-password" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm">Phone (Optional)</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid="input-phone" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm">Role</FormLabel>
                                <Select 
                                  onValueChange={(value) => {
                                    field.onChange(value);
                                    setShowPermissions(value === "admin" || value === "staff");
                                  }} 
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger data-testid="select-role">
                                      <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="staff">Staff</SelectItem>
                                    <SelectItem value="customer">Customer</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <FormField
                            control={form.control}
                            name="branchId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm">Assigned Branch</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger data-testid="select-branch">
                                      <SelectValue placeholder="No branch assignment" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {branches.map((branch) => (
                                      <SelectItem key={branch.id} value={branch.id} data-testid={`select-branch-option-${branch.id}`}>
                                        {branch.name} - {branch.city}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="isActive"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 min-h-[60px] sm:min-h-[72px]">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-sm sm:text-base">Active</FormLabel>
                                  <div className="text-xs text-muted-foreground">
                                    User can access the system
                                  </div>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    data-testid="switch-active"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        {/* Permissions Section - rendered for admin/staff only */}
                        {showPermissions && (
                          <FormField
                            control={form.control}
                            name="permissions"
                            render={({ field }) => (
                              <PermissionsSection 
                                permissions={field.value || []} 
                                onPermissionsChange={(perms) => field.onChange(perms)}
                              />
                            )}
                          />
                        )}
                      </div>
                    </div>
                    <DialogFooter className="pt-3 sm:pt-4 border-t mt-3 sm:mt-4 flex-col-reverse sm:flex-row gap-2 sm:gap-0 flex-shrink-0">
                      <Button
                        type="submit"
                        disabled={createMutation.isPending || updateMutation.isPending}
                        data-testid="button-save-user"
                        className="w-full sm:w-auto"
                      >
                        {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingUser ? "Update User" : "Create User"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Filters Section */}
          <Card className="mb-6">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col gap-4">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-users"
                  />
                </div>

                {/* Filter Dropdowns */}
                <div className="flex flex-wrap gap-3 items-center">
                  {/* Role Filter */}
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[140px]" data-testid="select-filter-role">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="rider">Rider</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Branch Filter */}
                  <Select value={branchFilter} onValueChange={setBranchFilter}>
                    <SelectTrigger className="w-[180px]" data-testid="select-filter-branch">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Branch" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      <SelectItem value="no-branch">No Branch</SelectItem>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Status Filter */}
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]" data-testid="select-filter-status">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Clear Filters Button */}
                  {(searchQuery || activeFilterCount > 0) && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={clearFilters}
                      className="text-muted-foreground"
                      data-testid="button-clear-filters"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear
                      {activeFilterCount > 0 && (
                        <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                          {activeFilterCount}
                        </Badge>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <PageLoader message="Loading users..." />
          ) : (
            <>
              <UserRoleTable users={paginatedUsers} onEdit={handleEdit} onDelete={handleDelete} />
              {filteredUsers.length > 0 && (
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredUsers.length}
                  pageSize={pageSize}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
