import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { useLanguage, LANGUAGES, CURRENCIES, type Language, type Currency } from "@/context/LanguageContext";
import { useTranslation } from "react-i18next";

export function LanguageSwitcher() {
  const { language, currency, changeLanguage, changeCurrency } = useLanguage();
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          data-testid="button-language-switcher"
        >
          <Globe className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t('settings.language')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={language} onValueChange={(val) => changeLanguage(val as Language)}>
          {Object.entries(LANGUAGES).map(([code, lang]) => (
            <DropdownMenuRadioItem 
              key={code} 
              value={code}
              data-testid={`language-option-${code}`}
            >
              <span className="mr-2">{lang.flag}</span>
              <span>{lang.nativeName}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel>{t('settings.currency')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={currency} onValueChange={(val) => changeCurrency(val as Currency)}>
          {Object.entries(CURRENCIES).map(([code, curr]) => (
            <DropdownMenuRadioItem 
              key={code} 
              value={code}
              data-testid={`currency-option-${code}`}
            >
              <span className="mr-2">{curr.symbol}</span>
              <span>{curr.name}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
