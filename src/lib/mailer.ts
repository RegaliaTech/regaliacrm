import nodemailer from "nodemailer";
import { getSettings } from "@/lib/settings";

export type SendEmailInput = {
  to: string;
  subject: string;
  /** Plain-text body; newlines are converted to <br> for the HTML part. */
  body: string;
  /** Optional sender signature appended after the body. */
  signature?: { name: string; role?: string | null };
  /** Optional preheader (hidden inbox preview text). Defaults to first line of body. */
  preheader?: string;
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

type CompanyInfo = {
  name: string;
  logo: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
};

const DEFAULT_COMPANY: CompanyInfo = {
  name: "Regalia",
  logo: null,
  address: null,
  phone: null,
  email: null,
  website: null,
};

async function resolveConfig(): Promise<{ smtp: SmtpConfig; company: CompanyInfo }> {
  try {
    const settings = await getSettings();
    const company: CompanyInfo = {
      name: settings.companyName || DEFAULT_COMPANY.name,
      logo: settings.companyLogo,
      address: settings.companyAddress,
      phone: settings.companyPhone,
      email: settings.companyEmail,
      website: settings.companyWebsite,
    };

    if (settings.smtpHost && settings.smtpUsername && settings.smtpPassword) {
      const fromName = settings.smtpFromName ?? company.name;
      const fromEmail = settings.smtpFrom ?? settings.smtpUsername;
      return {
        smtp: {
          host: settings.smtpHost,
          port: settings.smtpPort ?? 465,
          secure: settings.smtpSecure,
          user: settings.smtpUsername,
          pass: settings.smtpPassword,
          from: `${fromName} <${fromEmail}>`,
        },
        company,
      };
    }

    return { smtp: envSmtpConfig(company.name), company };
  } catch {
    return { smtp: envSmtpConfig(DEFAULT_COMPANY.name), company: DEFAULT_COMPANY };
  }
}

function envSmtpConfig(companyName: string): SmtpConfig {
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
    from: process.env.SMTP_FROM ?? `${companyName} <${user}>`,
  };
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const { smtp, company } = await resolveConfig();

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  const html = renderEmailHtml({
    body: input.body,
    signature: input.signature,
    preheader: input.preheader ?? firstLine(input.body),
    company,
  });

  const textParts = [input.body.trim()];
  if (input.signature) {
    textParts.push(
      "",
      `— ${input.signature.name}${input.signature.role ? `, ${formatRole(input.signature.role)}` : ""}`,
      company.name,
    );
  }
  const text = textParts.join("\n");

  await transporter.sendMail({
    from: smtp.from,
    to: input.to,
    subject: input.subject,
    text,
    html,
    attachments: input.attachments,
  });
}

// ---------------------------------------------------------------------------
// HTML template
// ---------------------------------------------------------------------------

function renderEmailHtml(opts: {
  body: string;
  signature?: SendEmailInput["signature"];
  preheader: string;
  company: CompanyInfo;
}): string {
  const { body, signature, preheader, company } = opts;
  const bodyHtml = body
    .split("\n")
    .map((line) => (line.trim() === "" ? "<br>" : escapeHtml(line)))
    .join("<br>");

  const header = renderHeader(company);
  const signatureHtml = signature ? renderSignature(signature, company.name) : "";
  const footer = renderFooter(company);
  const preheaderText = escapeHtml(preheader).slice(0, 140);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(company.name)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <span style="display:none!important;opacity:0;color:transparent;visibility:hidden;height:0;width:0;overflow:hidden;">${preheaderText}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px -8px rgba(15,23,42,0.12);">
          ${header}
          <tr>
            <td style="padding:32px 40px 8px 40px;color:#0f172a;font-size:15px;line-height:1.65;">
              ${bodyHtml}
            </td>
          </tr>
          ${signatureHtml}
          ${footer}
        </table>
        <p style="margin:16px 0 0 0;color:#94a3b8;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;">
          Sent via ${escapeHtml(company.name)} CRM
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderHeader(company: CompanyInfo): string {
  const brand = company.logo
    ? `<img src="${escapeAttr(company.logo)}" alt="${escapeAttr(company.name)}" height="36" style="display:block;height:36px;max-height:36px;border:0;outline:none;">`
    : `<span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.01em;">${escapeHtml(company.name)}</span>`;

  return `<tr>
    <td style="background:linear-gradient(135deg,#6366f1 0%,#7c3aed 100%);padding:24px 40px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="vertical-align:middle;">${brand}</td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function renderSignature(
  signature: NonNullable<SendEmailInput["signature"]>,
  companyName: string,
): string {
  const roleLine = signature.role
    ? `<div style="color:#64748b;font-size:13px;margin-top:2px;">${escapeHtml(formatRole(signature.role))} · ${escapeHtml(companyName)}</div>`
    : `<div style="color:#64748b;font-size:13px;margin-top:2px;">${escapeHtml(companyName)}</div>`;

  return `<tr>
    <td style="padding:20px 40px 8px 40px;">
      <div style="border-top:1px solid #e2e8f0;padding-top:20px;">
        <div style="color:#0f172a;font-size:14px;font-weight:600;">${escapeHtml(signature.name)}</div>
        ${roleLine}
      </div>
    </td>
  </tr>`;
}

function renderFooter(company: CompanyInfo): string {
  const contactBits: string[] = [];
  if (company.address) contactBits.push(escapeHtml(company.address));
  if (company.phone) contactBits.push(escapeHtml(company.phone));
  if (company.website) {
    const url = company.website.startsWith("http")
      ? company.website
      : `https://${company.website}`;
    contactBits.push(
      `<a href="${escapeAttr(url)}" style="color:#6366f1;text-decoration:none;">${escapeHtml(company.website.replace(/^https?:\/\//, ""))}</a>`,
    );
  }
  if (company.email) {
    contactBits.push(
      `<a href="mailto:${escapeAttr(company.email)}" style="color:#6366f1;text-decoration:none;">${escapeHtml(company.email)}</a>`,
    );
  }

  const contactLine = contactBits.length
    ? `<div style="color:#64748b;font-size:12px;line-height:1.7;">${contactBits.join(' <span style="color:#cbd5e1;">·</span> ')}</div>`
    : "";

  return `<tr>
    <td style="padding:24px 40px 32px 40px;">
      <div style="border-top:1px solid #e2e8f0;padding-top:20px;">
        <div style="color:#0f172a;font-size:13px;font-weight:600;margin-bottom:4px;">${escapeHtml(company.name)}</div>
        ${contactLine}
      </div>
    </td>
  </tr>`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

function firstLine(body: string): string {
  return body.split("\n").find((l) => l.trim().length > 0)?.trim() ?? "";
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(str: string): string {
  return escapeHtml(str);
}
