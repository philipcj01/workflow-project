import React from "react";
import { useDrag } from "react-dnd";
import {
  MessageSquare,
  Globe,
  Mail,
  Clock,
  Code,
  GitBranch,
  Trash2,
  Settings,
} from "lucide-react";
import type { WorkflowStep, DragItem } from "../../types/workflow-builder";

interface WorkflowStepNodeProps {
  step: WorkflowStep;
  isSelected: boolean;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

const iconComponents = {
  log: MessageSquare,
  http: Globe,
  email: Mail,
  wait: Clock,
  script: Code,
  conditional: GitBranch,
};

const stepColors = {
  log: "#3B82F6",
  http: "#10B981",
  email: "#F59E0B",
  wait: "#8B5CF6",
  script: "#EF4444",
  conditional: "#6366F1",
};

export const WorkflowStepNode: React.FC<WorkflowStepNodeProps> = ({
  step,
  isSelected,
  onClick,
  onDelete,
}) => {
  const [{ isDragging }, drag, dragPreview] = useDrag<
    DragItem,
    void,
    { isDragging: boolean }
  >({
    type: "STEP_NODE",
    item: { type: "STEP_NODE", stepId: step.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const IconComponent =
    iconComponents[step.type as keyof typeof iconComponents] || MessageSquare;
  const stepColor =
    stepColors[step.type as keyof typeof stepColors] || "#6B7280";

  return (
    <div
      ref={(node) => {
        drag(node);
        dragPreview(node);
      }}
      className={`workflow-step-node ${isSelected ? "selected" : ""} ${
        isDragging ? "dragging" : ""
      }`}
      style={{
        position: "absolute",
        left: step.position.x,
        top: step.position.y,
        opacity: isDragging ? 0.5 : 1,
      }}
      onClick={onClick}
    >
      <div className="step-node-header" style={{ backgroundColor: stepColor }}>
        <div className="step-icon">
          <IconComponent size={16} color="white" />
        </div>
        <div className="step-type">{step.type.toUpperCase()}</div>
        <div className="step-actions">
          <button
            className="step-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            title="Configure"
          >
            <Settings size={14} color="white" />
          </button>
          <button
            className="step-action-btn delete"
            onClick={onDelete}
            title="Delete"
          >
            <Trash2 size={14} color="white" />
          </button>
        </div>
      </div>

      <div className="step-node-body">
        <div className="step-name">{step.name}</div>
        {step.params && Object.keys(step.params).length > 0 && (
          <div className="step-params">
            {Object.entries(step.params)
              .slice(0, 2)
              .map(([key, value]) => (
                <div key={key} className="param-preview">
                  <span className="param-key">{key}:</span>
                  <span className="param-value">
                    {typeof value === "string" && value.length > 20
                      ? `${value.substring(0, 20)}...`
                      : String(value)}
                  </span>
                </div>
              ))}
            {Object.keys(step.params).length > 2 && (
              <div className="param-preview more">
                +{Object.keys(step.params).length - 2} more
              </div>
            )}
          </div>
        )}
      </div>

      {step.condition && (
        <div className="step-condition">
          <div className="condition-label">Condition: {step.condition}</div>
        </div>
      )}
    </div>
  );
};
