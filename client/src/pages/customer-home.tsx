import { useState } from "react";
import CustomerHeader from "@/components/CustomerHeader";
import ImageSlider from "@/components/ImageSlider";
import Footer from "@/components/Footer";
import CategoryFilter from "@/components/CategoryFilter";
import MenuItemCard, { MenuItem } from "@/components/MenuItemCard";
import CartDrawer, { CartItem } from "@/components/CartDrawer";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

import burgerImage from "@assets/generated_images/Gourmet_burger_hero_image_fed670c3.png";
import friesImage from "@assets/generated_images/French_fries_menu_item_798d4b73.png";
import pizzaImage from "@assets/generated_images/Pizza_menu_item_b86f5a67.png";
import dessertImage from "@assets/generated_images/Dessert_menu_item_68b0df04.png";
import smoothieImage from "@assets/generated_images/Smoothie_bowl_menu_item_c11d017b.png";
import saladImage from "@assets/generated_images/Salad_menu_item_382600b1.png";
import beverageImage from "@assets/generated_images/Beverage_menu_item_083197e0.png";

//todo: remove mock functionality
const MOCK_MENU_ITEMS: MenuItem[] = [
  {
    id: "1",
    name: "Gourmet Burger",
    description: "Juicy beef patty with melted cheese, fresh lettuce, tomatoes, and our signature sauce",
    price: 12.99,
    image: burgerImage,
    category: "Main Course",
    isVegetarian: false,
    isAvailable: true,
  },
  {
    id: "2",
    name: "Crispy Fries",
    description: "Golden french fries seasoned with sea salt and herbs",
    price: 4.99,
    image: friesImage,
    category: "Appetizers",
    isVegetarian: true,
    isAvailable: true,
  },
  {
    id: "3",
    name: "Pepperoni Pizza",
    description: "Classic pizza with mozzarella cheese, pepperoni, and fresh basil",
    price: 14.99,
    image: pizzaImage,
    category: "Main Course",
    isVegetarian: false,
    isAvailable: true,
  },
  {
    id: "4",
    name: "Chocolate Lava Cake",
    description: "Warm chocolate cake with molten center, served with vanilla ice cream",
    price: 7.99,
    image: dessertImage,
    category: "Desserts",
    isVegetarian: true,
    isAvailable: true,
  },
  {
    id: "5",
    name: "Smoothie Bowl",
    description: "Fresh fruit smoothie topped with granola, berries, and chia seeds",
    price: 9.99,
    image: smoothieImage,
    category: "Beverages",
    isVegetarian: true,
    isAvailable: true,
  },
  {
    id: "6",
    name: "Caesar Salad",
    description: "Grilled chicken, romaine lettuce, parmesan cheese, and croutons",
    price: 10.99,
    image: saladImage,
    category: "Appetizers",
    isVegetarian: false,
    isAvailable: true,
  },
  {
    id: "7",
    name: "Iced Lemonade",
    description: "Refreshing homemade lemonade with fresh mint and lemon slices",
    price: 3.99,
    image: beverageImage,
    category: "Beverages",
    isVegetarian: true,
    isAvailable: true,
  },
];

export default function CustomerHome() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const categories = ["All", "Bestsellers", "Appetizers", "Main Course", "Desserts", "Beverages"];

  const filteredItems = MOCK_MENU_ITEMS.filter((item) => {
    const matchesCategory = activeCategory === "All" || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddToCart = (item: MenuItem) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1, image: item.image }];
    });

    toast({
      title: "Added to cart",
      description: `${item.name} has been added to your cart`,
    });
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    if (quantity === 0) {
      setCartItems((prev) => prev.filter((item) => item.id !== id));
    } else {
      setCartItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, quantity } : item))
      );
    }
  };

  const handleCheckout = () => {
    toast({
      title: "Order placed!",
      description: "Your order has been placed successfully. We'll notify you when it's ready.",
    });
    setCartItems([]);
    setIsCartOpen(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CustomerHeader
        cartItemCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
        onCartClick={() => setIsCartOpen(true)}
        onMenuClick={() => console.log("Menu clicked")}
      />

      <ImageSlider />

      <div className="container px-4 py-6">
        <div className="relative max-w-2xl mx-auto mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search dishes, cuisines..."
            className="pl-10"
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search"
          />
        </div>
      </div>

      <CategoryFilter
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      <main className="container px-4 py-8 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <MenuItemCard key={item.id} item={item} onAddToCart={handleAddToCart} />
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No items found</p>
          </div>
        )}
      </main>

      <Footer />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onCheckout={handleCheckout}
      />
    </div>
  );
}
