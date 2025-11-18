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
    setLoading(true);
    setError(null);
    try {
      const result = await workflowService.executeWorkflow(workflowId);
      return result;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to execute workflow"
      );
      throw err;
    } finally {
      setLoading(false);
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
      setLoading(true);
      setError(null);
      try {
        await workflowService.deleteWorkflow(id);

        // Immediately update local state to remove the deleted workflow
        setWorkflows((prev) => prev.filter((w) => w.id !== id));

        // Try to refresh from server, but don't fail if it doesn't work
        try {
          await loadWorkflows();
        } catch (refreshError) {
          // Log refresh error in development but don't propagate it
          if (import.meta.env.DEV) {
            console.debug(
              "Workflow deleted successfully but failed to refresh list:",
              refreshError
            );
          }
          // Clear any error state that might have been set by loadWorkflows
          setError(null);
        }
      } catch (err) {
        // More specific error handling for deletion
        let errorMessage = "Failed to delete workflow";

        if (err instanceof Error) {
          if (err.message.includes("not found")) {
            errorMessage =
              "Workflow not found - it may have already been deleted";
            // Remove from local state anyway since it doesn't exist
            setWorkflows((prev) => prev.filter((w) => w.id !== id));
          } else if (
            err.message.includes("Network error") ||
            err.message.includes("Unable to connect")
          ) {
            errorMessage =
              "Unable to connect to server. Please check if the backend is running.";
          } else {
            errorMessage = err.message;
          }
        }

        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
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

  useEffect(() => {
    loadExecutions();
  }, [loadExecutions]);

  return {
    executions,
    loading,
    error,
    refetch: loadExecutions,
  };
};
