import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import {
  Users, Search, Crown, Award, Star, TrendingUp, ShoppingBag, MapPin, Heart, 
  CreditCard, Phone, Mail, Calendar, Package, DollarSign, ArrowUpDown, 
  Eye, Plus, Minus, ChevronRight, UserCheck, Activity, Coins
} from "lucide-react";

interface CustomerWithData {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phone: string | null;
  language: string | null;
  currency: string | null;
  isActive: boolean;
  createdAt: string;
  addressCount: number;
  orderCount: number;
  totalSpent: number;
  loyaltyPoints: number;
  loyaltyTier: string;
  lifetimePoints: number;
  favoriteCount: number;
  lastOrderDate: string | null;
}

interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  totalLoyaltyPoints: number;
  tierDistribution: {
    bronze: number;
    silver: number;
    gold: number;
    platinum: number;
  };
}

interface CustomerDetails {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phone: string | null;
  language: string | null;
  currency: string | null;
  isActive: boolean;
  createdAt: string;
  addresses: Array<{
    id: string;
    label: string;
    fullAddress: string;
    city: string;
    isDefault: boolean;
  }>;
  orders: Array<{
    id: string;
    orderNumber: string;
    total: string;
    status: string;
    createdAt: string;
  }>;
  loyalty: {
    availablePoints: number;
    lifetimeEarned: number;
    lifetimeRedeemed: number;
    tier: string;
  };
  loyaltyTransactions: Array<{
    id: string;
    transactionType: string;
    points: number;
    description: string;
    createdAt: string;
  }>;
  favorites: Array<{
    id: string;
    menuItem: {
      id: string;
      name: string;
      price: string;
      imageUrl: string | null;
    };
  }>;
  stats: {
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    totalSpent: number;
    averageOrderValue: number;
  };
}

