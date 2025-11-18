import React, { useState } from "react";
import { Save, RotateCcw, Sparkles } from "lucide-react";
import { useWorkflows } from "../hooks/useWorkflows";
import { showNotification } from "../utils";

export const WorkflowEditor: React.FC = () => {
  const [yamlContent, setYamlContent] = useState("");
  const { createWorkflow, loading } = useWorkflows();

  const handleSave = async () => {
    if (!yamlContent.trim()) {
      showNotification("Please enter workflow YAML content", "error");
      return;
    }

    try {
      await createWorkflow(yamlContent);
      showNotification("Workflow saved successfully!");
      setYamlContent(""); // Clear the editor after successful save
    } catch {
      showNotification("Failed to save workflow", "error");
    }
  };

  const handleReset = () => {
    setYamlContent("");
  };

  const exampleWorkflow = `name: Example Workflow
description: A sample workflow to get started
version: 1.0.0

steps:
  - name: log-message
    type: log
    message: "Hello from workflow!"
    
  - name: wait-step
    type: wait
    duration: 2
    
  - name: final-log
    type: log
    message: "Workflow completed successfully!"
`;

  const loadExample = () => {
    setYamlContent(exampleWorkflow);
  };

  return (
    <div className="workflow-editor">
      <div className="editor-header">
        <h2>Create New Workflow</h2>
        <div className="editor-actions">
          <button onClick={loadExample} className="example-button">
            <Sparkles size={16} />
            Load Example
          </button>
          <button onClick={handleReset} className="reset-button">
            <RotateCcw size={16} />
            Clear
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
          {loading ? "Saving..." : "Save Workflow"}
        </button>
      </div>
    </div>
  );
};
