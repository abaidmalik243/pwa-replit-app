import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Send, Calendar, Users, CheckCircle2, XCircle, Clock, Target, MessageSquare } from "lucide-react";
import { format } from "date-fns";

export default function AdminMarketingCampaigns() {
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: campaigns, isLoading } = useQuery<any[]>({
    queryKey: ["/api/marketing-campaigns", { searchParams: { status: statusFilter !== "all" ? statusFilter : undefined } }],
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-secondary",
      scheduled: "bg-blue-500",
      sending: "bg-yellow-500",
      completed: "bg-green-500",
      failed: "bg-destructive",
      cancelled: "bg-muted",
    };
    return colors[status] || "bg-secondary";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4" />;
      case "failed":
      case "cancelled":
        return <XCircle className="h-4 w-4" />;
      case "sending":
        return <Send className="h-4 w-4" />;
      case "scheduled":
        return <Clock className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const campaignsByStatus = campaigns?.reduce((acc: any, campaign: any) => {
    const status = campaign.status || "draft";
    if (!acc[status]) acc[status] = [];
    acc[status].push(campaign);
    return acc;
  }, {});

  const stats = {
    total: campaigns?.length || 0,
    draft: campaignsByStatus?.draft?.length || 0,
    scheduled: campaignsByStatus?.scheduled?.length || 0,
    active: campaignsByStatus?.sending?.length || 0,
    completed: campaignsByStatus?.completed?.length || 0,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading campaigns...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Marketing Campaigns</h1>
          <p className="text-muted-foreground mt-1">Create and manage WhatsApp promotional campaigns</p>
        </div>
        <Button onClick={() => setLocation("/admin/marketing-campaigns/new")} data-testid="button-create-campaign">
          <Plus className="h-4 w-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-campaigns">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-draft-campaigns">{stats.draft}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-scheduled-campaigns">{stats.scheduled}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-campaigns">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-completed-campaigns">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all-campaigns">All</TabsTrigger>
          <TabsTrigger value="draft" data-testid="tab-draft">Draft</TabsTrigger>
          <TabsTrigger value="scheduled" data-testid="tab-scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="sending" data-testid="tab-sending">Sending</TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-6">
          {!campaigns || campaigns.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No campaigns found</h3>
                <p className="text-muted-foreground text-center max-w-md mb-4">
                  Create your first marketing campaign to engage with customers via WhatsApp
                </p>
                <Button onClick={() => setLocation("/admin/marketing-campaigns/new")} data-testid="button-create-first-campaign">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {campaigns.map((campaign: any) => (
                <Card key={campaign.id} className="hover-elevate">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-xl" data-testid={`text-campaign-name-${campaign.id}`}>
                            {campaign.name}
                          </CardTitle>
                          <Badge className={getStatusColor(campaign.status)}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(campaign.status)}
                              {campaign.status}
                            </span>
                          </Badge>
                        </div>
                        {campaign.description && (
                          <CardDescription className="mt-1">{campaign.description}</CardDescription>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation(`/admin/marketing-campaigns/${campaign.id}`)}
                          data-testid={`button-view-campaign-${campaign.id}`}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Target Audience</div>
                        <div className="font-medium capitalize flex items-center gap-1 mt-1">
                          <Users className="h-3 w-3" />
                          {campaign.targetAudience?.replace(/_/g, " ") || "All"}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Recipients</div>
                        <div className="font-medium mt-1">
                          {campaign.sentCount || 0} / {campaign.totalRecipients || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Delivery Rate</div>
                        <div className="font-medium mt-1">
                          {campaign.totalRecipients
                            ? `${Math.round(((campaign.deliveredCount || 0) / campaign.totalRecipients) * 100)}%`
                            : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">
                          {campaign.scheduledAt ? "Scheduled For" : "Created"}
                        </div>
                        <div className="font-medium mt-1">
                          {campaign.scheduledAt
                            ? format(new Date(campaign.scheduledAt), "MMM dd, yyyy HH:mm")
                            : format(new Date(campaign.createdAt), "MMM dd, yyyy")}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
