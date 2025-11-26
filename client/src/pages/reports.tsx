import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, DollarSign, ShoppingBag, TrendingUp, Users, Package, CreditCard, PieChart as PieChartIcon, Receipt, Download, FileSpreadsheet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { formatCurrency } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { useToast } from "@/hooks/use-toast";
import type { Branch } from "@shared/schema";

export default function Reports() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const { toast } = useToast();

  const user = (() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  })();
  const userBranchId = user.branchId;

  // Export data as CSV
  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map(row => headers.map(h => {
        const value = row[h];
        if (typeof value === "string" && value.includes(",")) {
          return `"${value}"`;
        }
        return value;
      }).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${startDate}_to_${endDate}.csv`;
    link.click();
    
    toast({ title: "Export successful", description: `${filename} exported as CSV` });
  };

  // Export full report
  const exportFullReport = () => {
    if (!reportsData) return;
    
    const reportData = {
      generatedAt: new Date().toISOString(),
      dateRange: { startDate, endDate },
      overview: reportsData.overview,
      salesByOrderType: reportsData.salesByOrderType,
      paymentMethodBreakdown: reportsData.paymentMethodBreakdown,
      expenseStats: reportsData.expenseStats,
      expenseCategoryBreakdown: reportsData.expenseCategoryBreakdown,
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `full_report_${startDate}_to_${endDate}.json`;
    link.click();
    
    toast({ title: "Export successful", description: "Full report exported as JSON" });
  };

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const { data: reportsData, isLoading } = useQuery({
    queryKey: ["/api/reports", selectedBranchId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate,
        endDate,
        ...(selectedBranchId !== "all" && { branchId: selectedBranchId }),
      });
      const res = await fetch(`/api/reports?${params}`);
      if (!res.ok) throw new Error("Failed to fetch reports");
      return res.json();
    },
  });

  const COLORS = ['#dc2626', '#ea580c', '#d97706', '#ca8a04', '#65a30d'];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className={`fixed md:static inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <AdminSidebar />
      </div>
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <AdminHeader
          breadcrumbs={["Admin", "Reports & Analytics"]}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Date Range Filter */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Report Filters
                </CardTitle>
                <CardDescription>Select date range and branch</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      data-testid="input-start-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      data-testid="input-end-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branch">Branch</Label>
                    <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                      <SelectTrigger id="branch" data-testid="select-branch">
                        <SelectValue />
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
                </div>
              </CardContent>
            </Card>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Loading reports...</p>
              </div>
            ) : !reportsData ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">No data available</p>
              </div>
            ) : (
              <Tabs defaultValue="overview" className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <TabsList className="grid w-full md:w-auto grid-cols-3 md:grid-cols-6">
                    <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
                    <TabsTrigger value="sales" data-testid="tab-sales">Sales</TabsTrigger>
                    <TabsTrigger value="products" data-testid="tab-products">Products</TabsTrigger>
                    <TabsTrigger value="payments" data-testid="tab-payments">Payments</TabsTrigger>
                    <TabsTrigger value="expenses" data-testid="tab-expenses">Expenses</TabsTrigger>
                    <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
                  </TabsList>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" data-testid="button-export">
                        <Download className="h-4 w-4 mr-2" />
                        Export Data
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => exportToCSV(reportsData.dailySales, "daily_sales")} data-testid="export-sales-csv">
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Sales Data (CSV)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportToCSV(reportsData.topSellingProducts, "top_products")} data-testid="export-products-csv">
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Products Data (CSV)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportToCSV(reportsData.expenseCategoryBreakdown, "expenses")} data-testid="export-expenses-csv">
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Expenses Data (CSV)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportToCSV(reportsData.paymentMethodBreakdown, "payments")} data-testid="export-payments-csv">
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Payments Data (CSV)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={exportFullReport} data-testid="export-full-report">
                        <Download className="h-4 w-4 mr-2" />
                        Full Report (JSON)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold" data-testid="text-total-revenue">
                          {formatCurrency(reportsData.overview.totalRevenue)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          After {formatCurrency(reportsData.overview.totalDiscounts)} discounts
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold" data-testid="text-total-orders">
                          {reportsData.overview.totalOrders}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {reportsData.overview.completedOrders} completed
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold" data-testid="text-avg-order-value">
                          {formatCurrency(reportsData.overview.averageOrderValue)}
                        </div>
                        <p className="text-xs text-muted-foreground">Per order</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Delivery Charges</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold" data-testid="text-delivery-charges">
                          {formatCurrency(reportsData.overview.totalDeliveryCharges)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {reportsData.overview.deliveryOrders} delivery orders
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Order Status Distribution */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Order Status Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={reportsData.orderStatusDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value }) => `${name}: ${value}`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {reportsData.orderStatusDistribution.map((_: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Sales Tab */}
                <TabsContent value="sales" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Sales by Order Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={reportsData.salesByOrderType}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="type" />
                          <YAxis />
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Legend />
                          <Bar dataKey="revenue" fill="#dc2626" name="Revenue" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Dine-in Orders</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {reportsData.orderTypeCounts.dinein || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(reportsData.salesByOrderType.find((s: any) => s.type === 'dine-in')?.revenue || 0)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Takeaway Orders</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {reportsData.orderTypeCounts.takeaway || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(reportsData.salesByOrderType.find((s: any) => s.type === 'takeaway')?.revenue || 0)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Delivery Orders</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {reportsData.orderTypeCounts.delivery || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(reportsData.salesByOrderType.find((s: any) => s.type === 'delivery')?.revenue || 0)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Products Tab */}
                <TabsContent value="products" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Selling Products</CardTitle>
                      <CardDescription>Products ranked by quantity sold</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={reportsData.topSellingProducts} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={150} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="quantity" fill="#dc2626" name="Quantity Sold" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Sales by Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={reportsData.salesByCategory}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, revenue }) => `${name}: ${formatCurrency(revenue)}`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="revenue"
                          >
                            {reportsData.salesByCategory.map((_: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Payments Tab */}
                <TabsContent value="payments" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Payment Method Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={reportsData.paymentMethodBreakdown}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="method" />
                          <YAxis />
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Legend />
                          <Bar dataKey="amount" fill="#dc2626" name="Amount" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {reportsData.paymentMethodBreakdown.map((payment: any) => (
                      <Card key={payment.method}>
                        <CardHeader>
                          <CardTitle className="text-sm flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            {payment.method.toUpperCase()}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {formatCurrency(payment.amount)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {payment.count} transactions
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* Expenses Tab */}
                <TabsContent value="expenses" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                        <Receipt className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold" data-testid="text-total-expenses">
                          {formatCurrency(reportsData.expenseStats?.totalExpenses || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {reportsData.expenseStats?.expenseCount || 0} transactions
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Average Expense</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold" data-testid="text-avg-expense">
                          {formatCurrency(reportsData.expenseStats?.averageExpense || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">Per transaction</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Highest Expense</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold" data-testid="text-highest-expense">
                          {formatCurrency(reportsData.expenseStats?.highestExpense || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">Single transaction</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold" data-testid="text-net-revenue">
                          {formatCurrency(reportsData.overview.netRevenue)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Revenue - Expenses
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Expense Breakdown by Category</CardTitle>
                      <CardDescription>Distribution of expenses across categories</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={reportsData.expenseCategoryBreakdown || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="category" />
                          <YAxis />
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Legend />
                          <Bar dataKey="amount" fill="#dc2626" name="Amount" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Daily Expense Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={reportsData.dailyExpenses || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Legend />
                          <Line type="monotone" dataKey="amount" stroke="#ea580c" strokeWidth={2} name="Expenses" />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(reportsData.expenseCategoryBreakdown || []).map((cat: any) => (
                      <Card key={cat.category}>
                        <CardHeader>
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Receipt className="h-4 w-4" />
                            {cat.category}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {formatCurrency(cat.amount)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {cat.count} transactions
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* Performance Tab */}
                <TabsContent value="performance" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Daily Sales Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={reportsData.dailySales}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Legend />
                          <Line type="monotone" dataKey="revenue" stroke="#dc2626" strokeWidth={2} name="Revenue" />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {selectedBranchId !== "all" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Branch Performance</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Revenue:</span>
                            <span className="font-semibold">{formatCurrency(reportsData.overview.totalRevenue)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Orders:</span>
                            <span className="font-semibold">{reportsData.overview.totalOrders}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Avg Order Value:</span>
                            <span className="font-semibold">{formatCurrency(reportsData.overview.averageOrderValue)}</span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Order Sources</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Online Orders:</span>
                            <span className="font-semibold">{reportsData.orderSourceCounts.online || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">POS Orders:</span>
                            <span className="font-semibold">{reportsData.orderSourceCounts.pos || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Phone Orders:</span>
                            <span className="font-semibold">{reportsData.orderSourceCounts.phone || 0}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
