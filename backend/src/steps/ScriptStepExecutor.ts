import { StepExecutor, StepContext, StepResult } from "../types";
import { VM } from "vm2";

export class ScriptStepExecutor implements StepExecutor {
  type = "script";

  validate(params: Record<string, any>): boolean {
    return !!(params.code && typeof params.code === "string");
  }

  async execute(
    params: Record<string, any>,
    context: StepContext
  ): Promise<StepResult> {
    const {
      code,
      language = "javascript",
      timeout = 30000,
      allowAsync = true,
    } = params;

    try {
      const vm = new VM({
        timeout,
        sandbox: {
          context,
          console: {
            log: (...args: any[]) => context.logger.info("Script:", ...args),
            error: (...args: any[]) => context.logger.error("Script:", ...args),
            warn: (...args: any[]) => context.logger.warn("Script:", ...args),
            debug: (...args: any[]) => context.logger.debug("Script:", ...args),
          },
          require: (module: string) => {
            // Allow only safe modules
            const allowedModules = ["lodash", "moment", "crypto"];
            if (allowedModules.includes(module)) {
              return require(module);
            }
            throw new Error(`Module '${module}' is not allowed`);
          },
        },
      });

      context.logger.debug(`Executing ${language} script`);

      let result;
      if (allowAsync && code.includes("await")) {
        // Wrap in async function
        const wrappedCode = `
          (async function() {
            ${code}
          })()
        `;
        result = await vm.run(wrappedCode);
      } else {
        // Wrap in regular function to allow return statements
        const wrappedCode = `
          (function() {
            ${code}
          })()
        `;
        result = vm.run(wrappedCode);
      }

      return {
        success: true,
        data: result,
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
