import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, Tag, Calendar, Users, TrendingUp, Percent } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

const promoCodeFormSchema = z.object({
  code: z.string().min(3, "Code must be at least 3 characters").toUpperCase(),
  description: z.string().optional(),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.string().min(1, "Discount value is required"),
  minOrderAmount: z.string().optional(),
  maxDiscountAmount: z.string().optional(),
  usageLimit: z.string().optional(),
  perUserLimit: z.string().optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
  isActive: z.boolean().default(true),
  branchId: z.string().optional(),
});

type PromoCodeFormData = z.infer<typeof promoCodeFormSchema>;

interface PromoCode {
  id: string;
  code: string;
  description?: string;
  discountType: string;
  discountValue: string;
  minOrderAmount?: string;
  maxDiscountAmount?: string;
  usageLimit?: number;
  usageCount: number;
  perUserLimit?: number;
  validFrom: string;
  validUntil?: string;
  isActive: boolean;
  branchId?: string;
  createdBy?: string;
  createdAt: string;
}

interface Branch {
  id: string;
  name: string;
  city: string;
}

export default function AdminPromoCodes() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPromoCode, setEditingPromoCode] = useState<PromoCode | null>(null);

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const { data: promoCodes = [], isLoading } = useQuery<PromoCode[]>({
    queryKey: ["/api/promo-codes"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: PromoCodeFormData) => {
      return await apiRequest("/api/promo-codes", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/promo-codes"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Promo code created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create promo code",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PromoCodeFormData> }) => {
      return await apiRequest(`/api/promo-codes/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/promo-codes"] });
      setEditingPromoCode(null);
      toast({
        title: "Success",
        description: "Promo code updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update promo code",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/promo-codes/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/promo-codes"] });
      toast({
        title: "Success",
        description: "Promo code deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete promo code",
        variant: "destructive",
      });
    },
  });

  const form = useForm<PromoCodeFormData>({
    resolver: zodResolver(promoCodeFormSchema),
    defaultValues: {
      code: "",
      description: "",
      discountType: "percentage",
      discountValue: "",
      minOrderAmount: "0",
      maxDiscountAmount: "",
      usageLimit: "",
      perUserLimit: "",
      isActive: true,
      branchId: "",
    },
  });

  const openEditDialog = (promoCode: PromoCode) => {
    setEditingPromoCode(promoCode);
    form.reset({
      code: promoCode.code,
      description: promoCode.description || "",
      discountType: promoCode.discountType as "percentage" | "fixed",
      discountValue: promoCode.discountValue,
      minOrderAmount: promoCode.minOrderAmount || "0",
      maxDiscountAmount: promoCode.maxDiscountAmount || "",
      usageLimit: promoCode.usageLimit?.toString() || "",
      perUserLimit: promoCode.perUserLimit?.toString() || "",
      validFrom: promoCode.validFrom ? new Date(promoCode.validFrom).toISOString().slice(0, 16) : "",
      validUntil: promoCode.validUntil ? new Date(promoCode.validUntil).toISOString().slice(0, 16) : "",
      isActive: promoCode.isActive,
      branchId: promoCode.branchId || "",
    });
  };

  const onSubmit = (data: PromoCodeFormData) => {
    if (editingPromoCode) {
      updateMutation.mutate({ id: editingPromoCode.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this promo code?")) {
      deleteMutation.mutate(id);
    }
  };

  const getDiscountDisplay = (promoCode: PromoCode) => {
    if (promoCode.discountType === "percentage") {
      return `${promoCode.discountValue}% off`;
    }
    return `₨${promoCode.discountValue} off`;
  };

  const isExpired = (promoCode: PromoCode) => {
    if (!promoCode.validUntil) return false;
    return new Date(promoCode.validUntil) < new Date();
  };

  const isUsageLimitReached = (promoCode: PromoCode) => {
    if (!promoCode.usageLimit) return false;
    return promoCode.usageCount >= promoCode.usageLimit;
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Promo Codes</h1>
          <p className="text-muted-foreground">Manage promotional codes and discounts</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-promo-code">
              <Plus className="w-4 h-4 mr-2" />
              Add Promo Code
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Promo Code</DialogTitle>
              <DialogDescription>
                Create a new promotional code with discount settings and usage limits.
              </DialogDescription>
            </DialogHeader>
            <PromoCodeForm 
              form={form} 
              onSubmit={onSubmit} 
              branches={branches}
              isLoading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {promoCodes.map((promoCode) => (
          <Card key={promoCode.id} className={!promoCode.isActive || isExpired(promoCode) || isUsageLimitReached(promoCode) ? "opacity-60" : ""} data-testid={`card-promo-${promoCode.id}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg" data-testid={`text-promo-code-${promoCode.id}`}>{promoCode.code}</CardTitle>
                </div>
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditDialog(promoCode)}
                        data-testid={`button-edit-promo-${promoCode.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Edit Promo Code</DialogTitle>
                        <DialogDescription>
                          Update the promotional code settings below.
                        </DialogDescription>
                      </DialogHeader>
                      <PromoCodeForm 
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
                    onClick={() => handleDelete(promoCode.id)}
                    data-testid={`button-delete-promo-${promoCode.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {promoCode.description && (
                <p className="text-sm text-muted-foreground">{promoCode.description}</p>
              )}
              
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-primary">{getDiscountDisplay(promoCode)}</span>
              </div>

              {promoCode.minOrderAmount && parseFloat(promoCode.minOrderAmount) > 0 && (
                <div className="text-sm text-muted-foreground">
                  Min. order: ₨{promoCode.minOrderAmount}
                </div>
              )}

              {promoCode.validUntil && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className={isExpired(promoCode) ? "text-destructive" : "text-muted-foreground"}>
                    {isExpired(promoCode) ? "Expired" : `Valid until ${new Date(promoCode.validUntil).toLocaleDateString()}`}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {promoCode.usageCount} / {promoCode.usageLimit || "∞"} used
                </span>
                {isUsageLimitReached(promoCode) && (
                  <Badge variant="destructive">Limit Reached</Badge>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                {promoCode.isActive ? (
                  <Badge variant="default" className="bg-green-600">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
                {promoCode.discountType === "percentage" && (
                  <Badge variant="outline">Percentage</Badge>
                )}
                {promoCode.discountType === "fixed" && (
                  <Badge variant="outline">Fixed</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {promoCodes.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Tag className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No promo codes yet. Create your first one!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PromoCodeForm({ 
  form, 
  onSubmit, 
  branches,
  isLoading 
}: { 
  form: any; 
  onSubmit: (data: PromoCodeFormData) => void;
  branches: Branch[];
  isLoading: boolean;
}) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Promo Code</FormLabel>
              <FormControl>
                <Input {...field} placeholder="SAVE20" className="uppercase" data-testid="input-promo-code" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Save 20% on all orders" rows={2} data-testid="input-promo-description" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="discountType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Discount Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} data-testid="select-discount-type">
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="discountValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Discount Value</FormLabel>
                <FormControl>
                  <Input {...field} type="number" step="0.01" placeholder="20" data-testid="input-discount-value" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="minOrderAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Min. Order Amount (₨)</FormLabel>
                <FormControl>
                  <Input {...field} type="number" step="0.01" placeholder="0" data-testid="input-min-order" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="maxDiscountAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Discount (₨) - Optional</FormLabel>
                <FormControl>
                  <Input {...field} type="number" step="0.01" placeholder="No limit" data-testid="input-max-discount" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="usageLimit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Usage Limit</FormLabel>
                <FormControl>
                  <Input {...field} type="number" placeholder="Unlimited" data-testid="input-usage-limit" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="perUserLimit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Per User Limit</FormLabel>
                <FormControl>
                  <Input {...field} type="number" placeholder="Unlimited" data-testid="input-per-user-limit" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="validFrom"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valid From</FormLabel>
                <FormControl>
                  <Input {...field} type="datetime-local" data-testid="input-valid-from" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="validUntil"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valid Until (Optional)</FormLabel>
                <FormControl>
                  <Input {...field} type="datetime-local" data-testid="input-valid-until" />
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
              <FormLabel>Branch (Optional - Leave empty for all branches)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""} data-testid="select-branch">
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="All branches" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">All Branches</SelectItem>
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
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Active</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Enable this promo code for use
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="switch-is-active"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex gap-4 pt-4">
          <Button type="submit" className="flex-1" disabled={isLoading} data-testid="button-submit-promo">
            {isLoading ? "Saving..." : "Save Promo Code"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
