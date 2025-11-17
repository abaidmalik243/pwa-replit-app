import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { ShoppingCart, UserCog, Utensils, Clock, Star } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4">
          <h1 className="text-2xl font-bold text-primary">FoodHub</h1>
          <div className="flex gap-3">
            <Link href="/customer">
              <Button variant="outline" data-testid="button-customer-login">
                Customer Login
              </Button>
            </Link>
            <Link href="/admin">
              <Button data-testid="button-admin-login">Admin Login</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container px-4 py-12">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold mb-4">
            Welcome to FoodHub
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Order delicious food online or manage your restaurant with our powerful admin panel
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          <Card className="p-8 hover-elevate">
            <ShoppingCart className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-2xl font-bold mb-3">For Customers</h3>
            <p className="text-muted-foreground mb-6">
              Browse our menu, place orders, and enjoy fast delivery. Simple, quick, and delicious!
            </p>
            <Link href="/customer">
              <Button className="w-full" data-testid="button-start-ordering">
                Start Ordering
              </Button>
            </Link>
          </Card>

          <Card className="p-8 hover-elevate">
            <UserCog className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-2xl font-bold mb-3">For Administrators</h3>
            <p className="text-muted-foreground mb-6">
              Manage orders, menu items, users, and more with our comprehensive admin dashboard.
            </p>
            <Link href="/admin">
              <Button className="w-full" data-testid="button-admin-dashboard">
                Admin Dashboard
              </Button>
            </Link>
          </Card>
        </div>

        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-8">Why Choose FoodHub?</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 text-center">
              <Utensils className="h-10 w-10 text-primary mx-auto mb-3" />
              <h4 className="font-semibold mb-2">Wide Menu Selection</h4>
              <p className="text-sm text-muted-foreground">
                Choose from a variety of delicious dishes
              </p>
            </Card>
            <Card className="p-6 text-center">
              <Clock className="h-10 w-10 text-primary mx-auto mb-3" />
              <h4 className="font-semibold mb-2">Fast Delivery</h4>
              <p className="text-sm text-muted-foreground">
                Get your food delivered hot and fresh
              </p>
            </Card>
            <Card className="p-6 text-center">
              <Star className="h-10 w-10 text-primary mx-auto mb-3" />
              <h4 className="font-semibold mb-2">Quality Service</h4>
              <p className="text-sm text-muted-foreground">
                Top-rated restaurant with excellent reviews
              </p>
            </Card>
          </div>
        </div>
      </main>

      <footer className="border-t mt-16 py-8">
        <div className="container px-4 text-center text-muted-foreground">
          <p>&copy; 2024 FoodHub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
