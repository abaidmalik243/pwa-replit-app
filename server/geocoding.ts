interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

// Simple in-memory cache for geocoding results
const geocodeCache = new Map<string, { result: GeocodingResult | null; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_MAX_SIZE = 500;

// Rate limiting
const geocodeRateLimits = new Map<string, number>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

export function validateAddress(address: string): { valid: boolean; error?: string } {
  const trimmed = address.trim();
  
  if (!trimmed) {
    return { valid: false, error: "Address is required" };
  }
  
  if (trimmed.length < 5) {
    return { valid: false, error: "Address too short (minimum 5 characters)" };
  }
  
  return { valid: true };
}

export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  const normalizedAddress = address.trim().toLowerCase();
  
  // Check cache first
  const cached = geocodeCache.get(normalizedAddress);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.result;
  }

  // Rate limiting check
  const now = Date.now();
  const recentRequests = geocodeRateLimits.get(normalizedAddress) || 0;
  
  if (recentRequests >= MAX_REQUESTS_PER_WINDOW) {
    console.warn('Geocoding rate limit exceeded for address:', normalizedAddress.substring(0, 20));
    return null;
  }

  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'Kebabish-Pizza-App/1.0'
        }
      }
    );

    if (!response.ok) {
      console.error('Geocoding API error:', response.statusText);
      return null;
    }

    const data = await response.json();
    
    if (!data || data.length === 0) {
      console.warn('No geocoding results for address:', address);
      // Cache null result to prevent repeated failed lookups
      cacheResult(normalizedAddress, null);
      return null;
    }

    const result: GeocodingResult = {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
      displayName: data[0].display_name
    };

    // Cache successful result
    cacheResult(normalizedAddress, result);
    
    // Update rate limit counter
    geocodeRateLimits.set(normalizedAddress, recentRequests + 1);
    setTimeout(() => {
      geocodeRateLimits.delete(normalizedAddress);
    }, RATE_LIMIT_WINDOW);

    return result;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

function cacheResult(address: string, result: GeocodingResult | null) {
  // Evict oldest entries if cache is full
  if (geocodeCache.size >= CACHE_MAX_SIZE) {
    const oldestKey = geocodeCache.keys().next().value;
    geocodeCache.delete(oldestKey);
  }

  geocodeCache.set(address, {
    result,
    timestamp: Date.now()
  });
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
