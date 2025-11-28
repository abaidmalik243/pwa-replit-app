import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/context/AuthContext";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Calendar, DollarSign, User, Pencil, Trash2, Package, ExternalLink, Paperclip } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { Expense, Branch, User as UserType, Supplier } from "@shared/schema";
import { format, subDays } from "date-fns";

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

// Calculate the minimum allowed date for expenses based on 24-hour window (5:00 AM cutoff)
function getMinExpenseDate(): string {
  const now = new Date();
  const currentHour = now.getHours();
  
  // If before 5 AM, the window started yesterday at 5 AM
  // If after 5 AM, the window started today at 5 AM
  const windowStart = currentHour < 5 ? subDays(now, 1) : now;
  
  return format(windowStart, "yyyy-MM-dd");
}

const expenseSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  category: z.string().min(2, "Category is required"),
  staffId: z.string().optional(),
  supplierId: z.string().optional(),
  description: z.string().min(2, "Description is required"),
  amount: z.string().min(1, "Amount is required").refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Amount must be a positive number",
  }),
  date: z.string().min(1, "Date is required"),
  receiptUrl: z.string().optional(),
}).refine((data) => {
  if (data.category === "staff" && !data.staffId) {
    return false;
  }
  return true;
}, {
  message: "Staff member is required when category is Staff",
  path: ["staffId"],
}).refine((data) => {
  if (data.category === "supplies" && !data.supplierId) {
    return false;
  }
  return true;
}, {
  message: "Supplier is required when category is Supplies",
  path: ["supplierId"],
});

type ExpenseForm = z.infer<typeof expenseSchema>;

const EXPENSE_CATEGORIES = [
  "Rent",
  "Utilities",
  "Supplies",
  "Salaries",
  "Marketing",
  "Maintenance",
  "Transportation",
  "Staff",
  "Other",
];

