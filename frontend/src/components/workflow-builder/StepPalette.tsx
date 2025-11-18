import React from "react";
import { useDrag } from "react-dnd";
import {
  MessageSquare,
  Globe,
  Mail,
  Clock,
  Code,
  GitBranch,
  Package,
} from "lucide-react";
import type { StepType, DragItem } from "../../types/workflow-builder";

const stepTypes: StepType[] = [
  {
    id: "log",
    name: "Log",
    icon: "MessageSquare",
    description: "Log a message to the console",
    color: "#3B82F6",
    category: "action",
  },
  {
    id: "http",
    name: "HTTP Request",
    icon: "Globe",
    description: "Make an HTTP request to an API",
    color: "#10B981",
    category: "integration",
  },
  {
    id: "email",
    name: "Send Email",
    icon: "Mail",
    description: "Send an email notification",
    color: "#F59E0B",
    category: "integration",
  },
  {
    id: "wait",
    name: "Wait",
    icon: "Clock",
    description: "Pause execution for a specified duration",
    color: "#8B5CF6",
    category: "control",
  },
  {
    id: "script",
    name: "Script",
    icon: "Code",
    description: "Execute custom JavaScript code",
    color: "#EF4444",
    category: "action",
  },
  {
    id: "conditional",
    name: "Conditional",
    icon: "GitBranch",
    description: "Execute steps based on conditions",
    color: "#6366F1",
    category: "control",
  },
];

const iconComponents = {
  MessageSquare,
  Globe,
  Mail,
  Clock,
  Code,
  GitBranch,
  Package,
};

interface DraggableStepProps {
  stepType: StepType;
}

const DraggableStep: React.FC<DraggableStepProps> = ({ stepType }) => {
  const [{ isDragging }, drag, dragPreview] = useDrag<
    DragItem,
    void,
    { isDragging: boolean }
  >({
    type: "STEP_TYPE",
    item: { type: "STEP_TYPE", stepType: stepType.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const IconComponent =
    iconComponents[stepType.icon as keyof typeof iconComponents];

  return (
    <div
      ref={(node) => {
        drag(node);
        dragPreview(node);
      }}
      className={`draggable-step ${isDragging ? "dragging" : ""}`}
      style={{
        borderLeftColor: stepType.color,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <div className="step-icon" style={{ color: stepType.color }}>
        <IconComponent size={20} />
      </div>
      <div className="step-info">
        <div className="step-name">{stepType.name}</div>
        <div className="step-description">{stepType.description}</div>
      </div>
    </div>
  );
};

export const StepPalette: React.FC = () => {
  const categories = {
    action: stepTypes.filter((step) => step.category === "action"),
    control: stepTypes.filter((step) => step.category === "control"),
    integration: stepTypes.filter((step) => step.category === "integration"),
  };

  return (
    <div className="step-palette">
      <h3 className="palette-title">Step Types</h3>

      <div className="palette-category">
        <h4 className="category-title">Actions</h4>
        {categories.action.map((stepType) => (
          <DraggableStep key={stepType.id} stepType={stepType} />
        ))}
      </div>

      <div className="palette-category">
        <h4 className="category-title">Control Flow</h4>
        {categories.control.map((stepType) => (
          <DraggableStep key={stepType.id} stepType={stepType} />
        ))}
      </div>

      <div className="palette-category">
        <h4 className="category-title">Integrations</h4>
        {categories.integration.map((stepType) => (
          <DraggableStep key={stepType.id} stepType={stepType} />
        ))}
      </div>
    </div>
  );
};
