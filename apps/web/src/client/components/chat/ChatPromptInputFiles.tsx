"use client";

import {
  PromptInputButton,
  PromptInputCommand,
  PromptInputCommandEmpty,
  PromptInputCommandGroup,
  PromptInputCommandInput,
  PromptInputCommandItem,
  PromptInputCommandList,
  PromptInputCommandSeparator,
} from "@/client/components/ai-elements/prompt-input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/client/components/ui/popover";
import { AtSignIcon, GlobeIcon } from "lucide-react";
import { useEffect, useRef } from "react";

const sampleFiles = {
  activeTabs: [{ path: "prompt-input.tsx", location: "packages/elements/src" }],
  recents: [
    { path: "queue.tsx", location: "apps/test/app/examples" },
    { path: "queue.tsx", location: "packages/elements/src" },
  ],
  added: [
    { path: "prompt-input.tsx", location: "packages/elements/src" },
    { path: "queue.tsx", location: "apps/test/app/examples" },
    { path: "queue.tsx", location: "packages/elements/src" },
  ],
  filesAndFolders: [
    { path: "prompt-input.tsx", location: "packages/elements/src" },
    { path: "queue.tsx", location: "apps/test/app/examples" },
  ],
  code: [{ path: "prompt-input.tsx", location: "packages/elements/src" }],
  docs: [{ path: "README.md", location: "packages/elements" }],
};

interface ChatPromptInputFilesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ChatPromptInputFiles = ({
  open,
  onOpenChange,
}: ChatPromptInputFilesProps) => {
  const commandInputRef = useRef<HTMLInputElement>(null);

  // Focus command input when menu opens
  useEffect(() => {
    if (open && commandInputRef.current) {
      // Small delay to ensure the popover is rendered
      setTimeout(() => {
        commandInputRef.current?.focus();
      }, 0);
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <PromptInputButton>
          <AtSignIcon size={16} />
        </PromptInputButton>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[400px] p-0">
        <PromptInputCommand>
          <PromptInputCommandInput
            ref={commandInputRef}
            className="border-none focus-visible:ring-0"
            placeholder="Add files, folders, docs..."
          />
          <PromptInputCommandList>
            <PromptInputCommandEmpty className="p-3 text-muted-foreground text-sm">
              No results found.
            </PromptInputCommandEmpty>
            <PromptInputCommandGroup heading="Added">
              <PromptInputCommandItem>
                <GlobeIcon />
                <span>Active Tabs</span>
                <span className="ml-auto text-muted-foreground">✓</span>
              </PromptInputCommandItem>
            </PromptInputCommandGroup>
            <PromptInputCommandSeparator />
            <PromptInputCommandGroup heading="Other Files">
              {sampleFiles.added.map((file, index) => (
                <PromptInputCommandItem key={`${file.path}-${index}`}>
                  <GlobeIcon className="text-primary" />
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{file.path}</span>
                    <span className="text-muted-foreground text-xs">
                      {file.location}
                    </span>
                  </div>
                </PromptInputCommandItem>
              ))}
            </PromptInputCommandGroup>
          </PromptInputCommandList>
        </PromptInputCommand>
      </PopoverContent>
    </Popover>
  );
};
