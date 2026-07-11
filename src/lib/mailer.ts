import nodemailer from "nodemailer";
import { getSettings } from "@/lib/settings";

export type SendEmailInput = {
  to: string;
  subject: string;
  /** Plain-text body; newlines are converted to <br> for the HTML part. */
  body: string;
  /** Optional PDF attachment */
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
};

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

async function resolveSmtpConfig(): Promise<SmtpConfig> {
  // Prefer database settings (configured via Settings → Email & SMTP).
  // Fall back to environment variables for dev/self-hosted setups.
  try {
    const settings = await getSettings();
    if (settings.smtpHost && settings.smtpUsername && settings.smtpPassword) {
      const fromName = settings.smtpFromName ?? "Regalia";
      const fromEmail = settings.smtpFrom ?? settings.smtpUsername;
      return {
        host: settings.smtpHost,
        port: settings.smtpPort ?? 465,
        secure: settings.smtpSecure,
        user: settings.smtpUsername,
        pass: settings.smtpPassword,
        from: `${fromName} <${fromEmail}>`,
      };
    }
  } catch {
    // DB unavailable — fall through to env vars.
  }

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASSWORD in your environment, or configure Email & SMTP in Settings.",
    );
  }

  return {
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    user,
    pass,
    from: process.env.SMTP_FROM ?? user,
  };
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const config = await resolveSmtpConfig();

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });

  const html = input.body
    .split("\n")
    .map((line) => escapeHtml(line))
    .join("<br>");

  await transporter.sendMail({
    from: config.from,
    to: input.to,
    subject: input.subject,
    text: input.body,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5">${html}</div>`,
    attachments: input.attachments,
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
