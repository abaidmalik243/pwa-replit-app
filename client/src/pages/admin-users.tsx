import { useState } from "react";
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
import type { User, Branch } from "@shared/schema";

const AVAILABLE_PERMISSIONS = [
  { id: "manage_menu", label: "Manage Menu", description: "Add, edit, and delete menu items" },
  { id: "manage_orders", label: "Manage Orders", description: "View and update order status" },
  { id: "manage_users", label: "Manage Users", description: "Add, edit, and delete users" },
  { id: "view_reports", label: "View Reports", description: "Access analytics and reports" },
  { id: "manage_inventory", label: "Manage Inventory", description: "Track stock and suppliers" },
  { id: "manage_riders", label: "Manage Riders", description: "Assign and track deliveries" },
  { id: "access_pos", label: "Access POS", description: "Use point of sale system" },
  { id: "manage_promo_codes", label: "Manage Promo Codes", description: "Create and edit promotions" },
  { id: "manage_settings", label: "Manage Settings", description: "Change system settings" },
];

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
      form.reset({
        username: dbUser.username,
        email: dbUser.email,
        fullName: dbUser.fullName,
        phone: dbUser.phone || "",
        role: dbUser.role as "admin" | "staff" | "customer",
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
              }
            }}>
              <DialogTrigger asChild>
                <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-user">
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingUser ? "Edit User" : "Add New User"}</DialogTitle>
                  <DialogDescription>
                    {editingUser ? "Update user account details and permissions." : "Create a new user account with role and branch assignment."}
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                          <FormLabel>{editingUser ? "New Password (leave blank to keep current)" : "Password"}</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} data-testid="input-password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                          <Select onValueChange={field.onChange} value={field.value}>
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
                    <FormField
                      control={form.control}
                      name="branchId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assigned Branch (Optional)</FormLabel>
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
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Active</FormLabel>
                            <div className="text-sm text-muted-foreground">
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
                    
                    {/* Permissions Section */}
                    {(form.watch("role") === "admin" || form.watch("role") === "staff") && (
                      <FormField
                        control={form.control}
                        name="permissions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Permissions</FormLabel>
                            <div className="rounded-lg border p-4 space-y-3 max-h-48 overflow-y-auto">
                              {AVAILABLE_PERMISSIONS.map((permission) => (
                                <div key={permission.id} className="flex items-start space-x-3">
                                  <Checkbox
                                    id={`perm-${permission.id}`}
                                    checked={field.value?.includes(permission.id)}
                                    onCheckedChange={(checked) => {
                                      const currentPerms = field.value || [];
                                      if (checked) {
                                        field.onChange([...currentPerms, permission.id]);
                                      } else {
                                        field.onChange(currentPerms.filter((p: string) => p !== permission.id));
                                      }
                                    }}
                                    data-testid={`checkbox-perm-${permission.id}`}
                                  />
                                  <div className="grid gap-1 leading-none">
                                    <Label
                                      htmlFor={`perm-${permission.id}`}
                                      className="text-sm font-medium cursor-pointer"
                                    >
                                      {permission.label}
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                      {permission.description}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    <DialogFooter>
                      <Button
                        type="submit"
                        disabled={createMutation.isPending || updateMutation.isPending}
                        data-testid="button-save-user"
                      >
                        {editingUser ? "Update User" : "Create User"}
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
