import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import CustomerHeader from "@/components/CustomerHeader";
import Footer from "@/components/Footer";
import { 
  MapPin, 
  Heart, 
  Award, 
  ShoppingBag, 
  ChevronRight,
  User
} from "lucide-react";

export default function CustomerAccount() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect if not authenticated or not a customer
  if (!isAuthenticated || user?.role !== "customer") {
    setLocation("/login");
    return null;
  }

  // Fetch customer stats
  const { data: addresses = [] } = useQuery<any[]>({
    queryKey: [`/api/customers/${user.id}/addresses`],
  });

  const { data: favorites = [] } = useQuery<any[]>({
    queryKey: [`/api/customers/${user.id}/favorites`],
  });

  const { data: loyaltyData } = useQuery<{ balance: number }>({
    queryKey: [`/api/customers/${user.id}/loyalty-points`],
  });

  const { data: orders = [] } = useQuery<any[]>({
    queryKey: [`/api/customers/${user.id}/orders`],
  });

  const accountSections = [
    {
      title: "Saved Addresses",
      description: `${addresses.length} ${addresses.length === 1 ? 'address' : 'addresses'} saved`,
      icon: MapPin,
      href: "/account/addresses",
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    {
      title: "Favorites",
      description: `${favorites.length} favorite ${favorites.length === 1 ? 'item' : 'items'}`,
      icon: Heart,
      href: "/account/favorites",
      color: "text-red-600",
      bgColor: "bg-red-50 dark:bg-red-950",
    },
    {
      title: "Loyalty Points",
      description: `${loyaltyData?.balance || 0} points available`,
      icon: Award,
      href: "/account/loyalty",
      color: "text-yellow-600",
      bgColor: "bg-yellow-50 dark:bg-yellow-950",
    },
    {
      title: "Order History",
      description: `${orders.length} ${orders.length === 1 ? 'order' : 'orders'} placed`,
      icon: ShoppingBag,
      href: "/account/orders",
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <CustomerHeader />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Profile Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" data-testid="icon-profile" />
                </div>
                <div>
                  <CardTitle className="text-2xl" data-testid="text-fullname">{user.fullName}</CardTitle>
                  <CardDescription data-testid="text-email">{user.email}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Account Sections */}
          <div className="grid gap-4 md:grid-cols-2">
            {accountSections.map((section) => {
              const Icon = section.icon;
              return (
                <Card 
                  key={section.title}
                  className="hover-elevate active-elevate-2 cursor-pointer transition-all"
                  onClick={() => setLocation(section.href)}
                  data-testid={`card-${section.title.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-lg ${section.bgColor}`}>
                          <Icon className={`h-6 w-6 ${section.color}`} data-testid={`icon-${section.title.toLowerCase().replace(/\s+/g, '-')}`} />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{section.title}</CardTitle>
                          <CardDescription className="mt-1" data-testid={`text-${section.title.toLowerCase().replace(/\s+/g, '-')}-count`}>
                            {section.description}
                          </CardDescription>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>

          {/* Logout Button */}
          <div className="flex justify-center pt-4">
            <Button 
              variant="outline" 
              onClick={() => setLocation("/")}
              data-testid="button-back-home"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
