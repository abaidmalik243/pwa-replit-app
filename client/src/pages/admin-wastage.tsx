import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { Trash2, Plus, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const wastageSchema = z.object({
  menuItemId: z.string().min(1, "Menu item is required"),
  quantity: z.string().min(1, "Quantity is required"),
  wastageType: z.enum(["expired", "damaged", "overproduction", "spillage"]),
  estimatedCost: z.string().optional(),
  reason: z.string().min(1, "Reason is required"),
  wasteDate: z.string().optional(),
});

type WastageFormData = z.infer<typeof wastageSchema>;

interface Wastage {
  id: string;
  menuItemId: string;
  branchId: string;
  quantity: number;
  wastageType: string;
  estimatedCost?: number | null;
  reason: string;
  wasteDate: string;
  createdAt: string;
  menuItem?: { name: string };
}

const wastageTypeLabels: Record<string, string> = {
  expired: "Expired",
  damaged: "Damaged",
  overproduction: "Overproduction",
  spillage: "Spillage",
};

const wastageTypeColors: Record<string, string> = {
  expired: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  damaged: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  overproduction: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200",
  spillage: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
};

export default function AdminWastage() {
  const { toast } = useToast();
  const { logout, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const userBranchId = user?.branchId || "";

  const { data: wastage = [], isLoading } = useQuery<Wastage[]>({
    queryKey: ["/api/inventory/wastage", userBranchId],
    queryFn: async () => {
      const response = await fetch(`/api/inventory/wastage/${userBranchId}`);
      if (!response.ok) throw new Error("Failed to fetch wastage data");
      return response.json();
    },
    enabled: !!userBranchId,
  });

  const { data: inventory = [] } = useQuery<any[]>({
    queryKey: ["/api/menu-items"],
  });

  const form = useForm<WastageFormData>({
    resolver: zodResolver(wastageSchema),
    defaultValues: {
      menuItemId: "",
      quantity: "",
      wastageType: "expired",
      estimatedCost: "",
      reason: "",
      wasteDate: new Date().toISOString().split('T')[0],
    },
  });

  const createWastageMutation = useMutation({
    mutationFn: (data: any) => {
      return apiRequest("/api/inventory/wastage", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/wastage", userBranchId] });
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      toast({ title: "Success", description: "Wastage recorded successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: WastageFormData) => {
    const payload = {
      menuItemId: data.menuItemId,
      branchId: userBranchId,
      quantity: parseInt(data.quantity, 10),
      wastageType: data.wastageType,
      estimatedCost: data.estimatedCost ? parseFloat(data.estimatedCost) : undefined,
      reason: data.reason,
      wasteDate: data.wasteDate ? new Date(data.wasteDate).toISOString() : new Date().toISOString(),
    };
    createWastageMutation.mutate(payload);
  };

  const totalWastageCost = wastage.reduce((sum, item) => sum + (item.estimatedCost || 0), 0);

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
          soundEnabled={false}
          onToggleSound={() => {}}
          onLogout={logout}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader
          breadcrumbs={["Admin", "Wastage Tracking"]}
          notificationCount={0}
          userName="Admin User"
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Wastage Incidents</CardTitle>
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-wastage">{wastage.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estimated Total Cost</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600" data-testid="text-total-cost">
                ₨{totalWastageCost.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Most Common Reason</CardTitle>
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-common-reason">
                {wastage.length > 0 ? wastageTypeLabels[wastage[0].wastageType] : "-"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold" data-testid="text-wastage-title">Wastage Records</h2>
            <p className="text-muted-foreground">Track food wastage and losses</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} data-testid="button-record-wastage">
            <Plus className="h-4 w-4 mr-2" />
            Record Wastage
          </Button>
        </div>

        {/* Wastage List */}
        {isLoading ? (
          <p data-testid="text-loading">Loading wastage records...</p>
        ) : wastage.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Trash2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground" data-testid="text-empty-state">No wastage recorded yet</p>
              <Button className="mt-4" onClick={() => setIsDialogOpen(true)} data-testid="button-record-first-wastage">
                Record First Wastage
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {wastage.map((item) => (
              <Card key={item.id} data-testid={`card-wastage-${item.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold" data-testid={`text-item-name-${item.id}`}>
                          {item.menuItem?.name || "Unknown Item"}
                        </h3>
                        <Badge className={wastageTypeColors[item.wastageType]} data-testid={`badge-wastageType-${item.id}`}>
                          {wastageTypeLabels[item.wastageType]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1" data-testid={`text-date-${item.id}`}>
                        Waste Date: {format(new Date(item.wasteDate), "PPp")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Quantity</p>
                      <p className="text-xl font-bold" data-testid={`text-quantity-${item.id}`}>
                        {item.quantity}
                      </p>
                      {item.estimatedCost && (
                        <p className="text-sm text-red-600 mt-1" data-testid={`text-cost-${item.id}`}>
                          ₨{item.estimatedCost.toFixed(2)} loss
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {item.reason && (
                  <CardContent>
                    <p className="text-sm font-medium">Reason:</p>
                    <p className="text-sm text-muted-foreground mt-1" data-testid={`text-reason-${item.id}`}>
                      {item.reason}
                    </p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Record Wastage Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent data-testid="dialog-wastage-form">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">Record Wastage</DialogTitle>
            <DialogDescription>
              Document food wastage and associated losses
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="menuItemId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Menu Item</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-menu-item">
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {inventory.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
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
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity Wasted</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" placeholder="5" {...field} data-testid="input-quantity" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="wastageType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wastage Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-wastage-type">
                          <SelectValue placeholder="Select wastage type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="expired">Expired</SelectItem>
                        <SelectItem value="damaged">Damaged</SelectItem>
                        <SelectItem value="overproduction">Overproduction</SelectItem>
                        <SelectItem value="spillage">Spillage</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="wasteDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Waste Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-waste-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimatedCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Cost (Optional)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-estimated-cost" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the reason for wastage..." 
                        {...field} 
                        data-testid="input-reason"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createWastageMutation.isPending}
                  data-testid="button-save-wastage"
                >
                  {createWastageMutation.isPending ? "Recording..." : "Record Wastage"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
        </main>
      </div>
    </div>
  );
}
