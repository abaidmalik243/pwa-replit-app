import { useState } from 'react';
import CartDrawer, { CartItem } from '../CartDrawer';
import burgerImage from '@assets/generated_images/Gourmet_burger_hero_image_fed670c3.png';
import friesImage from '@assets/generated_images/French_fries_menu_item_798d4b73.png';
import { Button } from '@/components/ui/button';

export default function CartDrawerExample() {
  const [isOpen, setIsOpen] = useState(true);
  const [items, setItems] = useState<CartItem[]>([
    { id: '1', name: 'Gourmet Burger', price: 12.99, quantity: 2, image: burgerImage },
    { id: '2', name: 'French Fries', price: 4.99, quantity: 1, image: friesImage }
  ]);

  const handleUpdateQuantity = (id: string, quantity: number) => {
    if (quantity === 0) {
      setItems(items.filter(item => item.id !== id));
    } else {
      setItems(items.map(item => 
        item.id === id ? { ...item, quantity } : item
      ));
    }
  };

  return (
    <div>
      <Button onClick={() => setIsOpen(true)} data-testid="button-open-cart">
        Open Cart
      </Button>
      <CartDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        items={items}
        onUpdateQuantity={handleUpdateQuantity}
        onCheckout={() => console.log('Checkout clicked')}
      />
    </div>
  );
}
