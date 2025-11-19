import React, { useState } from "react";
import {
  Play,
  Workflow as Workflow2,
  Clock,
  Sparkles,
  Edit,
  Trash2,
  Eye,
} from "lucide-react";
import type { Workflow } from "../types";
import { ConfirmationModal } from "./ConfirmationModal";
import { ExecutionLog } from "./ExecutionLog";

interface WorkflowCardProps {
  workflow: Workflow;
  onExecute: (id: string) => Promise<{ id: string; workflow: string }>;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export const WorkflowCard: React.FC<WorkflowCardProps> = ({
  workflow,
  onExecute,
  onEdit,
  onDelete,
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showExecutionLog, setShowExecutionLog] = useState(false);
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(
    null
  );
  const [isExecutingThis, setIsExecutingThis] = useState(false);

  const handleExecute = async () => {
    try {
      setIsExecutingThis(true);
      const result = await onExecute(workflow.id);
      if (result?.id) {
        setCurrentExecutionId(result.id);
        setShowExecutionLog(true);
      }
    } catch (error) {
      console.error("Failed to execute workflow:", error);
    } finally {
      setIsExecutingThis(false);
    }
  };

  const handleEdit = () => {
    // Show warning if workflow is currently executing
    if (isExecutingThis) {
      if (
        confirm(
          "Workflow is currently running. Navigating away will interrupt real-time monitoring. Continue?"
        )
      ) {
        onEdit(workflow.id);
      }
      return;
    }
    onEdit(workflow.id);
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (isDeleting) return; // Prevent double deletion

    setIsDeleting(true);
    try {
      await onDelete(workflow.id);
      setShowDeleteModal(false); // Close modal only after successful deletion
    } catch (error) {
      // Error handling is done in the parent component
      // Just ensure we can try again if deletion failed
      console.error("Delete failed:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseModal = () => {
    if (!isDeleting) {
      setShowDeleteModal(false);
    }
  };

  const handleCloseExecutionLog = () => {
    setShowExecutionLog(false);
    setCurrentExecutionId(null);
  };

  const handleViewLogs = () => {
    setShowExecutionLog(true);
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
    <>
      <div className="workflow-card">
        <div className="workflow-header">
          <div className="workflow-icon">{getWorkflowIcon()}</div>
          <h3>{workflow.name}</h3>
        </div>
        <p>{workflow.description || "No description available"}</p>
        <div className="workflow-meta">
          <span>v{workflow.version}</span>
        </div>

        <div className="workflow-actions">
          <button
            onClick={handleExecute}
            disabled={isDeleting}
            className="run-button"
          >
            <Play size={16} />
            {isExecutingThis ? "Running..." : "Run"}
          </button>

          <button
            onClick={handleEdit}
            className="edit-button"
            title={
              isExecutingThis
                ? "Workflow is running - navigation will interrupt monitoring"
                : "Edit workflow"
            }
            disabled={isDeleting}
          >
            <Edit size={16} />
            Edit
          </button>

          <button
            onClick={handleViewLogs}
            className="cancel-button"
            title="View execution logs"
            disabled={isDeleting}
          >
            <Eye size={16} />
            Logs
          </button>

          <button
            onClick={handleDelete}
            className="delete-button"
            title="Delete workflow"
            disabled={isDeleting || isExecutingThis}
          >
            <Trash2 size={16} />
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>

        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={handleCloseModal}
          onConfirm={handleConfirmDelete}
          title="Delete Workflow"
          message={`Are you sure you want to delete "${workflow.name}"? This action cannot be undone.`}
          confirmText={isDeleting ? "Deleting..." : "Delete Workflow"}
          cancelText="Cancel"
          type="danger"
          isLoading={isDeleting}
        />
      </div>

      {showExecutionLog && (
        <ExecutionLog
          runId={currentExecutionId || undefined}
          workflowName={workflow.name}
          onClose={handleCloseExecutionLog}
        />
      )}
    </>
  );
};
