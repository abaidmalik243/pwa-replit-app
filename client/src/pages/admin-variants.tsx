import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { useAuth } from "@/context/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, Layers, ChevronRight, Check } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const variantGroupFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  displayOrder: z.number().int().min(0).default(0),
  selectionType: z.enum(["single", "multiple"]).default("single"),
  isRequired: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

type VariantGroupFormData = z.infer<typeof variantGroupFormSchema>;

const variantOptionFormSchema = z.object({
  variantGroupId: z.string().min(1, "Variant group is required"),
  name: z.string().min(1, "Name is required"),
  shortName: z.string().optional(),
  priceModifier: z.string().default("0"),
  displayOrder: z.number().int().min(0).default(0),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

type VariantOptionFormData = z.infer<typeof variantOptionFormSchema>;

interface VariantGroup {
  id: string;
  name: string;
  description?: string;
  displayOrder: number;
  selectionType: string;
  isRequired: boolean;
  isActive: boolean;
  createdAt: string;
}

interface VariantOption {
  id: string;
  variantGroupId: string;
  name: string;
  shortName?: string;
  priceModifier: string;
  displayOrder: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

export default function AdminVariants() {
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { logout } = useAuth();
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isOptionDialogOpen, setIsOptionDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<VariantGroup | null>(null);
  const [editingOption, setEditingOption] = useState<VariantOption | null>(null);
  const [selectedGroupForOption, setSelectedGroupForOption] = useState<string | null>(null);

  const { data: variantGroups = [], isLoading: loadingGroups } = useQuery<VariantGroup[]>({
    queryKey: ["/api/variant-groups"],
  });

  const { data: variantOptions = [], isLoading: loadingOptions } = useQuery<VariantOption[]>({
    queryKey: ["/api/variant-options"],
  });

  const groupForm = useForm<VariantGroupFormData>({
    resolver: zodResolver(variantGroupFormSchema),
    defaultValues: {
      name: "",
      description: "",
      displayOrder: 0,
      selectionType: "single",
      isRequired: true,
      isActive: true,
    },
  });

  const optionForm = useForm<VariantOptionFormData>({
    resolver: zodResolver(variantOptionFormSchema),
    defaultValues: {
      variantGroupId: "",
      name: "",
      shortName: "",
      priceModifier: "0",
      displayOrder: 0,
      isDefault: false,
      isActive: true,
    },
  });

  // Group Mutations
  const createGroupMutation = useMutation({
    mutationFn: async (data: VariantGroupFormData) => {
      return await apiRequest("/api/variant-groups", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/variant-groups"] });
      setIsGroupDialogOpen(false);
      groupForm.reset();
      toast({
        title: "Success",
        description: "Variant group created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create variant group",
        variant: "destructive",
      });
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<VariantGroupFormData> }) => {
      return await apiRequest(`/api/variant-groups/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/variant-groups"] });
      setEditingGroup(null);
      toast({
        title: "Success",
        description: "Variant group updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update variant group",
        variant: "destructive",
      });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/variant-groups/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/variant-groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/variant-options"] });
      toast({
        title: "Success",
        description: "Variant group deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete variant group",
        variant: "destructive",
      });
    },
  });

  // Option Mutations
  const createOptionMutation = useMutation({
    mutationFn: async (data: VariantOptionFormData) => {
      return await apiRequest("/api/variant-options", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/variant-options"] });
      setIsOptionDialogOpen(false);
      optionForm.reset();
      toast({
        title: "Success",
        description: "Variant option created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create variant option",
        variant: "destructive",
      });
    },
  });

  const updateOptionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<VariantOptionFormData> }) => {
      return await apiRequest(`/api/variant-options/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/variant-options"] });
      setEditingOption(null);
      toast({
        title: "Success",
        description: "Variant option updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update variant option",
        variant: "destructive",
      });
    },
  });

  const deleteOptionMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/variant-options/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/variant-options"] });
      toast({
        title: "Success",
        description: "Variant option deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete variant option",
        variant: "destructive",
      });
    },
  });

  const handleGroupSubmit = (data: VariantGroupFormData) => {
    if (editingGroup) {
      updateGroupMutation.mutate({ id: editingGroup.id, data });
    } else {
      createGroupMutation.mutate(data);
    }
  };

  const handleOptionSubmit = (data: VariantOptionFormData) => {
    if (editingOption) {
      updateOptionMutation.mutate({ id: editingOption.id, data });
    } else {
      createOptionMutation.mutate(data);
    }
  };

  const openEditGroup = (group: VariantGroup) => {
    setEditingGroup(group);
    groupForm.reset({
      name: group.name,
      description: group.description || "",
      displayOrder: group.displayOrder,
      selectionType: group.selectionType as "single" | "multiple",
      isRequired: group.isRequired,
      isActive: group.isActive,
    });
    setIsGroupDialogOpen(true);
  };

  const openEditOption = (option: VariantOption) => {
    setEditingOption(option);
    optionForm.reset({
      variantGroupId: option.variantGroupId,
      name: option.name,
      shortName: option.shortName || "",
      priceModifier: option.priceModifier,
      displayOrder: option.displayOrder,
      isDefault: option.isDefault,
      isActive: option.isActive,
    });
    setIsOptionDialogOpen(true);
  };

  const openCreateOption = (groupId: string) => {
    setSelectedGroupForOption(groupId);
    optionForm.reset({
      variantGroupId: groupId,
      name: "",
      shortName: "",
      priceModifier: "0",
      displayOrder: 0,
      isDefault: false,
      isActive: true,
    });
    setIsOptionDialogOpen(true);
  };

  const getOptionsForGroup = (groupId: string) => {
    return variantOptions.filter(opt => opt.variantGroupId === groupId);
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
          breadcrumbs={["Admin", "Variants"]}
          notificationCount={0}
          userName="Admin User"
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div data-testid="page-admin-variants">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Variant Management</h1>
                  <p className="text-muted-foreground mt-2">
                    Manage menu item variant groups (e.g., Size, Crust) and their options (e.g., Small, Medium, Large)
                  </p>
                </div>
          <Dialog open={isGroupDialogOpen} onOpenChange={(open) => {
            setIsGroupDialogOpen(open);
            if (!open) {
              setEditingGroup(null);
              groupForm.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-group">
                <Plus className="mr-2 h-4 w-4" />
                Create Variant Group
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg" data-testid="dialog-group-form">
              <DialogHeader>
                <DialogTitle>{editingGroup ? "Edit" : "Create"} Variant Group</DialogTitle>
                <DialogDescription>
                  {editingGroup ? "Update the variant group settings below." : "Create a new variant group for menu item customization."}
                </DialogDescription>
              </DialogHeader>
              <Form {...groupForm}>
                <form onSubmit={groupForm.handleSubmit(handleGroupSubmit)} className="space-y-4">
                  <FormField
                    control={groupForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Size, Crust Type, Toppings" data-testid="input-group-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={groupForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Optional description" data-testid="textarea-group-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={groupForm.control}
                      name="selectionType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Selection Type *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-selection-type">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="single">Single (Choose one)</SelectItem>
                              <SelectItem value="multiple">Multiple (Choose many)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={groupForm.control}
                      name="displayOrder"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Order</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              data-testid="input-group-display-order"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={groupForm.control}
                      name="isRequired"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Required</FormLabel>
                            <FormDescription className="text-xs">
                              Must select at least one option
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-group-required"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={groupForm.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Active</FormLabel>
                            <FormDescription className="text-xs">
                              Show in selection
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-group-active"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsGroupDialogOpen(false);
                        setEditingGroup(null);
                        groupForm.reset();
                      }}
                      data-testid="button-cancel-group"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" data-testid="button-submit-group">
                      {editingGroup ? "Update" : "Create"} Group
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Dialog open={isOptionDialogOpen} onOpenChange={(open) => {
          setIsOptionDialogOpen(open);
          if (!open) {
            setEditingOption(null);
            setSelectedGroupForOption(null);
            optionForm.reset();
          }
        }}>
          <DialogContent className="max-w-lg" data-testid="dialog-option-form">
            <DialogHeader>
              <DialogTitle>{editingOption ? "Edit" : "Create"} Variant Option</DialogTitle>
              <DialogDescription>
                {editingOption ? "Update the variant option details below." : "Add a new option to the variant group."}
              </DialogDescription>
            </DialogHeader>
            <Form {...optionForm}>
              <form onSubmit={optionForm.handleSubmit(handleOptionSubmit)} className="space-y-4">
                <FormField
                  control={optionForm.control}
                  name="variantGroupId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Variant Group *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!!editingOption}>
                        <FormControl>
                          <SelectTrigger data-testid="select-variant-group">
                            <SelectValue placeholder="Select variant group" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {variantGroups.map((group) => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.name}
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
                    control={optionForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Small, Medium, Large" data-testid="input-option-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={optionForm.control}
                    name="shortName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Short Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., S, M, L" data-testid="input-option-short-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={optionForm.control}
                    name="priceModifier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price Modifier (₨)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" placeholder="0" data-testid="input-option-price-modifier" />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Additional charge for this option
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={optionForm.control}
                    name="displayOrder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Order</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            data-testid="input-option-display-order"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={optionForm.control}
                    name="isDefault"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Default</FormLabel>
                          <FormDescription className="text-xs">
                            Pre-select this option
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-option-default"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={optionForm.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Active</FormLabel>
                          <FormDescription className="text-xs">
                            Show in selection
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-option-active"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsOptionDialogOpen(false);
                      setEditingOption(null);
                      setSelectedGroupForOption(null);
                      optionForm.reset();
                    }}
                    data-testid="button-cancel-option"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" data-testid="button-submit-option">
                    {editingOption ? "Update" : "Create"} Option
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {loadingGroups ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading variant groups...</p>
          </div>
        ) : variantGroups.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Layers className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Variant Groups</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first variant group to start customizing menu items
              </p>
              <Button onClick={() => setIsGroupDialogOpen(true)} data-testid="button-empty-create-group">
                <Plus className="mr-2 h-4 w-4" />
                Create Variant Group
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {variantGroups
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((group) => {
                const groupOptions = getOptionsForGroup(group.id).sort(
                  (a, b) => a.displayOrder - b.displayOrder
                );
                return (
                  <Card key={group.id} data-testid={`card-group-${group.id}`}>
                    <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          <Layers className="h-5 w-5" />
                          {group.name}
                          <div className="flex gap-2 ml-2">
                            <Badge variant={group.isActive ? "default" : "secondary"} data-testid={`badge-group-status-${group.id}`}>
                              {group.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <Badge variant="outline" data-testid={`badge-group-type-${group.id}`}>
                              {group.selectionType === "single" ? "Single Choice" : "Multiple Choice"}
                            </Badge>
                            {group.isRequired && (
                              <Badge variant="outline" data-testid={`badge-group-required-${group.id}`}>
                                Required
                              </Badge>
                            )}
                          </div>
                        </CardTitle>
                        {group.description && (
                          <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openCreateOption(group.id)}
                          data-testid={`button-add-option-${group.id}`}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Option
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openEditGroup(group)}
                          data-testid={`button-edit-group-${group.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this variant group? All its options will also be deleted.")) {
                              deleteGroupMutation.mutate(group.id);
                            }
                          }}
                          data-testid={`button-delete-group-${group.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {groupOptions.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed rounded-lg">
                          <p className="text-muted-foreground text-sm mb-3">No options created yet</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openCreateOption(group.id)}
                            data-testid={`button-empty-add-option-${group.id}`}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add First Option
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {groupOptions.map((option) => (
                            <div
                              key={option.id}
                              className="flex items-center justify-between p-3 border rounded-lg hover-elevate"
                              data-testid={`card-option-${option.id}`}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{option.name}</span>
                                  {option.shortName && (
                                    <span className="text-xs text-muted-foreground">({option.shortName})</span>
                                  )}
                                  {option.isDefault && (
                                    <Check className="h-4 w-4 text-green-500" />
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-sm text-muted-foreground">
                                    {parseFloat(option.priceModifier) === 0
                                      ? "No charge"
                                      : parseFloat(option.priceModifier) > 0
                                      ? `+₨${parseFloat(option.priceModifier).toFixed(2)}`
                                      : `₨${parseFloat(option.priceModifier).toFixed(2)}`}
                                  </span>
                                  {!option.isActive && (
                                    <Badge variant="secondary" className="text-xs">Inactive</Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openEditOption(option)}
                                  data-testid={`button-edit-option-${option.id}`}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    if (confirm("Are you sure you want to delete this option?")) {
                                      deleteOptionMutation.mutate(option.id);
                                    }
                                  }}
                                  data-testid={`button-delete-option-${option.id}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        )}
      </div>
          </div>
        </main>
      </div>
    </div>
  );
}
