import { Minus, Plus, ShoppingBag, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatCurrency } from "@/lib/utils";
import type { MenuItem } from "./MenuItemCard";

export interface CartItemVariant {
  groupName: string;
  optionName: string;
}

export interface CartItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  image: string;
  variants?: CartItemVariant[];
  instructions?: string;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  popularItems?: MenuItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  onAddPopularItem?: (item: MenuItem) => void;
  onCheckout: () => void;
}

export default function CartDrawer({ 
  isOpen, 
  onClose, 
  items, 
  popularItems = [],
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onAddPopularItem,
  onCheckout 
}: CartDrawerProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 280;
    const newPosition = direction === 'left' 
      ? Math.max(0, scrollPosition - scrollAmount)
      : scrollPosition + scrollAmount;
    
    scrollContainerRef.current.scrollTo({ left: newPosition, behavior: 'smooth' });
    setScrollPosition(newPosition);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <SheetTitle data-testid="text-cart-title">Your Cart</SheetTitle>
          {items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearCart}
              className="text-destructive hover:text-destructive"
              data-testid="button-clear-cart"
            >
              Clear cart
            </Button>
          )}
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
            <ShoppingBag className="h-16 w-16 text-muted-foreground" />
            <div>
              <h3 className="font-semibold text-lg mb-2" data-testid="text-empty-cart">Your cart is empty</h3>
              <p className="text-sm text-muted-foreground">Add items from the menu to get started</p>
            </div>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4 py-4">
                {items.map((item) => (
                  <div key={item.id} className="space-y-2" data-testid={`cart-item-${item.id}`}>
                    <div className="flex gap-3">
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm mb-1" data-testid={`text-cart-item-name-${item.id}`}>
                          {item.name}
                        </h4>
                        {item.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {item.description}
                          </p>
                        )}
                        {item.variants && item.variants.length > 0 && (
                          <div className="space-y-1 mb-2">
                            {item.variants.map((variant, idx) => (
                              <p key={idx} className="text-xs text-muted-foreground" data-testid={`text-variant-${item.id}-${idx}`}>
                                <span className="font-medium">{variant.groupName}:</span> {variant.optionName}
                              </p>
                            ))}
                          </div>
                        )}
                        {item.instructions && (
                          <p className="text-xs text-muted-foreground italic mb-2">
                            Note: {item.instructions}
                          </p>
                        )}
                        <p className="text-sm font-bold" data-testid={`text-cart-item-price-${item.id}`}>
                          {formatCurrency(item.price)}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive flex-shrink-0"
                        onClick={() => onRemoveItem(item.id)}
                        data-testid={`button-remove-${item.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="icon" 
                        variant="outline"
                        className="h-8 w-8 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] text-white border-0"
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        data-testid={`button-decrease-${item.id}`}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-10 text-center font-medium text-sm" data-testid={`text-quantity-${item.id}`}>
                        {item.quantity}
                      </span>
                      <Button 
                        size="icon" 
                        variant="outline"
                        className="h-8 w-8 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] text-white border-0"
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        data-testid={`button-increase-${item.id}`}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {popularItems.length > 0 && onAddPopularItem && (
                <div className="border-t pt-4 pb-4">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="font-semibold text-base" data-testid="text-popular-items">Popular Items</h3>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleScroll('left')}
                        data-testid="button-scroll-left"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleScroll('right')}
                        data-testid="button-scroll-right"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div 
                    ref={scrollContainerRef}
                    className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {popularItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex-shrink-0 w-64 border rounded-lg p-3 hover-elevate snap-start cursor-pointer"
                        onClick={() => onAddPopularItem(item)}
                        data-testid={`popular-item-${item.id}`}
                      >
                        <div className="flex gap-3">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-20 h-20 object-cover rounded-md"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm mb-1 line-clamp-1">{item.name}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                              {item.description}
                            </p>
                            <p className="text-sm font-bold">from {formatCurrency(item.price)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ScrollArea>

            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span data-testid="text-subtotal">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Grand total</span>
                  <span data-testid="text-grand-total">{formatCurrency(subtotal)}</span>
                </div>
              </div>

              <Button 
                className="w-full bg-[#DC2626] hover:bg-[#B91C1C] text-white" 
                size="lg"
                onClick={onCheckout}
                data-testid="button-checkout"
              >
                Checkout
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
