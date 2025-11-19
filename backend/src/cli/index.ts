#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import * as path from "path";
import { WorkflowEngine } from "../engine/WorkflowEngine";
import { WorkflowLoader } from "../loader/WorkflowLoader";
import { SqliteStorage } from "../storage/SqliteStorage";
import { ConsoleLogger } from "../utils/logger";
import { HttpStepExecutor } from "../steps/HttpStepExecutor";
import { WaitStepExecutor } from "../steps/WaitStepExecutor";
import { LogStepExecutor } from "../steps/LogStepExecutor";
import { ScriptStepExecutor } from "../steps/ScriptStepExecutor";
import { EmailStepExecutor } from "../steps/EmailStepExecutor";
import { ForEachStepExecutor } from "../steps/ForEachStepExecutor";
import { startDashboard } from "../dashboard/server";

const program = new Command();

program
  .name("workflow-engine")
  .description("Universal Workflow Automation Engine")
  .version("1.0.0");

program
  .command("run")
  .description("Run a workflow from a file")
  .argument("<file>", "Workflow file path (YAML or JSON)")
  .option("-v, --variables <variables>", "Variables as JSON string")
  .option("-d, --debug", "Enable debug logging")
  .option("--db <path>", "SQLite database path", "./workflows.db")
  .action(async (file: string, options: any) => {
    try {
      const logger = new ConsoleLogger(options.debug);
      const storage = new SqliteStorage(options.db);
      const engine = new WorkflowEngine(storage, logger);

      // Register built-in step executors
      engine.registerStepExecutor(new HttpStepExecutor());
      engine.registerStepExecutor(new WaitStepExecutor());
      engine.registerStepExecutor(new LogStepExecutor());
      engine.registerStepExecutor(new ScriptStepExecutor());
      engine.registerStepExecutor(new EmailStepExecutor());
      engine.registerStepExecutor(new ForEachStepExecutor());

      logger.info(chalk.cyan("Loading workflow..."));
      const workflow = await WorkflowLoader.loadFromFile(path.resolve(file));

      let variables = {};
      if (options.variables) {
        try {
          variables = JSON.parse(options.variables);
        } catch (error) {
          logger.error("Invalid variables JSON");
          process.exit(1);
        }
      }

      logger.info(chalk.cyan(`Starting workflow: ${workflow.name}`));
      const run = await engine.execute(workflow, variables);

      if (run.status === "completed") {
        logger.info(
          chalk.green(`✅ Workflow completed successfully! (ID: ${run.id})`)
        );
      } else {
        logger.error(
          chalk.red(`❌ Workflow failed: ${run.error} (ID: ${run.id})`)
        );
        process.exit(1);
      }
    } catch (error) {
      console.error(
        chalk.red("Error:"),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

program
  .command("validate")
  .description("Validate a workflow file")
  .argument("<file>", "Workflow file path (YAML or JSON)")
  .action(async (file: string) => {
    try {
      const workflow = await WorkflowLoader.loadFromFile(path.resolve(file));
      const validation = WorkflowLoader.validateWorkflow(workflow);

      if (validation.valid) {
        console.log(chalk.green("✅ Workflow is valid!"));
        console.log(chalk.gray(`Name: ${workflow.name}`));
        console.log(chalk.gray(`Steps: ${workflow.steps.length}`));
      } else {
        console.log(chalk.red("❌ Workflow validation failed:"));
        validation.errors.forEach((error) => {
          console.log(chalk.red(`  - ${error}`));
        });
        process.exit(1);
      }
    } catch (error) {
      console.error(
        chalk.red("Error:"),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

program
  .command("list")
  .description("List workflow runs")
  .option("--workflow <name>", "Filter by workflow name")
  .option("--db <path>", "SQLite database path", "./workflows.db")
  .action(async (options: any) => {
    try {
      const storage = new SqliteStorage(options.db);
      const runs = await storage.listRuns(options.workflow);

      if (runs.length === 0) {
        console.log(chalk.yellow("No workflow runs found."));
        return;
      }

      console.log(chalk.cyan("\nWorkflow Runs:"));
      console.log("─".repeat(80));

      runs.forEach((run) => {
        const status =
          run.status === "completed"
            ? chalk.green("✅ COMPLETED")
            : run.status === "failed"
            ? chalk.red("❌ FAILED")
            : chalk.yellow("⏳ RUNNING");

        console.log(`${status} ${run.workflowName} (${run.id})`);
        console.log(`  Started: ${run.startTime.toLocaleString()}`);
        if (run.endTime) {
          const duration = run.endTime.getTime() - run.startTime.getTime();
          console.log(`  Duration: ${duration}ms`);
        }
        if (run.error) {
          console.log(chalk.red(`  Error: ${run.error}`));
        }
        console.log("");
      });
    } catch (error) {
      console.error(
        chalk.red("Error:"),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

program
  .command("dashboard")
  .description("Start the web dashboard")
  .option("-p, --port <port>", "Port number", "3000")
  .option("--db <path>", "SQLite database path", "./workflows.db")
  .action(async (options: any) => {
    try {
      const port = parseInt(options.port);
      await startDashboard(port, options.db);
    } catch (error) {
      console.error(
        chalk.red("Error:"),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

program
  .command("init")
  .description("Initialize a new workflow file")
  .argument("<name>", "Workflow name")
  .option("-f, --format <format>", "File format (yaml|json)", "yaml")
  .action(async (name: string, options: any) => {
    try {
      const format = options.format === "json" ? "json" : "yaml";
      const filename = `${name.toLowerCase().replace(/\s+/g, "-")}.${format}`;

      const sampleWorkflow = {
        name,
        description: `A sample workflow for ${name}`,
        version: "1.0.0",
        variables: {
          environment: "development",
        },
        steps: [
          {
            name: "welcome",
            type: "log",
            params: {
              message: `Welcome to ${name} workflow!`,
              level: "info",
            },
            retries: 0,
            onError: "stop" as const,
          },
          {
            name: "sample-http-call",
            type: "http",
            params: {
              url: "https://api.github.com/zen",
              method: "GET",
            },
            retries: 0,
            onError: "stop" as const,
          },
          {
            name: "process-response",
            type: "script",
            params: {
              language: "javascript",
              code: `
                const response = context.steps['sample-http-call'];
                console.log('GitHub Zen:', response.data.data);
                return { 
                  message: 'Workflow completed successfully!',
                  zenQuote: response.data.data 
                };
              `,
            },
            retries: 0,
            onError: "stop" as const,
          },
        ],
      };

      await WorkflowLoader.saveToFile(sampleWorkflow, filename);
      console.log(chalk.green(`✅ Created workflow file: ${filename}`));
      console.log(chalk.gray(`Run with: workflow-engine run ${filename}`));
    } catch (error) {
      console.error(
        chalk.red("Error:"),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

program.parse();
