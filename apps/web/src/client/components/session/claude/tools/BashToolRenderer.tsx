/**
 * Renderer for Bash tool input
 * Shows command and optional description
 */

import { Terminal } from "lucide-react";
import type { BashToolInput } from "@/shared/types/tool.types";

interface BashToolRendererProps {
  input: BashToolInput;
}

export function BashToolRenderer({ input }: BashToolRendererProps) {
  return (
    <div className="space-y-2">
      {input.description && (
        <div className="text-sm text-muted-foreground">{input.description}</div>
      )}
      <div className="flex items-start gap-2 rounded-md bg-muted/50 px-3 py-2 border">
        <Terminal className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <code className="font-mono text-sm flex-1 break-all">
          {input.command}
        </code>
      </div>
      {input.timeout && (
        <div className="text-xs text-muted-foreground">
          Timeout: {input.timeout}ms
        </div>
      )}
    </div>
  );
}
