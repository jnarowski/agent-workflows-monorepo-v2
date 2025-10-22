import { useState, useMemo, useEffect } from "react";
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  File,
  FileImage,
  ChevronRight,
  Search,
  X,
} from "lucide-react";
import { useProjectFiles } from "@/client/hooks/useFiles";
import { useActiveProject } from "@/client/hooks/navigation";
import { useFilesStore } from "@/client/stores";
import type { FileTreeItem } from "@/shared/types/file.types";
import { Input } from "@/client/components/ui/input";
import { Button } from "@/client/components/ui/button";
import { Skeleton } from "@/client/components/ui/skeleton";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { FileEditor } from "./FileEditor";
import { ImageViewer } from "./ImageViewer";

// Helper functions
function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  const codeExts = [
    "ts",
    "tsx",
    "js",
    "jsx",
    "py",
    "java",
    "c",
    "cpp",
    "go",
    "rs",
    "rb",
    "php",
  ];
  const imageExts = ["png", "jpg", "jpeg", "gif", "svg", "webp", "ico"];

  if (codeExts.includes(ext || "")) {
    return <FileCode className="h-4 w-4 text-blue-500" />;
  }
  if (imageExts.includes(ext || "")) {
    return <FileImage className="h-4 w-4 text-purple-500" />;
  }
  if (["md", "txt", "json", "yaml", "yml", "xml"].includes(ext || "")) {
    return <FileText className="h-4 w-4 text-gray-500" />;
  }
  return <File className="h-4 w-4 text-gray-400" />;
}

function isImageFile(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase();
  const imageExts = ["png", "jpg", "jpeg", "gif", "svg", "webp", "ico", "bmp"];
  return imageExts.includes(ext || "");
}

function filterFiles(items: FileTreeItem[], query: string): FileTreeItem[] {
  if (!query) return items;

  const lowerQuery = query.toLowerCase();
  const filtered: FileTreeItem[] = [];

  for (const item of items) {
    if (item.name.toLowerCase().includes(lowerQuery)) {
      // Item matches - include it
      filtered.push(item);
    } else if (item.type === "directory" && item.children) {
      // Check if any children match
      const filteredChildren = filterFiles(item.children, query);
      if (filteredChildren.length > 0) {
        // Include directory with filtered children
        filtered.push({
          ...item,
          children: filteredChildren,
        });
      }
    }
  }

  return filtered;
}

interface FileTreeItemProps {
  item: FileTreeItem;
  level: number;
  expandedDirs: Set<string>;
  onToggle: (path: string) => void;
  onFileClick: (item: FileTreeItem) => void;
}

