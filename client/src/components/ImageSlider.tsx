import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage1 from "@assets/generated_images/Restaurant_hero_banner_image_3a83018b.png";
import pizzaImage from "@assets/generated_images/Pizza_menu_item_b86f5a67.png";
import burgerImage from "@assets/generated_images/Gourmet_burger_hero_image_fed670c3.png";

const slides = [
  {
    image: heroImage1,
    title: "Delicious Food, Delivered Fast",
    subtitle: "Order from our extensive menu and enjoy fresh, hot meals at your doorstep"
  },
  {
    image: pizzaImage,
    title: "Pizza Perfection",
    subtitle: "Handcrafted pizzas with premium toppings and authentic flavors"
  },
  {
    image: burgerImage,
    title: "Burgers & More",
    subtitle: "Juicy burgers, crispy wings, and delicious sides made fresh daily"
  }
];

export default function ImageSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="relative w-full h-[40vh] md:h-[60vh] overflow-hidden">
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          data-testid={`slide-${index}`}
        >
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${slide.image})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black/40" />
          </div>
          
          <div className="relative h-full flex flex-col items-center justify-center px-4 text-center">
            <h2 
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4" 
              data-testid={`text-hero-title-${index}`}
            >
              {slide.title}
            </h2>
            <p 
              className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl" 
              data-testid={`text-hero-subtitle-${index}`}
            >
              {slide.subtitle}
            </p>
          </div>
        </div>
      ))}

      <Button
        variant="ghost"
        size="icon"
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm"
        onClick={prevSlide}
        data-testid="button-prev-slide"
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm"
        onClick={nextSlide}
        data-testid="button-next-slide"
      >
        <ChevronRight className="h-6 w-6" />
      </Button>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2" data-testid="slider-dots">
        {slides.map((_, index) => (
          <button
            key={index}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentSlide ? "bg-white w-8" : "bg-white/50"
            }`}
            onClick={() => setCurrentSlide(index)}
            aria-label={`Go to slide ${index + 1}`}
            aria-current={index === currentSlide ? "true" : "false"}
            data-testid={`button-slide-${index}`}
          />
        ))}
      </div>
    </div>
  );
}
