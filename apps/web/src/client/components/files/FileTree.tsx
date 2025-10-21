import { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  File,
  ChevronRight,
  Search,
  X,
  List,
  Eye,
  TableProperties,
} from "lucide-react";
import { useProjectFiles } from "../../hooks/useFiles";
import type { FileTreeItem } from "../../../shared/types/file.types";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { Alert, AlertDescription } from "../ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";

type ViewMode = "simple" | "compact" | "detailed";

// Helper functions
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? "s" : ""} ago`;
  return new Date(date).toLocaleDateString();
}

function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  const codeExts = ["ts", "tsx", "js", "jsx", "py", "java", "c", "cpp", "go", "rs", "rb", "php"];

  if (codeExts.includes(ext || "")) {
    return <FileCode className="h-4 w-4 text-blue-500" />;
  }
  if (["md", "txt", "json", "yaml", "yml", "xml"].includes(ext || "")) {
    return <FileText className="h-4 w-4 text-gray-500" />;
  }
  return <File className="h-4 w-4 text-gray-400" />;
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
  viewMode: ViewMode;
  expandedDirs: Set<string>;
  selectedFile: string | null;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
}

function FileTreeItemComponent({
  item,
  level,
  viewMode,
  expandedDirs,
  selectedFile,
  onToggle,
  onSelect,
}: FileTreeItemProps) {
  const isExpanded = expandedDirs.has(item.path);
  const isSelected = selectedFile === item.path;

  if (item.type === "directory") {
    return (
      <Collapsible open={isExpanded} onOpenChange={() => onToggle(item.path)}>
        <div
          className={`flex items-center gap-2 px-2 py-1 hover:bg-secondary/50 cursor-pointer ${
            isSelected ? "bg-secondary" : ""
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => onSelect(item.path)}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={(e) => {
                e.stopPropagation();
                onToggle(item.path);
              }}
            >
              <ChevronRight
                className={`h-3 w-3 transition-transform ${
                  isExpanded ? "rotate-90" : ""
                }`}
              />
            </Button>
          </CollapsibleTrigger>
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 text-yellow-500" />
          ) : (
            <Folder className="h-4 w-4 text-yellow-500" />
          )}
          <span className="text-sm font-medium">{item.name}</span>
          {viewMode === "compact" && (
            <span className="text-xs text-muted-foreground ml-auto">
              {item.permissions}
            </span>
          )}
        </div>
        <CollapsibleContent>
          {item.children?.map((child) => (
            <FileTreeItemComponent
              key={child.path}
              item={child}
              level={level + 1}
              viewMode={viewMode}
              expandedDirs={expandedDirs}
              selectedFile={selectedFile}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  // File item
  return (
    <div
      className={`flex items-center gap-2 px-2 py-1 hover:bg-secondary/50 cursor-pointer ${
        isSelected ? "bg-secondary" : ""
      }`}
      style={{ paddingLeft: `${level * 16 + 24}px` }}
      onClick={() => onSelect(item.path)}
    >
      {getFileIcon(item.name)}
      <span className="text-sm">{item.name}</span>
      {viewMode === "compact" && (
        <>
          <span className="text-xs text-muted-foreground ml-auto">
            {item.size ? formatFileSize(item.size) : ""}
          </span>
          <span className="text-xs text-muted-foreground">
            {item.permissions}
          </span>
        </>
      )}
    </div>
  );
}

interface DetailedFileTreeItemProps {
  item: FileTreeItem;
  level: number;
  expandedDirs: Set<string>;
  selectedFile: string | null;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
}

function DetailedFileTreeItem({
  item,
  level,
  expandedDirs,
  selectedFile,
  onToggle,
  onSelect,
}: DetailedFileTreeItemProps) {
  const isExpanded = expandedDirs.has(item.path);
  const isSelected = selectedFile === item.path;

  if (item.type === "directory") {
    return (
      <>
        <Collapsible open={isExpanded} onOpenChange={() => onToggle(item.path)}>
          <div
            className={`grid grid-cols-[1fr,100px,150px,100px] gap-4 px-2 py-1 hover:bg-secondary/50 cursor-pointer ${
              isSelected ? "bg-secondary" : ""
            }`}
            onClick={() => onSelect(item.path)}
          >
            <div
              className="flex items-center gap-2"
              style={{ paddingLeft: `${level * 16}px` }}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(item.path);
                  }}
                >
                  <ChevronRight
                    className={`h-3 w-3 transition-transform ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
              {isExpanded ? (
                <FolderOpen className="h-4 w-4 text-yellow-500" />
              ) : (
                <Folder className="h-4 w-4 text-yellow-500" />
              )}
              <span className="text-sm font-medium">{item.name}</span>
            </div>
            <span className="text-sm text-muted-foreground">—</span>
            <span className="text-sm text-muted-foreground">
              {item.modified ? formatRelativeTime(item.modified) : "—"}
            </span>
            <span className="text-sm text-muted-foreground font-mono text-xs">
              {item.permissions || "—"}
            </span>
          </div>
          <CollapsibleContent>
            {item.children?.map((child) => (
              <DetailedFileTreeItem
                key={child.path}
                item={child}
                level={level + 1}
                expandedDirs={expandedDirs}
                selectedFile={selectedFile}
                onToggle={onToggle}
                onSelect={onSelect}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      </>
    );
  }

  // File item
  return (
    <div
      className={`grid grid-cols-[1fr,100px,150px,100px] gap-4 px-2 py-1 hover:bg-secondary/50 cursor-pointer ${
        isSelected ? "bg-secondary" : ""
      }`}
      onClick={() => onSelect(item.path)}
    >
      <div
        className="flex items-center gap-2"
        style={{ paddingLeft: `${level * 16 + 16}px` }}
      >
        {getFileIcon(item.name)}
        <span className="text-sm">{item.name}</span>
      </div>
      <span className="text-sm text-muted-foreground">
        {item.size ? formatFileSize(item.size) : "—"}
      </span>
      <span className="text-sm text-muted-foreground">
        {item.modified ? formatRelativeTime(item.modified) : "—"}
      </span>
      <span className="text-sm text-muted-foreground font-mono text-xs">
        {item.permissions || "—"}
      </span>
    </div>
  );
}

export function FileTree() {
  const { id } = useParams<{ id: string }>();
  const { data: files, isLoading, error } = useProjectFiles(id!);

  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem("fileTreeViewMode") as ViewMode) || "simple";
  });

  // Auto-expand directories containing search matches
  useEffect(() => {
    if (searchQuery && files) {
      const newExpanded = new Set<string>();

      function collectExpandedPaths(items: FileTreeItem[], currentPath: string[] = []) {
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
              // Add all parent paths
              for (let i = 1; i <= itemPath.length; i++) {
                newExpanded.add(item.path);
              }
            }

            if (item.children) {
              collectExpandedPaths(item.children, itemPath);
            }
          }
        }
      }

      collectExpandedPaths(files);
      setExpandedDirs(newExpanded);
    }
  }, [searchQuery, files]);

  // Persist view mode to localStorage
  useEffect(() => {
    localStorage.setItem("fileTreeViewMode", viewMode);
  }, [viewMode]);

  const filteredFiles = useMemo(() => {
    if (!files) return [];
    return filterFiles(files, searchQuery);
  }, [files, searchQuery]);

  const handleToggle = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleSelect = (path: string) => {
    setSelectedFile(path);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
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
        <div className="flex items-center justify-between gap-2 p-4 border-b">
          <div className="flex items-center gap-2 flex-1 relative">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
          <div className="flex gap-1">
            <Button
              variant={viewMode === "simple" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("simple")}
              title="Simple view"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "compact" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("compact")}
              title="Compact view"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "detailed" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("detailed")}
              title="Detailed view"
            >
              <TableProperties className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* No results message */}
        <div className="flex items-center justify-center flex-1 p-4">
          <div className="text-center text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No files match "{searchQuery}"</p>
            <Button
              variant="link"
              onClick={handleClearSearch}
              className="mt-2"
            >
              Clear search
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 p-4 border-b">
        <div className="flex items-center gap-2 flex-1 relative">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
        <div className="flex gap-1">
          <Button
            variant={viewMode === "simple" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("simple")}
            title="Simple view"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "compact" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("compact")}
            title="Compact view"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "detailed" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("detailed")}
            title="Detailed view"
          >
            <TableProperties className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Column headers for detailed view */}
      {viewMode === "detailed" && (
        <div className="grid grid-cols-[1fr,100px,150px,100px] gap-4 px-2 py-2 border-b bg-secondary/30 text-sm font-semibold">
          <div>Name</div>
          <div>Size</div>
          <div>Modified</div>
          <div>Permissions</div>
        </div>
      )}

      {/* File tree content */}
      <div className="flex-1 overflow-auto">
        {viewMode === "detailed" ? (
          filteredFiles.map((item) => (
            <DetailedFileTreeItem
              key={item.path}
              item={item}
              level={0}
              expandedDirs={expandedDirs}
              selectedFile={selectedFile}
              onToggle={handleToggle}
              onSelect={handleSelect}
            />
          ))
        ) : (
          filteredFiles.map((item) => (
            <FileTreeItemComponent
              key={item.path}
              item={item}
              level={0}
              viewMode={viewMode}
              expandedDirs={expandedDirs}
              selectedFile={selectedFile}
              onToggle={handleToggle}
              onSelect={handleSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}
