import { ShoppingCart, Phone, Menu, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

interface CustomerHeaderProps {
  cartItemCount?: number;
  onCartClick?: () => void;
  onMenuClick?: () => void;
}

export default function CustomerHeader({ 
  cartItemCount = 0, 
  onCartClick,
  onMenuClick 
}: CustomerHeaderProps) {
  const [, setLocation] = useLocation();
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-2">
          <Button 
            size="icon" 
            variant="ghost" 
            className="md:hidden"
            onClick={onMenuClick}
            data-testid="button-menu-toggle"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍕</span>
            <h1 className="text-xl md:text-2xl font-bold text-primary" data-testid="text-logo">Kebabish Pizza</h1>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 text-sm">
          <Phone className="h-4 w-4 text-primary" />
          <a href="tel:+923001234567" className="font-medium hover:text-primary" data-testid="text-phone">
            +92-300-1234567
          </a>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="default"
            onClick={() => setLocation("/admin")}
            data-testid="button-admin"
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Admin</span>
          </Button>
          <Button 
            size="icon" 
            variant="ghost" 
            className="relative"
            onClick={onCartClick}
            data-testid="button-cart"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartItemCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                data-testid="badge-cart-count"
              >
                {cartItemCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
