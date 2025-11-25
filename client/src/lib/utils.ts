import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string | null | undefined, currency: 'PKR' | 'USD' = 'PKR'): string {
  // Handle null, undefined, or invalid values
  if (amount === null || amount === undefined) {
    return currency === 'PKR' ? 'Rs 0' : '$0.00';
  }
  
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Handle NaN values
  if (isNaN(numAmount)) {
    return currency === 'PKR' ? 'Rs 0' : '$0.00';
  }
  
  if (currency === 'PKR') {
    return `Rs ${numAmount.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(numAmount);
}
