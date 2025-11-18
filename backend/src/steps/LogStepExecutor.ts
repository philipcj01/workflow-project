import { StepExecutor, StepContext, StepResult } from "../types";
import { replaceVariables } from "../utils/conditions";

export class LogStepExecutor implements StepExecutor {
  type = "log";

  validate(params: Record<string, any>): boolean {
    return !!params.message;
  }

  async execute(
    params: Record<string, any>,
    context: StepContext
  ): Promise<StepResult> {
    const { message, level = "info", data } = params;

    // Replace variables in the message
    const processedMessage = replaceVariables(message, context);

    const logMethod =
      context.logger[level as keyof typeof context.logger] ||
      context.logger.info;

    if (typeof logMethod === "function") {
      logMethod.call(context.logger, processedMessage, data);
    }

    return {
      success: true,
      data: { message: processedMessage, level, timestamp: new Date() },
      duration: 0,
      timestamp: new Date(),
      retries: 0,
    };
  }
}
