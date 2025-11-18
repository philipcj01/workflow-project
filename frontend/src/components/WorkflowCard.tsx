import React, { useState } from "react";
import {
  Play,
  Workflow as Workflow2,
  Clock,
  Sparkles,
  Edit,
  Trash2,
} from "lucide-react";
import type { Workflow } from "../types";
import { ConfirmationModal } from "./ConfirmationModal";

interface WorkflowCardProps {
  workflow: Workflow;
  onExecute: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isExecuting: boolean;
}

export const WorkflowCard: React.FC<WorkflowCardProps> = ({
  workflow,
  onExecute,
  onEdit,
  onDelete,
  isExecuting,
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExecute = () => {
    onExecute(workflow.id);
  };

  const handleEdit = () => {
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

      <div className="workflow-actions">
        <button
          onClick={handleExecute}
          disabled={isExecuting || isDeleting}
          className="run-button"
        >
          <Play size={16} />
          {isExecuting ? "Running..." : "Run"}
        </button>

        <button
          onClick={handleEdit}
          className="edit-button"
          title="Edit workflow"
          disabled={isDeleting}
        >
          <Edit size={16} />
          Edit
        </button>

        <button
          onClick={handleDelete}
          className="delete-button"
          title="Delete workflow"
          disabled={isDeleting}
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
  );
};
