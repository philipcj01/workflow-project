import React, { useCallback } from "react";
import { useDrop } from "react-dnd";
import { WorkflowStepNode } from "./WorkflowStepNode";
import type { WorkflowStep, DragItem } from "../../types/workflow-builder";

interface WorkflowCanvasProps {
  steps: WorkflowStep[];
  onAddStep: (stepType: string, position: { x: number; y: number }) => void;
  onSelectStep: (step: WorkflowStep) => void;
  onMoveStep: (stepId: string, position: { x: number; y: number }) => void;
  onDeleteStep: (stepId: string) => void;
  selectedStepId?: string;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  steps,
  onAddStep,
  onSelectStep,
  onMoveStep,
  onDeleteStep,
  selectedStepId,
}) => {
  const [{ isOver, canDrop }, drop] = useDrop<
    DragItem,
    void,
    { isOver: boolean; canDrop: boolean }
  >({
    accept: ["STEP_TYPE", "STEP_NODE"],
    drop: (item, monitor) => {
      const offset = monitor.getClientOffset();
      const canvasRect = canvasRef.current?.getBoundingClientRect();

      if (offset && canvasRect) {
        const position = {
          x: offset.x - canvasRect.left,
          y: offset.y - canvasRect.top,
        };

        if (item.type === "STEP_TYPE" && item.stepType) {
          onAddStep(item.stepType, position);
        } else if (item.type === "STEP_NODE" && item.stepId) {
          onMoveStep(item.stepId, position);
        }
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const canvasRef = React.useRef<HTMLDivElement>(null);

  const handleStepClick = useCallback(
    (step: WorkflowStep) => {
      onSelectStep(step);
    },
    [onSelectStep]
  );

  const handleStepDelete = useCallback(
    (stepId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      onDeleteStep(stepId);
    },
    [onDeleteStep]
  );

  // Calculate connections between steps
  const connections = steps
    .map((step, index) => {
      const nextStep = steps[index + 1];
      if (nextStep) {
        return {
          from: step,
          to: nextStep,
        };
      }
      return null;
    })
    .filter(Boolean);

  return (
    <div
      ref={(node) => {
        drop(node);
        canvasRef.current = node;
      }}
      className={`workflow-canvas ${isOver && canDrop ? "drop-active" : ""}`}
    >
      {/* Connection lines */}
      <svg className="connection-overlay">
        {connections.map((connection, index) => {
          if (!connection) return null;

          const fromX = connection.from.position.x + 100; // Half step width
          const fromY = connection.from.position.y + 40; // Half step height
          const toX = connection.to.position.x + 100;
          const toY = connection.to.position.y + 40;

          // Create curved connection line
          const controlX1 = fromX + 50;
          const controlY1 = fromY;
          const controlX2 = toX - 50;
          const controlY2 = toY;

          return (
            <path
              key={index}
              d={`M ${fromX} ${fromY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${toX} ${toY}`}
              stroke="#94A3B8"
              strokeWidth="2"
              fill="none"
              markerEnd="url(#arrowhead)"
            />
          );
        })}

        {/* Arrow marker definition */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
            fill="#94A3B8"
          >
            <polygon points="0 0, 10 3.5, 0 7" />
          </marker>
        </defs>
      </svg>

      {/* Workflow steps */}
      {steps.map((step) => (
        <WorkflowStepNode
          key={step.id}
          step={step}
          isSelected={step.id === selectedStepId}
          onClick={() => handleStepClick(step)}
          onDelete={(e: React.MouseEvent) => handleStepDelete(step.id, e)}
        />
      ))}

      {/* Drop zone indicator */}
      {isOver && canDrop && (
        <div className="drop-indicator">Drop here to add step</div>
      )}

      {/* Empty state */}
      {steps.length === 0 && (
        <div className="canvas-empty-state">
          <div className="empty-state-content">
            <h3>Start Building Your Workflow</h3>
            <p>Drag and drop steps from the palette to create your workflow</p>
          </div>
        </div>
      )}
    </div>
  );
};
