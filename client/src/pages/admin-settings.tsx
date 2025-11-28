import { useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, Bell, Clock, CreditCard, Truck, Globe, Shield, 
  Percent, Receipt, Settings, CheckCircle2, AlertCircle 
} from "lucide-react";

interface SystemSettings {
  restaurantName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  openingTime: string;
  closingTime: string;
  orderNotifications: boolean;
  soundAlerts: boolean;
  lowStockAlerts: boolean;
  taxRate: number;
  taxName: string;
  taxEnabled: boolean;
  currency: string;
  currencySymbol: string;
  language: string;
  timezone: string;
  minOrderAmount: number;
  maxOrderAmount: number;
  autoAcceptOrders: boolean;
  requirePhoneVerification: boolean;
  allowGuestCheckout: boolean;
  enableLoyaltyProgram: boolean;
  pointsPerOrder: number;
  pointsRedemptionRate: number;
  defaultDeliveryRadius: number;
  estimatedDeliveryTime: number;
  enableCOD: boolean;
  enableStripe: boolean;
  enableJazzCash: boolean;
}

const defaultSettings: SystemSettings = {
  restaurantName: "Kebabish Pizza",
  contactEmail: "info@kebabish-pizza.com",
  contactPhone: "+92-300-1234567",
  address: "Main Branch, Sahiwal, Pakistan",
  openingTime: "10:00",
  closingTime: "23:00",
  orderNotifications: true,
  soundAlerts: true,
  lowStockAlerts: true,
  taxRate: 16,
  taxName: "GST",
  taxEnabled: true,
  currency: "PKR",
  currencySymbol: "Rs.",
  language: "en",
  timezone: "Asia/Karachi",
  minOrderAmount: 200,
  maxOrderAmount: 50000,
  autoAcceptOrders: false,
  requirePhoneVerification: false,
  allowGuestCheckout: true,
  enableLoyaltyProgram: true,
  pointsPerOrder: 10,
  pointsRedemptionRate: 100,
  defaultDeliveryRadius: 10,
  estimatedDeliveryTime: 45,
  enableCOD: true,
  enableStripe: true,
  enableJazzCash: true,
};

