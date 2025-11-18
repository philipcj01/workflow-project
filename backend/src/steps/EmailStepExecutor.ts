import nodemailer from "nodemailer";
import { StepExecutor, StepContext, StepResult } from "../types";

export class EmailStepExecutor implements StepExecutor {
  type = "email";

  validate(params: Record<string, any>): boolean {
    return !!(params.to && params.subject && (params.text || params.html));
  }

  async execute(
    params: Record<string, any>,
    context: StepContext
  ): Promise<StepResult> {
    const { to, from, subject, text, html, smtp = {} } = params;

    try {
      // Create transporter
      const transporter = nodemailer.createTransport({
        host: smtp.host || process.env.SMTP_HOST,
        port: smtp.port || parseInt(process.env.SMTP_PORT || "587"),
        secure: smtp.secure || false,
        auth: {
          user: smtp.user || process.env.SMTP_USER,
          pass: smtp.pass || process.env.SMTP_PASS,
        },
      });

      const mailOptions = {
        from: from || smtp.from || process.env.SMTP_FROM,
        to,
        subject,
        text,
        html,
      };

      context.logger.debug(`Sending email to ${to}`);

      const info = await transporter.sendMail(mailOptions);

      return {
        success: true,
        data: {
          messageId: info.messageId,
          to,
          subject,
          timestamp: new Date(),
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