function FileTreeItemComponent({
  item,
  level,
  expandedDirs,
  onToggle,
  onFileClick,
}: FileTreeItemProps) {
  const isExpanded = expandedDirs.has(item.path);

  if (item.type === "directory") {
    return (
      <div>
        <div
          className="flex items-center gap-2 px-2 py-1.5 hover:bg-secondary/50 cursor-pointer rounded-sm"
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => onToggle(item.path)}
        >
          <ChevronRight
            className={`h-3 w-3 transition-transform flex-shrink-0 ${
              isExpanded ? "rotate-90" : ""
            }`}
          />
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 text-blue-500 flex-shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{item.name}</span>
        </div>
        {isExpanded && item.children && item.children.length > 0 && (
          <div>
            {item.children.map((child) => (
              <FileTreeItemComponent
                key={child.path}
                item={child}
                level={level + 1}
                expandedDirs={expandedDirs}
                onToggle={onToggle}
                onFileClick={onFileClick}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // File item
  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 hover:bg-secondary/50 cursor-pointer rounded-sm"
      style={{ paddingLeft: `${level * 16 + 24}px` }}
      onClick={() => onFileClick(item)}
    >
      {getFileIcon(item.name)}
      <span className="text-sm">{item.name}</span>
    </div>
  );
}

export function FileTree() {
  const { projectId } = useActiveProject();
  const { data: files, isLoading, error } = useProjectFiles(projectId!);

  // Use filesStore for UI state
  const expandedDirs = useFilesStore((s) => s.expandedDirs);
  const toggleDir = useFilesStore((s) => s.toggleDir);
  const searchQuery = useFilesStore((s) => s.searchQuery);
  const setSearch = useFilesStore((s) => s.setSearch);
  const selectedFileFromStore = useFilesStore((s) => s.selectedFile);
  const setSelectedFile = useFilesStore((s) => s.setSelectedFile);
  const clearSelection = useFilesStore((s) => s.clearSelection);

  const [selectedFileItem, setSelectedFileItem] = useState<FileTreeItem | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

  // Auto-expand directories containing search matches
  useEffect(() => {
    if (searchQuery && files) {
      function collectExpandedPaths(
        items: FileTreeItem[],
        currentPath: string[] = []
      ) {
        for (const item of items) {
          if (item.type === "directory") {
            const itemPath = [...currentPath, item.name];

            // Check if this directory or any children match the search
            function hasMatch(node: FileTreeItem): boolean {
              if (node.name.toLowerCase().includes(searchQuery.toLowerCase())) {
                return true;
              }
              if (node.children) {
                return node.children.some(hasMatch);
              }
              return false;
            }

            if (hasMatch(item)) {
              // Expand this directory using store action
              useFilesStore.getState().expandDir(item.path);
            }

            if (item.children) {
              collectExpandedPaths(item.children, itemPath);
            }
          }
        }
      }

      collectExpandedPaths(files);
    }
  }, [searchQuery, files]);

  const filteredFiles = useMemo(() => {
    if (!files) return [];
    return filterFiles(files, searchQuery);
  }, [files, searchQuery]);

  const handleToggle = (path: string) => {
    toggleDir(path);
  };

  const handleFileClick = (item: FileTreeItem) => {
    setSelectedFileItem(item);
    setSelectedFile(item.path);
    if (isImageFile(item.name)) {
      setIsImageViewerOpen(true);
    } else {
      setIsEditorOpen(true);
    }
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setSelectedFileItem(null);
    clearSelection();
  };

  const handleCloseImageViewer = () => {
    setIsImageViewerOpen(false);
    setSelectedFileItem(null);
    clearSelection();
  };

  const handleClearSearch = () => {
    setSearch("");
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full p-4 space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-5/6" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertDescription>
            {error.message || "Failed to load files. Please try again."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Empty state
  if (!files || files.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center text-muted-foreground">
          <Folder className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No files found in this project.</p>
        </div>
      </div>
    );
  }

  // No search results
  if (searchQuery && filteredFiles.length === 0) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-2 p-4 border-b">
          <div className="flex items-center gap-2 flex-1 relative">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSearch}
                className="absolute right-1 h-7 w-7 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* No results message */}
        <div className="flex items-center justify-center flex-1 p-4">
          <div className="text-center text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No files match "{searchQuery}"</p>
            <Button variant="link" onClick={handleClearSearch} className="mt-2">
              Clear search
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-2 p-4 border-b">
          <div className="flex items-center gap-2 flex-1 relative">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSearch}
                className="absolute right-1 h-7 w-7 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* File tree content */}
        <div className="flex-1 overflow-auto p-2">
          {filteredFiles.map((item) => (
            <FileTreeItemComponent
              key={item.path}
              item={item}
              level={0}
              expandedDirs={expandedDirs}
              onToggle={handleToggle}
              onFileClick={handleFileClick}
            />
          ))}
        </div>
      </div>

      {/* File Editor Modal */}
      {isEditorOpen && selectedFileItem && (
        <FileEditor
          projectId={projectId!}
          filePath={selectedFileItem.path}
          fileName={selectedFileItem.name}
          onClose={handleCloseEditor}
        />
      )}

      {/* Image Viewer Modal */}
      {isImageViewerOpen && selectedFileItem && (
        <ImageViewer
          projectId={projectId!}
          filePath={selectedFileItem.path}
          fileName={selectedFileItem.name}
          onClose={handleCloseImageViewer}
        />
      )}
    </>
  );
}
