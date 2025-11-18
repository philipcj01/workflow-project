import React from "react";
import { Activity, Clock, CheckCircle, XCircle } from "lucide-react";
import type { ExecutionResult } from "../types";
import { formatDate } from "../utils";

interface ExecutionListProps {
  executions: ExecutionResult[];
  loading: boolean;
  error: string | null;
}

export const ExecutionList: React.FC<ExecutionListProps> = ({
  executions,
  loading,
  error,
}) => {
  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        Loading executions...
      </div>
    );
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
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
    <div className="executions-list">
      {executions.map((execution) => (
        <div key={execution.id} className="execution-item">
          <div className="execution-header">
            {getStatusIcon(execution.status)}
            <span>{execution.workflow}</span>
            <span className={`status status-${execution.status.toLowerCase()}`}>
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
    </div>
  );
};
