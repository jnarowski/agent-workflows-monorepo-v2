"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Folder, MessageSquare, Terminal, FileText } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/client/components/ui/command";
import { useProjects } from "@/client/hooks/useProjects";
import { useAgentSessions } from "@/client/hooks/useAgentSessions";
import { Button } from "@/client/components/ui/button";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
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

  // Filter out hidden projects and sort alphabetically by name
  const sortedProjects = [...projects]
    .filter((project) => !project.is_hidden)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <span className="flex-1 text-left">Type to search...</span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>J
        </kbd>
      </button>
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
    <CommandGroup
      heading={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Folder className="h-4 w-4" />
            <span>{project.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(`/projects/${project.id}/chat`);
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
        </div>
      }
    >
      {recentSessions.map((session) => (
        <CommandItem
          key={session.id}
          onSelect={() =>
            onNavigate(`/projects/${project.id}/chat/${session.id}`)
          }
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
