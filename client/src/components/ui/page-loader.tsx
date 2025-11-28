import { Loader2 } from "lucide-react";

interface PageLoaderProps {
  message?: string;
}

export function PageLoader({ message = "Loading..." }: PageLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground" data-testid="text-loading">
        {message}
      </p>
    </div>
  );
}

interface TableLoaderProps {
  rows?: number;
  columns?: number;
}

export function TableLoader({ rows = 5, columns = 5 }: TableLoaderProps) {
  return (
    <div className="w-full space-y-3" data-testid="loader-table">
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className="h-4 bg-muted rounded animate-pulse"
            style={{ width: `${100 / columns}%` }}
          />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="h-10 bg-muted/50 rounded animate-pulse"
              style={{ width: `${100 / columns}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

interface CardLoaderProps {
  count?: number;
}

export function CardLoader({ count = 3 }: CardLoaderProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="loader-cards">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-6 border rounded-lg space-y-3">
          <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
          <div className="h-3 bg-muted/50 rounded animate-pulse w-1/2" />
          <div className="h-8 bg-muted/30 rounded animate-pulse w-full mt-4" />
        </div>
      ))}
    </div>
  );
}

interface InlineLoaderProps {
  size?: "sm" | "md" | "lg";
}

export function InlineLoader({ size = "md" }: InlineLoaderProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <Loader2
      className={`animate-spin text-muted-foreground ${sizeClasses[size]}`}
      data-testid="loader-inline"
    />
  );
}
