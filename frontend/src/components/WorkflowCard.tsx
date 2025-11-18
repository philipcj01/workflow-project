import React from "react";
import { Play, Workflow as Workflow2, Clock, Sparkles } from "lucide-react";
import type { Workflow } from "../types";

interface WorkflowCardProps {
  workflow: Workflow;
  onExecute: (id: string) => void;
  isExecuting: boolean;
}

export const WorkflowCard: React.FC<WorkflowCardProps> = ({
  workflow,
  onExecute,
  isExecuting,
}) => {
  const handleExecute = () => {
    onExecute(workflow.id);
  };

  // Get a workflow icon based on workflow type or name
  const getWorkflowIcon = () => {
    const name = workflow.name?.toLowerCase() || "";
    if (name.includes("api") || name.includes("http")) {
      return <Sparkles size={20} />;
    }
    if (name.includes("email") || name.includes("notification")) {
      return <Clock size={20} />;
    }
    return <Workflow2 size={20} />;
  };

  return (
    <div className="workflow-card">
      <div className="workflow-header">
        <div className="workflow-icon">{getWorkflowIcon()}</div>
        <h3>{workflow.name}</h3>
      </div>
      <p>{workflow.description || "No description available"}</p>
      <div className="workflow-meta">
        <span>v{workflow.version}</span>
      </div>
      <button
        onClick={handleExecute}
        disabled={isExecuting}
        className="run-button"
      >
        <Play size={16} />
        {isExecuting ? "Running..." : "Run Workflow"}
      </button>
    </div>
  );
};
