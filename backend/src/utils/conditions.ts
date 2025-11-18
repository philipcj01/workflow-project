import { StepContext } from "../types";

export function evaluateCondition(
  condition: string,
  context: StepContext
): boolean {
  try {
    // Simple condition parser - supports basic comparisons and logical operators
    // Replace context variables with actual values
    let processedCondition = condition;

    // Replace variables like ${variable} or ${steps.stepName.data.field}
    processedCondition = processedCondition.replace(
      /\${([^}]+)}/g,
      (match, path) => {
        const value = getNestedValue(context, path.trim());
        return JSON.stringify(value);
      }
    );

    // Evaluate the condition safely
    const result = new Function("return " + processedCondition)();
    return Boolean(result);
  } catch (error) {
    context.logger.warn(`Failed to evaluate condition: ${condition}`, error);
    return false;
  }
}

function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

export function replaceVariables(text: string, context: StepContext): string {
  return text.replace(/\${([^}]+)}/g, (match, path) => {
    const value = getNestedValue(context, path.trim());
    return value !== undefined ? String(value) : match;
  });
}
