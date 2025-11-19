import { Phone, Mail, MapPin } from "lucide-react";
import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-card border-t mt-16">
      <div className="container px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🍕</span>
              <h3 className="text-xl font-bold text-primary">Kebabish Pizza</h3>
            </div>
            <p className="text-muted-foreground">
              Delicious pizzas, burgers, and more delivered to your doorstep. Quality food made with fresh ingredients.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Our Branches</h4>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-1 text-primary flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Okara</p>
                  <p>Main Bazaar, Okara</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-1 text-primary flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Sahiwal</p>
                  <p>Main Boulevard, Sahiwal</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-1 text-primary flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Faisalabad</p>
                  <p>D-Ground, Faisalabad</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Contact Us</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 text-primary" />
                <a href="tel:+923001234567" className="hover:text-primary transition-colors">
                  +92-300-1234567
                </a>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 text-primary" />
                <a href="mailto:info@kebabishpizza.com" className="hover:text-primary transition-colors">
                  info@kebabishpizza.com
                </a>
              </div>
            </div>
            <div className="mt-6">
              <p className="text-sm font-medium mb-2">Hours of Operation</p>
              <p className="text-sm text-muted-foreground">
                Daily: 11:00 AM - 11:00 PM
              </p>
            </div>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2 mb-3 text-sm">
            <Link href="/terms-conditions">
              <span className="text-muted-foreground hover:text-primary transition-colors hover-elevate px-3 py-1 rounded cursor-pointer" data-testid="link-terms-conditions">
                Terms & Conditions
              </span>
            </Link>
            <span className="text-muted-foreground">|</span>
            <Link href="/privacy-policy">
              <span className="text-muted-foreground hover:text-primary transition-colors hover-elevate px-3 py-1 rounded cursor-pointer" data-testid="link-privacy-policy">
                Privacy Policy
              </span>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Kebabish Pizza. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
