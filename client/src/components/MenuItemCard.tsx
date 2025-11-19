import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  isVegetarian?: boolean;
  isAvailable?: boolean;
  hasVariants?: boolean;
}

interface MenuItemCardProps {
  item: MenuItem;
  onAddToCart: (item: MenuItem) => void;
  onToggleFavorite?: (item: MenuItem) => void;
}

export default function MenuItemCard({ item, onAddToCart, onToggleFavorite }: MenuItemCardProps) {
  return (
    <Card className="overflow-hidden hover-elevate" data-testid={`card-menu-item-${item.id}`}>
      <div className="relative aspect-square">
        <img 
          src={item.image} 
          alt={item.name}
          className="w-full h-full object-cover"
        />
        {!item.isAvailable && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge variant="secondary" data-testid="badge-unavailable">Unavailable</Badge>
          </div>
        )}
        {item.isVegetarian && (
          <Badge className="absolute top-2 left-2 bg-green-600" data-testid="badge-vegetarian">🌱 Veg</Badge>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-lg leading-tight mb-2" data-testid={`text-item-name-${item.id}`}>
          {item.name}
        </h3>
        
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3" data-testid={`text-item-description-${item.id}`}>
          {item.description}
        </p>
        
        <div className="flex items-center justify-between gap-2">
          <span className="text-lg font-bold border-2 border-primary px-3 py-1 rounded" data-testid={`text-item-price-${item.id}`}>
            {item.hasVariants ? 'from ' : ''}{formatCurrency(item.price)}
          </span>
          <div className="flex items-center gap-2">
            <Button 
              size="sm"
              className="bg-[#F59E0B] hover:bg-[#D97706] text-white rounded px-4"
              onClick={() => onAddToCart(item)}
              disabled={!item.isAvailable}
              data-testid={`button-add-${item.id}`}
            >
              Add To Cart
            </Button>
            {onToggleFavorite && (
              <Button 
                size="icon"
                variant="outline"
                className="h-9 w-9 border-2 border-primary rounded"
                onClick={() => onToggleFavorite(item)}
                data-testid={`button-favorite-${item.id}`}
              >
                <Heart className="h-4 w-4 text-primary" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
