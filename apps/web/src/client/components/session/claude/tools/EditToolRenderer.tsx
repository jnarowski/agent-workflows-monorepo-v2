/**
 * Renderer for Edit tool input
 * Shows file path and diff view
 */

import type { EditToolInput } from "@/shared/types/tool.types";
import { FileReference } from "@/client/components/chat/FileReference";
import { DiffViewer } from "@/client/components/chat/DiffViewer";

interface EditToolRendererProps {
  input: EditToolInput;
}

export function EditToolRenderer({ input }: EditToolRendererProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">File:</span>
        <FileReference filePath={input.file_path} />
        {input.replace_all && (
          <span className="text-xs text-muted-foreground">(replace all)</span>
        )}
      </div>
      <DiffViewer
        oldString={input.old_string}
        newString={input.new_string}
        filePath={input.file_path}
      />
    </div>
  );
}
