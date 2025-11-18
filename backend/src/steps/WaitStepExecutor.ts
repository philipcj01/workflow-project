import { StepExecutor, StepContext, StepResult } from "../types";

export class WaitStepExecutor implements StepExecutor {
  type = "wait";

  validate(params: Record<string, any>): boolean {
    return typeof params.duration === "number" && params.duration > 0;
  }

  async execute(
    params: Record<string, any>,
    context: StepContext
  ): Promise<StepResult> {
    const { duration, unit = "milliseconds" } = params;

    let delayMs = duration;

    switch (unit) {
      case "seconds":
        delayMs = duration * 1000;
        break;
      case "minutes":
        delayMs = duration * 60 * 1000;
        break;
      case "hours":
        delayMs = duration * 60 * 60 * 1000;
        break;
      case "milliseconds":
      default:
        delayMs = duration;
        break;
    }

    context.logger.debug(`Waiting for ${delayMs}ms`);

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: { waited: delayMs, unit },
          duration: delayMs,
          timestamp: new Date(),
          retries: 0,
        });
      }, delayMs);
    });
  }
}
