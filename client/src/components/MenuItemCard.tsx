import { Plus } from "lucide-react";
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
}

interface MenuItemCardProps {
  item: MenuItem;
  onAddToCart: (item: MenuItem) => void;
}

export default function MenuItemCard({ item, onAddToCart }: MenuItemCardProps) {
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
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-lg leading-tight" data-testid={`text-item-name-${item.id}`}>
            {item.name}
          </h3>
          <Button 
            size="icon" 
            className="shrink-0 rounded-full h-8 w-8"
            onClick={() => onAddToCart(item)}
            disabled={!item.isAvailable}
            data-testid={`button-add-${item.id}`}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3" data-testid={`text-item-description-${item.id}`}>
          {item.description}
        </p>
        
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold" data-testid={`text-item-price-${item.id}`}>
            {formatCurrency(item.price)}
          </span>
          <span className="text-xs text-muted-foreground">{item.category}</span>
        </div>
      </div>
    </Card>
  );
}
