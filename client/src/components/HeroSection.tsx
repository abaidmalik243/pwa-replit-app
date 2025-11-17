import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import heroImage from "@assets/generated_images/Restaurant_hero_banner_image_3a83018b.png";

interface HeroSectionProps {
  onSearch?: (query: string) => void;
}

export default function HeroSection({ onSearch }: HeroSectionProps) {
  return (
    <div className="relative w-full h-[40vh] md:h-[60vh] overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black/40" />
      </div>
      
      <div className="relative h-full flex flex-col items-center justify-center px-4 text-center">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4" data-testid="text-hero-title">
          Delicious Food, Delivered Fast
        </h2>
        <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl" data-testid="text-hero-subtitle">
          Order from our extensive menu and enjoy fresh, hot meals at your doorstep
        </p>
        
        <div className="relative w-full max-w-2xl">
          <div className="relative bg-white/10 backdrop-blur-md rounded-lg p-1 border border-white/20">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/70" />
              <Input
                type="search"
                placeholder="Search dishes, cuisines..."
                className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/60 focus-visible:ring-white/50"
                onChange={(e) => onSearch?.(e.target.value)}
                data-testid="input-search"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
