import { StepExecutor, StepContext, StepResult } from "../types";
import { evaluateCondition } from "../utils/conditions";

export class ConditionalStepExecutor implements StepExecutor {
  type = "conditional";

  validate(params: Record<string, any>): boolean {
    return !!(params.condition && (params.then || params.else));
  }

  async execute(
    params: Record<string, any>,
    context: StepContext
  ): Promise<StepResult> {
    const { condition, then, else: elseValue } = params;

    try {
      const conditionResult = evaluateCondition(condition, context);

      context.logger.debug(
        `Condition "${condition}" evaluated to: ${conditionResult}`
      );

      const result = conditionResult ? then : elseValue;

      return {
        success: true,
        data: {
          condition,
          conditionResult,
          selectedBranch: conditionResult ? "then" : "else",
          result,
        },
        duration: 0,
        timestamp: new Date(),
        retries: 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: 0,
        timestamp: new Date(),
        retries: 0,
      };
    }
  }
}
