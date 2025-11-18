import sqlite3 from "sqlite3";
import { Workflow } from "../types";
import { promisify } from "util";
import * as path from "path";

export interface StoredWorkflow {
  id: string;
  name: string;
  description?: string;
  version: string;
  content: string; // YAML/JSON content
  format: "yaml" | "json";
  created_at: Date;
  updated_at: Date;
}

export class WorkflowStorage {
  private db: sqlite3.Database;
  private initialized: boolean = false;

  constructor(dbPath: string = ":memory:") {
    this.db = new sqlite3.Database(dbPath);
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    const run = promisify(this.db.run.bind(this.db));

    await run(`
      CREATE TABLE IF NOT EXISTS workflows (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        version TEXT NOT NULL,
        content TEXT NOT NULL,
        format TEXT NOT NULL DEFAULT 'yaml',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      CREATE INDEX IF NOT EXISTS idx_workflows_name ON workflows(name);
    `);

    this.initialized = true;
  }

  async saveWorkflow(workflow: StoredWorkflow): Promise<void> {
    await this.ensureInitialized();
    const run = promisify(this.db.run.bind(this.db)) as any;

    await run(
      `INSERT OR REPLACE INTO workflows 
       (id, name, description, version, content, format, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      workflow.id,
      workflow.name,
      workflow.description || null,
      workflow.version,
      workflow.content,
      workflow.format
    );
  }

  async getWorkflow(id: string): Promise<StoredWorkflow | null> {
    await this.ensureInitialized();
    const get = promisify(this.db.get.bind(this.db)) as any;

    const row: any = await get("SELECT * FROM workflows WHERE id = ?", id);

    if (!row) {
      return null;
    }

    return this.mapRowToWorkflow(row);
  }

  async listWorkflows(): Promise<StoredWorkflow[]> {
    await this.ensureInitialized();
    const all = promisify(this.db.all.bind(this.db)) as any;

    const rows: any[] = await all(
      "SELECT * FROM workflows ORDER BY updated_at DESC"
    );
    return rows.map((row) => this.mapRowToWorkflow(row));
  }

  async deleteWorkflow(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const run = promisify(this.db.run.bind(this.db)) as any;

    const result = await run("DELETE FROM workflows WHERE id = ?", id);
    return result.changes > 0;
  }

  async updateWorkflow(
    id: string,
    updates: Partial<StoredWorkflow>
  ): Promise<void> {
    await this.ensureInitialized();
    const run = promisify(this.db.run.bind(this.db)) as any;

    const setClause: string[] = [];
    const values: any[] = [];

    if (updates.name) {
      setClause.push("name = ?");
      values.push(updates.name);
    }

    if (updates.description !== undefined) {
      setClause.push("description = ?");
      values.push(updates.description);
    }

    if (updates.version) {
      setClause.push("version = ?");
      values.push(updates.version);
    }

    if (updates.content) {
      setClause.push("content = ?");
      values.push(updates.content);
    }

    if (updates.format) {
      setClause.push("format = ?");
      values.push(updates.format);
    }

    setClause.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    await run(
      `UPDATE workflows SET ${setClause.join(", ")} WHERE id = ?`,
      ...values
    );
  }

  private mapRowToWorkflow(row: any): StoredWorkflow {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      version: row.version,
      content: row.content,
      format: row.format,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }

  async close(): Promise<void> {
    const close = promisify(this.db.close.bind(this.db));
    await close();
  }
}
