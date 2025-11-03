import { FileText } from "lucide-react";

export interface Artifact {
  id: string;
  name: string;
  file_type?: string;
  size_bytes?: number;
}

export interface ArtifactListProps {
  artifacts: Artifact[];
  size?: "sm" | "md";
}

/**
 * Shared component for rendering artifact lists
 * Used by steps and events
 */
export function ArtifactList({ artifacts, size = "md" }: ArtifactListProps) {
  if (!artifacts || artifacts.length === 0) {
    return null;
  }

  const textSize = size === "sm" ? "text-xs" : "text-sm";
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div>
      <p className="text-sm font-medium">Artifacts</p>
      <div className="space-y-2">
        {artifacts.map((artifact) => (
          <div
            key={artifact.id}
            className={`flex items-center gap-2 rounded-md bg-muted p-2 ${textSize}`}
          >
            <FileText className={`${iconSize} text-muted-foreground`} />
            <span className="flex-1 truncate">{artifact.name}</span>
            <button
              onClick={() => {
                window.open(`/api/artifacts/${artifact.id}/download`, "_blank");
              }}
              className="text-primary hover:underline text-xs"
            >
              Download
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