export default function AdminSettings() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const { toast } = useToast();

  const updateSetting = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your settings have been updated successfully",
    });
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
          soundEnabled={settings.soundAlerts}
          onToggleSound={() => updateSetting('soundAlerts', !settings.soundAlerts)}
          onLogout={() => {
            localStorage.removeItem("user");
            window.location.href = "/";
          }}
          onNavigate={() => setSidebarOpen(false)}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader
          breadcrumbs={["Admin", "Settings"]}
          notificationCount={0}
          userName="Admin User"
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">System Settings</h1>
              <p className="text-muted-foreground">
                Configure your restaurant and application settings
              </p>
            </div>

            <Tabs defaultValue="general" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
                <TabsTrigger value="general" className="gap-2" data-testid="tab-general">
                  <Building2 className="h-4 w-4" />
                  <span className="hidden md:inline">General</span>
                </TabsTrigger>
                <TabsTrigger value="notifications" className="gap-2" data-testid="tab-notifications">
                  <Bell className="h-4 w-4" />
                  <span className="hidden md:inline">Notifications</span>
                </TabsTrigger>
                <TabsTrigger value="tax" className="gap-2" data-testid="tab-tax">
                  <Percent className="h-4 w-4" />
                  <span className="hidden md:inline">Tax</span>
                </TabsTrigger>
                <TabsTrigger value="payments" className="gap-2" data-testid="tab-payments">
                  <CreditCard className="h-4 w-4" />
                  <span className="hidden md:inline">Payments</span>
                </TabsTrigger>
                <TabsTrigger value="delivery" className="gap-2" data-testid="tab-delivery">
                  <Truck className="h-4 w-4" />
                  <span className="hidden md:inline">Delivery</span>
                </TabsTrigger>
                <TabsTrigger value="localization" className="gap-2" data-testid="tab-localization">
                  <Globe className="h-4 w-4" />
                  <span className="hidden md:inline">Localization</span>
                </TabsTrigger>
                <TabsTrigger value="orders" className="gap-2" data-testid="tab-orders">
                  <Receipt className="h-4 w-4" />
                  <span className="hidden md:inline">Orders</span>
                </TabsTrigger>
              </TabsList>

              {/* General Settings */}
              <TabsContent value="general" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Restaurant Information
                    </CardTitle>
                    <CardDescription>
                      Basic information about your restaurant
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="restaurant-name">Restaurant Name</Label>
                        <Input
                          id="restaurant-name"
                          value={settings.restaurantName}
                          onChange={(e) => updateSetting('restaurantName', e.target.value)}
                          data-testid="input-restaurant-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact-email">Contact Email</Label>
                        <Input
                          id="contact-email"
                          type="email"
                          value={settings.contactEmail}
                          onChange={(e) => updateSetting('contactEmail', e.target.value)}
                          data-testid="input-contact-email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact-phone">Contact Phone</Label>
                        <Input
                          id="contact-phone"
                          type="tel"
                          value={settings.contactPhone}
                          onChange={(e) => updateSetting('contactPhone', e.target.value)}
                          data-testid="input-contact-phone"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          value={settings.address}
                          onChange={(e) => updateSetting('address', e.target.value)}
                          data-testid="input-address"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Operating Hours
                    </CardTitle>
                    <CardDescription>
                      Set your restaurant's daily operating hours
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="opening-time">Opening Time</Label>
                        <Input
                          id="opening-time"
                          type="time"
                          value={settings.openingTime}
                          onChange={(e) => updateSetting('openingTime', e.target.value)}
                          data-testid="input-opening-time"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="closing-time">Closing Time</Label>
                        <Input
                          id="closing-time"
                          type="time"
                          value={settings.closingTime}
                          onChange={(e) => updateSetting('closingTime', e.target.value)}
                          data-testid="input-closing-time"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notification Settings */}
              <TabsContent value="notifications" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Notification Preferences
                    </CardTitle>
                    <CardDescription>
                      Configure how you receive alerts and notifications
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="order-notifications">Order Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive alerts when new orders are placed
                        </p>
                      </div>
                      <Switch
                        id="order-notifications"
                        checked={settings.orderNotifications}
                        onCheckedChange={(checked) => updateSetting('orderNotifications', checked)}
                        data-testid="switch-order-notifications"
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="sound-alerts">Sound Alerts</Label>
                        <p className="text-sm text-muted-foreground">
                          Play sound when new orders arrive
                        </p>
                      </div>
                      <Switch
                        id="sound-alerts"
                        checked={settings.soundAlerts}
                        onCheckedChange={(checked) => updateSetting('soundAlerts', checked)}
                        data-testid="switch-sound-alerts"
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="low-stock-alerts">Low Stock Alerts</Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified when inventory items are running low
                        </p>
                      </div>
                      <Switch
                        id="low-stock-alerts"
                        checked={settings.lowStockAlerts}
                        onCheckedChange={(checked) => updateSetting('lowStockAlerts', checked)}
                        data-testid="switch-low-stock-alerts"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tax Settings */}
              <TabsContent value="tax" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Percent className="h-5 w-5" />
                      Tax Configuration
                    </CardTitle>
                    <CardDescription>
                      Configure tax rates and settings for orders
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="tax-enabled">Enable Tax</Label>
                        <p className="text-sm text-muted-foreground">
                          Apply tax to all orders
                        </p>
                      </div>
                      <Switch
                        id="tax-enabled"
                        checked={settings.taxEnabled}
                        onCheckedChange={(checked) => updateSetting('taxEnabled', checked)}
                        data-testid="switch-tax-enabled"
                      />
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="tax-name">Tax Name</Label>
                        <Input
                          id="tax-name"
                          value={settings.taxName}
                          onChange={(e) => updateSetting('taxName', e.target.value)}
                          placeholder="e.g., GST, VAT, Sales Tax"
                          disabled={!settings.taxEnabled}
                          data-testid="input-tax-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                        <Input
                          id="tax-rate"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={settings.taxRate}
                          onChange={(e) => updateSetting('taxRate', parseFloat(e.target.value) || 0)}
                          disabled={!settings.taxEnabled}
                          data-testid="input-tax-rate"
                        />
                      </div>
                    </div>
                    {settings.taxEnabled && (
                      <div className="bg-muted p-4 rounded-lg">
                        <p className="text-sm">
                          Current tax: <strong>{settings.taxName} @ {settings.taxRate}%</strong>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          A {settings.currencySymbol}1000 order will have {settings.currencySymbol}{(1000 * settings.taxRate / 100).toFixed(2)} tax added.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Payment Settings */}
              <TabsContent value="payments" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Payment Methods
                    </CardTitle>
                    <CardDescription>
                      Configure accepted payment methods
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                          <Receipt className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="space-y-0.5">
                          <Label>Cash on Delivery (COD)</Label>
                          <p className="text-sm text-muted-foreground">
                            Accept cash payments on delivery
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={settings.enableCOD ? "default" : "secondary"}>
                          {settings.enableCOD ? "Active" : "Disabled"}
                        </Badge>
                        <Switch
                          checked={settings.enableCOD}
                          onCheckedChange={(checked) => updateSetting('enableCOD', checked)}
                          data-testid="switch-enable-cod"
                        />
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                          <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="space-y-0.5">
                          <Label>Stripe Payments</Label>
                          <p className="text-sm text-muted-foreground">
                            Accept credit/debit card payments via Stripe
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={settings.enableStripe ? "default" : "secondary"}>
                          {settings.enableStripe ? "Connected" : "Disabled"}
                        </Badge>
                        <Switch
                          checked={settings.enableStripe}
                          onCheckedChange={(checked) => updateSetting('enableStripe', checked)}
                          data-testid="switch-enable-stripe"
                        />
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                          <CreditCard className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div className="space-y-0.5">
                          <Label>JazzCash Mobile Wallet</Label>
                          <p className="text-sm text-muted-foreground">
                            Accept JazzCash mobile wallet payments
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={settings.enableJazzCash ? "default" : "secondary"}>
                          {settings.enableJazzCash ? "Active" : "Disabled"}
                        </Badge>
                        <Switch
                          checked={settings.enableJazzCash}
                          onCheckedChange={(checked) => updateSetting('enableJazzCash', checked)}
                          data-testid="switch-enable-jazzcash"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Delivery Settings */}
              <TabsContent value="delivery" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      Delivery Configuration
                    </CardTitle>
                    <CardDescription>
                      Configure delivery zones and estimated times
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="delivery-radius">Default Delivery Radius (km)</Label>
                        <Input
                          id="delivery-radius"
                          type="number"
                          min="1"
                          max="100"
                          value={settings.defaultDeliveryRadius}
                          onChange={(e) => updateSetting('defaultDeliveryRadius', parseInt(e.target.value) || 10)}
                          data-testid="input-delivery-radius"
                        />
                        <p className="text-xs text-muted-foreground">
                          Maximum distance for delivery orders
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="delivery-time">Estimated Delivery Time (minutes)</Label>
                        <Input
                          id="delivery-time"
                          type="number"
                          min="10"
                          max="180"
                          value={settings.estimatedDeliveryTime}
                          onChange={(e) => updateSetting('estimatedDeliveryTime', parseInt(e.target.value) || 45)}
                          data-testid="input-delivery-time"
                        />
                        <p className="text-xs text-muted-foreground">
                          Average time to deliver an order
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Localization Settings */}
              <TabsContent value="localization" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Regional Settings
                    </CardTitle>
                    <CardDescription>
                      Configure currency, language, and timezone
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="currency">Currency</Label>
                        <Select 
                          value={settings.currency} 
                          onValueChange={(value) => {
                            updateSetting('currency', value);
                            const symbols: Record<string, string> = { PKR: 'Rs.', USD: '$', AED: 'AED', SAR: 'SAR' };
                            updateSetting('currencySymbol', symbols[value] || value);
                          }}
                        >
                          <SelectTrigger id="currency" data-testid="select-currency">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PKR">PKR - Pakistani Rupee</SelectItem>
                            <SelectItem value="USD">USD - US Dollar</SelectItem>
                            <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                            <SelectItem value="SAR">SAR - Saudi Riyal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="language">Default Language</Label>
                        <Select value={settings.language} onValueChange={(value) => updateSetting('language', value)}>
                          <SelectTrigger id="language" data-testid="select-language">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="ur">Urdu</SelectItem>
                            <SelectItem value="ar">Arabic</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="timezone">Timezone</Label>
                        <Select value={settings.timezone} onValueChange={(value) => updateSetting('timezone', value)}>
                          <SelectTrigger id="timezone" data-testid="select-timezone">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Asia/Karachi">Asia/Karachi (PKT)</SelectItem>
                            <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                            <SelectItem value="Asia/Riyadh">Asia/Riyadh (AST)</SelectItem>
                            <SelectItem value="UTC">UTC</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currency-symbol">Currency Symbol</Label>
                        <Input
                          id="currency-symbol"
                          value={settings.currencySymbol}
                          onChange={(e) => updateSetting('currencySymbol', e.target.value)}
                          data-testid="input-currency-symbol"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Order Settings */}
              <TabsContent value="orders" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Receipt className="h-5 w-5" />
                      Order Configuration
                    </CardTitle>
                    <CardDescription>
                      Configure order limits and preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="min-order">Minimum Order Amount ({settings.currencySymbol})</Label>
                        <Input
                          id="min-order"
                          type="number"
                          min="0"
                          value={settings.minOrderAmount}
                          onChange={(e) => updateSetting('minOrderAmount', parseInt(e.target.value) || 0)}
                          data-testid="input-min-order"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="max-order">Maximum Order Amount ({settings.currencySymbol})</Label>
                        <Input
                          id="max-order"
                          type="number"
                          min="0"
                          value={settings.maxOrderAmount}
                          onChange={(e) => updateSetting('maxOrderAmount', parseInt(e.target.value) || 0)}
                          data-testid="input-max-order"
                        />
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Auto-Accept Orders</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically accept new orders without manual confirmation
                        </p>
                      </div>
                      <Switch
                        checked={settings.autoAcceptOrders}
                        onCheckedChange={(checked) => updateSetting('autoAcceptOrders', checked)}
                        data-testid="switch-auto-accept"
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Allow Guest Checkout</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow customers to place orders without creating an account
                        </p>
                      </div>
                      <Switch
                        checked={settings.allowGuestCheckout}
                        onCheckedChange={(checked) => updateSetting('allowGuestCheckout', checked)}
                        data-testid="switch-guest-checkout"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Loyalty Program
                    </CardTitle>
                    <CardDescription>
                      Configure customer loyalty rewards
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable Loyalty Program</Label>
                        <p className="text-sm text-muted-foreground">
                          Award points to customers for their purchases
                        </p>
                      </div>
                      <Switch
                        checked={settings.enableLoyaltyProgram}
                        onCheckedChange={(checked) => updateSetting('enableLoyaltyProgram', checked)}
                        data-testid="switch-loyalty"
                      />
                    </div>
                    {settings.enableLoyaltyProgram && (
                      <>
                        <Separator />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="points-per-order">Points per {settings.currencySymbol}100 spent</Label>
                            <Input
                              id="points-per-order"
                              type="number"
                              min="1"
                              value={settings.pointsPerOrder}
                              onChange={(e) => updateSetting('pointsPerOrder', parseInt(e.target.value) || 1)}
                              data-testid="input-points-per-order"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="points-value">Points Redemption Rate (points per {settings.currencySymbol}1)</Label>
                            <Input
                              id="points-value"
                              type="number"
                              min="1"
                              value={settings.pointsRedemptionRate}
                              onChange={(e) => updateSetting('pointsRedemptionRate', parseInt(e.target.value) || 1)}
                              data-testid="input-points-value"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end mt-6 sticky bottom-6">
              <Button onClick={handleSave} size="lg" data-testid="button-save-settings">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Save All Settings
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
