import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import AdminLayout from "@/components/AdminLayout";
import { DollarSign, RefreshCcw, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const refundSchema = z.object({
  orderId: z.string().min(1, "Order is required"),
  amount: z.string().min(1, "Amount is required"),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
  paymentMethod: z.enum(["Cash", "Card", "JazzCash"]),
});

type RefundFormData = z.infer<typeof refundSchema>;

interface Refund {
  id: string;
  orderId: string;
  amount: number;
  reason: string;
  paymentMethod: string;
  status: string;
  createdAt: string;
  order?: {
    orderNumber: string;
    totalAmount: number;
  };
}

interface Order {
  id: string;
  orderNumber: string;
  totalAmount: number;
  paymentMethod: string;
  status: string;
}

export default function AdminRefunds() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: refunds = [], isLoading } = useQuery<Refund[]>({
    queryKey: ["/api/refunds"],
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  // Filter orders that can be refunded (completed or cancelled)
  const refundableOrders = orders.filter(
    (order) => order.status === "completed" || order.status === "cancelled"
  );

  const form = useForm<RefundFormData>({
    resolver: zodResolver(refundSchema),
    defaultValues: {
      orderId: "",
      amount: "",
      reason: "",
      paymentMethod: "Cash",
    },
  });

  const createRefundMutation = useMutation({
    mutationFn: (data: { amount: number; reason: string }) => {
      const orderId = form.getValues("orderId");
      return apiRequest(`/api/orders/${orderId}/refund`, "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/refunds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Success", description: "Refund processed successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: RefundFormData) => {
    createRefundMutation.mutate({
      amount: parseFloat(data.amount),
      reason: data.reason,
    });
  };

  // Auto-fill payment method and total when order selected
  const handleOrderChange = (orderId: string) => {
    const selectedOrder = orders.find((o) => o.id === orderId);
    if (selectedOrder) {
      form.setValue("paymentMethod", selectedOrder.paymentMethod as "Cash" | "Card" | "JazzCash");
      form.setValue("amount", selectedOrder.totalAmount.toString());
    }
  };

  const totalRefunded = refunds.reduce((sum, refund) => sum + refund.amount, 0);

  return (
    <AdminLayout title="Refunds Management">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Refunds</CardTitle>
              <RefreshCcw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-refunds">{refunds.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Amount Refunded</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-refunded">
                ₨{totalRefunded.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Refunds</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600" data-testid="text-pending-refunds">
                {refunds.filter((r) => r.status === "pending").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold" data-testid="text-refunds-title">Refunds</h2>
            <p className="text-muted-foreground">Process and manage order refunds</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} data-testid="button-process-refund">
            <RefreshCcw className="h-4 w-4 mr-2" />
            Process Refund
          </Button>
        </div>

        {/* Refunds List */}
        {isLoading ? (
          <p data-testid="text-loading">Loading refunds...</p>
        ) : refunds.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <RefreshCcw className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground" data-testid="text-empty-state">No refunds processed yet</p>
              <Button className="mt-4" onClick={() => setIsDialogOpen(true)} data-testid="button-process-first-refund">
                Process First Refund
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {refunds.map((refund) => (
              <Card key={refund.id} data-testid={`card-refund-${refund.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg" data-testid={`text-order-number-${refund.id}`}>
                          Order #{refund.order?.orderNumber || "Unknown"}
                        </CardTitle>
                        <Badge variant="outline" data-testid={`badge-status-${refund.id}`}>
                          {refund.status}
                        </Badge>
                        <Badge variant="outline" data-testid={`badge-payment-method-${refund.id}`}>
                          {refund.paymentMethod}
                        </Badge>
                      </div>
                      <CardDescription className="mt-1" data-testid={`text-date-${refund.id}`}>
                        {format(new Date(refund.createdAt), "PPp")}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Refund Amount</p>
                      <p className="text-xl font-bold text-red-600" data-testid={`text-amount-${refund.id}`}>
                        ₨{refund.amount.toFixed(2)}
                      </p>
                      {refund.order && (
                        <p className="text-xs text-muted-foreground" data-testid={`text-original-amount-${refund.id}`}>
                          Original: ₨{refund.order.totalAmount.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div>
                    <p className="text-sm font-medium">Reason:</p>
                    <p className="text-sm text-muted-foreground mt-1" data-testid={`text-reason-${refund.id}`}>
                      {refund.reason}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Process Refund Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent data-testid="dialog-refund-form">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">Process Refund</DialogTitle>
            <DialogDescription>
              Select an order and enter refund details
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="orderId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Order</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        handleOrderChange(value);
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-order">
                          <SelectValue placeholder="Select an order" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {refundableOrders.map((order) => (
                          <SelectItem key={order.id} value={order.id}>
                            #{order.orderNumber} - ₨{order.totalAmount.toFixed(2)} ({order.paymentMethod})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Refund Amount</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-amount" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled>
                        <FormControl>
                          <SelectTrigger data-testid="select-payment-method">
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="Card">Card</SelectItem>
                          <SelectItem value="JazzCash">JazzCash</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Refund Reason</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Explain why this refund is being processed..." 
                        className="min-h-[100px]"
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
                  disabled={createRefundMutation.isPending}
                  data-testid="button-process"
                >
                  {createRefundMutation.isPending ? "Processing..." : "Process Refund"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
