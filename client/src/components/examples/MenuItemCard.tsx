import MenuItemCard from '../MenuItemCard';
import burgerImage from '@assets/generated_images/Gourmet_burger_hero_image_fed670c3.png';

export default function MenuItemCardExample() {
  const item = {
    id: '1',
    name: 'Gourmet Burger',
    description: 'Juicy beef patty with cheese, lettuce, tomato, and special sauce',
    price: 12.99,
    image: burgerImage,
    category: 'Main Course',
    isVegetarian: false,
    isAvailable: true
  };
  
  return (
    <div className="w-full max-w-sm">
      <MenuItemCard 
        item={item}
        onAddToCart={(item) => console.log('Added to cart:', item)}
      />
    </div>
  );
}
