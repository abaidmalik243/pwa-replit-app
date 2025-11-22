import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Global logout handler - will be set by AuthContext
let globalLogoutHandler: (() => void) | null = null;

export function setGlobalLogoutHandler(handler: () => void) {
  globalLogoutHandler = handler;
}

async function throwIfResNotOk(res: Response) {
  // 304 Not Modified is a success - it means use cached data
  if (res.status === 304) {
    return;
  }
  
  if (!res.ok) {
    // Handle 401 Unauthorized - trigger logout
    if (res.status === 401 && globalLogoutHandler) {
      globalLogoutHandler();
    }
    
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  method: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: HeadersInit = data ? { "Content-Type": "application/json" } : {};

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // Send cookies with request
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Build URL from queryKey
    let url = queryKey[0] as string;
    
    // Handle structured query keys with searchParams
    if (queryKey.length > 1 && typeof queryKey[1] === 'object' && queryKey[1] !== null) {
      const options = queryKey[1] as { searchParams?: Record<string, string | number> };
      if (options.searchParams) {
        const params = new URLSearchParams();
        Object.entries(options.searchParams).forEach(([key, value]) => {
          params.append(key, String(value));
        });
        const queryString = params.toString();
        url = queryString ? `${url}?${queryString}` : url;
      }
    }
    
    const res = await fetch(url, {
      credentials: "include", // Send cookies with request
      cache: "no-store", // Bypass HTTP cache to avoid 304 responses
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
