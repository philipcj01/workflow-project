import React from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "warning" | "danger";
  isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "warning",
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  const handleConfirm = () => {
    if (isLoading) return; // Prevent action during loading
    onConfirm();
  };

  const handleClose = () => {
    if (isLoading) return; // Prevent closing during loading
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="confirmation-modal">
        <div className="modal-header">
          <div className={`modal-icon ${type}`}>
            <AlertTriangle size={24} />
          </div>
          <button
            className="modal-close"
            onClick={handleClose}
            disabled={isLoading}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-content">
          <h3>{title}</h3>
          <p>{message}</p>
        </div>

        <div className="modal-actions">
          <button
            onClick={handleClose}
            className="cancel-btn"
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`confirm-btn ${type}`}
            disabled={isLoading}
          >
            {isLoading && (
              <div
                className="loading-spinner"
                style={{ width: "16px", height: "16px", marginRight: "0.5rem" }}
              ></div>
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