export default function AdminExpenses() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const isAdmin = user?.role === "admin";
  const userBranchId = user?.branchId;

  const { data: allBranches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  // Fetch all users for displaying staff names on expense cards
  const { data: allUsers = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users", { credentials: "include" });
      return res.json();
    },
  });

  // Fetch all suppliers for displaying supplier names on expense cards
  const { data: suppliersList = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
    queryFn: async () => {
      const res = await fetch("/api/suppliers", { credentials: "include" });
      return res.json();
    },
  });

  // Helper functions to get staff/supplier names
  const getStaffName = (staffId: string | null) => {
    if (!staffId) return null;
    const staff = allUsers.find(u => u.id === staffId);
    return staff?.fullName || null;
  };

  const getSupplierName = (supplierId: string | null) => {
    if (!supplierId) return null;
    const supplier = suppliersList.find(s => s.id === supplierId);
    return supplier?.name || null;
  };

  const allowedBranches = useMemo(() => {
    if (isAdmin) {
      return allBranches;
    }
    return allBranches.filter(branch => branch.id === userBranchId);
  }, [allBranches, isAdmin, userBranchId]);

  useEffect(() => {
    if (!isAdmin && userBranchId && selectedBranch === "all") {
      setSelectedBranch(userBranchId);
    }
  }, [isAdmin, userBranchId, selectedBranch]);

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses", selectedBranch],
    queryFn: async () => {
      const url = selectedBranch === "all" 
        ? "/api/expenses" 
        : `/api/expenses?branchId=${selectedBranch}`;
      return await fetch(url, { credentials: "include" }).then(res => res.json());
    },
  });

  const form = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      branchId: !isAdmin && userBranchId ? userBranchId : "",
      category: "",
      staffId: "",
      supplierId: "",
      description: "",
      amount: "",
      date: format(new Date(), "yyyy-MM-dd"),
      receiptUrl: "",
    },
  });

  const formBranchId = form.watch("branchId");
  const formCategory = form.watch("category");

  // Fetch active staff members for the selected branch in the form
  const { data: branchStaff = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users", formBranchId, "staff", "active"],
    queryFn: async () => {
      if (!formBranchId) return [];
      const res = await fetch(`/api/users?branchId=${formBranchId}&role=staff&isActive=true`, { credentials: "include" });
      return res.json();
    },
    enabled: !!formBranchId && formCategory === "staff",
  });

  // Fetch active suppliers from all branches when category is supplies
  const { data: allSuppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers", "active"],
    queryFn: async () => {
      const res = await fetch("/api/suppliers", { credentials: "include" });
      const suppliers = await res.json();
      return suppliers.filter((s: Supplier) => s.isActive);
    },
    enabled: formCategory === "supplies",
  });

  useEffect(() => {
    if (!isAdmin && userBranchId) {
      form.setValue("branchId", userBranchId);
    }
  }, [isAdmin, userBranchId, form]);

  // Clear staffId when category changes from "staff"
  useEffect(() => {
    if (formCategory !== "staff") {
      form.setValue("staffId", "");
    }
  }, [formCategory, form]);

  // Clear supplierId when category changes from "supplies"
  useEffect(() => {
    if (formCategory !== "supplies") {
      form.setValue("supplierId", "");
    }
  }, [formCategory, form]);

  // Reset form when dialog opens
  useEffect(() => {
    if (isAddDialogOpen) {
      form.reset({
        branchId: !isAdmin && userBranchId ? userBranchId : "",
        category: "",
        staffId: "",
        supplierId: "",
        description: "",
        amount: "",
        date: format(new Date(), "yyyy-MM-dd"),
        receiptUrl: "",
      });
    }
  }, [isAddDialogOpen, isAdmin, userBranchId, form]);

  const canAddExpense = isAdmin || !!userBranchId;

  const createMutation = useMutation({
    mutationFn: async (data: ExpenseForm) => {
      // Parse the date string and convert to ISO format
      const dateValue = data.date ? new Date(data.date + "T12:00:00").toISOString() : new Date().toISOString();
      const res = await apiRequest("/api/expenses", "POST", {
        branchId: data.branchId,
        category: data.category,
        staffId: data.staffId || null,
        supplierId: data.supplierId || null,
        description: data.description,
        amount: data.amount,
        date: dateValue,
        receiptUrl: data.receiptUrl || null,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses", selectedBranch] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({ title: "Expense added successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ExpenseForm }) => {
      const dateValue = data.date ? new Date(data.date + "T12:00:00").toISOString() : new Date().toISOString();
      const res = await apiRequest(`/api/expenses/${id}`, "PUT", {
        branchId: data.branchId,
        category: data.category,
        staffId: data.staffId || null,
        supplierId: data.supplierId || null,
        description: data.description,
        amount: data.amount,
        date: dateValue,
        receiptUrl: data.receiptUrl || null,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses", selectedBranch] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      setEditingExpense(null);
      form.reset();
      toast({ title: "Expense updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest(`/api/expenses/${id}`, "DELETE");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses", selectedBranch] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      // Play delete sound
      playDeleteSound();
      toast({ 
        title: "Expense Deleted", 
        description: "The expense has been removed from the system.",
        variant: "destructive"
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    form.reset({
      branchId: expense.branchId,
      category: expense.category,
      staffId: expense.staffId || "",
      supplierId: expense.supplierId || "",
      description: expense.description,
      amount: expense.amount,
      date: format(new Date(expense.date), "yyyy-MM-dd"),
      receiptUrl: expense.receiptUrl || "",
    });
  };

  const onSubmit = (data: ExpenseForm) => {
    // Double-check staff validation before submission
    if (data.category === "staff" && !data.staffId) {
      form.setError("staffId", { 
        type: "manual", 
        message: "Staff member is required when category is Staff" 
      });
      return;
    }
    
    if (editingExpense) {
      updateMutation.mutate({ id: editingExpense.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const expensesArray = Array.isArray(expenses) ? expenses : [];
  
  const filteredExpenses = expensesArray.filter((expense) =>
    expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalExpenses = filteredExpenses.reduce(
    (sum, exp) => sum + parseFloat(exp.amount),
    0
  );

  const getBranchName = (branchId: string) => {
    const branch = allBranches.find((b) => b.id === branchId);
    return branch?.name || "Unknown Branch";
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
          soundEnabled={false}
          onToggleSound={() => {}}
          onLogout={() => localStorage.removeItem("user")}
          onNavigate={() => setSidebarOpen(false)}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader
          breadcrumbs={["Admin", "Expenses"]}
          notificationCount={0}
          userName="Admin User"
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Daily Expenses</h1>
              <p className="text-muted-foreground">
                {isAdmin 
                  ? "Track and manage expenses across all branches"
                  : `Track and manage expenses for ${getBranchName(userBranchId || "")}`
                }
              </p>
            </div>

            <Dialog open={isAddDialogOpen || !!editingExpense} onOpenChange={(open) => {
              if (!open) {
                setIsAddDialogOpen(false);
                setEditingExpense(null);
                form.reset();
              }
            }}>
              <DialogTrigger asChild>
                <Button 
                  data-testid="button-add-expense"
                  disabled={!canAddExpense}
                  title={!canAddExpense ? "You need a branch assignment to add expenses" : undefined}
                  onClick={() => setIsAddDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingExpense ? "Edit Expense" : "Add New Expense"}</DialogTitle>
                  <DialogDescription>
                    {editingExpense ? "Update the expense details" : "Record a daily expense for one of your branches"}
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="branchId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Branch</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={!isAdmin && allowedBranches.length === 1}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-branch">
                                <SelectValue placeholder="Select branch" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {allowedBranches.map((branch) => (
                                <SelectItem key={branch.id} value={branch.id}>
                                  {branch.name}
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
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-category">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {EXPENSE_CATEGORIES.map((cat) => (
                                <SelectItem key={cat} value={cat.toLowerCase()}>
                                  {cat}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {formCategory === "staff" && (
                      <FormField
                        control={form.control}
                        name="staffId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Staff Member</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger data-testid="select-staff">
                                  <SelectValue placeholder="Select staff member" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {branchStaff.map((staff) => (
                                  <SelectItem key={staff.id} value={staff.id}>
                                    <div className="flex items-center gap-2">
                                      <User className="h-4 w-4" />
                                      <span>{staff.fullName}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                                {branchStaff.length === 0 && (
                                  <div className="py-2 px-3 text-sm text-muted-foreground">
                                    No active staff found for this branch
                                  </div>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    {formCategory === "supplies" && (
                      <FormField
                        control={form.control}
                        name="supplierId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Supplier</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger data-testid="select-supplier">
                                  <SelectValue placeholder="Select supplier" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {allSuppliers.map((supplier) => (
                                  <SelectItem key={supplier.id} value={supplier.id}>
                                    <div className="flex flex-col">
                                      <span>{supplier.name}</span>
                                      {supplier.contactPerson && (
                                        <span className="text-xs text-muted-foreground">{supplier.contactPerson}</span>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                                {allSuppliers.length === 0 && (
                                  <div className="py-2 px-3 text-sm text-muted-foreground">
                                    No active suppliers found
                                  </div>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input placeholder="Electricity bill for January" {...field} data-testid="input-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount (PKR)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="5000"
                              {...field}
                              data-testid="input-amount"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              min={getMinExpenseDate()}
                              max={format(new Date(), "yyyy-MM-dd")}
                              {...field} 
                              data-testid="input-date" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="receiptUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Receipt/Attachment URL (Optional)</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Input
                                type="url"
                                placeholder="https://example.com/receipt.pdf"
                                {...field}
                                value={field.value || ""}
                                className="flex-1"
                                data-testid="input-receipt-url"
                              />
                              {field.value && (
                                <a 
                                  href={field.value} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="shrink-0"
                                >
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    title="View receipt"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                </a>
                              )}
                            </div>
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            Paste a URL to a receipt image or PDF
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-expense">
                        {(createMutation.isPending || updateMutation.isPending) 
                          ? "Saving..." 
                          : editingExpense 
                            ? "Update Expense" 
                            : "Save Expense"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">PKR {totalExpenses.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {filteredExpenses.length} transaction{filteredExpenses.length !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mb-6 flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-expenses"
                />
              </div>
            </div>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-[200px]" data-testid="filter-branch">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                {isAdmin && <SelectItem value="all">All Branches</SelectItem>}
                {allowedBranches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading expenses...
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No expenses found
              </div>
            ) : (
              filteredExpenses.map((expense) => {
                const staffName = getStaffName(expense.staffId);
                const supplierName = getSupplierName(expense.supplierId);
                
                return (
                  <Card key={expense.id} data-testid={`card-expense-${expense.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="font-semibold">{expense.description}</h3>
                            <span className="text-xs px-2 py-1 rounded-full bg-muted">
                              {expense.category}
                            </span>
                            {staffName && (
                              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {staffName}
                              </span>
                            )}
                            {supplierName && (
                              <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                {supplierName}
                              </span>
                            )}
                            {expense.receiptUrl && (
                              <a 
                                href={expense.receiptUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 flex items-center gap-1 hover:underline"
                                data-testid={`link-receipt-${expense.id}`}
                              >
                                <Paperclip className="h-3 w-3" />
                                Receipt
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{getBranchName(expense.branchId)}</span>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{format(new Date(expense.date), "MMM dd, yyyy")}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">
                              PKR {parseFloat(expense.amount).toLocaleString()}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(expense)}
                              data-testid={`button-edit-expense-${expense.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  data-testid={`button-delete-expense-${expense.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this expense? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMutation.mutate(expense.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
