import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, MapPin, Phone, Building2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import type { Branch } from "@shared/schema";

const branchSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  city: z.string().min(2, "City is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  deliveryAreas: z.array(z.string()).default([]),
  logoUrl: z.string().url().optional().or(z.literal("")),
  primaryColor: z.string().optional(),
  isActive: z.boolean().default(true),
});

type BranchForm = z.infer<typeof branchSchema>;

export default function AdminBranches() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [newArea, setNewArea] = useState("");
  const { toast } = useToast();

  const { data: branches = [], isLoading } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const form = useForm<BranchForm>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      name: "",
      city: "",
      address: "",
      phone: "",
      latitude: "",
      longitude: "",
      deliveryAreas: [],
      logoUrl: "",
      primaryColor: "",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: BranchForm) => {
      const res = await apiRequest("/api/branches", "POST", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({ title: "Branch created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: BranchForm }) => {
      const res = await apiRequest(`/api/branches/${id}`, "PUT", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      setEditingBranch(null);
      form.reset();
      toast({ title: "Branch updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest(`/api/branches/${id}`, "DELETE");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      toast({ title: "Branch deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    form.reset({
      name: branch.name,
      city: branch.city,
      address: branch.address || "",
      phone: branch.phone || "",
      latitude: branch.latitude || "",
      longitude: branch.longitude || "",
      deliveryAreas: branch.deliveryAreas || [],
      logoUrl: branch.logoUrl || "",
      primaryColor: branch.primaryColor || "",
      isActive: branch.isActive,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this branch?")) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (data: BranchForm) => {
    if (editingBranch) {
      updateMutation.mutate({ id: editingBranch.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleAddArea = () => {
    if (!newArea.trim()) return;
    const currentAreas = form.getValues("deliveryAreas");
    form.setValue("deliveryAreas", [...currentAreas, newArea.trim()]);
    setNewArea("");
  };

  const handleRemoveArea = (index: number) => {
    const currentAreas = form.getValues("deliveryAreas");
    form.setValue("deliveryAreas", currentAreas.filter((_, i) => i !== index));
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
          soundEnabled={true}
          onToggleSound={() => {}}
          onLogout={() => console.log("Logout")}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader 
          breadcrumbs={["Admin", "Branches"]} 
          userName="Admin User"
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">Branch Management</h1>
              <p className="text-muted-foreground text-sm md:text-base">
                Manage restaurant branches and delivery areas
              </p>
            </div>
            <Dialog open={isAddDialogOpen || !!editingBranch} onOpenChange={(open) => {
              if (!open) {
                setIsAddDialogOpen(false);
                setEditingBranch(null);
                form.reset();
              }
            }}>
              <DialogTrigger asChild>
                <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-branch">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Branch
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingBranch ? "Edit Branch" : "Add New Branch"}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Branch Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., Okara Main" data-testid="input-branch-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., Okara" data-testid="input-city" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Full address" rows={2} data-testid="input-address" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., +92 123 4567890" data-testid="input-phone" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between space-y-0 pt-8">
                            <FormLabel>Active Status</FormLabel>
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="h-4 w-4"
                                data-testid="input-is-active"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="latitude"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Latitude (GPS)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., 30.8081" data-testid="input-latitude" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="longitude"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Longitude (GPS)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., 73.4534" data-testid="input-longitude" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-2">
                      <FormLabel>Delivery Areas</FormLabel>
                      <div className="flex gap-2">
                        <Input
                          value={newArea}
                          onChange={(e) => setNewArea(e.target.value)}
                          placeholder="Add delivery area..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddArea();
                            }
                          }}
                          data-testid="input-new-area"
                        />
                        <Button type="button" onClick={handleAddArea} data-testid="button-add-area">
                          Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {form.watch("deliveryAreas").map((area, index) => (
                          <Badge key={index} variant="secondary" className="gap-1" data-testid={`badge-area-${index}`}>
                            {area}
                            <X
                              className="h-3 w-3 cursor-pointer hover-elevate"
                              onClick={() => handleRemoveArea(index)}
                              data-testid={`button-remove-area-${index}`}
                            />
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="logoUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Logo URL (Optional)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="https://..." data-testid="input-logo-url" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="primaryColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primary Color (Optional)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="#DC2626" data-testid="input-primary-color" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <DialogFooter>
                      <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-branch">
                        {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingBranch ? "Update Branch" : "Create Branch"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="h-32 bg-muted"></CardHeader>
                  <CardContent className="h-24"></CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {branches.map((branch) => (
                <Card key={branch.id} className="hover-elevate" data-testid={`card-branch-${branch.id}`}>
                  <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
                    <div className="flex-1">
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        {branch.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{branch.city}</p>
                    </div>
                    <Badge variant={branch.isActive ? "default" : "secondary"} data-testid={`badge-status-${branch.id}`}>
                      {branch.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {branch.address && (
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <span className="text-muted-foreground">{branch.address}</span>
                      </div>
                    )}
                    {branch.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{branch.phone}</span>
                      </div>
                    )}
                    {branch.latitude && branch.longitude && (
                      <div className="text-xs text-muted-foreground">
                        GPS: {branch.latitude}, {branch.longitude}
                      </div>
                    )}
                    {branch.deliveryAreas && branch.deliveryAreas.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium">Delivery Areas:</p>
                        <div className="flex flex-wrap gap-1">
                          {branch.deliveryAreas.slice(0, 3).map((area, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {area}
                            </Badge>
                          ))}
                          {branch.deliveryAreas.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{branch.deliveryAreas.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEdit(branch)}
                        className="flex-1"
                        data-testid={`button-edit-${branch.id}`}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(branch.id)}
                        data-testid={`button-delete-${branch.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!isLoading && branches.length === 0 && (
            <Card className="p-12 text-center">
              <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No branches yet</h3>
              <p className="text-muted-foreground mb-4">Get started by creating your first branch</p>
              <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-first-branch">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Branch
              </Button>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
