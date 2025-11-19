export interface Position {
  x: number;
  y: number;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: string;
  position: Position;
  params?: Record<string, any>;
  condition?: string;
}

export interface VisualWorkflow {
  name: string;
  description: string;
  version: string;
  steps: WorkflowStep[];
}

export interface StepType {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  category: "action" | "control" | "integration";
}

export interface DragItem {
  type: string;
  stepType?: string;
  stepId?: string;
}