const TIER_COLORS: Record<string, string> = {
  bronze: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  silver: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  gold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  platinum: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

const TIER_ICONS: Record<string, typeof Crown> = {
  bronze: Award,
  silver: Star,
  gold: Crown,
  platinum: Crown,
};

function formatCurrency(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function AdminCustomers() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [adjustPointsOpen, setAdjustPointsOpen] = useState(false);
  const [pointsAdjustment, setPointsAdjustment] = useState({ points: 0, reason: "" });
  const { toast } = useToast();

  const { data: customers = [], isLoading: customersLoading } = useQuery<CustomerWithData[]>({
    queryKey: ["/api/admin/customers", searchQuery, tierFilter, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (tierFilter !== "all") params.append("tier", tierFilter);
      params.append("sortBy", sortBy);
      params.append("sortOrder", sortOrder);
      const res = await fetch(`/api/admin/customers?${params}`);
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
  });

  const { data: stats } = useQuery<CustomerStats>({
    queryKey: ["/api/admin/customers/stats/overview"],
  });

  const { data: customerDetails, isLoading: detailsLoading } = useQuery<CustomerDetails>({
    queryKey: ["/api/admin/customers", selectedCustomer],
    queryFn: async () => {
      const res = await fetch(`/api/admin/customers/${selectedCustomer}`);
      if (!res.ok) throw new Error("Failed to fetch customer details");
      return res.json();
    },
    enabled: !!selectedCustomer,
  });

  const adjustPointsMutation = useMutation({
    mutationFn: async ({ customerId, points, reason }: { customerId: string; points: number; reason: string }) => {
      const res = await apiRequest("POST", `/api/admin/customers/${customerId}/loyalty/adjust`, { points, reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers", selectedCustomer] });
      toast({ title: "Points adjusted", description: "Customer loyalty points have been updated" });
      setAdjustPointsOpen(false);
      setPointsAdjustment({ points: 0, reason: "" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex h-screen bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <AdminSidebar onNavigate={() => setSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader
          breadcrumbs={["Admin", "Saved Customers"]}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Stats Overview */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Total</span>
                    </div>
                    <p className="text-2xl font-bold mt-1" data-testid="text-total-customers">
                      {stats.totalCustomers}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-muted-foreground">Active</span>
                    </div>
                    <p className="text-2xl font-bold mt-1" data-testid="text-active-customers">
                      {stats.activeCustomers}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-muted-foreground">Orders</span>
                    </div>
                    <p className="text-2xl font-bold mt-1" data-testid="text-total-orders">
                      {stats.totalOrders}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-muted-foreground">Revenue</span>
                    </div>
                    <p className="text-lg font-bold mt-1" data-testid="text-total-revenue">
                      {formatCurrency(stats.totalRevenue)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-orange-50 dark:bg-orange-950">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-orange-600" />
                      <span className="text-sm text-orange-700 dark:text-orange-300">Bronze</span>
                    </div>
                    <p className="text-2xl font-bold mt-1 text-orange-800 dark:text-orange-200">
                      {stats.tierDistribution.bronze}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-gray-50 dark:bg-gray-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-gray-600" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Silver</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">
                      {stats.tierDistribution.silver}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-yellow-50 dark:bg-yellow-950">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-700 dark:text-yellow-300">Gold+</span>
                    </div>
                    <p className="text-2xl font-bold mt-1 text-yellow-800 dark:text-yellow-200">
                      {stats.tierDistribution.gold + stats.tierDistribution.platinum}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Search and Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-customers"
                    />
                  </div>
                  <Select value={tierFilter} onValueChange={setTierFilter}>
                    <SelectTrigger className="w-full md:w-40" data-testid="select-tier-filter">
                      <SelectValue placeholder="All Tiers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tiers</SelectItem>
                      <SelectItem value="bronze">Bronze</SelectItem>
                      <SelectItem value="silver">Silver</SelectItem>
                      <SelectItem value="gold">Gold</SelectItem>
                      <SelectItem value="platinum">Platinum</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button
                      variant={sortBy === "name" ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleSort("name")}
                      data-testid="button-sort-name"
                    >
                      Name
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                    <Button
                      variant={sortBy === "spent" ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleSort("spent")}
                      data-testid="button-sort-spent"
                    >
                      Spent
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                    <Button
                      variant={sortBy === "orders" ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleSort("orders")}
                      data-testid="button-sort-orders"
                    >
                      Orders
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Saved Customers
                </CardTitle>
                <CardDescription>
                  {customers.length} customer{customers.length !== 1 ? "s" : ""} found
                </CardDescription>
              </CardHeader>
              <CardContent>
                {customersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-muted-foreground">Loading customers...</p>
                  </div>
                ) : customers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No customers found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customers.map((customer) => {
                      const TierIcon = TIER_ICONS[customer.loyaltyTier] || Award;
                      return (
                        <div
                          key={customer.id}
                          className="flex items-center gap-4 p-4 rounded-lg border hover-elevate cursor-pointer"
                          onClick={() => setSelectedCustomer(customer.id)}
                          data-testid={`customer-row-${customer.id}`}
                        >
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {getInitials(customer.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium truncate">{customer.fullName}</span>
                              <Badge className={TIER_COLORS[customer.loyaltyTier]} variant="secondary">
                                <TierIcon className="h-3 w-3 mr-1" />
                                {customer.loyaltyTier}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {customer.email}
                              </span>
                              {customer.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {customer.phone}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="hidden md:flex items-center gap-6 text-sm">
                            <div className="text-center">
                              <p className="font-semibold">{customer.orderCount}</p>
                              <p className="text-muted-foreground">Orders</p>
                            </div>
                            <div className="text-center">
                              <p className="font-semibold">{formatCurrency(customer.totalSpent)}</p>
                              <p className="text-muted-foreground">Spent</p>
                            </div>
                            <div className="text-center">
                              <p className="font-semibold">{customer.loyaltyPoints}</p>
                              <p className="text-muted-foreground">Points</p>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Customer Detail Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {detailsLoading ? (
            <DialogHeader>
              <DialogTitle>Loading...</DialogTitle>
              <DialogDescription>
                Loading customer details...
              </DialogDescription>
            </DialogHeader>
          ) : customerDetails ? (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-primary/10 text-primary text-xl">
                      {getInitials(customerDetails.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-xl flex items-center gap-2">
                      {customerDetails.fullName}
                      <Badge className={TIER_COLORS[customerDetails.loyalty.tier]} variant="secondary">
                        {customerDetails.loyalty.tier}
                      </Badge>
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-4 mt-1">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {customerDetails.email}
                      </span>
                      {customerDetails.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {customerDetails.phone}
                        </span>
                      )}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <Tabs defaultValue="overview" className="flex-1 overflow-hidden flex flex-col">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="overview" data-testid="tab-customer-overview">Overview</TabsTrigger>
                  <TabsTrigger value="orders" data-testid="tab-customer-orders">Orders</TabsTrigger>
                  <TabsTrigger value="addresses" data-testid="tab-customer-addresses">Addresses</TabsTrigger>
                  <TabsTrigger value="loyalty" data-testid="tab-customer-loyalty">Loyalty</TabsTrigger>
                  <TabsTrigger value="favorites" data-testid="tab-customer-favorites">Favorites</TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1 mt-4">
                  <TabsContent value="overview" className="mt-0 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4 text-center">
                          <ShoppingBag className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                          <p className="text-2xl font-bold">{customerDetails.stats.totalOrders}</p>
                          <p className="text-sm text-muted-foreground">Total Orders</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <DollarSign className="h-8 w-8 mx-auto text-green-600 mb-2" />
                          <p className="text-2xl font-bold">{formatCurrency(customerDetails.stats.totalSpent)}</p>
                          <p className="text-sm text-muted-foreground">Total Spent</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <Coins className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
                          <p className="text-2xl font-bold">{customerDetails.loyalty.availablePoints}</p>
                          <p className="text-sm text-muted-foreground">Available Points</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <Activity className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                          <p className="text-2xl font-bold">{formatCurrency(customerDetails.stats.averageOrderValue)}</p>
                          <p className="text-sm text-muted-foreground">Avg Order</p>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Customer Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <Label className="text-muted-foreground">Username</Label>
                            <p>{customerDetails.username}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Member Since</Label>
                            <p>{format(new Date(customerDetails.createdAt), "PPP")}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Language</Label>
                            <p>{customerDetails.language === "ur" ? "Urdu" : customerDetails.language === "ar" ? "Arabic" : "English"}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Currency</Label>
                            <p>{customerDetails.currency || "PKR"}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="orders" className="mt-0 space-y-4">
                    {customerDetails.orders.length === 0 ? (
                      <div className="text-center py-8">
                        <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No orders yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {customerDetails.orders.slice(0, 10).map((order) => (
                          <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border">
                            <div>
                              <p className="font-medium">{order.orderNumber}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(order.createdAt), "PPP")}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge variant={
                                order.status === "completed" || order.status === "delivered" ? "default" :
                                order.status === "cancelled" ? "destructive" : "secondary"
                              }>
                                {order.status}
                              </Badge>
                              <span className="font-semibold">{formatCurrency(parseFloat(order.total))}</span>
                            </div>
                          </div>
                        ))}
                        {customerDetails.orders.length > 10 && (
                          <p className="text-center text-sm text-muted-foreground pt-2">
                            Showing 10 of {customerDetails.orders.length} orders
                          </p>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="addresses" className="mt-0 space-y-4">
                    {customerDetails.addresses.length === 0 ? (
                      <div className="text-center py-8">
                        <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No saved addresses</p>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {customerDetails.addresses.map((address) => (
                          <Card key={address.id}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-primary" />
                                    <span className="font-medium">{address.label}</span>
                                    {address.isDefault && (
                                      <Badge variant="secondary" className="text-xs">Default</Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">{address.fullAddress}</p>
                                  <p className="text-sm text-muted-foreground">{address.city}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="loyalty" className="mt-0 space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4 text-center">
                          <p className="text-3xl font-bold text-primary">{customerDetails.loyalty.availablePoints}</p>
                          <p className="text-sm text-muted-foreground">Available</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <p className="text-3xl font-bold text-green-600">{customerDetails.loyalty.lifetimeEarned}</p>
                          <p className="text-sm text-muted-foreground">Earned</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <p className="text-3xl font-bold text-orange-600">{customerDetails.loyalty.lifetimeRedeemed}</p>
                          <p className="text-sm text-muted-foreground">Redeemed</p>
                        </CardContent>
                      </Card>
                    </div>

                    <Button onClick={() => setAdjustPointsOpen(true)} className="w-full" data-testid="button-adjust-points">
                      <Plus className="h-4 w-4 mr-2" />
                      Adjust Points
                    </Button>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-3">Recent Transactions</h4>
                      {customerDetails.loyaltyTransactions.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">No transactions yet</p>
                      ) : (
                        <div className="space-y-2">
                          {customerDetails.loyaltyTransactions.slice(0, 10).map((tx) => (
                            <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border">
                              <div>
                                <p className="text-sm">{tx.description}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(tx.createdAt), "PPP")}
                                </p>
                              </div>
                              <span className={`font-semibold ${tx.points > 0 ? "text-green-600" : "text-red-600"}`}>
                                {tx.points > 0 ? "+" : ""}{tx.points}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="favorites" className="mt-0 space-y-4">
                    {customerDetails.favorites.length === 0 ? (
                      <div className="text-center py-8">
                        <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No favorite items</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {customerDetails.favorites.map((fav) => (
                          <Card key={fav.id}>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                {fav.menuItem.imageUrl ? (
                                  <img
                                    src={fav.menuItem.imageUrl}
                                    alt={fav.menuItem.name}
                                    className="h-12 w-12 rounded-lg object-cover"
                                  />
                                ) : (
                                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                                    <Package className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium text-sm">{fav.menuItem.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {formatCurrency(parseFloat(fav.menuItem.price))}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Adjust Points Dialog */}
      <Dialog open={adjustPointsOpen} onOpenChange={setAdjustPointsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Loyalty Points</DialogTitle>
            <DialogDescription>
              Add or remove points from customer's balance
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="points">Points Adjustment</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setPointsAdjustment(prev => ({ ...prev, points: prev.points - 10 }))}
                  data-testid="button-decrease-points"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="points"
                  type="number"
                  value={pointsAdjustment.points}
                  onChange={(e) => setPointsAdjustment(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
                  className="text-center"
                  data-testid="input-points-adjustment"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setPointsAdjustment(prev => ({ ...prev, points: prev.points + 10 }))}
                  data-testid="button-increase-points"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use negative values to deduct points
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                value={pointsAdjustment.reason}
                onChange={(e) => setPointsAdjustment(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Describe why you're adjusting points..."
                data-testid="input-adjustment-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustPointsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedCustomer && pointsAdjustment.reason) {
                  adjustPointsMutation.mutate({
                    customerId: selectedCustomer,
                    points: pointsAdjustment.points,
                    reason: pointsAdjustment.reason,
                  });
                }
              }}
              disabled={!pointsAdjustment.reason || pointsAdjustment.points === 0 || adjustPointsMutation.isPending}
              data-testid="button-confirm-adjustment"
            >
              {adjustPointsMutation.isPending ? "Saving..." : "Confirm Adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
