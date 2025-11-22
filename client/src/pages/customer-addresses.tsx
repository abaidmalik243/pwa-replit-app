import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import CustomerHeader from "@/components/CustomerHeader";
import Footer from "@/components/Footer";
import { MapPin, Plus, Star, Trash2, Edit, ChevronLeft } from "lucide-react";

const addressSchema = z.object({
  label: z.enum(["Home", "Work", "Other"]),
  addressLine1: z.string().min(5, "Address is too short"),
  addressLine2: z.string().optional(),
  city: z.string().min(2, "City is required"),
  postalCode: z.string().optional(),
});

type AddressFormData = z.infer<typeof addressSchema>;

interface Address {
  id: string;
  label: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  postalCode?: string | null;
  isDefault: boolean;
}

export default function CustomerAddresses() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  if (!isAuthenticated || user?.role !== "customer") {
    setLocation("/login");
    return null;
  }

  const { data: addresses = [], isLoading } = useQuery<Address[]>({
    queryKey: [`/api/customers/${user.id}/addresses`],
  });

  const form = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: "Home",
      addressLine1: "",
      addressLine2: "",
      city: "",
      postalCode: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: AddressFormData) =>
      apiRequest(`/api/customers/${user.id}/addresses`, "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${user.id}/addresses`] });
      toast({ title: "Success", description: "Address saved successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AddressFormData }) =>
      apiRequest(`/api/customers/${user.id}/addresses/${id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${user.id}/addresses`] });
      toast({ title: "Success", description: "Address updated successfully" });
      setIsDialogOpen(false);
      setEditingAddress(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/customers/${user.id}/addresses/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${user.id}/addresses`] });
      toast({ title: "Success", description: "Address deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/customers/${user.id}/addresses/${id}/set-default`, "PATCH"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${user.id}/addresses`] });
      toast({ title: "Success", description: "Default address updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenDialog = (address?: Address) => {
    if (address) {
      setEditingAddress(address);
      form.reset({
        label: address.label as "Home" | "Work" | "Other",
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2 || "",
        city: address.city,
        postalCode: address.postalCode || "",
      });
    } else {
      setEditingAddress(null);
      form.reset();
    }
    setIsDialogOpen(true);
  };

  const onSubmit = (data: AddressFormData) => {
    if (editingAddress) {
      updateMutation.mutate({ id: editingAddress.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <CustomerHeader />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/account")}
                data-testid="button-back"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold" data-testid="text-page-title">Saved Addresses</h1>
                <p className="text-muted-foreground" data-testid="text-address-count">
                  Manage your delivery addresses
                </p>
              </div>
            </div>
            <Button onClick={() => handleOpenDialog()} data-testid="button-add-address">
              <Plus className="h-4 w-4 mr-2" />
              Add Address
            </Button>
          </div>

          {/* Addresses List */}
          {isLoading ? (
            <p data-testid="text-loading">Loading addresses...</p>
          ) : addresses.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground" data-testid="text-empty-state">No addresses saved yet</p>
                <Button className="mt-4" onClick={() => handleOpenDialog()} data-testid="button-add-first-address">
                  Add Your First Address
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {addresses.map((address) => (
                <Card key={address.id} data-testid={`card-address-${address.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg" data-testid={`text-address-label-${address.id}`}>
                            {address.label}
                          </CardTitle>
                          {address.isDefault && (
                            <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full" data-testid={`badge-default-${address.id}`}>
                              <Star className="h-3 w-3 fill-current" />
                              Default
                            </span>
                          )}
                        </div>
                        <CardDescription className="mt-2" data-testid={`text-address-full-${address.id}`}>
                          {address.addressLine1}
                          {address.addressLine2 && `, ${address.addressLine2}`}
                          <br />
                          {address.city}
                          {address.postalCode && ` - ${address.postalCode}`}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {!address.isDefault && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDefaultMutation.mutate(address.id)}
                            title="Set as default"
                            data-testid={`button-set-default-${address.id}`}
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(address)}
                          data-testid={`button-edit-${address.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this address?")) {
                              deleteMutation.mutate(address.id);
                            }
                          }}
                          data-testid={`button-delete-${address.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent data-testid="dialog-address-form">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingAddress ? "Edit Address" : "Add New Address"}
            </DialogTitle>
            <DialogDescription>
              {editingAddress ? "Update your address details" : "Save a new delivery address"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-label">
                          <SelectValue placeholder="Select label" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Home">Home</SelectItem>
                        <SelectItem value="Work">Work</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="addressLine1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 1</FormLabel>
                    <FormControl>
                      <Input placeholder="Street address" {...field} data-testid="input-address-line1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="addressLine2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 2 (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Apartment, suite, etc." {...field} data-testid="input-address-line2" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="City" {...field} data-testid="input-city" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Code (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Postal code" {...field} data-testid="input-postal-code" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-address"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : "Save Address"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
