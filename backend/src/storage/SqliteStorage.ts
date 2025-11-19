import sqlite3 from "sqlite3";
import { Storage, WorkflowRun } from "../types";
import { promisify } from "util";

export class SqliteStorage implements Storage {
  private db: sqlite3.Database;
  private initialized: boolean = false;

  constructor(dbPath: string = ":memory:") {
    this.db = new sqlite3.Database(dbPath);
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    const run = promisify(this.db.run.bind(this.db));

    await run(`
      CREATE TABLE IF NOT EXISTS workflow_runs (
        id TEXT PRIMARY KEY,
        workflow_name TEXT NOT NULL,
        status TEXT NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME,
        steps TEXT,
        variables TEXT,
        error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      CREATE INDEX IF NOT EXISTS idx_workflow_runs_name ON workflow_runs(workflow_name);
    `);

    await run(`
      CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON workflow_runs(status);
    `);

    this.initialized = true;
  }

  async saveRun(run: WorkflowRun): Promise<void> {
    await this.ensureInitialized();
    const runDb = promisify(this.db.run.bind(this.db)) as any;

    await runDb(
      `INSERT INTO workflow_runs 
       (id, workflow_name, status, start_time, end_time, steps, variables, error) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      run.id,
      run.workflowName,
      run.status,
      run.startTime.toISOString(),
      run.endTime?.toISOString() || null,
      JSON.stringify(run.steps),
      JSON.stringify(run.variables),
      run.error || null
    );
  }

  async getRun(id: string): Promise<WorkflowRun | null> {
    await this.ensureInitialized();
    const get = promisify(this.db.get.bind(this.db)) as any;

    const row: any = await get("SELECT * FROM workflow_runs WHERE id = ?", id);

    if (!row) {
      return null;
    }

    return this.mapRowToRun(row);
  }

  async listRuns(workflowName?: string): Promise<WorkflowRun[]> {
    await this.ensureInitialized();
    const all = promisify(this.db.all.bind(this.db)) as any;

    let query = "SELECT * FROM workflow_runs";
    const params: any[] = [];

    if (workflowName) {
      query += " WHERE workflow_name = ?";
      params.push(workflowName);
    }

    query += " ORDER BY start_time DESC LIMIT 100";

    const rows: any[] =
      params.length > 0 ? await all(query, ...params) : await all(query);
    return rows.map((row) => this.mapRowToRun(row));
  }

  async updateRun(id: string, updates: Partial<WorkflowRun>): Promise<void> {
    await this.ensureInitialized();
    const runDb = promisify(this.db.run.bind(this.db)) as any;

    const setClause: string[] = [];
    const values: any[] = [];

    if (updates.status) {
      setClause.push("status = ?");
      values.push(updates.status);
    }

    if (updates.endTime) {
      setClause.push("end_time = ?");
      values.push(updates.endTime.toISOString());
    }

    if (updates.steps) {
      setClause.push("steps = ?");
      values.push(JSON.stringify(updates.steps));
    }

    if (updates.variables) {
      setClause.push("variables = ?");
      values.push(JSON.stringify(updates.variables));
    }

    if (updates.error !== undefined) {
      setClause.push("error = ?");
      values.push(updates.error);
    }

    setClause.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    await runDb(
      `UPDATE workflow_runs SET ${setClause.join(", ")} WHERE id = ?`,
      ...values
    );
  }

  async clearAllRuns(): Promise<void> {
    await this.ensureInitialized();
    const runDb = promisify(this.db.run.bind(this.db)) as any;

    await runDb("DELETE FROM workflow_runs");
  }

  private mapRowToRun(row: any): WorkflowRun {
    return {
      id: row.id,
      workflowName: row.workflow_name,
      status: row.status,
      startTime: new Date(row.start_time),
      endTime: row.end_time ? new Date(row.end_time) : undefined,
      steps: JSON.parse(row.steps || "{}"),
      variables: JSON.parse(row.variables || "{}"),
      error: row.error || undefined,
    };
  }

  async close(): Promise<void> {
    const close = promisify(this.db.close.bind(this.db));
    await close();
  }
}
