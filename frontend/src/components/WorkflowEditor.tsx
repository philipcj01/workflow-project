import React, { useState, useEffect } from "react";
import {
  Save,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  Code,
  Palette,
  X,
} from "lucide-react";
import { useWorkflows } from "../hooks/useWorkflows";
import { useNotifications } from "../contexts/NotificationContext";
import { useParams, useNavigate } from "react-router-dom";
import { ConfirmationModal } from "./ConfirmationModal";
import { VisualWorkflowBuilder } from "./VisualWorkflowBuilder";
import type { VisualWorkflow } from "../types/workflow-builder";
import * as yaml from "js-yaml";

export const WorkflowEditor: React.FC = () => {
  const { id: workflowId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotifications();
  const [yamlContent, setYamlContent] = useState("");
  const [visualWorkflow, setVisualWorkflow] = useState<VisualWorkflow | null>(
    null
  );
  const [editorMode, setEditorMode] = useState<"visual" | "yaml">("visual");
  const [showYamlPreview, setShowYamlPreview] = useState(false);
  const [previewYaml, setPreviewYaml] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const { createWorkflow, updateWorkflow, getWorkflow, loading } =
    useWorkflows();

  // Load workflow for editing if ID is provided
  useEffect(() => {
    if (workflowId) {
      setIsEditMode(true);
      const loadWorkflow = async () => {
        try {
          const workflow = await getWorkflow(workflowId);
          setYamlContent(workflow.content || "");

          // Try to parse YAML and convert to visual format
          try {
            const parsedWorkflow = yaml.load(workflow.content || "") as any;
            if (parsedWorkflow && parsedWorkflow.steps) {
              const visualSteps = parsedWorkflow.steps.map(
                (step: any, index: number) => ({
                  id: `step_${index}_${Date.now()}`,
                  name: step.name,
                  type: step.type,
                  position: { x: 100 + index * 250, y: 100 },
                  params: step.params || {},
                  condition: step.condition,
                })
              );

              setVisualWorkflow({
                name: parsedWorkflow.name || "Untitled Workflow",
                description: parsedWorkflow.description || "",
                version: parsedWorkflow.version || "1.0.0",
                steps: visualSteps,
              });
            }
          } catch (parseError) {
            // If YAML parsing fails, default to YAML mode
            setEditorMode("yaml");
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to load workflow";
          showError(errorMessage, "Load Failed");
          navigate("/");
        }
      };
      loadWorkflow();
    } else {
      setIsEditMode(false);
      setYamlContent("");
      setVisualWorkflow({
        name: "",
        description: "",
        version: "1.0.0",
        steps: [],
      });
    }
  }, [workflowId, getWorkflow, navigate, showError]);

  const handleSave = async () => {
    let contentToSave = yamlContent;

    // If in visual mode, generate YAML from visual workflow
    if (editorMode === "visual" && visualWorkflow) {
      contentToSave = generateYamlFromVisual(visualWorkflow);
    }

    if (!contentToSave.trim()) {
      showError("Please enter workflow content", "Validation Error");
      return;
    }

    try {
      if (isEditMode && workflowId) {
        await updateWorkflow(workflowId, contentToSave);
        showSuccess("Workflow updated successfully!");
        navigate("/");
      } else {
        await createWorkflow(contentToSave);
        showSuccess("Workflow created successfully!");
        if (editorMode === "yaml") {
          setYamlContent("");
        } else {
          setVisualWorkflow({
            name: "",
            description: "",
            version: "1.0.0",
            steps: [],
          });
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save workflow";
      showError(errorMessage, "Save Failed");
    }
  };

  const generateYamlFromVisual = (workflow: VisualWorkflow): string => {
    const yamlSteps = workflow.steps.map((step) => {
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

    return `name: ${workflow.name || "Untitled Workflow"}
description: ${workflow.description || "Generated from visual builder"}
version: ${workflow.version || "1.0.0"}

steps:
${yamlSteps
  .map(
    (step) => `  - name: ${step.name}
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
  };

  const handleVisualSave = (workflow: VisualWorkflow) => {
    setVisualWorkflow(workflow);
    const yamlContent = generateYamlFromVisual(workflow);
    setYamlContent(yamlContent);
  };

  const handlePreview = (yaml: string) => {
    setPreviewYaml(yaml);
    setShowYamlPreview(true);
  };

  const switchToYamlMode = () => {
    if (visualWorkflow) {
      const yamlContent = generateYamlFromVisual(visualWorkflow);
      setYamlContent(yamlContent);
    }
    setEditorMode("yaml");
  };

  const switchToVisualMode = () => {
    // Try to parse current YAML and convert to visual
    try {
      if (yamlContent.trim()) {
        const parsedWorkflow = yaml.load(yamlContent) as any;
        if (parsedWorkflow && parsedWorkflow.steps) {
          const visualSteps = parsedWorkflow.steps.map(
            (step: any, index: number) => ({
              id: `step_${index}_${Date.now()}`,
              name: step.name,
              type: step.type,
              position: { x: 100 + index * 250, y: 100 },
              params: step.params || {},
              condition: step.condition,
            })
          );

          setVisualWorkflow({
            name: parsedWorkflow.name || "Untitled Workflow",
            description: parsedWorkflow.description || "",
            version: parsedWorkflow.version || "1.0.0",
            steps: visualSteps,
          });
        }
      }
      setEditorMode("visual");
    } catch (error) {
      showError(
        "Invalid YAML format. Please fix YAML errors before switching to visual mode.",
        "Parse Error"
      );
    }
  };

  const exampleWorkflow = `name: Example Workflow
description: A sample workflow to get started
version: 1.0.0

steps:
  - name: log-message
    type: log
    params:
      message: "Hello from workflow!"
    
  - name: wait-step
    type: wait
    params:
      duration: 2
      unit: "seconds"
    
  - name: final-log
    type: log
    params:
      message: "Workflow completed successfully!"
`;

  const loadExample = () => {
    if (editorMode === "yaml") {
      setYamlContent(exampleWorkflow);
    } else {
      // Convert example to visual format
      try {
        const parsedWorkflow = yaml.load(exampleWorkflow) as any;
        const visualSteps = parsedWorkflow.steps.map(
          (step: any, index: number) => ({
            id: `step_${index}_${Date.now()}`,
            name: step.name,
            type: step.type,
            position: { x: 100 + index * 250, y: 100 },
            params: step.params || {},
            condition: step.condition,
          })
        );

        setVisualWorkflow({
          name: parsedWorkflow.name,
          description: parsedWorkflow.description,
          version: parsedWorkflow.version,
          steps: visualSteps,
        });
      } catch (error) {
        showError("Failed to load example", "Error");
      }
    }
  };

  return (
    <div className="workflow-editor">
      <div className="editor-header">
        <h2>{isEditMode ? "Edit Workflow" : "Create New Workflow"}</h2>

        <div className="editor-mode-toggle">
          <button
            onClick={() => setEditorMode("visual")}
            className={`mode-btn ${editorMode === "visual" ? "active" : ""}`}
            disabled={
              editorMode === "yaml" &&
              yamlContent.trim() !== "" &&
              !visualWorkflow
            }
          >
            <Palette size={16} />
            Visual
          </button>
          <button
            onClick={switchToYamlMode}
            className={`mode-btn ${editorMode === "yaml" ? "active" : ""}`}
          >
            <Code size={16} />
            YAML
          </button>
        </div>

        <div className="editor-actions">
          {isEditMode && (
            <button onClick={() => navigate("/")} className="cancel-button">
              <ArrowLeft size={16} />
              Cancel
            </button>
          )}
          <button onClick={loadExample} className="example-button">
            <Sparkles size={16} />
            Load Example
          </button>
          {editorMode === "yaml" && (
            <button onClick={() => setYamlContent("")} className="reset-button">
              <RotateCcw size={16} />
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="editor-container">
        {editorMode === "visual" ? (
          <VisualWorkflowBuilder
            initialWorkflow={visualWorkflow || undefined}
            onSave={handleVisualSave}
            onPreview={handlePreview}
            isEditMode={isEditMode}
          />
        ) : (
          <>
            <textarea
              value={yamlContent}
              onChange={(e) => setYamlContent(e.target.value)}
              placeholder="Enter your workflow YAML here..."
              className="yaml-editor"
              rows={20}
            />
            <div className="yaml-editor-actions">
              <button
                onClick={switchToVisualMode}
                className="switch-button"
                disabled={!yamlContent.trim()}
              >
                <Palette size={16} />
                Switch to Visual
              </button>
            </div>
          </>
        )}

        <button onClick={handleSave} disabled={loading} className="save-button">
          <Save size={16} />
          {loading
            ? "Saving..."
            : isEditMode
            ? "Update Workflow"
            : "Save Workflow"}
        </button>
      </div>

      {/* YAML Preview Modal */}
      {showYamlPreview && (
        <div
          className="modal-overlay"
          onClick={() => setShowYamlPreview(false)}
        >
          <div
            className="yaml-preview-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Generated YAML Preview</h3>
              <button
                onClick={() => setShowYamlPreview(false)}
                className="close-btn"
              >
                <X size={20} />
              </button>
            </div>
            <pre className="yaml-preview-content">{previewYaml}</pre>
            <div className="modal-actions">
              <button
                onClick={() => setShowYamlPreview(false)}
                className="close-button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={() => {
          /* existing reset logic */
        }}
        title="Reset Changes"
        message="Are you sure you want to reset all changes? This will restore the original workflow content and any unsaved changes will be lost."
        confirmText="Reset Changes"
        cancelText="Keep Changes"
        type="warning"
      />
    </div>
  );
};
