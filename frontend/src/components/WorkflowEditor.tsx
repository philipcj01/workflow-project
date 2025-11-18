import React, { useState, useEffect } from "react";
import { Save, RotateCcw, Sparkles, ArrowLeft } from "lucide-react";
import { useWorkflows } from "../hooks/useWorkflows";
import { useNotifications } from "../contexts/NotificationContext";
import { useParams, useNavigate } from "react-router-dom";
import { ConfirmationModal } from "./ConfirmationModal";

export const WorkflowEditor: React.FC = () => {
  const { id: workflowId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotifications();
  const [yamlContent, setYamlContent] = useState("");
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
    }
  }, [workflowId, getWorkflow, navigate, showError]);

  const handleSave = async () => {
    if (!yamlContent.trim()) {
      showError("Please enter workflow YAML content", "Validation Error");
      return;
    }

    try {
      if (isEditMode && workflowId) {
        await updateWorkflow(workflowId, yamlContent);
        showSuccess("Workflow updated successfully!");
        navigate("/"); // Navigate back to list after successful update
      } else {
        await createWorkflow(yamlContent);
        showSuccess("Workflow created successfully!");
        setYamlContent(""); // Clear the editor after successful save
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save workflow";
      showError(errorMessage, "Save Failed");
    }
  };

  const handleReset = () => {
    if (isEditMode) {
      // In edit mode, show confirmation modal before resetting
      setShowResetModal(true);
    } else {
      setYamlContent("");
    }
  };

  const handleConfirmReset = () => {
    if (isEditMode && workflowId) {
      // Reload the original workflow content
      const loadWorkflow = async () => {
        try {
          const workflow = await getWorkflow(workflowId);
          setYamlContent(workflow.content || "");
          showSuccess("Changes have been reset");
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to reload workflow";
          showError(errorMessage, "Reset Failed");
        }
      };
      loadWorkflow();
    } else {
      setYamlContent("");
    }
  };

  const handleCancel = () => {
    navigate("/");
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
    setYamlContent(exampleWorkflow);
  };

  return (
    <div className="workflow-editor">
      <div className="editor-header">
        <h2>{isEditMode ? "Edit Workflow" : "Create New Workflow"}</h2>
        <div className="editor-actions">
          {isEditMode && (
            <button onClick={handleCancel} className="cancel-button">
              <ArrowLeft size={16} />
              Cancel
            </button>
          )}
          <button onClick={loadExample} className="example-button">
            <Sparkles size={16} />
            Load Example
          </button>
          <button onClick={handleReset} className="reset-button">
            <RotateCcw size={16} />
            {isEditMode ? "Reset Changes" : "Clear"}
          </button>
        </div>
      </div>

      <div className="editor-container">
        <textarea
          value={yamlContent}
          onChange={(e) => setYamlContent(e.target.value)}
          placeholder="Enter your workflow YAML here..."
          className="yaml-editor"
          rows={20}
        />
        <button onClick={handleSave} disabled={loading} className="save-button">
          <Save size={16} />
          {loading
            ? "Saving..."
            : isEditMode
            ? "Update Workflow"
            : "Save Workflow"}
        </button>
      </div>

      <ConfirmationModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleConfirmReset}
        title="Reset Changes"
        message="Are you sure you want to reset all changes? This will restore the original workflow content and any unsaved changes will be lost."
        confirmText="Reset Changes"
        cancelText="Keep Changes"
        type="warning"
      />
    </div>
  );
};
