/* eslint-disable @typescript-eslint/no-explicit-any */
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Layers } from 'lucide-react';

interface WorkflowDefinitionsListProps {
  projectId: string;
  definitions: any[];
  executions: any[];
}

export function WorkflowDefinitionsList({
  projectId,
  definitions,
  executions,
}: WorkflowDefinitionsListProps) {
  const navigate = useNavigate();

  // Count executions per definition
  const executionCounts = executions.reduce(
    (acc, exec) => {
      const defId = exec.workflow_definition_id;
      acc[defId] = (acc[defId] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const handleDefinitionClick = (definitionId: string) => {
    navigate(`/projects/${projectId}/workflows/${definitionId}`);
  };

  if (!definitions || definitions.length === 0) {
    return null;
  }

  return (
    <div className="border-b bg-background">
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Workflow Templates
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {definitions.map((def) => {
            const execCount = executionCounts[def.id] || 0;
            const phaseCount = def.phases?.length || 0;

            return (
              <button
                key={def.id}
                onClick={() => handleDefinitionClick(def.id)}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent hover:border-primary transition-colors text-left group"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                    {def.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span>
                      {phaseCount} phase{phaseCount !== 1 ? 's' : ''}
                    </span>
                    <span>•</span>
                    <span>
                      {execCount} execution{execCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {def.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {def.description}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors ml-2 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
