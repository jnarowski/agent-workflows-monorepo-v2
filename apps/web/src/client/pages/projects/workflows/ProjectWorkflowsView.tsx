/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { WorkflowStatusValues } from "@/shared/schemas/workflow.schemas";
import type { WorkflowStatus } from "@/shared/schemas/workflow.schemas";
import { WorkflowKanbanColumn } from "./components/WorkflowKanbanColumn";
import { WorkflowDefinitionsList } from "./components/WorkflowDefinitionsList";
import { NewRunDialog } from "./components/NewRunDialog";
import { useWorkflowRuns } from "./hooks/useWorkflowRuns";
import { useWorkflowDefinitions } from "./hooks/useWorkflowDefinitions";
import { useWorkflowWebSocket } from "./hooks/useWorkflowWebSocket";

export interface ProjectWorkflowsViewProps {
  projectId?: string;
}

export function ProjectWorkflowsView({
  projectId: propProjectId,
}: ProjectWorkflowsViewProps) {
  const { projectId: paramProjectId } = useParams<{ projectId: string }>();
  const projectId = propProjectId || paramProjectId!;
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [definitionFilter, setDefinitionFilter] = useState<
    string | undefined
  >();
  const [showNewRunDialog, setShowNewRunDialog] = useState(false);

  // Hooks
  const { data: runs, isLoading } = useWorkflowRuns(projectId, {
    search,
    definitionId: definitionFilter,
  });
  const { data: definitions } = useWorkflowDefinitions();
  useWorkflowWebSocket(projectId);

  // TODO: Wire up workflow control mutations
  // const pauseWorkflow = usePauseWorkflow();
  // const resumeWorkflow = useResumeWorkflow();
  // const cancelWorkflow = useCancelWorkflow();

  const handleExecutionClick = (run: any) => {
    // Navigate to run detail page
    const definitionId = run.workflow_definition_id;
    const runId = run.id;
    navigate(
      `/projects/${projectId}/workflows/${definitionId}/runs/${runId}`
    );
  };

  // Group runs by status
  const runsByStatus = (runs || []).reduce(
    (acc, run) => {
      if (!acc[run.status]) {
        acc[run.status] = [];
      }
      acc[run.status].push(run);
      return acc;
    },
    {} as Record<WorkflowStatus, any[]>
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Workflows</h1>
          <button
            onClick={() => setShowNewRunDialog(true)}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Run
          </button>
        </div>

        {/* Filters */}
        <div className="mt-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search workflows..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border bg-background py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={definitionFilter || ""}
            onChange={(e) => setDefinitionFilter(e.target.value || undefined)}
            className="rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Templates</option>
            {definitions?.map((def) => (
              <option key={def.id} value={def.id}>
                {def.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Workflow Definitions List */}
      <WorkflowDefinitionsList
        projectId={projectId}
        definitions={definitions || []}
        runs={runs || []}
      />

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 min-w-max">
          {[
            WorkflowStatusValues.PENDING,
            WorkflowStatusValues.RUNNING,
            WorkflowStatusValues.PAUSED,
            WorkflowStatusValues.COMPLETED,
            WorkflowStatusValues.FAILED,
          ].map((status) => (
            <div key={status} className="w-80">
              <WorkflowKanbanColumn
                status={status}
                runs={runsByStatus[status] || []}
                onExecutionClick={handleExecutionClick}
              />
            </div>
          ))}
        </div>
      </div>

      {/* New Run Dialog */}
      <NewRunDialog
        open={showNewRunDialog}
        onOpenChange={setShowNewRunDialog}
        projectId={projectId}
        definitionId=""
        definitions={definitions}
      />
    </div>
  );
}
