import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SessionResponse } from "@/shared/types";
import { api } from "@/client/utils/api-client";
import { toast } from "sonner";
import { projectKeys } from "@/client/pages/projects/hooks/useProjects";

export const sessionKeys = {
  all: ["agentSessions"] as const,
  byProject: (projectId: string) => ["agentSessions", projectId] as const,
};

export function useUpdateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const result = await api.patch<{ data: SessionResponse }>(
        `/api/sessions/${id}`,
        { name }
      );
      return result.data;
    },
    onSuccess: (updatedSession) => {
      // Update cache for the project's sessions
      queryClient.setQueryData<SessionResponse[]>(
        sessionKeys.byProject(updatedSession.projectId),
        (old) => {
          if (!old) return [updatedSession];
          return old.map((session) =>
            session.id === updatedSession.id ? updatedSession : session
          );
        }
      );

      // Invalidate projects with sessions query (used by sidebar)
      queryClient.invalidateQueries({ queryKey: projectKeys.withSessions() });

      toast.success("Session name updated successfully");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to update session name";
      toast.error(message);
    },
  });
}
