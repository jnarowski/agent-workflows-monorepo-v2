import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateProject, useUpdateProject } from "@/client/pages/projects/hooks/useProjects";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import { Loader2 } from "lucide-react";
import type { Project } from "@/shared/types/project.types";

// Form validation schema
const projectFormSchema = z.object({
  name: z.string().min(1, "Project name is required").max(255),
  path: z.string().min(1, "Project path is required"),
});

type ProjectFormData = z.infer<typeof projectFormSchema>;

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project;
}

export function ProjectDialog({
  open,
  onOpenChange,
  project,
}: ProjectDialogProps) {
  const isEditMode = !!project;
  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: project
      ? {
          name: project.name,
          path: project.path,
        }
      : {
          name: "",
          path: "",
        },
  });

  // Reset form when dialog opens/closes or project changes
  useEffect(() => {
    if (open) {
      reset(
        project
          ? {
              name: project.name,
              path: project.path,
            }
          : {
              name: "",
              path: "",
            }
      );
    }
  }, [open, project, reset]);

  // Extract folder name from path
  const extractFolderName = (path: string): string => {
    if (!path) return "";
    // Remove trailing slashes
    const cleanPath = path.replace(/\/+$/, "");
    // Get last segment
    const segments = cleanPath.split("/");
    return segments[segments.length - 1] || "";
  };

  // Watch path changes and auto-populate name (only when creating new project)
  const currentPath = watch("path");

  useEffect(() => {
    // Only auto-populate name when creating (not editing) and name hasn't been manually changed
    if (!isEditMode && currentPath && !project) {
      const extractedName = extractFolderName(currentPath);
      if (extractedName) {
        setValue("name", extractedName);
      }
    }
  }, [currentPath, isEditMode, project, setValue]);

  const onSubmit = (data: ProjectFormData) => {
    if (isEditMode) {
      updateMutation.mutate(
        { id: project.id, data },
        {
          onSuccess: () => {
            onOpenChange(false);
          },
        }
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          onOpenChange(false);
        },
      });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Project" : "Create Project"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update your project information."
              : "Enter the full path to your project folder to create a new project."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="path">Project Folder Path</Label>
            <Input
              id="path"
              {...register("path")}
              placeholder="/Users/username/projects/my-project"
              className="font-mono text-sm"
              disabled={isLoading}
            />
            {errors.path && (
              <p className="text-sm text-destructive">{errors.path.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Paste the full absolute path to your project folder. The project name will be auto-extracted.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="my-project"
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Auto-filled from path. You can customize it if needed.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
