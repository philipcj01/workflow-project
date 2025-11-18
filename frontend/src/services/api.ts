import axios from "axios";
import type { AxiosResponse } from "axios";
import type {
  Workflow,
  ExecutionResult,
  WorkflowCreateRequest,
} from "../types";

const API_BASE_URL = "http://localhost:3001/api";

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
    console.error("API Error:", error);
    return Promise.reject(error);
  }
);

export const workflowService = {
  async getWorkflows(): Promise<Workflow[]> {
    try {
      const response: AxiosResponse<Workflow[]> = await apiClient.get(
        "/workflows"
      );
      return response.data;
    } catch {
      console.warn("Failed to load workflows from API, using mock data");
      // Fallback to example workflows
      return [
        {
          id: "hello-world",
          name: "Hello World",
          description: "A simple introduction to workflow automation",
          version: "1.0.0",
        },
        {
          id: "api-pipeline",
          name: "API Pipeline",
          description: "API data processing pipeline",
          version: "1.0.0",
        },
      ];
    }
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
};

export const executionService = {
  async getExecutions(): Promise<ExecutionResult[]> {
    try {
      const response: AxiosResponse<ExecutionResult[]> = await apiClient.get(
        "/executions"
      );
      return response.data;
    } catch {
      console.warn("Failed to load executions from API");
      return [];
    }
  },

  async getExecution(executionId: string): Promise<ExecutionResult> {
    const response: AxiosResponse<ExecutionResult> = await apiClient.get(
      `/executions/${executionId}`
    );
    return response.data;
  },
};
