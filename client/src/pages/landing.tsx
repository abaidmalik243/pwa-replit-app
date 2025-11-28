import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { ShoppingCart, UserCog, Utensils, Clock, Star, Phone } from "lucide-react";
import { HeroSlider } from "@/components/HeroSlider";
import logoImage from "@assets/logo_1764330678819.jfif";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <img 
              src={logoImage} 
              alt="Kebabish Pizza" 
              className="h-10 w-auto object-contain" 
              data-testid="img-landing-logo"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-primary" />
              <span className="font-medium">+92-300-1234567</span>
            </div>
            <Link href="/login">
              <Button variant="outline" data-testid="button-customer-login">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button data-testid="button-signup">Sign Up</Button>
            </Link>
          </div>
        </div>
      </header>

      <HeroSlider />

      <main className="container px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            Three Locations to Serve You
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Find us in Okara, Sahiwal, and Faisalabad
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          <Card className="p-8 hover-elevate">
            <ShoppingCart className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-2xl font-bold mb-3">For Customers</h3>
            <p className="text-muted-foreground mb-6">
              Browse our menu, place orders, and enjoy authentic pizzas & kebabs with fast delivery!
            </p>
            <Link href="/login">
              <Button className="w-full" data-testid="button-start-ordering">
                Start Ordering
              </Button>
            </Link>
          </Card>

          <Card className="p-8 hover-elevate">
            <UserCog className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-2xl font-bold mb-3">For Administrators</h3>
            <p className="text-muted-foreground mb-6">
              Manage orders, menu items, users, expenses, and more across all three branches.
            </p>
            <Link href="/login">
              <Button className="w-full" data-testid="button-admin-dashboard">
                Admin Dashboard
              </Button>
            </Link>
          </Card>
        </div>

        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-8">Why Choose Kebabish Pizza?</h3>
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
          <p>&copy; 2024 Kebabish Pizza. All rights reserved.</p>
          <p className="mt-2">Okara | Sahiwal | Faisalabad</p>
        </div>
      </footer>
    </div>
  );
}
