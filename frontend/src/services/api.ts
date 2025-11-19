import axios from "axios";
import type { AxiosResponse } from "axios";
import type {
  Workflow,
  ExecutionResult,
  WorkflowCreateRequest,
} from "../types";

// Use proxy configuration for development
const API_BASE_URL = "/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Extract detailed error message without console logging
    let errorMessage = "Network error occurred";

    if (error.response) {
      // Server responded with error status
      const { data, status } = error.response;
      errorMessage = data?.error || data?.message || `HTTP ${status} Error`;
    } else if (error.request) {
      // Network error
      errorMessage =
        "Unable to connect to server. Please check if the backend is running.";
    } else {
      // Other error
      errorMessage = error.message || "Unknown error occurred";
    }

    // Create a new error with the detailed message
    const enhancedError = new Error(errorMessage);
    (enhancedError as any).originalError = error;

    return Promise.reject(enhancedError);
  }
);

export const workflowService = {
  async getWorkflows(): Promise<Workflow[]> {
    const response: AxiosResponse<Workflow[]> = await apiClient.get(
      "/workflows"
    );
    return response.data;
  },

  async getWorkflow(id: string): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(
      `/workflows/${id}`
    );
    return response.data;
  },

  async executeWorkflow(workflowId: string): Promise<ExecutionResult> {
    const response: AxiosResponse<ExecutionResult> = await apiClient.post(
      `/workflows/${workflowId}/execute`
    );
    return response.data;
  },

  async createWorkflow(workflow: WorkflowCreateRequest): Promise<Workflow> {
    const response: AxiosResponse<Workflow> = await apiClient.post(
      "/workflows",
      workflow
    );
    return response.data;
  },

  async updateWorkflow(
    id: string,
    workflow: WorkflowCreateRequest
  ): Promise<Workflow> {
    const response: AxiosResponse<Workflow> = await apiClient.put(
      `/workflows/${id}`,
      workflow
    );
    return response.data;
  },

  async deleteWorkflow(id: string): Promise<void> {
    await apiClient.delete(`/workflows/${id}`);
  },
};

export const executionService = {
  async getExecutions(): Promise<ExecutionResult[]> {
    const response: AxiosResponse<ExecutionResult[]> = await apiClient.get(
      "/executions"
    );
    return response.data;
  },

  async getExecution(executionId: string): Promise<ExecutionResult> {
    const response: AxiosResponse<ExecutionResult> = await apiClient.get(
      `/executions/${executionId}`
    );
    return response.data;
  },

  async clearExecutions(): Promise<void> {
    await apiClient.delete("/executions");
  },
};
