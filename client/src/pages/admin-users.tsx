import { useState, useCallback } from "react";
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
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, UtensilsCrossed, Users, BarChart3, Package, Truck, Megaphone, Settings, CreditCard, Heart } from "lucide-react";
import type { User, Branch } from "@shared/schema";

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
      { id: "pos.access", label: "Access POS", description: "Use POS terminal" },
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
      { id: "delivery.manage_zones", label: "Manage Zones", description: "Configure delivery zones" },
    ],
  },
  {
    id: "inventory",
    label: "Inventory & Suppliers",
    icon: Package,
    permissions: [
      { id: "inventory.view_stock", label: "View Stock", description: "View stock levels" },
      { id: "inventory.adjust_stock", label: "Adjust Stock", description: "Modify stock quantities" },
      { id: "inventory.manage_suppliers", label: "Manage Suppliers", description: "Add/edit suppliers" },
      { id: "inventory.receive_stock", label: "Receive Stock", description: "Record stock receipts" },
      { id: "inventory.view_audit", label: "View Audit Logs", description: "View stock history" },
      { id: "inventory.manage_wastage", label: "Manage Wastage", description: "Record wastage" },
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
];

const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  admin: PERMISSION_MODULES.flatMap(m => m.permissions.map(p => p.id)),
  staff: [
    "orders.view", "orders.create", "orders.update_status",
    "menu.view",
    "pos.access", "pos.apply_discounts", "pos.view_kitchen",
    "inventory.view_stock",
    "reports.view_sales",
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
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-base font-semibold">Permissions</Label>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {permissions.length}/{totalPerms} selected
          </Badge>
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={handleSelectAll}
            data-testid="button-select-all-perms"
          >
            Select All
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={handleClearAll}
            data-testid="button-clear-all-perms"
          >
            Clear All
          </Button>
        </div>
      </div>
      <div className="rounded-lg border">
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
                <div className="flex items-center px-4 py-2 hover:bg-muted/50">
                  <Checkbox
                    checked={moduleState === "all"}
                    onCheckedChange={() => handleToggleModule(module.id)}
                    className={`mr-3 ${moduleState === "partial" ? "opacity-50" : ""}`}
                    data-testid={`checkbox-module-${module.id}`}
                  />
                  <AccordionTrigger className="flex-1 hover:no-underline py-0">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{module.label}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {selectedCount}/{module.permissions.length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                </div>
                <AccordionContent className="pb-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1 px-4 pb-3 pt-1">
                    {module.permissions.map((perm) => (
                      <label 
                        key={perm.id} 
                        className="flex items-start gap-2 p-2 rounded hover:bg-muted/30 cursor-pointer"
                      >
                        <Checkbox
                          checked={permissions.includes(perm.id)}
                          onCheckedChange={() => handleTogglePermission(perm.id)}
                          data-testid={`checkbox-perm-${perm.id}`}
                        />
                        <div className="grid gap-0.5 leading-none">
                          <span className="text-sm">
                            {perm.label}
                          </span>
                          <p className="text-xs text-muted-foreground">
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
  const { logout } = useAuth();

  const { data: dbUsers = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const users: UserData[] = dbUsers.map((u) => ({
    id: u.id,
    name: u.fullName,
    email: u.email,
    role: u.role as "admin" | "manager" | "staff",
    isActive: u.isActive,
  }));

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
      toast({ title: "User deleted successfully" });
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
          userName="Admin User"
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">Users & Roles</h1>
              <p className="text-muted-foreground text-sm md:text-base">
                Manage user accounts and role assignments
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
              <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>{editingUser ? "Edit User" : "Add New User"}</DialogTitle>
                  <DialogDescription>
                    {editingUser ? "Update user account details and permissions." : "Create a new user account with role and branch assignment."}
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
                    <ScrollArea className="flex-1 pr-4">
                      <div className="space-y-4 pb-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="fullName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Full Name</FormLabel>
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
                                <FormLabel>Username</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid="input-username" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
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
                                <FormLabel>{editingUser ? "New Password (optional)" : "Password"}</FormLabel>
                                <FormControl>
                                  <Input type="password" {...field} data-testid="input-password" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone (Optional)</FormLabel>
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
                                <FormLabel>Role</FormLabel>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="branchId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Assigned Branch</FormLabel>
                                <Select 
                                  onValueChange={(value) => field.onChange(value === "none" ? "" : value)} 
                                  value={field.value || "none"}
                                >
                                  <FormControl>
                                    <SelectTrigger data-testid="select-branch">
                                      <SelectValue placeholder="Select branch" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="none">No branch assignment</SelectItem>
                                    {branches.map((branch) => (
                                      <SelectItem key={branch.id} value={branch.id}>
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
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 h-[72px]">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Active</FormLabel>
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
                    </ScrollArea>
                    <DialogFooter className="pt-4 border-t mt-4">
                      <Button
                        type="submit"
                        disabled={createMutation.isPending || updateMutation.isPending}
                        data-testid="button-save-user"
                      >
                        {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingUser ? "Update User" : "Create User"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading users...
            </div>
          ) : (
            <UserRoleTable users={users} onEdit={handleEdit} onDelete={handleDelete} />
          )}
        </main>
      </div>
    </div>
  );
}
