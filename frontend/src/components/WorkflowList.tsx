import React from "react";
import { WorkflowCard } from "./WorkflowCard";
import { ExecutionList } from "./ExecutionList";
import { useWorkflows, useExecutions } from "../hooks/useWorkflows";
import { useNotifications } from "../contexts/NotificationContext";
import { useNavigate } from "react-router-dom";

export const WorkflowList: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotifications();
  const {
    workflows,
    loading: workflowLoading,
    error: workflowError,
    executeWorkflow,
    deleteWorkflow,
    refetch: refetchWorkflows,
  } = useWorkflows();
  const {
    executions,
    loading: executionLoading,
    error: executionError,
    refetch: refetchExecutions,
    clearExecutions,
  } = useExecutions();

  const handleExecuteWorkflow = async (
    workflowId: string
  ): Promise<{ id: string; workflow: string }> => {
    try {
      const result = await executeWorkflow(workflowId);
      showSuccess("Workflow execution started successfully!");

      // Refresh executions after starting a workflow
      setTimeout(() => refetchExecutions(), 1000);

      // Return execution details for real-time tracking
      return {
        id: result.id,
        workflow: result.workflow || "Unknown Workflow",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to execute workflow";
      showError(errorMessage, "Execution Failed");
      throw error; // Re-throw so the component can handle it
    }
  };

  const handleEditWorkflow = (workflowId: string) => {
    // Navigate to edit page with workflow ID
    navigate(`/edit/${workflowId}`);
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    try {
      await deleteWorkflow(workflowId);
      showSuccess("Workflow deleted successfully!");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete workflow";
      showError(errorMessage, "Delete Failed");
    }
  };

  const handleClearExecutions = async () => {
    try {
      await clearExecutions();
      showSuccess("Execution history cleared successfully!");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to clear executions";
      showError(errorMessage, "Clear Failed");
    }
  };

  return (
    <div className="workflow-dashboard">
      <h2>Workflows</h2>
      {workflowLoading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          Loading workflows...
        </div>
      ) : workflowError ? (
        <div className="error-display">
          <div className="error-display-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L1 21h22L12 2zm-1 8v4h2v-4h-2zm0 6v2h2v-2h-2z" />
            </svg>
          </div>
          <div className="error-display-content">
            <h3>Failed to Load Workflows</h3>
            <p>{workflowError}</p>
            <div className="error-display-actions">
              <button
                onClick={() => refetchWorkflows()}
                className="retry-error-button"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="workflow-grid">
          {workflows.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              onExecute={handleExecuteWorkflow}
              onEdit={handleEditWorkflow}
              onDelete={handleDeleteWorkflow}
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
        onRetry={refetchExecutions}
        onClear={handleClearExecutions}
      />
    </div>
  );
};
