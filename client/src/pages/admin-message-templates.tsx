import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Copy, MessageSquare } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  category: z.string().min(1, "Category is required"),
  templateText: z.string().min(1, "Content is required"),
});

type TemplateFormData = z.infer<typeof templateSchema>;

export default function AdminMessageTemplates() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: templates, isLoading } = useQuery<any[]>({
    queryKey: ["/api/message-templates", { searchParams: { category: categoryFilter !== "all" ? categoryFilter : undefined } }],
  });

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      category: "promotional",
      templateText: "",
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      // Extract variables from templateText (find all {{variable}} patterns)
      const variableMatches = data.templateText.match(/\{\{(\w+)\}\}/g);
      const variables = variableMatches 
        ? variableMatches.map(v => v.replace(/\{\{|\}\}/g, ''))
        : [];
      
      const payload = {
        ...data,
        variables,
      };
      if (editingTemplate) {
        const res = await apiRequest(`/api/message-templates/${editingTemplate.id}`, "PUT", payload);
        return await res.json();
      } else {
        const res = await apiRequest("/api/message-templates", "POST", payload);
        return await res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/message-templates"] });
      toast({
        title: "Success",
        description: `Template ${editingTemplate ? "updated" : "created"} successfully`,
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
      await apiRequest(`/api/message-templates/${id}`, "DELETE", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/message-templates"] });
      toast({
        title: "Template Deleted",
        description: "Template deleted successfully",
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

  const handleOpenDialog = (template?: any) => {
    if (template) {
      setEditingTemplate(template);
      form.reset({
        name: template.name,
        category: template.category,
        templateText: template.templateText,
      });
    } else {
      setEditingTemplate(null);
      form.reset({
        name: "",
        category: "promotional",
        templateText: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTemplate(null);
    form.reset();
  };

  const handleSave = (data: TemplateFormData) => {
    saveMutation.mutate(data);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDuplicate = (template: any) => {
    setEditingTemplate(null);
    form.reset({
      name: `${template.name} (Copy)`,
      category: template.category,
      templateText: template.templateText,
    });
    setIsDialogOpen(true);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      promotional: "bg-blue-500",
      transactional: "bg-green-500",
      reminder: "bg-yellow-500",
      announcement: "bg-purple-500",
      seasonal: "bg-orange-500",
    };
    return colors[category] || "bg-secondary";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Message Templates</h1>
          <p className="text-muted-foreground mt-1">Create reusable message templates for campaigns</p>
        </div>
        <Button onClick={() => handleOpenDialog()} data-testid="button-create-template">
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          variant={categoryFilter === "all" ? "default" : "outline"}
          onClick={() => setCategoryFilter("all")}
          size="sm"
          data-testid="filter-all"
        >
          All
        </Button>
        <Button
          variant={categoryFilter === "promotional" ? "default" : "outline"}
          onClick={() => setCategoryFilter("promotional")}
          size="sm"
          data-testid="filter-promotional"
        >
          Promotional
        </Button>
        <Button
          variant={categoryFilter === "transactional" ? "default" : "outline"}
          onClick={() => setCategoryFilter("transactional")}
          size="sm"
          data-testid="filter-transactional"
        >
          Transactional
        </Button>
        <Button
          variant={categoryFilter === "reminder" ? "default" : "outline"}
          onClick={() => setCategoryFilter("reminder")}
          size="sm"
          data-testid="filter-reminder"
        >
          Reminder
        </Button>
        <Button
          variant={categoryFilter === "announcement" ? "default" : "outline"}
          onClick={() => setCategoryFilter("announcement")}
          size="sm"
          data-testid="filter-announcement"
        >
          Announcement
        </Button>
      </div>

      {!templates || templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No templates found</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Create message templates to streamline your campaign creation
            </p>
            <Button onClick={() => handleOpenDialog()} data-testid="button-create-first-template">
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template: any) => (
            <Card key={template.id} className="hover-elevate">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate" data-testid={`text-template-name-${template.id}`}>
                      {template.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={getCategoryColor(template.category)}>
                        {template.category}
                      </Badge>
                      {template.isActive === false && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 rounded p-3 text-sm min-h-[80px]">
                  <p className="line-clamp-3">{template.templateText}</p>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  Used {template.usageCount || 0} times
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDialog(template)}
                    className="flex-1"
                    data-testid={`button-edit-${template.id}`}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicate(template)}
                    data-testid={`button-duplicate-${template.id}`}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(template.id)}
                    data-testid={`button-delete-${template.id}`}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
            <DialogDescription>
              Create reusable message templates with personalization variables
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Summer Sale Announcement"
                        data-testid="input-template-name"
                      />
                    </FormControl>
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
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="promotional">Promotional</SelectItem>
                        <SelectItem value="transactional">Transactional</SelectItem>
                        <SelectItem value="reminder">Reminder</SelectItem>
                        <SelectItem value="announcement">Announcement</SelectItem>
                        <SelectItem value="seasonal">Seasonal</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="templateText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message Content</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Hi {{name}}, we have exciting news for you..."
                        rows={6}
                        data-testid="input-template-content"
                      />
                    </FormControl>
                    <FormDescription>
                      Use &#123;&#123;name&#125;&#125;, &#123;&#123;phone&#125;&#125; or custom variables
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-template">
                  {editingTemplate ? "Update" : "Create"} Template
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
