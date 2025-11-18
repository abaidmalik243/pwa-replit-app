import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import pizzaBanner from "@assets/generated_images/Delicious_gourmet_pizza_banner_99a9c003.png";
import burgerBanner from "@assets/generated_images/Juicy_burger_with_fries_banner_bef48246.png";
import kebabBanner from "@assets/generated_images/Traditional_kebabs_platter_banner_ff91db4e.png";

const slides = [
  {
    id: 1,
    image: pizzaBanner,
    title: "Delicious Pizzas",
    subtitle: "Freshly baked with love, loaded with flavor",
  },
  {
    id: 2,
    image: burgerBanner,
    title: "Juicy Burgers",
    subtitle: "Premium ingredients, unforgettable taste",
  },
  {
    id: 3,
    image: kebabBanner,
    title: "Authentic Kebabs",
    subtitle: "Traditional flavors, modern presentation",
  },
];

export function HeroSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const goToPrevious = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  return (
    <div className="relative w-full h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden group">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? "opacity-100" : "opacity-0"
          }`}
        >
          <div
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${slide.image})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
            <div className="relative h-full flex items-center">
              <div className="container mx-auto px-4">
                <div className="max-w-2xl text-white">
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 animate-in fade-in slide-in-from-left duration-700">
                    {slide.title}
                  </h1>
                  <p className="text-xl md:text-2xl mb-8 animate-in fade-in slide-in-from-left duration-700 delay-150">
                    {slide.subtitle}
                  </p>
                  <Button
                    size="lg"
                    className="bg-primary hover:bg-primary/90 text-white animate-in fade-in slide-in-from-left duration-700 delay-300"
                    data-testid="button-order-now"
                  >
                    Order Now
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation Arrows - Hidden on mobile */}
      <Button
        variant="ghost"
        size="icon"
        className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={goToPrevious}
        data-testid="button-slider-prev"
      >
        <ChevronLeft className="h-8 w-8" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={goToNext}
        data-testid="button-slider-next"
      >
        <ChevronRight className="h-8 w-8" />
      </Button>

      {/* Dots Indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentSlide
                ? "bg-white w-8"
                : "bg-white/50 hover:bg-white/75"
            }`}
            data-testid={`button-slide-${index}`}
          />
        ))}
      </div>
    </div>
  );
}
