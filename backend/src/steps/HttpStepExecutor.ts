import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { StepExecutor, StepContext, StepResult } from "../types";

export class HttpStepExecutor implements StepExecutor {
  type = "http";

  validate(params: Record<string, any>): boolean {
    return !!(params.url && params.method);
  }

  async execute(
    params: Record<string, any>,
    context: StepContext
  ): Promise<StepResult> {
    const {
      url,
      method = "GET",
      headers = {},
      data,
      timeout = 30000,
      ...axiosOptions
    } = params;

    try {
      const config: AxiosRequestConfig = {
        url,
        method: method.toUpperCase(),
        headers,
        data,
        timeout,
        ...axiosOptions,
      };

      context.logger.debug(`Making ${method} request to ${url}`);

      const response: AxiosResponse = await axios(config);

      return {
        success: true,
        data: {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          data: response.data,
        },
        duration: 0,
        timestamp: new Date(),
        retries: 0,
      };
    } catch (error: any) {
      if (error.response) {
        // Server responded with error status
        return {
          success: false,
          error: `HTTP ${error.response.status}: ${error.response.statusText}`,
          data: {
            status: error.response.status,
            statusText: error.response.statusText,
            headers: error.response.headers,
            data: error.response.data,
          },
          duration: 0,
          timestamp: new Date(),
          retries: 0,
        };
      } else if (error.request) {
        // Network error
        return {
          success: false,
          error: `Network error: ${error.message}`,
          duration: 0,
          timestamp: new Date(),
          retries: 0,
        };
      } else {
        // Other error
        return {
          success: false,
          error: error.message,
          duration: 0,
          timestamp: new Date(),
          retries: 0,
        };
      }
    }
  }
}
