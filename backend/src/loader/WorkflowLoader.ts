import * as fs from "fs/promises";
import * as yaml from "js-yaml";
import { Workflow, WorkflowSchema } from "../types";

export class WorkflowLoader {
  static async loadFromFile(filePath: string): Promise<Workflow> {
    try {
      const content = await fs.readFile(filePath, "utf8");
      const isYaml = filePath.endsWith(".yaml") || filePath.endsWith(".yml");

      let workflowData: any;

      if (isYaml) {
        workflowData = yaml.load(content);
      } else {
        workflowData = JSON.parse(content);
      }

      // Validate the workflow structure
      const validation = this.validateWorkflow(workflowData);
      if (!validation.valid) {
        throw new Error(`Invalid workflow: ${validation.errors.join(", ")}`);
      }

      return WorkflowSchema.parse(workflowData);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to load workflow from ${filePath}: ${error.message}`
        );
      }
      throw error;
    }
  }

  static async saveToFile(workflow: any, filePath: string): Promise<void> {
    try {
      const isYaml = filePath.endsWith(".yaml") || filePath.endsWith(".yml");

      let content: string;
      if (isYaml) {
        content = yaml.dump(workflow, {
          indent: 2,
          lineWidth: 120,
          noRefs: true,
        });
      } else {
        content = JSON.stringify(workflow, null, 2);
      }

      await fs.writeFile(filePath, content, "utf8");
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to save workflow to ${filePath}: ${error.message}`
        );
      }
      throw error;
    }
  }

  static validateWorkflow(workflow: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      WorkflowSchema.parse(workflow);
      return { valid: true, errors: [] };
    } catch (error: any) {
      if (error.errors) {
        // Zod validation errors
        error.errors.forEach((err: any) => {
          errors.push(`${err.path.join(".")}: ${err.message}`);
        });
      } else {
        errors.push(error.message || "Unknown validation error");
      }
    }

    // Additional custom validation
    if (workflow && workflow.steps) {
      const stepNames = new Set<string>();
      workflow.steps.forEach((step: any, index: number) => {
        if (!step.name) {
          errors.push(`Step ${index}: name is required`);
        } else if (stepNames.has(step.name)) {
          errors.push(`Step ${index}: duplicate step name '${step.name}'`);
        } else {
          stepNames.add(step.name);
        }

        if (!step.type) {
          errors.push(`Step ${step.name || index}: type is required`);
        }

        if (!step.params || typeof step.params !== "object") {
          errors.push(`Step ${step.name || index}: params must be an object`);
        }

        // Validate step-specific requirements
        if (step.type === "http") {
          if (!step.params?.url) {
            errors.push(
              `Step ${step.name}: HTTP step requires 'url' parameter`
            );
          }
          if (!step.params?.method) {
            errors.push(
              `Step ${step.name}: HTTP step requires 'method' parameter`
            );
          }
        }

        if (step.type === "wait") {
          if (
            typeof step.params?.duration !== "number" ||
            step.params.duration <= 0
          ) {
            errors.push(
              `Step ${step.name}: Wait step requires positive 'duration' parameter`
            );
          }
        }

        if (step.type === "script") {
          if (!step.params?.code) {
            errors.push(
              `Step ${step.name}: Script step requires 'code' parameter`
            );
          }
        }

        if (step.type === "log") {
          if (!step.params?.message) {
            errors.push(
              `Step ${step.name}: Log step requires 'message' parameter`
            );
          }
        }

        if (step.type === "email") {
          const required = ["to", "subject"];
          required.forEach((field) => {
            if (!step.params?.[field]) {
              errors.push(
                `Step ${step.name}: Email step requires '${field}' parameter`
              );
            }
          });
          if (!step.params?.text && !step.params?.html) {
            errors.push(
              `Step ${step.name}: Email step requires either 'text' or 'html' parameter`
            );
          }
        }
      });
    }

    return { valid: errors.length === 0, errors };
  }

  static async loadFromString(
    content: string,
    format: "yaml" | "json" = "yaml"
  ): Promise<Workflow> {
    try {
      let workflowData: any;

      if (format === "yaml") {
        workflowData = yaml.load(content);
      } else {
        workflowData = JSON.parse(content);
      }

      const validation = this.validateWorkflow(workflowData);
      if (!validation.valid) {
        throw new Error(`Invalid workflow: ${validation.errors.join(", ")}`);
      }

      return WorkflowSchema.parse(workflowData);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to parse workflow: ${error.message}`);
      }
      throw error;
    }
  }
}
