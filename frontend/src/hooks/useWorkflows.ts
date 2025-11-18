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
        try {
          await loadWorkflows(); // Refresh the list
        } catch (refreshError) {
          // If deletion succeeded but refresh failed, don't throw
          // The deletion was successful, just log silently for debugging
          if (process.env.NODE_ENV === "development") {
            console.debug(
              "Workflow deleted successfully but failed to refresh list:",
              refreshError
            );
          }
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to delete workflow"
        );
        throw err;
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
