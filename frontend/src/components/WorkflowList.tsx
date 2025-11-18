import React from "react";
import { WorkflowCard } from "./WorkflowCard";
import { ExecutionList } from "./ExecutionList";
import { useWorkflows, useExecutions } from "../hooks/useWorkflows";
import { showNotification } from "../utils";

export const WorkflowList: React.FC = () => {
  const {
    workflows,
    loading: workflowLoading,
    error: workflowError,
    executeWorkflow,
  } = useWorkflows();
  const {
    executions,
    loading: executionLoading,
    error: executionError,
    refetch: refetchExecutions,
  } = useExecutions();

  const handleExecuteWorkflow = async (workflowId: string) => {
    try {
      await executeWorkflow(workflowId);
      showNotification("Workflow execution started successfully!");
      // Refresh executions after starting a workflow
      setTimeout(() => refetchExecutions(), 1000);
    } catch {
      showNotification("Failed to execute workflow", "error");
    }
  };

  if (workflowError) {
    return (
      <div className="error">Error loading workflows: {workflowError}</div>
    );
  }

  return (
    <div className="workflow-dashboard">
      <h2>Workflows</h2>
      {workflowLoading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          Loading workflows...
        </div>
      ) : (
        <div className="workflow-grid">
          {workflows.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              onExecute={handleExecuteWorkflow}
              isExecuting={workflowLoading}
            />
          ))}
          {workflows.length === 0 && (
            <div className="loading">
              No workflows found. Create your first workflow to get started!
            </div>
          )}
        </div>
      )}

      <h2>Recent Executions</h2>
      <ExecutionList
        executions={executions}
        loading={executionLoading}
        error={executionError}
      />
    </div>
  );
};
