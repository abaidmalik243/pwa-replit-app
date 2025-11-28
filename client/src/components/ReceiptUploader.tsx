import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X, ExternalLink, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface ReceiptUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}

export function ReceiptUploader({ value, onChange, disabled }: ReceiptUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const maxFileSize = 10 * 1024 * 1024; // 10MB

  const uploadFile = async (file: File) => {
    if (!allowedTypes.includes(file.type)) {
      setError("Invalid file type. Please upload PDF, JPG, PNG, GIF, or WebP.");
      return;
    }

    if (file.size > maxFileSize) {
      setError("File too large. Maximum size is 10MB.");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const response = await apiRequest("/api/objects/upload", "POST");
      const data = await response.json();
      
      if (!data.uploadURL) {
        throw new Error("Failed to get upload URL");
      }
      
      const uploadURL = data.uploadURL;

      const uploadResponse = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      const urlWithoutParams = uploadURL.split('?')[0];
      const urlPath = new URL(urlWithoutParams).pathname;
      const pathParts = urlPath.split('/');
      const objectId = pathParts[pathParts.length - 1];
      const normalizedPath = `/objects/uploads/${objectId}`;
      
      onChange(normalizedPath);
      setFileName(file.name);
    } catch (err) {
      console.error("Upload error:", err);
      setError("Failed to upload file. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragOver(true);
    }
  }, [disabled, isUploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled || isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadFile(file);
    }
  }, [disabled, isUploading]);

  const handleClear = useCallback(() => {
    onChange("");
    setFileName(null);
    setError(null);
  }, [onChange]);

  const handleClick = useCallback(() => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  }, [disabled, isUploading]);

  const getDisplayName = () => {
    if (fileName) return fileName;
    if (value) {
      if (value.startsWith('/objects/')) {
        const pathParts = value.split('/');
        return pathParts[pathParts.length - 1] || "Receipt";
      }
      try {
        const url = new URL(value);
        const pathParts = url.pathname.split('/');
        return pathParts[pathParts.length - 1] || "Receipt";
      } catch {
        return "Receipt attached";
      }
    }
    return "Receipt attached";
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isUploading}
        data-testid="input-receipt-file"
      />

      {value ? (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="flex-1 text-sm truncate">
            {getDisplayName()}
          </span>
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground"
            data-testid="link-view-receipt"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            disabled={disabled}
            data-testid="button-clear-receipt"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors",
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50",
            (disabled || isUploading) && "opacity-50 cursor-not-allowed"
          )}
          data-testid="dropzone-receipt"
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">
                PDF, JPG, PNG, GIF, WebP (max 10MB)
              </p>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive" data-testid="text-upload-error">{error}</p>
      )}
    </div>
  );
}
