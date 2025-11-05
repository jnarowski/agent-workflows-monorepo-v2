import { Download } from "lucide-react";
import type { WorkflowArtifact } from "../../types";
import { formatFileSize, getFileIcon } from "../../utils/workflowFormatting";

interface ArtifactRowProps {
  artifact: WorkflowArtifact;
}

export function ArtifactRow({ artifact }: ArtifactRowProps) {
  const fileIcon = getFileIcon(artifact.name, artifact.mime_type);
  const isImage = artifact.mime_type.startsWith("image/");

  const handleDownload = () => {
    window.open(`/api/artifacts/${artifact.id}/download`, "_blank");
  };

  return (
    <div className="flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors group">
      {/* Icon/Thumbnail */}
      {isImage && artifact.file_path ? (
        <div className="h-10 w-10 rounded overflow-hidden bg-muted flex-shrink-0">
          <img
            src={artifact.file_path}
            alt={artifact.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
          <span className="text-2xl">{fileIcon}</span>
        </div>
      )}

      {/* Artifact Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate" title={artifact.name}>
            {artifact.name}
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            [ARTIFACT: {artifact.id}]
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
          <span>{artifact.file_type}</span>
          <span>{formatFileSize(artifact.size_bytes)}</span>
          <span>{new Date(artifact.created_at).toLocaleString()}</span>
        </div>
      </div>

      {/* Download Button */}
      <button
        onClick={handleDownload}
        className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
        aria-label={`Download ${artifact.name}`}
      >
        <Download className="h-3 w-3" />
        Download
      </button>
    </div>
  );
}
