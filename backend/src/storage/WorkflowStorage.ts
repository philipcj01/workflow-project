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

    try {
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
    } catch (error) {
      console.error("Error saving workflow:", error);
      throw new Error(
        `Failed to save workflow: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
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

    try {
      const rows: any[] = await all(
        "SELECT * FROM workflows ORDER BY updated_at DESC"
      );
      return rows.map((row) => this.mapRowToWorkflow(row));
    } catch (error) {
      console.error("Error listing workflows:", error);
      throw new Error(
        `Failed to list workflows: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async deleteWorkflow(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const run = promisify(this.db.run.bind(this.db)) as any;

    try {
      // First check if the workflow exists
      const get = promisify(this.db.get.bind(this.db)) as any;
      const existingWorkflow = await get(
        "SELECT id FROM workflows WHERE id = ?",
        id
      );

      if (!existingWorkflow) {
        console.log(`Workflow with id ${id} not found`);
        return false;
      }

      // Delete the workflow
      const result = await run("DELETE FROM workflows WHERE id = ?", id);

      // SQLite3 run result should have a 'changes' property
      const deleted = result?.changes > 0;

      if (deleted) {
        console.log(`Successfully deleted workflow with id: ${id}`);
      } else {
        console.log(`No workflow was deleted for id: ${id}`);
      }

      return deleted;
    } catch (error) {
      console.error("Error deleting workflow:", error);
      throw new Error(
        `Failed to delete workflow: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
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

    try {
      await run(
        `UPDATE workflows SET ${setClause.join(", ")} WHERE id = ?`,
        ...values
      );
    } catch (error) {
      console.error("Error updating workflow:", error);
      throw new Error(
        `Failed to update workflow: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
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
