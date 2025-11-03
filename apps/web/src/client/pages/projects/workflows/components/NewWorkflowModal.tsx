/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import type { WorkflowDefinition } from '../types';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export interface NewWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  definitions: WorkflowDefinition[];
  onSubmit: (data: { definitionId: string; name: string; args: Record<string, any> }) => Promise<void>;
}

export function NewWorkflowModal({
  isOpen,
  onClose,
  definitions,
  onSubmit,
}: NewWorkflowModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedDefinitionId, setSelectedDefinitionId] = useState<string>('');
  const [workflowName, setWorkflowName] = useState('');
  const [args, setArgs] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedDefinition = definitions.find((d) => d.id === selectedDefinitionId);

  const handleClose = () => {
    if (isSubmitting) return;
    setStep(1);
    setSelectedDefinitionId('');
    setWorkflowName('');
    setArgs({});
    onClose();
  };

  const handleNext = () => {
    if (step === 1 && selectedDefinitionId) {
      // Generate default workflow name
      if (!workflowName) {
        const definition = definitions.find((d) => d.id === selectedDefinitionId);
        const timestamp = new Date().toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
        setWorkflowName(`${definition?.name} - ${timestamp}`);
      }
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDefinitionId || !workflowName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        definitionId: selectedDefinitionId,
        name: workflowName.trim(),
        args,
      });
      handleClose();
    } catch (error) {
      console.error('Failed to create workflow:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-2xl rounded-lg bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b p-6">
          <div>
            <h2 className="text-xl font-semibold">Create New Workflow</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Step {step} of 2: {step === 1 ? 'Select Template' : 'Configure'}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-md p-2 hover:bg-muted disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1: Select template */}
          {step === 1 && (
            <div className="max-h-[60vh] overflow-y-auto p-6">
              <div className="space-y-3">
                {definitions.map((definition) => (
                  <label
                    key={definition.id}
                    className={`block cursor-pointer rounded-lg border p-4 transition-all ${
                      selectedDefinitionId === definition.id
                        ? 'border-primary bg-primary/5 ring-2 ring-primary'
                        : 'hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="definition"
                        value={definition.id}
                        checked={selectedDefinitionId === definition.id}
                        onChange={(e) => setSelectedDefinitionId(e.target.value)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <h3 className="font-medium">{definition.name}</h3>
                        {definition.description && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {definition.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {definition.phases.map((phase, index) => {
                            const stepCount = Array.isArray(phase.steps) ? phase.steps.length : 0;
                            return (
                              <span
                                key={index}
                                className="rounded-full bg-muted px-2 py-0.5 text-xs"
                              >
                                {phase.name} ({stepCount})
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Configure */}
          {step === 2 && selectedDefinition && (
            <div className="max-h-[60vh] overflow-y-auto p-6">
              <div className="space-y-4">
                {/* Workflow name */}
                <div>
                  <label htmlFor="workflow-name" className="block text-sm font-medium mb-2">
                    Workflow Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="workflow-name"
                    type="text"
                    value={workflowName}
                    onChange={(e) => setWorkflowName(e.target.value)}
                    required
                    maxLength={200}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter a descriptive name..."
                  />
                </div>

                {/* Dynamic args based on schema */}
                {selectedDefinition.args_schema &&
                  selectedDefinition.args_schema.properties &&
                  Object.keys(selectedDefinition.args_schema.properties).length > 0 && (
                    <div className="space-y-4 border-t pt-4">
                      <h3 className="font-medium text-sm">Configuration</h3>
                      {Object.entries(selectedDefinition.args_schema.properties).map(
                        ([key, schema]: [string, any]) => (
                          <div key={key}>
                            <label htmlFor={`arg-${key}`} className="block text-sm font-medium mb-2">
                              {schema.title || key}
                              {selectedDefinition.args_schema.required?.includes(key) && (
                                <span className="text-destructive ml-1">*</span>
                              )}
                            </label>
                            {schema.description && (
                              <p className="text-xs text-muted-foreground mb-2">
                                {schema.description}
                              </p>
                            )}
                            <input
                              id={`arg-${key}`}
                              type={schema.type === 'number' ? 'number' : 'text'}
                              value={args[key] || ''}
                              onChange={(e) =>
                                setArgs({
                                  ...args,
                                  [key]:
                                    schema.type === 'number'
                                      ? Number(e.target.value)
                                      : e.target.value,
                                })
                              }
                              required={selectedDefinition.args_schema.required?.includes(key)}
                              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder={schema.placeholder || ''}
                            />
                          </div>
                        )
                      )}
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between border-t p-6">
            {step === 1 ? (
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="rounded-md px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            )}

            {step === 1 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!selectedDefinitionId}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!workflowName.trim() || isSubmitting}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Workflow'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
