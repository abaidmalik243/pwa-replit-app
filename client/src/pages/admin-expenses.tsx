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
import { Plus, Search, Calendar, DollarSign, User } from "lucide-react";
import type { Expense, Branch, User as UserType } from "@shared/schema";
import { format, subDays } from "date-fns";

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
  description: z.string().min(2, "Description is required"),
  amount: z.string().min(1, "Amount is required").refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Amount must be a positive number",
  }),
  date: z.string().min(1, "Date is required"),
}).refine((data) => {
  if (data.category === "staff" && !data.staffId) {
    return false;
  }
  return true;
}, {
  message: "Staff member is required when category is Staff",
  path: ["staffId"],
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const isAdmin = user?.role === "admin";
  const userBranchId = user?.branchId;

  const { data: allBranches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

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
      description: "",
      amount: "",
      date: format(new Date(), "yyyy-MM-dd"),
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

  // Reset form when dialog opens
  useEffect(() => {
    if (isAddDialogOpen) {
      form.reset({
        branchId: !isAdmin && userBranchId ? userBranchId : "",
        category: "",
        staffId: "",
        description: "",
        amount: "",
        date: format(new Date(), "yyyy-MM-dd"),
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
        description: data.description,
        amount: data.amount,
        date: dateValue,
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

  const onSubmit = (data: ExpenseForm) => {
    // Double-check staff validation before submission
    if (data.category === "staff" && !data.staffId) {
      form.setError("staffId", { 
        type: "manual", 
        message: "Staff member is required when category is Staff" 
      });
      return;
    }
    createMutation.mutate(data);
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

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  data-testid="button-add-expense"
                  disabled={!canAddExpense}
                  title={!canAddExpense ? "You need a branch assignment to add expenses" : undefined}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Expense</DialogTitle>
                  <DialogDescription>
                    Record a daily expense for one of your branches
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
                    <DialogFooter>
                      <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-expense">
                        {createMutation.isPending ? "Saving..." : "Save Expense"}
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
              filteredExpenses.map((expense) => (
                <Card key={expense.id} data-testid={`card-expense-${expense.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{expense.description}</h3>
                          <span className="text-xs px-2 py-1 rounded-full bg-muted">
                            {expense.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{getBranchName(expense.branchId)}</span>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{format(new Date(expense.date), "MMM dd, yyyy")}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          PKR {parseFloat(expense.amount).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
