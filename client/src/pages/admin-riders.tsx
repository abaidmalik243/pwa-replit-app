import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { useAuth } from "@/context/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Bike, Plus, Edit, Trash2, MapPin, Phone, Mail, Star, Package, Search } from "lucide-react";

// Define rider schema for form validation
const riderFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  vehicleType: z.enum(["bike", "motorcycle", "car", "bicycle"]),
  vehicleNumber: z.string().min(3, "Vehicle number is required"),
  branchId: z.string().min(1, "Branch is required"),
  status: z.enum(["online", "offline", "busy", "on_break"]).default("offline"),
  isAvailable: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

type RiderFormData = z.infer<typeof riderFormSchema>;

interface Rider {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vehicleType: string;
  vehicleNumber: string;
  branchId: string;
  userId?: string;
  status: string;
  isAvailable: boolean;
  isActive: boolean;
  currentLatitude?: string;
  currentLongitude?: string;
  lastLocationUpdate?: string;
  totalDeliveries: number;
  rating: string;
  createdAt: string;
}

interface Branch {
  id: string;
  name: string;
  city: string;
}

export default function AdminRiders() {
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { logout } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRider, setEditingRider] = useState<Rider | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch branches
  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  // Fetch riders
  const { data: riders = [], isLoading } = useQuery<Rider[]>({
    queryKey: ["/api/riders"],
  });

  // Create rider mutation
  const createMutation = useMutation({
    mutationFn: async (data: RiderFormData) => {
      return await apiRequest("/api/riders", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/riders"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Rider created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create rider",
        variant: "destructive",
      });
    },
  });

  // Update rider mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RiderFormData> }) => {
      return await apiRequest(`/api/riders/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/riders"] });
      setEditingRider(null);
      toast({
        title: "Success",
        description: "Rider updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update rider",
        variant: "destructive",
      });
    },
  });

  // Delete rider mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/riders/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/riders"] });
      toast({
        title: "Success",
        description: "Rider deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete rider",
        variant: "destructive",
      });
    },
  });

  // Form for create/edit
  const form = useForm<RiderFormData>({
    resolver: zodResolver(riderFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      vehicleType: "motorcycle",
      vehicleNumber: "",
      branchId: "",
      status: "offline",
      isAvailable: true,
      isActive: true,
    },
  });

  // Update form when editing rider
  if (editingRider && form.getValues().name !== editingRider.name) {
    form.reset({
      name: editingRider.name,
      phone: editingRider.phone,
      email: editingRider.email || "",
      vehicleType: editingRider.vehicleType as any,
      vehicleNumber: editingRider.vehicleNumber,
      branchId: editingRider.branchId,
      status: editingRider.status as any,
      isAvailable: editingRider.isAvailable,
      isActive: editingRider.isActive,
    });
  }

  const onSubmit = (data: RiderFormData) => {
    if (editingRider) {
      updateMutation.mutate({ id: editingRider.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this rider?")) {
      deleteMutation.mutate(id);
    }
  };

  // Filter riders
  const filteredRiders = riders.filter(rider => {
    const matchesBranch = selectedBranch === "all" || rider.branchId === selectedBranch;
    const matchesSearch = searchQuery === "" || 
      rider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rider.phone.includes(searchQuery);
    return matchesBranch && matchesSearch;
  });

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-green-500";
      case "busy": return "bg-yellow-500";
      case "offline": return "bg-gray-500";
      case "on_break": return "bg-blue-500";
      default: return "bg-gray-500";
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
          breadcrumbs={["Admin", "Riders"]}
          notificationCount={0}
          userName="Admin User"
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="space-y-6" data-testid="page-admin-riders">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold" data-testid="text-page-title">Riders Management</h1>
                <p className="text-muted-foreground">Manage delivery riders and their assignments</p>
              </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingRider(null);
              form.reset();
            }} data-testid="button-create-rider">
              <Plus className="w-4 h-4 mr-2" />
              Add Rider
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md" data-testid="dialog-create-rider">
            <DialogHeader>
              <DialogTitle>Add New Rider</DialogTitle>
              <DialogDescription>
                Create a new delivery rider profile with vehicle details and branch assignment.
              </DialogDescription>
            </DialogHeader>
            <RiderForm 
              form={form} 
              onSubmit={onSubmit} 
              branches={branches}
              isLoading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-riders"
                />
              </div>
            </div>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-48" data-testid="select-branch-filter">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Riders Grid */}
      {isLoading ? (
        <div className="text-center py-12" data-testid="loading-riders">
          <p>Loading riders...</p>
        </div>
      ) : filteredRiders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center" data-testid="empty-state">
            <Bike className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium">No riders found</p>
            <p className="text-muted-foreground">Add your first rider to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRiders.map((rider) => (
            <Card key={rider.id} className="hover-elevate" data-testid={`card-rider-${rider.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2" data-testid={`text-rider-name-${rider.id}`}>
                      <Bike className="w-5 h-5" />
                      {rider.name}
                    </CardTitle>
                    <Badge className={`mt-2 ${getStatusColor(rider.status)}`} data-testid={`badge-rider-status-${rider.id}`}>
                      {rider.status}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Dialog open={editingRider?.id === rider.id} onOpenChange={(open) => !open && setEditingRider(null)}>
                      <DialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingRider(rider)}
                          data-testid={`button-edit-rider-${rider.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md" data-testid={`dialog-edit-rider-${rider.id}`}>
                        <DialogHeader>
                          <DialogTitle>Edit Rider</DialogTitle>
                          <DialogDescription>
                            Update rider information and status.
                          </DialogDescription>
                        </DialogHeader>
                        <RiderForm 
                          form={form} 
                          onSubmit={onSubmit} 
                          branches={branches}
                          isLoading={updateMutation.isPending}
                        />
                      </DialogContent>
                    </Dialog>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(rider.id)}
                      data-testid={`button-delete-rider-${rider.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span data-testid={`text-rider-phone-${rider.id}`}>{rider.phone}</span>
                </div>
                {rider.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span data-testid={`text-rider-email-${rider.id}`}>{rider.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Bike className="w-4 h-4 text-muted-foreground" />
                  <span className="capitalize">{rider.vehicleType}</span>
                  <span className="text-muted-foreground">• {rider.vehicleNumber}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{branches.find(b => b.id === rider.branchId)?.name || "Unknown Branch"}</span>
                </div>
                <div className="flex items-center gap-4 pt-2 border-t">
                  <div className="flex items-center gap-1">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium" data-testid={`text-rider-deliveries-${rider.id}`}>{rider.totalDeliveries || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium" data-testid={`text-rider-rating-${rider.id}`}>{rider.rating || "5.00"}</span>
                  </div>
                  <Badge variant={rider.isAvailable ? "default" : "secondary"} className="ml-auto">
                    {rider.isAvailable ? "Available" : "Unavailable"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
          </div>
        </main>
      </div>
    </div>
  );
}

// Rider Form Component
function RiderForm({ 
  form, 
  onSubmit, 
  branches,
  isLoading 
}: { 
  form: any; 
  onSubmit: (data: RiderFormData) => void;
  branches: Branch[];
  isLoading: boolean;
}) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="John Doe" data-testid="input-rider-name" />
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
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input {...field} placeholder="+92 300 1234567" data-testid="input-rider-phone" />
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
              <FormLabel>Email (Optional)</FormLabel>
              <FormControl>
                <Input {...field} type="email" placeholder="john@example.com" data-testid="input-rider-email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="vehicleType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vehicle Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-vehicle-type">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="motorcycle">Motorcycle</SelectItem>
                    <SelectItem value="bike">Bike</SelectItem>
                    <SelectItem value="car">Car</SelectItem>
                    <SelectItem value="bicycle">Bicycle</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="vehicleNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vehicle Number</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="ABC-123" data-testid="input-vehicle-number" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="branchId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Branch</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-rider-branch">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
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

        <div className="flex gap-4 pt-4">
          <Button type="submit" className="flex-1" disabled={isLoading} data-testid="button-submit-rider">
            {isLoading ? "Saving..." : "Save Rider"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
