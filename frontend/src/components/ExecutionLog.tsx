import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Activity,
  X,
} from "lucide-react";
import { useWebSocketContext } from "../App";
import type { WorkflowEvent } from "../hooks/useWebSocket";
import { formatDate } from "../utils";

interface ExecutionLogProps {
  runId?: string;
  workflowName?: string;
  onClose?: () => void;
}

interface StepLog {
  name: string;
  type?: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  error?: string;
  output?: any;
  retries?: number;
  index: number;
}

export const ExecutionLog: React.FC<ExecutionLogProps> = ({
  runId,
  workflowName,
  onClose,
}) => {
  const [steps, setSteps] = useState<StepLog[]>([]);
  const [workflowStatus, setWorkflowStatus] = useState<
    "running" | "completed" | "failed"
  >("running");
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [totalSteps, setTotalSteps] = useState<number>(0);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [isInitialRender, setIsInitialRender] = useState(true);
  const logEndRef = useRef<HTMLDivElement>(null);
  const { onEvent, getEventsForRun, isConnected } = useWebSocketContext();

  // Auto-scroll to bottom when new steps are added (but not on initial render)
  useEffect(() => {
    if (!isInitialRender && steps.length > 0) {
      logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [steps, isInitialRender]);

  // Mark that initial render is complete after first render
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialRender(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Process workflow events
  useEffect(() => {
    const unsubscribe = onEvent((event: WorkflowEvent) => {
      // If we're tracking a specific run, only process events for that run
      if (runId && event.runId !== runId) return;

      // If we're not tracking a specific run, track the first workflow that starts
      if (!runId && !currentRunId && event.type === "workflow_started") {
        setCurrentRunId(event.runId);
      }

      // Only process events for our current run
      if (runId ? event.runId === runId : event.runId === currentRunId) {
        processWorkflowEvent(event);
      }
    });

    return unsubscribe;
  }, [onEvent, runId, currentRunId]);

  // Load existing events for a specific run
  useEffect(() => {
    if (runId) {
      const existingEvents = getEventsForRun(runId);
      existingEvents.forEach(processWorkflowEvent);
    }
  }, [runId, getEventsForRun]);

  const processWorkflowEvent = (event: WorkflowEvent) => {
    switch (event.type) {
      case "workflow_started":
        setStartTime(new Date(event.timestamp));
        setWorkflowStatus("running");
        setTotalSteps(event.data?.totalSteps || 0);
        setCurrentRunId(event.runId);

        // Initialize steps as pending
        if (event.data?.totalSteps) {
          const initialSteps: StepLog[] = Array.from(
            { length: event.data.totalSteps },
            (_, i) => ({
              name: `Step ${i + 1}`,
              status: "pending",
              index: i,
            })
          );
          setSteps(initialSteps);
        }
        break;

      case "step_started":
        setSteps((prev) =>
          prev.map((step, idx) =>
            idx === event.data?.stepIndex
              ? {
                  ...step,
                  name: event.data?.stepName || step.name,
                  type: event.data?.stepType,
                  status: "running",
                  startTime: new Date(event.timestamp),
                }
              : step
          )
        );
        break;

      case "step_completed":
        setSteps((prev) =>
          prev.map((step, idx) =>
            idx === event.data?.stepIndex
              ? {
                  ...step,
                  name: event.data?.stepName || step.name,
                  status:
                    event.data?.status === "skipped" ? "skipped" : "completed",
                  endTime: new Date(event.timestamp),
                  duration: event.data?.duration,
                  output: event.data?.output,
                  retries: event.data?.retries,
                }
              : step
          )
        );
        break;

      case "step_failed":
        setSteps((prev) =>
          prev.map((step, idx) =>
            idx === event.data?.stepIndex
              ? {
                  ...step,
                  name: event.data?.stepName || step.name,
                  status: "failed",
                  endTime: new Date(event.timestamp),
                  duration: event.data?.duration,
                  error: event.data?.error,
                  retries: event.data?.retries,
                }
              : step
          )
        );
        break;

      case "workflow_completed":
      case "workflow_failed":
        setWorkflowStatus(
          event.type === "workflow_completed" ? "completed" : "failed"
        );
        setEndTime(new Date(event.timestamp));
        break;
    }
  };

  const getStepIcon = (step: StepLog) => {
    switch (step.status) {
      case "pending":
        return <Clock size={16} className="text-gray-400" />;
      case "running":
        return <Loader2 size={16} className="text-blue-500 animate-spin" />;
      case "completed":
        return <CheckCircle size={16} className="text-green-500" />;
      case "failed":
        return <XCircle size={16} className="text-red-500" />;
      case "skipped":
        return <AlertTriangle size={16} className="text-yellow-500" />;
      default:
        return <Activity size={16} className="text-gray-400" />;
    }
  };

  const getStepStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "text-blue-600 bg-blue-50";
      case "completed":
        return "text-green-600 bg-green-50";
      case "failed":
        return "text-red-600 bg-red-50";
      case "skipped":
        return "text-yellow-600 bg-yellow-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getWorkflowStatusIcon = () => {
    switch (workflowStatus) {
      case "running":
        return <Loader2 size={20} className="text-blue-500 animate-spin" />;
      case "completed":
        return <CheckCircle size={20} className="text-green-500" />;
      case "failed":
        return <XCircle size={20} className="text-red-500" />;
    }
  };

  const completedSteps = steps.filter(
    (s) => s.status === "completed" || s.status === "skipped"
  ).length;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <div className="execution-log" data-status={workflowStatus}>
      <div className="execution-log-header">
        <div className="execution-log-title">
          {getWorkflowStatusIcon()}
          <div>
            <h3>Workflow Execution Log</h3>
            <p>
              {workflowName || "Unknown Workflow"} •{" "}
              {currentRunId || runId || "No Run ID"}
            </p>
          </div>
        </div>
        <div className="execution-log-actions">
          <div className="connection-status">
            <div
              className={`connection-indicator ${
                isConnected ? "connected" : "disconnected"
              }`}
            />
            {isConnected ? "Live" : "Disconnected"}
          </div>
          {onClose && (
            <button onClick={onClose} className="close-button">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="execution-log-progress">
        <div className="progress-info">
          <span>
            Progress: {completedSteps}/{totalSteps} steps
          </span>
          <span className={`status-badge ${workflowStatus}`}>
            {workflowStatus.toUpperCase()}
          </span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="execution-log-timeline">
        {startTime && (
          <div className="timeline-event workflow-start">
            <Play size={16} />
            <div>
              <strong>Workflow Started</strong>
              <span>{formatDate(startTime.toISOString())}</span>
            </div>
          </div>
        )}

        {steps.map((step, index) => (
          <div
            key={index}
            className={`timeline-event step-event ${step.status}`}
          >
            {getStepIcon(step)}
            <div className="step-details">
              <div className="step-header">
                <span className="step-name">{step.name}</span>
                {step.type && <span className="step-type">{step.type}</span>}
                <span
                  className={`step-status ${getStepStatusColor(step.status)}`}
                >
                  {step.status}
                </span>
              </div>

              {step.startTime && (
                <div className="step-timing">
                  Started: {formatDate(step.startTime.toISOString())}
                  {step.duration && <span> • Duration: {step.duration}ms</span>}
                  {step.retries && step.retries > 0 && (
                    <span> • Retries: {step.retries}</span>
                  )}
                </div>
              )}

              {step.error && (
                <div className="step-error">
                  <strong>Error:</strong> {step.error}
                </div>
              )}

              {step.output && step.status === "completed" && (
                <details className="step-output">
                  <summary>Output</summary>
                  <pre>{JSON.stringify(step.output, null, 2)}</pre>
                </details>
              )}
            </div>
          </div>
        ))}

        {endTime && (
          <div className={`timeline-event workflow-end ${workflowStatus}`}>
            {workflowStatus === "completed" ? (
              <CheckCircle size={16} />
            ) : (
              <XCircle size={16} />
            )}
            <div>
              <strong>
                Workflow{" "}
                {workflowStatus === "completed" ? "Completed" : "Failed"}
              </strong>
              <span>{formatDate(endTime.toISOString())}</span>
              {startTime && (
                <span>
                  {" "}
                  • Total Duration: {endTime.getTime() - startTime.getTime()}ms
                </span>
              )}
            </div>
          </div>
        )}

        <div ref={logEndRef} />
      </div>
    </div>
  );
};
