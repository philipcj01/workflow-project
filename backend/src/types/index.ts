import { z } from "zod";

// Base workflow schema
export const WorkflowSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  version: z.string().default("1.0.0"),
  variables: z.record(z.any()).optional(),
  steps: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      params: z.record(z.any()),
      condition: z.string().optional(),
      retries: z.number().default(0),
      timeout: z.number().optional(),
      onError: z.enum(["stop", "continue", "retry"]).default("stop"),
    })
  ),
});

export type Workflow = z.infer<typeof WorkflowSchema>;

// Step execution context
export interface StepContext {
  workflow: Workflow;
  variables: Record<string, any>;
  steps: Record<string, StepResult>;
  currentStep: string;
  runId: string;
  logger: Logger;
}

// Step result
export interface StepResult {
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
  timestamp: Date;
  retries: number;
}

// Step executor interface
export interface StepExecutor {
  type: string;
  execute(
    params: Record<string, any>,
    context: StepContext
  ): Promise<StepResult>;
  validate?(params: Record<string, any>): boolean;
}

// Workflow run
export interface WorkflowRun {
  id: string;
  workflowName: string;
  status: "running" | "completed" | "failed" | "paused";
  startTime: Date;
  endTime?: Date;
  steps: Record<string, StepResult>;
  variables: Record<string, any>;
  error?: string;
}

// Logger interface
export interface Logger {
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}

// Storage interface
export interface Storage {
  saveRun(run: WorkflowRun): Promise<void>;
  getRun(id: string): Promise<WorkflowRun | null>;
  listRuns(workflowName?: string): Promise<WorkflowRun[]>;
  updateRun(id: string, updates: Partial<WorkflowRun>): Promise<void>;
  clearAllRuns(): Promise<void>;
}

// Plugin interface
export interface Plugin {
  name: string;
  version: string;
  stepExecutors: StepExecutor[];
  hooks?: {
    beforeWorkflow?(workflow: Workflow, context: any): Promise<void>;
    afterWorkflow?(workflow: Workflow, result: WorkflowRun): Promise<void>;
    beforeStep?(step: any, context: StepContext): Promise<void>;
    afterStep?(
      step: any,
      result: StepResult,
      context: StepContext
    ): Promise<void>;
  };
}
