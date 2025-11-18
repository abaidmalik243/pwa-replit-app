import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export default function AdminSettings() {
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your settings have been updated successfully",
    });
  };

  return (
    <div className="flex h-screen bg-background">
      <div className="w-64">
        <AdminSidebar
          soundEnabled={false}
          onToggleSound={() => {}}
          onLogout={() => {
            localStorage.removeItem("user");
            window.location.href = "/";
          }}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader
          breadcrumbs={["Admin", "Settings"]}
          notificationCount={0}
          userName="Admin User"
        />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">Settings</h1>
              <p className="text-muted-foreground">
                Manage your application settings and preferences
              </p>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Restaurant Information</CardTitle>
                  <CardDescription>
                    Update your restaurant details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="restaurant-name">Restaurant Name</Label>
                    <Input
                      id="restaurant-name"
                      defaultValue="Kebabish Pizza"
                      data-testid="input-restaurant-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-email">Contact Email</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      defaultValue="info@kebabish-pizza.com"
                      data-testid="input-contact-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-phone">Contact Phone</Label>
                    <Input
                      id="contact-phone"
                      type="tel"
                      defaultValue="+92-300-1234567"
                      data-testid="input-contact-phone"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notification Settings</CardTitle>
                  <CardDescription>
                    Configure how you receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="order-notifications">Order Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive alerts for new orders
                      </p>
                    </div>
                    <Switch id="order-notifications" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="sound-alerts">Sound Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Play sound when new orders arrive
                      </p>
                    </div>
                    <Switch id="sound-alerts" defaultChecked />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Operating Hours</CardTitle>
                  <CardDescription>
                    Set your restaurant operating hours
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="opening-time">Opening Time</Label>
                      <Input
                        id="opening-time"
                        type="time"
                        defaultValue="10:00"
                        data-testid="input-opening-time"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="closing-time">Closing Time</Label>
                      <Input
                        id="closing-time"
                        type="time"
                        defaultValue="23:00"
                        data-testid="input-closing-time"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={handleSave} data-testid="button-save-settings">
                  Save Settings
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
