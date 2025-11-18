import chalk from "chalk";
import { Logger } from "../types";

export class ConsoleLogger implements Logger {
  private debugMode: boolean;

  constructor(debugMode = false) {
    this.debugMode = debugMode;
  }

  info(message: string, meta?: any): void {
    const timestamp = new Date().toISOString();
    console.log(
      chalk.blue(`[${timestamp}] INFO:`),
      message,
      meta ? JSON.stringify(meta, null, 2) : ""
    );
  }

  warn(message: string, meta?: any): void {
    const timestamp = new Date().toISOString();
    console.log(
      chalk.yellow(`[${timestamp}] WARN:`),
      message,
      meta ? JSON.stringify(meta, null, 2) : ""
    );
  }

  error(message: string, meta?: any): void {
    const timestamp = new Date().toISOString();
    console.error(
      chalk.red(`[${timestamp}] ERROR:`),
      message,
      meta ? JSON.stringify(meta, null, 2) : ""
    );
  }

  debug(message: string, meta?: any): void {
    if (this.debugMode) {
      const timestamp = new Date().toISOString();
      console.log(
        chalk.gray(`[${timestamp}] DEBUG:`),
        message,
        meta ? JSON.stringify(meta, null, 2) : ""
      );
    }
  }
}
