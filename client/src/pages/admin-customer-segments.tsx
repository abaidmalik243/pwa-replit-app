import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Users, RefreshCw, Filter } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";

const segmentSchema = z.object({
  name: z.string().min(1, "Segment name is required"),
  description: z.string().optional(),
});

type SegmentFormData = z.infer<typeof segmentSchema>;

export default function AdminCustomerSegments() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState<any>(null);

  const { data: segments, isLoading } = useQuery<any[]>({
    queryKey: ["/api/customer-segments"],
  });

  const form = useForm<SegmentFormData>({
    resolver: zodResolver(segmentSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: SegmentFormData) => {
      const payload = {
        ...data,
        filters: {},
      };
      if (editingSegment) {
        const res = await apiRequest(`/api/customer-segments/${editingSegment.id}`, "PUT", payload);
        return await res.json();
      } else {
        const res = await apiRequest("/api/customer-segments", "POST", payload);
        return await res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-segments"] });
      toast({
        title: "Success",
        description: `Segment ${editingSegment ? "updated" : "created"} successfully`,
      });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/customer-segments/${id}`, "DELETE", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-segments"] });
      toast({
        title: "Segment Deleted",
        description: "Segment deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const recalculateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest(`/api/customer-segments/${id}/recalculate`, "POST", {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-segments"] });
      toast({
        title: "Recalculated",
        description: "Segment customer count updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = (segment?: any) => {
    if (segment) {
      setEditingSegment(segment);
      form.reset({
        name: segment.name,
        description: segment.description || "",
      });
    } else {
      setEditingSegment(null);
      form.reset({
        name: "",
        description: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSegment(null);
    form.reset();
  };

  const handleSave = (data: SegmentFormData) => {
    saveMutation.mutate(data);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this segment?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleRecalculate = (id: string) => {
    recalculateMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading segments...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Customer Segments</h1>
          <p className="text-muted-foreground mt-1">Create and manage customer segments for targeted campaigns</p>
        </div>
        <Button onClick={() => handleOpenDialog()} data-testid="button-create-segment">
          <Plus className="h-4 w-4 mr-2" />
          Create Segment
        </Button>
      </div>

      {!segments || segments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Filter className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No segments found</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Create customer segments to target specific audiences in your campaigns
            </p>
            <Button onClick={() => handleOpenDialog()} data-testid="button-create-first-segment">
              <Plus className="h-4 w-4 mr-2" />
              Create Segment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {segments.map((segment: any) => (
            <Card key={segment.id} className="hover-elevate">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate" data-testid={`text-segment-name-${segment.id}`}>
                      {segment.name}
                    </CardTitle>
                    {segment.description && (
                      <CardDescription className="mt-1 line-clamp-2">
                        {segment.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Customers</span>
                  </div>
                  <Badge variant="secondary" data-testid={`text-customer-count-${segment.id}`}>
                    {segment.customerCount || 0}
                  </Badge>
                </div>

                {segment.lastCalculated && (
                  <div className="text-xs text-muted-foreground">
                    Last calculated: {format(new Date(segment.lastCalculated), "MMM dd, yyyy")}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRecalculate(segment.id)}
                    disabled={recalculateMutation.isPending}
                    data-testid={`button-recalculate-${segment.id}`}
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDialog(segment)}
                    className="flex-1"
                    data-testid={`button-edit-${segment.id}`}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(segment.id)}
                    data-testid={`button-delete-${segment.id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSegment ? "Edit Segment" : "Create Segment"}</DialogTitle>
            <DialogDescription>
              Define customer segments based on various criteria
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Segment Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="High-value Customers"
                        data-testid="input-segment-name"
                      />
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
                      <Textarea
                        {...field}
                        placeholder="Customers with lifetime value > $500"
                        data-testid="input-segment-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="bg-muted/50 rounded p-4">
                <p className="text-sm text-muted-foreground">
                  Custom filter configuration is available through API.
                  Use predefined segments (All, Loyal, New, Inactive) in campaigns or contact support for advanced segmentation.
                </p>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-segment">
                  {editingSegment ? "Update" : "Create"} Segment
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
