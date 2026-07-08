import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const secure = process.env.SMTP_SECURE === "true";

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASSWORD in your environment.",
    );
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return transporter;
}

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

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER!;
  const html = input.body
    .split("\n")
    .map((line) => escapeHtml(line))
    .join("<br>");

  await getTransporter().sendMail({
    from,
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
