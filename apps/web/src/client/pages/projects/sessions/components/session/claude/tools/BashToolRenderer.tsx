/**
 * Renderer for Bash tool input
 * Shows command
 */

import type { BashToolInput } from "@/shared/types/tool.types";

interface BashToolRendererProps {
  input: BashToolInput;
}

export function BashToolRenderer({ input }: BashToolRendererProps) {
  return (
    <div className="space-y-2">
      <code className="font-mono text-sm block break-all">{input.command}</code>
      {input.timeout && (
        <div className="text-xs text-muted-foreground">
          Timeout: {input.timeout}ms
        </div>
      )}
    </div>
  );
}
