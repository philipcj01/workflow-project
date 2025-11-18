import { v4 as uuidv4 } from "uuid";
import {
  Workflow,
  WorkflowRun,
  StepExecutor,
  StepContext,
  StepResult,
  Storage,
  Logger,
  Plugin,
} from "../types";
import { ConsoleLogger } from "../utils/logger";
import { evaluateCondition } from "../utils/conditions";

export class WorkflowEngine {
  private stepExecutors: Map<string, StepExecutor> = new Map();
  private storage: Storage;
  private logger: Logger;
  private plugins: Plugin[] = [];

  constructor(storage: Storage, logger?: Logger) {
    this.storage = storage;
    this.logger = logger || new ConsoleLogger();
  }

  registerStepExecutor(executor: StepExecutor): void {
    this.stepExecutors.set(executor.type, executor);
    this.logger.debug(`Registered step executor: ${executor.type}`);
  }

  registerPlugin(plugin: Plugin): void {
    this.plugins.push(plugin);

    // Register all step executors from the plugin
    plugin.stepExecutors.forEach((executor) => {
      this.registerStepExecutor(executor);
    });

    this.logger.info(`Registered plugin: ${plugin.name} v${plugin.version}`);
  }

  async execute(
    workflow: Workflow,
    variables: Record<string, any> = {}
  ): Promise<WorkflowRun> {
    const runId = uuidv4();
    const run: WorkflowRun = {
      id: runId,
      workflowName: workflow.name,
      status: "running",
      startTime: new Date(),
      steps: {},
      variables: { ...workflow.variables, ...variables },
    };

    this.logger.info(
      `Starting workflow execution: ${workflow.name} (${runId})`
    );

    try {
      // Save initial run
      await this.storage.saveRun(run);

      // Execute beforeWorkflow hooks
      for (const plugin of this.plugins) {
        if (plugin.hooks?.beforeWorkflow) {
          await plugin.hooks.beforeWorkflow(workflow, {
            runId,
            variables: run.variables,
          });
        }
      }

      // Execute steps
      for (const step of workflow.steps) {
        const context: StepContext = {
          workflow,
          variables: run.variables,
          steps: run.steps,
          currentStep: step.name,
          runId,
          logger: this.logger,
        };

        // Check condition if specified
        if (step.condition && !evaluateCondition(step.condition, context)) {
          this.logger.info(
            `Skipping step '${step.name}' - condition not met: ${step.condition}`
          );
          continue;
        }

        // Execute beforeStep hooks
        for (const plugin of this.plugins) {
          if (plugin.hooks?.beforeStep) {
            await plugin.hooks.beforeStep(step, context);
          }
        }

        const result = await this.executeStep(step, context);
        run.steps[step.name] = result;

        // Execute afterStep hooks
        for (const plugin of this.plugins) {
          if (plugin.hooks?.afterStep) {
            await plugin.hooks.afterStep(step, result, context);
          }
        }

        // Update run with step result
        await this.storage.updateRun(runId, { steps: run.steps });

        // Handle step failure
        if (!result.success) {
          if (step.onError === "stop") {
            run.status = "failed";
            run.error = `Step '${step.name}' failed: ${result.error}`;
            break;
          } else if (step.onError === "continue") {
            this.logger.warn(
              `Step '${step.name}' failed but continuing: ${result.error}`
            );
            continue;
          }
        }
      }

      // Mark as completed if no failures
      if (run.status === "running") {
        run.status = "completed";
      }

      run.endTime = new Date();
      await this.storage.updateRun(runId, {
        status: run.status,
        endTime: run.endTime,
        error: run.error,
      });

      // Execute afterWorkflow hooks
      for (const plugin of this.plugins) {
        if (plugin.hooks?.afterWorkflow) {
          await plugin.hooks.afterWorkflow(workflow, run);
        }
      }

      this.logger.info(
        `Workflow execution completed: ${workflow.name} (${runId}) - Status: ${run.status}`
      );
      return run;
    } catch (error) {
      run.status = "failed";
      run.error = error instanceof Error ? error.message : String(error);
      run.endTime = new Date();

      await this.storage.updateRun(runId, {
        status: run.status,
        endTime: run.endTime,
        error: run.error,
      });

      this.logger.error(
        `Workflow execution failed: ${workflow.name} (${runId})`,
        error
      );
      return run;
    }
  }

  private async executeStep(
    step: any,
    context: StepContext
  ): Promise<StepResult> {
    const executor = this.stepExecutors.get(step.type);
    if (!executor) {
      return {
        success: false,
        error: `Unknown step type: ${step.type}`,
        duration: 0,
        timestamp: new Date(),
        retries: 0,
      };
    }

    const startTime = Date.now();
    let retryCount = 0;
    let lastError: string | undefined;

    while (retryCount <= step.retries) {
      try {
        this.logger.debug(
          `Executing step '${step.name}' (attempt ${retryCount + 1})`
        );

        // Validate parameters if validator exists
        if (executor.validate && !executor.validate(step.params)) {
          throw new Error(`Invalid parameters for step type '${step.type}'`);
        }

        const result = await this.executeWithTimeout(
          executor.execute(step.params, context),
          step.timeout
        );

        const duration = Date.now() - startTime;

        this.logger.info(
          `Step '${step.name}' completed successfully in ${duration}ms`
        );

        return {
          ...result,
          duration,
          timestamp: new Date(),
          retries: retryCount,
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Step '${step.name}' failed (attempt ${retryCount + 1}): ${lastError}`
        );

        retryCount++;

        if (retryCount <= step.retries) {
          // Wait before retry (exponential backoff)
          const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 30000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    const duration = Date.now() - startTime;
    return {
      success: false,
      error: lastError,
      duration,
      timestamp: new Date(),
      retries: retryCount - 1,
    };
  }

  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs?: number
  ): Promise<T> {
    if (!timeoutMs) {
      return promise;
    }

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () =>
          reject(new Error(`Step execution timed out after ${timeoutMs}ms`)),
        timeoutMs
      );
    });

    return Promise.race([promise, timeoutPromise]);
  }

  async getRun(runId: string): Promise<WorkflowRun | null> {
    return this.storage.getRun(runId);
  }

  async listRuns(workflowName?: string): Promise<WorkflowRun[]> {
    return this.storage.listRuns(workflowName);
  }
}
