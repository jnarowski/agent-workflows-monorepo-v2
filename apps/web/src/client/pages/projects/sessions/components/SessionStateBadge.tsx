import { Loader2 } from "lucide-react";
import { Badge } from "@/client/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";

interface SessionStateBadgeProps {
  state: "idle" | "working" | "error";
  errorMessage?: string | null;
}

export function SessionStateBadge({
  state,
  errorMessage,
}: SessionStateBadgeProps) {
  // Don't show badge for idle state (clean default)
  if (state === "idle") {
    return null;
  }

  // Working state - show animated spinner badge
  if (state === "working") {
    return (
      <Badge variant="secondary" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Streaming
      </Badge>
    );
  }

  // Error state - show red badge with tooltip
  if (state === "error") {
    const errorText = errorMessage || "An error occurred";

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="destructive">Error</Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm">
            <p className="text-sm">{errorText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return null;
}
