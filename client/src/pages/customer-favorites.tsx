import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import CustomerHeader from "@/components/CustomerHeader";
import Footer from "@/components/Footer";
import { Heart, ShoppingCart, Trash2, ChevronLeft } from "lucide-react";

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string | null;
  categoryId: string;
}

interface Favorite {
  id: string;
  menuItemId: string;
  createdAt: string;
  menuItem: MenuItem;
}

export default function CustomerFavorites() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  if (!isAuthenticated || user?.role !== "customer") {
    setLocation("/login");
    return null;
  }

  const { data: favorites = [], isLoading } = useQuery<Favorite[]>({
    queryKey: [`/api/customers/${user.id}/favorites`],
  });

  const removeMutation = useMutation({
    mutationFn: (favoriteId: string) =>
      apiRequest(`/api/customers/${user.id}/favorites/${favoriteId}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${user.id}/favorites`] });
      toast({ title: "Success", description: "Removed from favorites" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <CustomerHeader />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/account")}
              data-testid="button-back"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-page-title">My Favorites</h1>
              <p className="text-muted-foreground" data-testid="text-favorites-count">
                {favorites.length} {favorites.length === 1 ? 'item' : 'items'} saved
              </p>
            </div>
          </div>

          {/* Favorites List */}
          {isLoading ? (
            <p data-testid="text-loading">Loading favorites...</p>
          ) : favorites.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2" data-testid="text-empty-state">No favorites yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Start adding your favorite items for quick access
                </p>
                <Button onClick={() => setLocation("/")} data-testid="button-browse-menu">
                  Browse Menu
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {favorites.map((favorite) => (
                <Card key={favorite.id} data-testid={`card-favorite-${favorite.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-lg" data-testid={`text-item-name-${favorite.id}`}>
                          {favorite.menuItem.name}
                        </CardTitle>
                        <CardDescription className="mt-1" data-testid={`text-item-description-${favorite.id}`}>
                          {favorite.menuItem.description}
                        </CardDescription>
                        <p className="text-lg font-bold text-primary mt-2" data-testid={`text-item-price-${favorite.id}`}>
                          ₨{favorite.menuItem.price.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => {
                            toast({ 
                              title: "Added to cart", 
                              description: `${favorite.menuItem.name} added to cart` 
                            });
                          }}
                          data-testid={`button-add-to-cart-${favorite.id}`}
                        >
                          <ShoppingCart className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (confirm("Remove from favorites?")) {
                              removeMutation.mutate(favorite.id);
                            }
                          }}
                          data-testid={`button-remove-${favorite.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
