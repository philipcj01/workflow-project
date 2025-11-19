import { StepExecutor, StepContext, StepResult } from "../types";
import { WorkflowEngine } from "../engine/WorkflowEngine";
import { evaluateCondition } from "../utils/conditions";

export interface ForEachParams {
  items: any[] | string; // Array or expression that evaluates to an array
  itemVariable?: string; // Variable name for current item (default: "item")
  indexVariable?: string; // Variable name for current index (default: "index")
  steps: Array<{
    name: string;
    type: string;
    params: Record<string, any>;
    condition?: string;
    retries?: number;
    timeout?: number;
    onError?: "stop" | "continue" | "retry";
  }>;
  parallel?: boolean; // Whether to execute iterations in parallel (default: false)
  maxConcurrency?: number; // Max concurrent iterations when parallel=true (default: 5)
}

export class ForEachStepExecutor implements StepExecutor {
  type = "foreach";

  validate(params: Record<string, any>): boolean {
    const p = params as ForEachParams;
    return (
      (Array.isArray(p.items) || typeof p.items === "string") &&
      Array.isArray(p.steps) &&
      p.steps.length > 0 &&
      p.steps.every(step => 
        typeof step.name === "string" &&
        typeof step.type === "string" &&
        typeof step.params === "object"
      )
    );
  }

  async execute(
    params: Record<string, any>,
    context: StepContext
  ): Promise<StepResult> {
    const p = params as ForEachParams;
    const startTime = Date.now();

    try {
      // Resolve items array
      let items: any[];
      if (typeof p.items === "string") {
        // Evaluate expression to get array
        items = this.evaluateExpression(p.items, context);
      } else {
        items = p.items;
      }

      if (!Array.isArray(items)) {
        throw new Error("Items must be an array or expression that evaluates to an array");
      }

      const itemVariable = p.itemVariable || "item";
      const indexVariable = p.indexVariable || "index";
      const results: any[] = [];
      const errors: any[] = [];

      context.logger.info(`ForEach: Processing ${items.length} items`);

      if (p.parallel) {
        // Execute iterations in parallel with concurrency control
        const maxConcurrency = p.maxConcurrency || 5;
        const batches = this.createBatches(items, maxConcurrency);
        
        for (const batch of batches) {
          const batchPromises = batch.map(({ item, index }) =>
            this.executeIteration(item, index, p.steps, context, itemVariable, indexVariable)
          );
          
          const batchResults = await Promise.allSettled(batchPromises);
          
          batchResults.forEach((result, batchIndex) => {
            const originalIndex = batch[batchIndex].index;
            if (result.status === "fulfilled") {
              results[originalIndex] = result.value;
            } else {
              errors.push({
                index: originalIndex,
                error: result.reason?.message || String(result.reason)
              });
            }
          });
        }
      } else {
        // Execute iterations sequentially
        for (let i = 0; i < items.length; i++) {
          try {
            const result = await this.executeIteration(
              items[i], 
              i, 
              p.steps, 
              context, 
              itemVariable, 
              indexVariable
            );
            results[i] = result;
          } catch (error) {
            errors.push({
              index: i,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      }

      const duration = Date.now() - startTime;
      const hasErrors = errors.length > 0;

      context.logger.info(
        `ForEach completed: ${results.length} successful, ${errors.length} failed in ${duration}ms`
      );

      return {
        success: !hasErrors || errors.length < items.length, // Success if at least some iterations succeeded
        data: {
          results,
          errors,
          totalItems: items.length,
          successCount: results.filter(r => r != null).length,
          errorCount: errors.length
        },
        duration,
        timestamp: new Date(),
        retries: 0,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration,
        timestamp: new Date(),
        retries: 0,
      };
    }
  }

  private async executeIteration(
    item: any,
    index: number,
    steps: ForEachParams["steps"],
    parentContext: StepContext,
    itemVariable: string,
    indexVariable: string
  ): Promise<any> {
    // Create a new context with the current item and index variables
    const iterationContext: StepContext = {
      ...parentContext,
      variables: {
        ...parentContext.variables,
        [itemVariable]: item,
        [indexVariable]: index,
      },
      steps: {}, // Fresh step results for this iteration
      currentStep: `${parentContext.currentStep}_iteration_${index}`,
    };

    const iterationResults: Record<string, any> = {};

    // Execute each step in the iteration
    for (const step of steps) {
      // Check condition if specified
      if (step.condition && !evaluateCondition(step.condition, iterationContext)) {
        iterationContext.logger.debug(
          `Skipping step '${step.name}' in iteration ${index} - condition not met: ${step.condition}`
        );
        continue;
      }

      // Create a temporary workflow engine to execute the step
      // We'll use the same step executors that are registered in the parent engine
      const stepWithDefaults = {
        ...step,
        retries: step.retries ?? 0,
        onError: step.onError ?? "stop",
      };

      // Execute the step (we'll need to get the step executor from the parent engine)
      const result = await this.executeNestedStep(stepWithDefaults, iterationContext);
      
      iterationResults[step.name] = result;
      iterationContext.steps[step.name] = result;

      // Handle step failure
      if (!result.success) {
        if (stepWithDefaults.onError === "stop") {
          throw new Error(`Step '${step.name}' failed in iteration ${index}: ${result.error}`);
        } else if (stepWithDefaults.onError === "continue") {
          iterationContext.logger.warn(
            `Step '${step.name}' failed in iteration ${index} but continuing: ${result.error}`
          );
          continue;
        }
      }
    }

    return {
      item,
      index,
      steps: iterationResults,
    };
  }

  private async executeNestedStep(step: any, context: StepContext): Promise<StepResult> {
    // This is a simplified version - in a real implementation, we'd need access to the parent engine's step executors
    // For now, we'll implement basic step types directly
    
    const startTime = Date.now();
    
    try {
      let result: any;
      
      switch (step.type) {
        case "log":
          const message = this.evaluateExpression(step.params.message || "", context);
          context.logger.info(message);
          result = { message };
          break;
          
        case "script":
          // Simple JavaScript execution
          if (step.params.language === "javascript") {
            const func = new Function("context", step.params.code);
            result = func(context);
          } else {
            throw new Error(`Unsupported script language: ${step.params.language}`);
          }
          break;
          
        default:
          throw new Error(`Unsupported nested step type: ${step.type}. Use a script step for complex operations.`);
      }
      
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        data: result,
        duration,
        timestamp: new Date(),
        retries: 0,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration,
        timestamp: new Date(),
        retries: 0,
      };
    }
  }

  private evaluateExpression(expression: string, context: StepContext): any {
    // Simple expression evaluation - supports ${variable.path} syntax
    if (!expression.includes("${")) {
      return expression;
    }

    return expression.replace(/\$\{([^}]+)\}/g, (match, path) => {
      const keys = path.split(".");
      let value: any = {
        variables: context.variables,
        steps: context.steps,
      };

      for (const key of keys) {
        if (value && typeof value === "object" && key in value) {
          value = value[key];
        } else {
          return match; // Return original if path not found
        }
      }

      return typeof value === "string" ? value : JSON.stringify(value);
    });
  }

  private createBatches<T>(items: T[], batchSize: number): Array<{ item: T; index: number }[]> {
    const batches: Array<{ item: T; index: number }[]> = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize).map((item, batchIndex) => ({
        item,
        index: i + batchIndex,
      }));
      batches.push(batch);
    }
    
    return batches;
  }
}