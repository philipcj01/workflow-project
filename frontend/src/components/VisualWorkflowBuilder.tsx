import React, { useState, useCallback, useEffect } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Play, Eye } from "lucide-react";
import { StepPalette } from "./workflow-builder/StepPalette";
import { WorkflowCanvas } from "./workflow-builder/WorkflowCanvas";
import { StepConfigPanel } from "./workflow-builder/StepConfigPanel";
import type { WorkflowStep, VisualWorkflow } from "../types/workflow-builder";

interface VisualWorkflowBuilderProps {
  initialWorkflow?: VisualWorkflow;
  onSave: (workflow: VisualWorkflow) => void;
  onPreview: (yaml: string) => void;
  isEditMode?: boolean;
}

export const VisualWorkflowBuilder: React.FC<VisualWorkflowBuilderProps> = ({
  initialWorkflow,
  onSave,
  onPreview,
  isEditMode = false,
}) => {
  const [workflow, setWorkflow] = useState<VisualWorkflow>(
    initialWorkflow || {
      name: "",
      description: "",
      version: "1.0.0",
      steps: [],
    }
  );

  const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null);
  const [showConfigPanel, setShowConfigPanel] = useState(false);

  useEffect(() => {
    if (initialWorkflow) {
      setWorkflow(initialWorkflow);
    }
  }, [initialWorkflow]);

  const handleAddStep = useCallback(
    (stepType: string, position: { x: number; y: number }) => {
      const newStep: WorkflowStep = {
        id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: `${stepType}-step`,
        type: stepType,
        position,
        params: getDefaultParams(stepType),
      };

      setWorkflow((prev: VisualWorkflow) => ({
        ...prev,
        steps: [...prev.steps, newStep],
      }));
    },
    []
  );

  const handleUpdateStep = useCallback(
    (stepId: string, updates: Partial<WorkflowStep>) => {
      setWorkflow((prev: VisualWorkflow) => ({
        ...prev,
        steps: prev.steps.map((step: WorkflowStep) =>
          step.id === stepId ? { ...step, ...updates } : step
        ),
      }));
    },
    []
  );

  const handleDeleteStep = useCallback(
    (stepId: string) => {
      setWorkflow((prev: VisualWorkflow) => ({
        ...prev,
        steps: prev.steps.filter((step: WorkflowStep) => step.id !== stepId),
      }));
      if (selectedStep?.id === stepId) {
        setSelectedStep(null);
        setShowConfigPanel(false);
      }
    },
    [selectedStep]
  );

  const handleSelectStep = useCallback((step: WorkflowStep) => {
    setSelectedStep(step);
    setShowConfigPanel(true);
  }, []);

  const handleMoveStep = useCallback(
    (stepId: string, position: { x: number; y: number }) => {
      handleUpdateStep(stepId, { position });
    },
    [handleUpdateStep]
  );

  const generateYaml = useCallback(() => {
    const yamlSteps = workflow.steps.map((step: WorkflowStep) => {
      const yamlStep: any = {
        name: step.name,
        type: step.type,
      };

      if (step.params && Object.keys(step.params).length > 0) {
        yamlStep.params = step.params;
      }

      if (step.condition) {
        yamlStep.condition = step.condition;
      }

      return yamlStep;
    });

    const yamlContent = `name: ${workflow.name || "Untitled Workflow"}
description: ${workflow.description || "Generated from visual builder"}
version: ${workflow.version || "1.0.0"}

steps:
${yamlSteps
  .map(
    (step: any) => `  - name: ${step.name}
    type: ${step.type}${
      step.params
        ? `
    params:
${Object.entries(step.params)
  .map(
    ([key, value]) =>
      `      ${key}: ${typeof value === "string" ? `"${value}"` : value}`
  )
  .join("\n")}`
        : ""
    }${
      step.condition
        ? `
    condition: ${step.condition}`
        : ""
    }`
  )
  .join("\n\n")}`;

    return yamlContent;
  }, [workflow]);

  const handleSave = () => {
    onSave(workflow);
  };

  const handlePreview = () => {
    const yaml = generateYaml();
    onPreview(yaml);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="visual-workflow-builder">
        <div className="builder-header">
          <div className="workflow-meta">
            <input
              type="text"
              placeholder="Workflow Name"
              value={workflow.name}
              onChange={(e) =>
                setWorkflow((prev: VisualWorkflow) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
              className="workflow-name-input"
            />
            <input
              type="text"
              placeholder="Description"
              value={workflow.description}
              onChange={(e) =>
                setWorkflow((prev: VisualWorkflow) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="workflow-description-input"
            />
          </div>

          <div className="builder-actions">
            <button onClick={handlePreview} className="preview-button">
              <Eye size={16} />
              Preview YAML
            </button>
            <button onClick={handleSave} className="save-button">
              <Play size={16} />
              {isEditMode ? "Update Workflow" : "Save Workflow"}
            </button>
          </div>
        </div>

        <div className="builder-content">
          <StepPalette />

          <div className="canvas-container">
            <WorkflowCanvas
              steps={workflow.steps}
              onAddStep={handleAddStep}
              onSelectStep={handleSelectStep}
              onMoveStep={handleMoveStep}
              onDeleteStep={handleDeleteStep}
              selectedStepId={selectedStep?.id}
            />
          </div>

          {showConfigPanel && selectedStep && (
            <StepConfigPanel
              step={selectedStep}
              onUpdate={(updates: Partial<WorkflowStep>) =>
                handleUpdateStep(selectedStep.id, updates)
              }
              onClose={() => {
                setShowConfigPanel(false);
                setSelectedStep(null);
              }}
            />
          )}
        </div>
      </div>
    </DndProvider>
  );
};

function getDefaultParams(stepType: string): Record<string, any> {
  switch (stepType) {
    case "log":
      return { message: "Hello World!" };
    case "http":
      return {
        url: "https://api.example.com",
        method: "GET",
        headers: {},
      };
    case "email":
      return {
        to: "user@example.com",
        subject: "Workflow Notification",
        body: "This is an automated message from your workflow.",
      };
    case "wait":
      return {
        duration: 5,
        unit: "seconds",
      };
    case "script":
      return {
        language: "javascript",
        code: 'console.log("Hello from script!");',
      };
    case "conditional":
      return {
        condition: "equals",
        value1: "",
        value2: "",
        onTrue: [],
        onFalse: [],
      };
    default:
      return {};
  }
}
