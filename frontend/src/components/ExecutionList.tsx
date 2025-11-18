import React, { useState } from "react";
import {
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Trash2,
  Eye,
} from "lucide-react";
import type { ExecutionResult } from "../types";
import { formatDate } from "../utils";
import { ConfirmationModal } from "./ConfirmationModal";

interface ExecutionListProps {
  executions: ExecutionResult[];
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  onClear?: () => void;
}

export const ExecutionList: React.FC<ExecutionListProps> = ({
  executions,
  loading,
  error,
  onRetry,
  onClear,
}) => {
  const [showAll, setShowAll] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);

  const DEFAULT_LIMIT = 8;
  const displayedExecutions = showAll
    ? executions
    : executions.slice(0, DEFAULT_LIMIT);
  const hasMore = executions.length > DEFAULT_LIMIT;

  const handleClearClick = () => {
    setShowClearModal(true);
  };

  const handleClearConfirm = async () => {
    if (!onClear) return;

    setClearing(true);
    try {
      await onClear();
      setShowClearModal(false);
    } finally {
      setClearing(false);
    }
  };

  const handleClearCancel = () => {
    if (!clearing) {
      setShowClearModal(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        Loading executions...
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-display">
        <div className="error-display-icon">
          <XCircle size={24} />
        </div>
        <div className="error-display-content">
          <h3>Failed to Load Executions</h3>
          <p>{error}</p>
          {onRetry && (
            <div className="error-display-actions">
              <button onClick={onRetry} className="retry-error-button">
                <RefreshCw size={16} />
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (executions.length === 0) {
    return (
      <div className="loading">
        <Activity size={24} />
        No executions yet. Run a workflow to see results here.
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "running":
        return <Clock size={16} className="animate-pulse" />;
      case "completed":
        return <CheckCircle size={16} />;
      case "failed":
        return <XCircle size={16} />;
      default:
        return <Activity size={16} />;
    }
  };

  return (
    <>
      <div className="executions-list">
        <div className="executions-list-header">
          <div className="executions-count">
            {executions.length} execution{executions.length !== 1 ? "s" : ""}
            {!showAll && hasMore && ` (showing ${DEFAULT_LIMIT})`}
          </div>
          {onClear && executions.length > 0 && (
            <button
              onClick={handleClearClick}
              className="clear-executions-button"
              disabled={clearing}
              title="Clear all executions"
            >
              <Trash2 size={16} />
              {clearing ? "Clearing..." : "Clear All"}
            </button>
          )}
        </div>

        {displayedExecutions.map((execution) => (
          <div key={execution.id} className="execution-item">
            <div className="execution-header">
              {getStatusIcon(execution.status)}
              <span>{execution.workflow}</span>
              <span
                className={`status status-${execution.status.toLowerCase()}`}
              >
                {execution.status}
              </span>
            </div>
            <div className="execution-time">
              Started: {formatDate(execution.startTime)}
              {execution.endTime && (
                <span> • Ended: {formatDate(execution.endTime)}</span>
              )}
            </div>
          </div>
        ))}

        {hasMore && !showAll && (
          <div className="executions-list-footer">
            <button
              onClick={() => setShowAll(true)}
              className="view-more-button"
            >
              <Eye size={16} />
              View More ({executions.length - DEFAULT_LIMIT} more)
            </button>
          </div>
        )}

        {showAll && hasMore && (
          <div className="executions-list-footer">
            <button
              onClick={() => setShowAll(false)}
              className="view-less-button"
            >
              Show Less
            </button>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={showClearModal}
        onClose={handleClearCancel}
        onConfirm={handleClearConfirm}
        title="Clear All Executions"
        message="Are you sure you want to clear all execution history? This action cannot be undone and will permanently remove all execution records."
        confirmText={clearing ? "Clearing..." : "Clear All"}
        cancelText="Cancel"
        type="danger"
        isLoading={clearing}
      />
    </>
  );
};
