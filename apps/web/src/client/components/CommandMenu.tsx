"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Folder, MessageSquare, Terminal, FileText, Search, Plus } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/client/components/ui/command";
import { useProjects } from "@/client/pages/projects/hooks/useProjects";
import { useAgentSessions } from "@/client/pages/projects/sessions/hooks/useAgentSessions";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { ProjectDialog } from "@/client/pages/projects/components/ProjectDialog";

interface CommandMenuProps {
  onSearchChange?: (query: string) => void;
}

export function CommandMenu({ onSearchChange }: CommandMenuProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearchChange?.(value);
  };

  // Filter out hidden projects and sort alphabetically by name
  const sortedProjects = [...projects]
    .filter((project) => !project.is_hidden)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search projects..."
          className="pl-9 pr-24"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setProjectDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <button
            onClick={() => setOpen(true)}
          >
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">⌘</span>J
            </kbd>
          </button>
        </div>
      </div>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search projects and sessions..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {projectsLoading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : (
            sortedProjects.map((project, index) => (
              <>
                <ProjectGroup
                  key={project.id}
                  project={project}
                  onNavigate={handleNavigate}
                />
                {index < sortedProjects.length - 1 && <CommandSeparator />}
              </>
            ))
          )}
        </CommandList>
      </CommandDialog>
      <ProjectDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
      />
    </>
  );
}

interface ProjectGroupProps {
  project: {
    id: string;
    name: string;
    path: string;
  };
  onNavigate: (path: string) => void;
}

function ProjectGroup({ project, onNavigate }: ProjectGroupProps) {
  const { data: sessions = [] } = useAgentSessions({
    projectId: project.id,
  });

  // Get the 5 most recent sessions, sorted by lastMessageAt
  const recentSessions = [...sessions]
    .sort((a, b) => {
      const dateA = new Date(a.metadata.lastMessageAt).getTime();
      const dateB = new Date(b.metadata.lastMessageAt).getTime();
      return dateB - dateA; // Most recent first
    })
    .slice(0, 5);

  return (
    <CommandGroup heading={project.name}>
      <CommandItem
        onSelect={() => onNavigate(`/projects/${project.id}`)}
        className="font-medium"
      >
        <Folder className="mr-2 h-4 w-4" />
        <span>{project.name}</span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(`/projects/${project.id}/session/new`);
            }}
          >
            <MessageSquare className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(`/projects/${project.id}/shell`);
            }}
          >
            <Terminal className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(`/projects/${project.id}/files`);
            }}
          >
            <FileText className="h-3 w-3" />
          </Button>
        </div>
      </CommandItem>
      {recentSessions.map((session) => (
        <CommandItem
          key={session.id}
          onSelect={() =>
            onNavigate(`/projects/${project.id}/session/${session.id}`)
          }
          className="pl-6"
          keywords={[session.metadata.firstMessagePreview || ""]}
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          <span className="truncate">
            {session.metadata.firstMessagePreview || "New session"}
          </span>
        </CommandItem>
      ))}
    </CommandGroup>
  );
}
