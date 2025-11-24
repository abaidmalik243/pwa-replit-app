import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

export type Language = 'en' | 'ur' | 'ar';
export type Currency = 'PKR' | 'USD' | 'AED' | 'SAR';

export const LANGUAGES = {
  en: { name: 'English', nativeName: 'English', flag: '🇬🇧', dir: 'ltr' },
  ur: { name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰', dir: 'rtl' },
  ar: { name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', dir: 'rtl' },
} as const;

export const CURRENCIES = {
  PKR: { symbol: 'Rs', name: 'Pakistani Rupee', locale: 'en-PK' },
  USD: { symbol: '$', name: 'US Dollar', locale: 'en-US' },
  AED: { symbol: 'د.إ', name: 'UAE Dirham', locale: 'ar-AE' },
  SAR: { symbol: 'ر.س', name: 'Saudi Riyal', locale: 'ar-SA' },
} as const;

interface UserPreferences {
  language?: Language;
  currency?: Currency;
}

interface LanguageContextType {
  language: Language;
  currency: Currency;
  changeLanguage: (lang: Language) => void;
  changeCurrency: (curr: Currency) => void;
  formatCurrency: (amount: number) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'en';
  });
  const [currency, setCurrency] = useState<Currency>(() => {
    const saved = localStorage.getItem('currency');
    return (saved as Currency) || 'PKR';
  });

  const isRTL = LANGUAGES[language].dir === 'rtl';

  // Fetch user preferences if authenticated (wait for auth to finish loading)
  const { data: userPrefs, isLoading: prefsLoading } = useQuery<UserPreferences>({
    queryKey: ['/api/user/preferences', user?.id],
    enabled: isAuthenticated && !authLoading,
    retry: false,
  });

  // Save preferences mutation
  const savePreferencesMutation = useMutation({
    mutationFn: async (data: { language?: Language; currency?: Currency }) => {
      return await apiRequest('/api/user/preferences', 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences', user?.id] });
    },
    onError: (error: any) => {
      console.error('Failed to save preferences:', error);
      toast({
        title: "Preference Save Failed",
        description: "Your language and currency preferences couldn't be saved to your account. They will remain in this browser only.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    // Apply language to i18n
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
    
    // Apply RTL/LTR direction
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    
    // Save to localStorage
    localStorage.setItem('language', language);
  }, [language, i18n, isRTL]);

  useEffect(() => {
    // Save currency to localStorage
    localStorage.setItem('currency', currency);
  }, [currency]);

  // Load user preferences whenever they're available and different from local state
  // This ensures backend preferences always sync (including after refetches)
  useEffect(() => {
    if (!authLoading && !prefsLoading && userPrefs) {
      if (userPrefs.language && userPrefs.language !== language) {
        setLanguage(userPrefs.language);
      }
      if (userPrefs.currency && userPrefs.currency !== currency) {
        setCurrency(userPrefs.currency);
      }
    }
  }, [userPrefs, authLoading, prefsLoading]);

  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
    // Save to backend only if user is authenticated
    if (isAuthenticated) {
      savePreferencesMutation.mutate({ language: lang });
    }
  };

  const changeCurrency = (curr: Currency) => {
    setCurrency(curr);
    // Save to backend only if user is authenticated
    if (isAuthenticated) {
      savePreferencesMutation.mutate({ currency: curr });
    }
  };

  const formatCurrency = (amount: number): string => {
    const currencyInfo = CURRENCIES[currency];
    const formatted = new Intl.NumberFormat(currencyInfo.locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
    
    return formatted;
  };

  const value: LanguageContextType = {
    language,
    currency,
    changeLanguage,
    changeCurrency,
    formatCurrency,
    isRTL,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
