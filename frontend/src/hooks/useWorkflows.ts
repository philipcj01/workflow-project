import { useState, useEffect, useCallback } from "react";
import type { Workflow, ExecutionResult } from "../types";
import { workflowService, executionService } from "../services/api";

export const useWorkflows = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWorkflows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await workflowService.getWorkflows();
      setWorkflows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workflows");
    } finally {
      setLoading(false);
    }
  }, []);

  const executeWorkflow = useCallback(async (workflowId: string) => {
    setError(null);
    try {
      const result = await workflowService.executeWorkflow(workflowId);
      return result;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to execute workflow"
      );
      throw err;
    }
  }, []);

  const createWorkflow = useCallback(
    async (yaml: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await workflowService.createWorkflow({ yaml });
        await loadWorkflows(); // Refresh the list
        return result;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create workflow"
        );
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [loadWorkflows]
  );

  const updateWorkflow = useCallback(
    async (id: string, yaml: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await workflowService.updateWorkflow(id, { yaml });
        await loadWorkflows(); // Refresh the list
        return result;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update workflow"
        );
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [loadWorkflows]
  );

  const deleteWorkflow = useCallback(
    async (id: string) => {
      setError(null);
      try {
        // First, try to delete the workflow
        await workflowService.deleteWorkflow(id);

        // Immediately update local state to remove the deleted workflow
        // This ensures the UI updates even if the refresh fails
        setWorkflows((prev) => prev.filter((w) => w.id !== id));

        // Try to refresh from server, but don't let refresh errors interfere
        // with the successful deletion
        setTimeout(async () => {
          try {
            await loadWorkflows();
          } catch (refreshError) {
            // Log refresh error in development but don't show it to user
            // since the deletion was successful
            if (import.meta.env.DEV) {
              console.debug(
                "Workflow deleted successfully but failed to refresh list:",
                refreshError
              );
            }
            // Don't set error state for refresh failures after successful deletion
          }
        }, 100);
      } catch (err) {
        // Handle deletion errors specifically
        let errorMessage = "Failed to delete workflow";

        if (err instanceof Error) {
          if (
            err.message.includes("not found") ||
            err.message.includes("404")
          ) {
            // If workflow is not found, it may have already been deleted
            // Remove it from local state and don't treat this as an error
            setWorkflows((prev) => prev.filter((w) => w.id !== id));
            // Don't set an error message for this case - just silently succeed
            return;
          } else if (
            err.message.includes("Network error") ||
            err.message.includes("Unable to connect") ||
            err.message.includes("fetch")
          ) {
            errorMessage =
              "Unable to connect to server. Please check if the backend is running.";
          } else {
            errorMessage = err.message;
          }
        }

        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [loadWorkflows]
  );

  const getWorkflow = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await workflowService.getWorkflow(id);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workflow");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  return {
    workflows,
    loading,
    error,
    executeWorkflow,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    getWorkflow,
    refetch: loadWorkflows,
  };
};

export const useExecutions = () => {
  const [executions, setExecutions] = useState<ExecutionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadExecutions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await executionService.getExecutions();
      setExecutions(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load executions"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const clearExecutions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await executionService.clearExecutions();
      setExecutions([]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to clear executions"
      );
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExecutions();
  }, [loadExecutions]);

  return {
    executions,
    loading,
    error,
    refetch: loadExecutions,
    clearExecutions,
  };
};
