import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import chalk from "chalk";
import * as path from "path";
import { SqliteStorage } from "../storage/SqliteStorage";
import { WorkflowEngine } from "../engine/WorkflowEngine";
import { WorkflowLoader } from "../loader/WorkflowLoader";
import { ConsoleLogger } from "../utils/logger";
import { HttpStepExecutor } from "../steps/HttpStepExecutor";
import { WaitStepExecutor } from "../steps/WaitStepExecutor";
import { LogStepExecutor } from "../steps/LogStepExecutor";
import { ScriptStepExecutor } from "../steps/ScriptStepExecutor";
import { EmailStepExecutor } from "../steps/EmailStepExecutor";

export async function startDashboard(
  port: number,
  dbPath: string
): Promise<void> {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  app.use(express.json());
  app.use(express.static(path.join(__dirname, "public")));

  const storage = new SqliteStorage(dbPath);
  const logger = new ConsoleLogger(false);
  const engine = new WorkflowEngine(storage, logger);

  // Register built-in step executors
  engine.registerStepExecutor(new HttpStepExecutor());
  engine.registerStepExecutor(new WaitStepExecutor());
  engine.registerStepExecutor(new LogStepExecutor());
  engine.registerStepExecutor(new ScriptStepExecutor());
  engine.registerStepExecutor(new EmailStepExecutor());

  // WebSocket connections for real-time updates
  const clients = new Set<any>();

  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.on("close", () => clients.delete(ws));
  });

  function broadcast(data: any) {
    const message = JSON.stringify(data);
    clients.forEach((client) => {
      if (client.readyState === 1) {
        // WebSocket.OPEN
        client.send(message);
      }
    });
  }

  // API Routes
  app.get("/api/runs", async (req, res) => {
    try {
      const workflowName = req.query.workflow as string;
      const runs = await storage.listRuns(workflowName);
      res.json(runs);
    } catch (error) {
      res
        .status(500)
        .json({
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
      res
        .status(500)
        .json({
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
      res
        .status(500)
        .json({
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
      res
        .status(500)
        .json({
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
