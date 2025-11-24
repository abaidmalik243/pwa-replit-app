import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { useAuth } from "@/context/AuthContext";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Send, Save, Users, Eye, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const campaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  description: z.string().optional(),
  branchId: z.string().optional(),
  targetAudience: z.string().default("all"),
  messageTemplate: z.string().min(1, "Message template is required"),
  scheduledAt: z.string().optional(),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

export default function AdminMarketingCampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { logout } = useAuth();
  const isNew = id === "new";

  const [previewAudience, setPreviewAudience] = useState<any>(null);

  const { data: campaign, isLoading } = useQuery({
    queryKey: [`/api/marketing-campaigns/${id}`],
    enabled: !isNew,
  });

  const { data: branches } = useQuery<any[]>({
    queryKey: ["/api/branches"],
  });

  const { data: templates } = useQuery<any[]>({
    queryKey: ["/api/message-templates"],
  });

  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: "",
      description: "",
      branchId: "all",
      targetAudience: "all",
      messageTemplate: "",
      scheduledAt: "",
    },
  });

  useEffect(() => {
    if (campaign && !isNew) {
      form.reset({
        name: campaign.name || "",
        description: campaign.description || "",
        branchId: campaign.branchId || "all",
        targetAudience: campaign.targetAudience || "all",
        messageTemplate: campaign.messageTemplate || "",
        scheduledAt: campaign.scheduledAt ? format(new Date(campaign.scheduledAt), "yyyy-MM-dd'T'HH:mm") : "",
      });
    }
  }, [campaign, isNew, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: CampaignFormData) => {
      const payload = {
        ...data,
        branchId: data.branchId === "all" ? null : data.branchId,
        templateVariables: {},
      };
      if (isNew) {
        const res = await apiRequest("/api/marketing-campaigns", "POST", payload);
        return await res.json();
      } else {
        const res = await apiRequest(`/api/marketing-campaigns/${id}`, "PUT", payload);
        return await res.json();
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketing-campaigns"] });
      toast({
        title: "Success",
        description: `Campaign ${isNew ? "created" : "updated"} successfully`,
      });
      if (isNew && data?.id) {
        setLocation(`/admin/marketing-campaigns/${data.id}`);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const launchMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(`/api/marketing-campaigns/${id}/launch`, "POST", {});
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketing-campaigns"] });
      queryClient.invalidateQueries({ queryKey: [`/api/marketing-campaigns/${id}`] });
      toast({
        title: "Campaign Launched",
        description: `Campaign launched successfully. ${data.recipientsCreated} recipients created.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Launch Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(`/api/marketing-campaigns/${id}`, "DELETE", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketing-campaigns"] });
      toast({
        title: "Campaign Deleted",
        description: "Campaign deleted successfully",
      });
      setLocation("/admin/marketing-campaigns");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const previewAudienceMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("/api/marketing-campaigns/preview-audience", "POST", data);
      return await res.json();
    },
    onSuccess: (data: any) => {
      setPreviewAudience(data);
    },
    onError: (error: any) => {
      toast({
        title: "Preview Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = (data: CampaignFormData) => {
    saveMutation.mutate(data);
  };

  const handleLaunch = () => {
    if (confirm("Are you sure you want to launch this campaign? Messages will be sent to all targeted customers.")) {
      launchMutation.mutate();
    }
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this campaign? This action cannot be undone.")) {
      deleteMutation.mutate();
    }
  };

  const handlePreviewAudience = () => {
    const values = form.getValues();
    previewAudienceMutation.mutate({
      targetAudience: values.targetAudience,
      branchId: values.branchId,
      customSegmentFilter: {},
    });
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates?.find((t) => t.id === templateId);
    if (template) {
      form.setValue("messageTemplate", template.templateText);
    }
  };

  if (isLoading && !isNew) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading campaign...</div>
      </div>
    );
  }

  const canLaunch = campaign && (campaign.status === "draft" || campaign.status === "scheduled");
  const canEdit = !campaign || campaign.status === "draft" || campaign.status === "scheduled";

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
          breadcrumbs={["Admin", "Marketing Campaigns", "Campaign Details"]}
          notificationCount={0}
          userName="Admin User"
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/marketing-campaigns")} data-testid="button-back">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-3xl font-bold" data-testid="text-page-title">
                    {isNew ? "New Campaign" : campaign?.name}
                  </h1>
            {campaign?.status && (
              <Badge className="mt-2">
                {campaign.status}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {!isNew && canEdit && (
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending} data-testid="button-delete">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
          {!isNew && canLaunch && (
            <Button onClick={handleLaunch} disabled={launchMutation.isPending} data-testid="button-launch">
              <Send className="h-4 w-4 mr-2" />
              Launch Campaign
            </Button>
          )}
        </div>
      </div>

      {!isNew && campaign && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Recipients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-recipients">{campaign.totalRecipients || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sent</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-sent-count">{campaign.sentCount || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-delivered-count">{campaign.deliveredCount || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive" data-testid="text-failed-count">{campaign.failedCount || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Details</CardTitle>
                <CardDescription>Basic information about your campaign</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Summer Sale 2024"
                          disabled={!canEdit}
                          data-testid="input-campaign-name"
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
                          placeholder="Describe the campaign purpose..."
                          disabled={!canEdit}
                          data-testid="input-campaign-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="branchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={!canEdit}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-branch">
                            <SelectValue placeholder="Select branch" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">All Branches</SelectItem>
                          {branches?.map((branch) => (
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
                  name="scheduledAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Schedule (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="datetime-local"
                          disabled={!canEdit}
                          data-testid="input-scheduled-at"
                        />
                      </FormControl>
                      <FormDescription>
                        Leave empty to send immediately when launched
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Target Audience</CardTitle>
                <CardDescription>Select who will receive this campaign</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="targetAudience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Audience Segment</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={!canEdit}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-target-audience">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">All Customers</SelectItem>
                          <SelectItem value="loyal_customers">Loyal Customers (Gold Tier)</SelectItem>
                          <SelectItem value="new_customers">New Customers (≤3 orders)</SelectItem>
                          <SelectItem value="inactive_customers">Inactive Customers</SelectItem>
                          <SelectItem value="custom">Custom Segment</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePreviewAudience}
                  disabled={previewAudienceMutation.isPending}
                  className="w-full"
                  data-testid="button-preview-audience"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Audience
                </Button>

                {previewAudience && (
                  <div className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Customers</span>
                      <Badge variant="secondary" data-testid="text-preview-count">{previewAudience.totalCount}</Badge>
                    </div>
                    <Separator />
                    <div className="text-xs text-muted-foreground">
                      Sample customers: {previewAudience.sampleCustomers?.slice(0, 3).map((c: any) => c.fullName).join(", ")}
                      {previewAudience.sampleCustomers?.length > 3 && "..."}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Message Content</CardTitle>
              <CardDescription>Compose your WhatsApp message</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <FormLabel>Use Template (Optional)</FormLabel>
                <Select onValueChange={handleTemplateSelect} disabled={!canEdit}>
                  <SelectTrigger data-testid="select-template">
                    <SelectValue placeholder="Choose a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates?.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <FormField
                control={form.control}
                name="messageTemplate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Hi {{name}}, check out our amazing deals..."
                        rows={6}
                        disabled={!canEdit}
                        data-testid="input-message-template"
                      />
                    </FormControl>
                    <FormDescription>
                      Use &#123;&#123;name&#125;&#125; to personalize messages. Other variables can be defined in templates.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {canEdit && (
            <div className="flex justify-end">
              <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save">
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
            </div>
          )}
        </form>
      </Form>
          </div>
        </main>
      </div>
    </div>
  );
}
