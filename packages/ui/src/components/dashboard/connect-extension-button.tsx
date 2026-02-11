"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface ConnectExtensionButtonProps {
  hasSyncedBefore: boolean;
}

export function ConnectExtensionButton({ hasSyncedBefore }: ConnectExtensionButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Call the token generation API
      const response = await fetch("/api/sync/token", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to generate sync token");
      }

      const data = await response.json();

      if (!data.success || !data.audibleUrl) {
        throw new Error("Invalid response from server");
      }

      // Open Audible URL in a new tab with the token
      window.open(data.audibleUrl, "_blank", "noopener,noreferrer");

      // Show success toast
      toast.success(
        hasSyncedBefore
          ? "Sync token generated! Opening Audible..."
          : "Connection ready! Opening Audible..."
      );
    } catch (err) {
      console.error("Error connecting extension:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to connect extension";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button onClick={handleConnect} disabled={isLoading} size="lg" className="w-full">
        {isLoading ? (
          <>
            <svg
              className="mr-2 h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Generating token...
          </>
        ) : hasSyncedBefore ? (
          "Update Library"
        ) : (
          "Connect Extension"
        )}
      </Button>

      {error && <p className="text-sm text-destructive text-center">{error}</p>}

      {!error && !isLoading && (
        <p className="text-xs text-muted-foreground text-center">
          This will open Audible in a new tab with a secure sync token
        </p>
      )}
    </div>
  );
}
