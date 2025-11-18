import React, { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import type { WorkflowStep } from "../../types/workflow-builder";

interface StepConfigPanelProps {
  step: WorkflowStep;
  onUpdate: (updates: Partial<WorkflowStep>) => void;
  onClose: () => void;
}

export const StepConfigPanel: React.FC<StepConfigPanelProps> = ({
  step,
  onUpdate,
  onClose,
}) => {
  const [name, setName] = useState(step.name);
  const [params, setParams] = useState(step.params || {});
  const [condition, setCondition] = useState(step.condition || "");

  useEffect(() => {
    setName(step.name);
    setParams(step.params || {});
    setCondition(step.condition || "");
  }, [step]);

  const handleSave = () => {
    onUpdate({
      name,
      params,
      condition: condition || undefined,
    });
    onClose();
  };

  const handleParamChange = (key: string, value: any) => {
    setParams((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const renderParamField = (key: string, value: any) => {
    const paramType = typeof value;

    if (paramType === "boolean") {
      return (
        <div key={key} className="param-field">
          <label className="param-label">{key}:</label>
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => handleParamChange(key, e.target.checked)}
            className="param-checkbox"
          />
        </div>
      );
    }

    if (paramType === "number") {
      return (
        <div key={key} className="param-field">
          <label className="param-label">{key}:</label>
          <input
            type="number"
            value={value}
            onChange={(e) =>
              handleParamChange(key, parseFloat(e.target.value) || 0)
            }
            className="param-input"
          />
        </div>
      );
    }

    // Handle special cases based on step type and param key
    if (step.type === "http" && key === "method") {
      return (
        <div key={key} className="param-field">
          <label className="param-label">{key}:</label>
          <select
            value={value}
            onChange={(e) => handleParamChange(key, e.target.value)}
            className="param-select"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
          </select>
        </div>
      );
    }

    if (step.type === "wait" && key === "unit") {
      return (
        <div key={key} className="param-field">
          <label className="param-label">{key}:</label>
          <select
            value={value}
            onChange={(e) => handleParamChange(key, e.target.value)}
            className="param-select"
          >
            <option value="seconds">Seconds</option>
            <option value="minutes">Minutes</option>
            <option value="hours">Hours</option>
          </select>
        </div>
      );
    }

    if (step.type === "script" && key === "language") {
      return (
        <div key={key} className="param-field">
          <label className="param-label">{key}:</label>
          <select
            value={value}
            onChange={(e) => handleParamChange(key, e.target.value)}
            className="param-select"
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="bash">Bash</option>
          </select>
        </div>
      );
    }

    if (step.type === "conditional" && key === "condition") {
      return (
        <div key={key} className="param-field">
          <label className="param-label">{key}:</label>
          <select
            value={value}
            onChange={(e) => handleParamChange(key, e.target.value)}
            className="param-select"
          >
            <option value="equals">Equals</option>
            <option value="notEquals">Not Equals</option>
            <option value="contains">Contains</option>
            <option value="startsWith">Starts With</option>
            <option value="endsWith">Ends With</option>
            <option value="greaterThan">Greater Than</option>
            <option value="lessThan">Less Than</option>
          </select>
        </div>
      );
    }

    // For large text fields
    if (
      key === "code" ||
      key === "body" ||
      (typeof value === "string" && value.length > 100)
    ) {
      return (
        <div key={key} className="param-field">
          <label className="param-label">{key}:</label>
          <textarea
            value={value}
            onChange={(e) => handleParamChange(key, e.target.value)}
            className="param-textarea"
            rows={5}
          />
        </div>
      );
    }

    // Default text input
    return (
      <div key={key} className="param-field">
        <label className="param-label">{key}:</label>
        <input
          type="text"
          value={value}
          onChange={(e) => handleParamChange(key, e.target.value)}
          className="param-input"
        />
      </div>
    );
  };

  const addNewParam = () => {
    const key = prompt("Parameter name:");
    if (key && !params.hasOwnProperty(key)) {
      handleParamChange(key, "");
    }
  };

  const removeParam = (key: string) => {
    setParams((prev) => {
      const newParams = { ...prev };
      delete newParams[key];
      return newParams;
    });
  };

  return (
    <div className="step-config-panel">
      <div className="config-header">
        <h3>Configure Step: {step.type}</h3>
        <button onClick={onClose} className="close-btn">
          <X size={20} />
        </button>
      </div>

      <div className="config-content">
        <div className="param-field">
          <label className="param-label">Step Name:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="param-input"
            placeholder="Enter step name"
          />
        </div>

        <div className="params-section">
          <div className="section-header">
            <h4>Parameters</h4>
            <button onClick={addNewParam} className="add-param-btn">
              Add Parameter
            </button>
          </div>

          {Object.entries(params).map(([key, value]) => (
            <div key={key} className="param-row">
              {renderParamField(key, value)}
              <button
                onClick={() => removeParam(key)}
                className="remove-param-btn"
                title="Remove parameter"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>

        {step.type === "conditional" && (
          <div className="param-field">
            <label className="param-label">Global Condition:</label>
            <input
              type="text"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="param-input"
              placeholder="Enter condition expression"
            />
          </div>
        )}
      </div>

      <div className="config-footer">
        <button onClick={onClose} className="cancel-btn">
          Cancel
        </button>
        <button onClick={handleSave} className="save-btn">
          <Save size={16} />
          Save Changes
        </button>
      </div>
    </div>
  );
};
