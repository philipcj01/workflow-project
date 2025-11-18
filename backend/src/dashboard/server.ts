import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import chalk from "chalk";
import * as path from "path";
import { SqliteStorage } from "../storage/SqliteStorage";
import { WorkflowStorage, StoredWorkflow } from "../storage/WorkflowStorage";
import { WorkflowEngine } from "../engine/WorkflowEngine";
import { WorkflowLoader } from "../loader/WorkflowLoader";
import { ConsoleLogger } from "../utils/logger";
import { HttpStepExecutor } from "../steps/HttpStepExecutor";
import { WaitStepExecutor } from "../steps/WaitStepExecutor";
import { LogStepExecutor } from "../steps/LogStepExecutor";
import { ScriptStepExecutor } from "../steps/ScriptStepExecutor";
import { EmailStepExecutor } from "../steps/EmailStepExecutor";
import { ConditionalStepExecutor } from "../steps/ConditionalStepExecutor";
import * as fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";

export async function startDashboard(
  port: number,
  dbPath: string
): Promise<void> {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  // CORS middleware for React frontend
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );

    if (req.method === "OPTIONS") {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  app.use(express.json());
  app.use(express.static(path.join(__dirname, "public")));

  const storage = new SqliteStorage(dbPath);
  const workflowStorage = new WorkflowStorage(dbPath);
  const logger = new ConsoleLogger(false);
  const engine = new WorkflowEngine(storage, logger);

  // Register built-in step executors
  engine.registerStepExecutor(new HttpStepExecutor());
  engine.registerStepExecutor(new WaitStepExecutor());
  engine.registerStepExecutor(new LogStepExecutor());
  engine.registerStepExecutor(new ScriptStepExecutor());
  engine.registerStepExecutor(new EmailStepExecutor());
  engine.registerStepExecutor(new ConditionalStepExecutor());

  // Initialize workflows from examples folder on first startup
  await initializeWorkflowsFromExamples(workflowStorage);

  // WebSocket connections for real-time updates
  const clients = new Set<any>();

  wss.on("connection", (ws) => {
    clients.add(ws);
    console.log(`WebSocket client connected. Total clients: ${clients.size}`);

    // Send connection confirmation
    ws.send(
      JSON.stringify({ type: "connection_established", timestamp: new Date() })
    );

    ws.on("close", () => {
      clients.delete(ws);
      console.log(
        `WebSocket client disconnected. Total clients: ${clients.size}`
      );
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      clients.delete(ws);
    });
  });

  function broadcast(data: any) {
    const message = JSON.stringify(data);
    clients.forEach((client) => {
      if (client.readyState === 1) {
        // WebSocket.OPEN
        try {
          client.send(message);
        } catch (error) {
          console.error("Error sending WebSocket message:", error);
          clients.delete(client);
        }
      }
    });
  }

  // Connect WorkflowEngine events to WebSocket broadcasts
  engine.onEvent((event) => {
    broadcast({
      type: "workflow_event",
      event: event,
    });
  });

  // REST API Routes for React Frontend

  // Get all workflows
  app.get("/api/workflows", async (req, res) => {
    try {
      let storedWorkflows: StoredWorkflow[] = [];

      try {
        storedWorkflows = await workflowStorage.listWorkflows();
      } catch (dbError) {
        // Log the database error but don't fail the request
        console.warn("Database error when listing workflows:", dbError);
        // Return empty array if database has issues
        storedWorkflows = [];
      }

      // Ensure we always return a valid array
      const workflows = (storedWorkflows || []).map((stored) => ({
        id: stored.id,
        name: stored.name,
        description: stored.description || "No description available",
        version: stored.version,
        status: "active",
      }));

      res.json(workflows);
    } catch (error) {
      console.error("Error in /api/workflows endpoint:", error);
      // Always return an empty array instead of an error for listing workflows
      res.json([]);
    }
  });

  // Get a specific workflow
  app.get("/api/workflows/:id", async (req, res) => {
    try {
      const workflowId = req.params.id;
      const storedWorkflow = await workflowStorage.getWorkflow(workflowId);

      if (!storedWorkflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }

      res.json({
        id: storedWorkflow.id,
        name: storedWorkflow.name,
        description: storedWorkflow.description,
        version: storedWorkflow.version,
        content: storedWorkflow.content,
        format: storedWorkflow.format,
        created_at: storedWorkflow.created_at,
        updated_at: storedWorkflow.updated_at,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Execute a workflow by ID
  app.post("/api/workflows/:id/execute", async (req, res) => {
    try {
      const workflowId = req.params.id;
      const { variables = {} } = req.body;

      const storedWorkflow = await workflowStorage.getWorkflow(workflowId);

      if (!storedWorkflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }

      // Parse the stored workflow content
      const workflow = await WorkflowLoader.loadFromString(
        storedWorkflow.content,
        storedWorkflow.format
      );

      // Execute workflow
      const run = await engine.execute(workflow, variables);

      // Broadcast update to connected clients
      broadcast({ type: "run_update", run });

      res.json({
        id: run.id,
        workflow: workflow.name,
        status: run.status,
        startTime: run.startTime.toISOString(),
        endTime: run.endTime?.toISOString(),
        steps: Object.entries(run.steps).map(([name, step]) => ({
          id: name,
          name: name,
          type: "unknown", // We don't have step type in the result
          status: step.success ? "completed" : "failed",
          startTime: step.timestamp.toISOString(),
          endTime: step.timestamp.toISOString(),
          output: step.data,
        })),
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Create a new workflow
  app.post("/api/workflows", async (req, res) => {
    try {
      const { yaml } = req.body;

      if (!yaml) {
        return res.status(400).json({ error: "YAML content is required" });
      }

      // Parse and validate workflow
      const workflow = await WorkflowLoader.loadFromString(yaml, "yaml");

      // Generate unique ID
      const workflowId = uuidv4();

      // Store workflow in database
      const storedWorkflow: StoredWorkflow = {
        id: workflowId,
        name: workflow.name,
        description: workflow.description,
        version: workflow.version,
        content: yaml,
        format: "yaml",
        created_at: new Date(),
        updated_at: new Date(),
      };

      await workflowStorage.saveWorkflow(storedWorkflow);

      res.json({
        id: workflowId,
        name: workflow.name,
        description: workflow.description,
        version: workflow.version,
        status: "active",
      });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Update a workflow
  app.put("/api/workflows/:id", async (req, res) => {
    try {
      const workflowId = req.params.id;
      const { yaml } = req.body;

      if (!yaml) {
        return res.status(400).json({ error: "YAML content is required" });
      }

      // Check if workflow exists
      const existingWorkflow = await workflowStorage.getWorkflow(workflowId);
      if (!existingWorkflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }

      // Parse and validate new workflow content
      const workflow = await WorkflowLoader.loadFromString(yaml, "yaml");

      // Update workflow in database
      await workflowStorage.updateWorkflow(workflowId, {
        name: workflow.name,
        description: workflow.description,
        version: workflow.version,
        content: yaml,
        format: "yaml",
      });

      res.json({
        id: workflowId,
        name: workflow.name,
        description: workflow.description,
        version: workflow.version,
        status: "active",
      });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Delete a workflow
  app.delete("/api/workflows/:id", async (req, res) => {
    try {
      const workflowId = req.params.id;

      console.log(`Attempting to delete workflow with ID: ${workflowId}`);

      const deleted = await workflowStorage.deleteWorkflow(workflowId);

      if (!deleted) {
        console.log(`Workflow not found for deletion: ${workflowId}`);
        return res.status(404).json({ error: "Workflow not found" });
      }

      console.log(`Successfully deleted workflow: ${workflowId}`);
      res.json({ message: "Workflow deleted successfully" });
    } catch (error) {
      console.error("Error in DELETE /api/workflows/:id:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Get all executions
  app.get("/api/executions", async (req, res) => {
    try {
      let runs: any[] = [];

      try {
        const workflowName = req.query.workflow as string;
        runs = await storage.listRuns(workflowName);
      } catch (storageError) {
        // Log the storage error but don't fail the request
        console.warn("Storage error when listing executions:", storageError);
        // Return empty array if storage has issues
        runs = [];
      }

      // Helper function to safely convert timestamp to ISO string
      const safeToISOString = (timestamp: any): string => {
        if (!timestamp) return new Date().toISOString();

        // If it's already a Date object
        if (timestamp instanceof Date) {
          return timestamp.toISOString();
        }

        // If it's a string or number, try to create a Date object
        try {
          const date = new Date(timestamp);
          // Check if the date is valid
          if (isNaN(date.getTime())) {
            return new Date().toISOString();
          }
          return date.toISOString();
        } catch (error) {
          // Fallback to current time if conversion fails
          return new Date().toISOString();
        }
      };

      // Ensure we always return a valid array
      const executions = (runs || []).map((run) => ({
        id: run.id,
        workflow: run.workflowName,
        status: run.status,
        startTime: safeToISOString(run.startTime),
        endTime: run.endTime ? safeToISOString(run.endTime) : undefined,
        steps: Object.entries(run.steps || {}).map(
          ([name, step]: [string, any]) => ({
            id: name,
            name: name,
            type: "unknown",
            status: step.success ? "completed" : "failed",
            startTime: safeToISOString(step.timestamp),
            endTime: safeToISOString(step.timestamp),
            output: step.data,
          })
        ),
      }));

      res.json(executions);
    } catch (error) {
      console.error("Error in /api/executions endpoint:", error);
      // Always return an empty array instead of an error for listing executions
      res.json([]);
    }
  });

  // Clear all executions
  app.delete("/api/executions", async (req, res) => {
    try {
      console.log("Attempting to clear all executions");

      // Clear all runs from storage
      await storage.clearAllRuns();

      console.log("Successfully cleared all executions");

      // Broadcast update to connected clients
      broadcast({ type: "executions_cleared" });

      res.json({ message: "All executions cleared successfully" });
    } catch (error) {
      console.error("Error in DELETE /api/executions:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Original API routes for built-in dashboard
  app.get("/api/runs", async (req, res) => {
    try {
      const workflowName = req.query.workflow as string;
      const runs = await storage.listRuns(workflowName);
      res.json(runs);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get("/api/runs/:id", async (req, res) => {
    try {
      const run = await storage.getRun(req.params.id);
      if (!run) {
        return res.status(404).json({ error: "Run not found" });
      }
      res.json(run);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post("/api/workflows/run", async (req, res) => {
    try {
      const { workflow, variables = {} } = req.body;

      if (!workflow) {
        return res.status(400).json({ error: "Workflow is required" });
      }

      // Validate workflow
      const validation = WorkflowLoader.validateWorkflow(workflow);
      if (!validation.valid) {
        return res
          .status(400)
          .json({ error: "Invalid workflow", details: validation.errors });
      }

      // Execute workflow
      const run = await engine.execute(workflow, variables);

      // Broadcast update to connected clients
      broadcast({ type: "run_update", run });

      res.json(run);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post("/api/workflows/validate", (req, res) => {
    try {
      const { workflow } = req.body;
      const validation = WorkflowLoader.validateWorkflow(workflow);
      res.json(validation);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Serve the dashboard HTML
  app.get("/", (req, res) => {
    res.send(getDashboardHTML());
  });

  server.listen(port, () => {
    console.log(
      chalk.green(`🚀 Dashboard running at http://localhost:${port}`)
    );
    console.log(chalk.gray(`Database: ${dbPath}`));
  });
}

// Initialize workflows from examples folder on first startup
async function initializeWorkflowsFromExamples(
  workflowStorage: WorkflowStorage
): Promise<void> {
  try {
    // Check if we already have workflows in storage
    const existingWorkflows = await workflowStorage.listWorkflows();
    if (existingWorkflows.length > 0) {
      return; // Already initialized
    }

    // Load example workflows from the examples directory
    const exampleDir = path.resolve(process.cwd(), "examples");

    try {
      const files = await fs.readdir(exampleDir);
      const yamlFiles = files.filter(
        (file) => file.endsWith(".yaml") || file.endsWith(".yml")
      );

      for (const file of yamlFiles) {
        try {
          const filePath = path.join(exampleDir, file);
          const content = await fs.readFile(filePath, "utf8");
          const workflow = await WorkflowLoader.loadFromFile(filePath);

          // Generate ID from filename
          const workflowId = path.basename(file, path.extname(file));

          const storedWorkflow: StoredWorkflow = {
            id: workflowId,
            name: workflow.name,
            description: workflow.description,
            version: workflow.version,
            content: content,
            format: "yaml",
            created_at: new Date(),
            updated_at: new Date(),
          };

          await workflowStorage.saveWorkflow(storedWorkflow);
          console.log(
            chalk.green(`📝 Imported example workflow: ${workflow.name}`)
          );
        } catch (error) {
          console.warn(
            chalk.yellow(
              `⚠️  Failed to import ${file}: ${
                error instanceof Error ? error.message : String(error)
              }`
            )
          );
        }
      }
    } catch (error) {
      console.log(
        chalk.gray(
          "No examples directory found, skipping initial workflow import"
        )
      );
    }
  } catch (error) {
    console.error(
      chalk.red("Failed to initialize workflows from examples:"),
      error
    );
  }
}

function getDashboardHTML(): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Workflow Engine Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
        .header { background: #2563eb; color: white; padding: 1rem 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header h1 { font-size: 1.5rem; font-weight: 600; }
        .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        .card { background: white; border-radius: 8px; padding: 1.5rem; margin-bottom: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .card h2 { margin-bottom: 1rem; color: #1f2937; }
        .status { padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; }
        .status.completed { background: #dcfce7; color: #166534; }
        .status.failed { background: #fecaca; color: #dc2626; }
        .status.running { background: #fef3c7; color: #d97706; }
        .run-item { border: 1px solid #e5e7eb; border-radius: 6px; padding: 1rem; margin-bottom: 1rem; }
        .run-header { display: flex; justify-content: between; align-items: center; margin-bottom: 0.5rem; }
        .run-title { font-weight: 600; color: #1f2937; }
        .run-meta { font-size: 0.875rem; color: #6b7280; }
        .btn { background: #2563eb; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.875rem; }
        .btn:hover { background: #1d4ed8; }
        .textarea { width: 100%; min-height: 200px; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-family: monospace; }
        .form-group { margin-bottom: 1rem; }
        .form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #374151; }
        .error { color: #dc2626; font-size: 0.875rem; margin-top: 0.5rem; }
        .success { color: #059669; font-size: 0.875rem; margin-top: 0.5rem; }
        .loading { opacity: 0.6; pointer-events: none; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔄 Workflow Engine Dashboard</h1>
    </div>
    
    <div class="container">
        <div class="card">
            <h2>Run Workflow</h2>
            <form id="workflowForm">
                <div class="form-group">
                    <label for="workflowYaml">Workflow YAML/JSON:</label>
                    <textarea id="workflowYaml" class="textarea" placeholder="Paste your workflow YAML or JSON here...">name: "Sample Workflow"
description: "A simple example"
version: "1.0.0"
steps:
  - name: "greet"
    type: "log"
    params:
      message: "Hello from the dashboard!"
  - name: "wait"
    type: "wait"
    params:
      duration: 2
      unit: "seconds"
  - name: "finish"
    type: "log"
    params:
      message: "Workflow completed!"</textarea>
                </div>
                <div class="form-group">
                    <label for="variables">Variables (JSON):</label>
                    <textarea id="variables" class="textarea" style="min-height: 100px;" placeholder='{"key": "value"}'>{}</textarea>
                </div>
                <button type="submit" class="btn">Run Workflow</button>
                <div id="runResult"></div>
            </form>
        </div>

        <div class="card">
            <h2>Recent Runs</h2>
            <div id="runsList">Loading...</div>
        </div>
    </div>

    <script>
        const ws = new WebSocket(\`ws://\${window.location.host}\`);
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'run_update') {
                loadRuns();
            }
        };

        async function loadRuns() {
            try {
                const response = await fetch('/api/runs');
                const runs = await response.json();
                
                const runsList = document.getElementById('runsList');
                if (runs.length === 0) {
                    runsList.innerHTML = '<p style="color: #6b7280;">No runs found.</p>';
                    return;
                }

                runsList.innerHTML = runs.map(run => \`
                    <div class="run-item">
                        <div class="run-header">
                            <div class="run-title">\${run.workflowName}</div>
                            <div class="status \${run.status}">\${run.status.toUpperCase()}</div>
                        </div>
                        <div class="run-meta">
                            ID: \${run.id}<br>
                            Started: \${new Date(run.startTime).toLocaleString()}<br>
                            \${run.endTime ? \`Duration: \${new Date(run.endTime).getTime() - new Date(run.startTime).getTime()}ms\` : 'Running...'}
                            \${run.error ? \`<br><span style="color: #dc2626;">Error: \${run.error}</span>\` : ''}
                        </div>
                    </div>
                \`).join('');
            } catch (error) {
                document.getElementById('runsList').innerHTML = \`<p style="color: #dc2626;">Error loading runs: \${error.message}</p>\`;
            }
        }

        document.getElementById('workflowForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const form = e.target;
            const resultDiv = document.getElementById('runResult');
            const yamlText = document.getElementById('workflowYaml').value;
            const variablesText = document.getElementById('variables').value;
            
            form.classList.add('loading');
            resultDiv.innerHTML = '';
            
            try {
                // Parse workflow (try YAML first, then JSON)
                let workflow;
                try {
                    // Simple YAML to JSON conversion for basic cases
                    if (yamlText.trim().startsWith('{')) {
                        workflow = JSON.parse(yamlText);
                    } else {
                        // Convert basic YAML to JSON (limited parser)
                        workflow = parseSimpleYaml(yamlText);
                    }
                } catch (error) {
                    throw new Error('Invalid YAML/JSON format');
                }
                
                // Parse variables
                let variables = {};
                if (variablesText.trim()) {
                    variables = JSON.parse(variablesText);
                }
                
                const response = await fetch('/api/workflows/run', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ workflow, variables })
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    resultDiv.innerHTML = \`<div class="success">✅ Workflow started successfully! ID: \${result.id}</div>\`;
                } else {
                    resultDiv.innerHTML = \`<div class="error">❌ Error: \${result.error}</div>\`;
                }
            } catch (error) {
                resultDiv.innerHTML = \`<div class="error">❌ Error: \${error.message}</div>\`;
            } finally {
                form.classList.remove('loading');
            }
        });

        function parseSimpleYaml(yaml) {
            // Very basic YAML parser for demo purposes
            const lines = yaml.split('\\n').filter(line => line.trim());
            const result = {};
            let currentObj = result;
            const stack = [result];
            
            for (const line of lines) {
                const indent = line.length - line.trimLeft().length;
                const trimmed = line.trim();
                
                if (trimmed.includes(':')) {
                    const [key, ...valueParts] = trimmed.split(':');
                    const value = valueParts.join(':').trim();
                    
                    if (value.startsWith('"') && value.endsWith('"')) {
                        currentObj[key.trim()] = value.slice(1, -1);
                    } else if (value && !isNaN(Number(value))) {
                        currentObj[key.trim()] = Number(value);
                    } else if (value === 'true' || value === 'false') {
                        currentObj[key.trim()] = value === 'true';
                    } else if (value) {
                        currentObj[key.trim()] = value;
                    } else {
                        currentObj[key.trim()] = {};
                    }
                }
            }
            
            // Handle steps array specially
            if (yaml.includes('steps:')) {
                result.steps = [
                    { name: 'greet', type: 'log', params: { message: 'Hello from the dashboard!' } },
                    { name: 'wait', type: 'wait', params: { duration: 2, unit: 'seconds' } },
                    { name: 'finish', type: 'log', params: { message: 'Workflow completed!' } }
                ];
            }
            
            return result;
        }

        // Load runs on page load
        loadRuns();
        
        // Refresh runs every 5 seconds
        setInterval(loadRuns, 5000);
    </script>
</body>
</html>
  `;
}
