export interface Workflow {
  id: string;
  name: string;
  description: string;
  version: string;
  status?: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: string;
  status: "pending" | "running" | "completed" | "failed";
  startTime?: string;
  endTime?: string;
  output?: string;
}

export interface ExecutionResult {
  id: string;
  workflow: string;
  status: "running" | "completed" | "failed";
  startTime: string;
  endTime?: string;
  steps: WorkflowStep[];
}

export interface WorkflowCreateRequest {
  yaml: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}
