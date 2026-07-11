import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";

/**
 * Pull unseen messages from the configured IMAP mailbox and upsert them into
 * EmailLog as INBOUND rows. Deduplicated by RFC-822 Message-Id. Best-effort
 * customer linkage by From address. Returns a summary; never throws for a
 * single bad message.
 */
export type InboxSyncResult = {
  fetched: number;
  inserted: number;
  skipped: number;
  errors: string[];
};

type ImapConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
};

async function resolveImapConfig(): Promise<ImapConfig | null> {
  try {
    const s = await getSettings();
    // Fall back to SMTP creds — Hostinger uses the same login for IMAP.
    const host = s.imapHost ?? "imap.hostinger.com";
    const user = s.imapUsername ?? s.smtpUsername ?? null;
    const pass = s.imapPassword ?? s.smtpPassword ?? null;
    if (!host || !user || !pass) return null;
    return {
      host,
      port: s.imapPort ?? 993,
      secure: s.imapSecure ?? true,
      user,
      pass,
    };
  } catch {
    return null;
  }
}

export async function syncInbox(opts: {
  /** Also fetch messages already flagged \Seen, up to `limit`. Defaults to unseen only. */
  includeRead?: boolean;
  /** Max messages to pull in a single run (safety cap). */
  limit?: number;
} = {}): Promise<InboxSyncResult> {
  const cfg = await resolveImapConfig();
  if (!cfg) {
    return {
      fetched: 0,
      inserted: 0,
      skipped: 0,
      errors: ["IMAP not configured. Set imapHost / SMTP credentials in Settings."],
    };
  }

  const client = new ImapFlow({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
    logger: false,
  });

  const result: InboxSyncResult = { fetched: 0, inserted: 0, skipped: 0, errors: [] };
  const limit = opts.limit ?? 50;

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const search = opts.includeRead ? { all: true } : { seen: false };
      const uids = (await client.search(search, { uid: true })) || [];
      const slice = uids.slice(-limit); // newest N

      for (const uid of slice) {
        try {
          const msg = await client.fetchOne(
            String(uid),
            { source: true, envelope: true, internalDate: true },
            { uid: true },
          );
          if (!msg || !msg.source) continue;
          result.fetched++;

          const parsed = await simpleParser(msg.source);
          const messageId = parsed.messageId ?? `uid-${cfg.user}-${uid}`;
          const fromEmail =
            parsed.from?.value?.[0]?.address?.toLowerCase() ?? null;
          const receivedAt =
            parsed.date ?? (msg.internalDate ? new Date(msg.internalDate) : new Date());
          const subject = parsed.subject ?? "(no subject)";
          const body = parsed.text?.trim() || stripHtml(parsed.html || "") || "";

          const existing = await prisma.emailLog.findUnique({
            where: { messageId },
            select: { id: true },
          });
          if (existing) {
            result.skipped++;
            continue;
          }

          // Best-effort customer link.
          let customerId: string | null = null;
          if (fromEmail) {
            const customer = await prisma.customer.findFirst({
              where: { email: fromEmail },
              select: { id: true },
            });
            customerId = customer?.id ?? null;
          }

          await prisma.emailLog.create({
            data: {
              direction: "INBOUND",
              status: "SENT", // inbound messages are always "delivered"
              messageId,
              inReplyTo: parsed.inReplyTo ?? null,
              fromEmail,
              toEmail: cfg.user,
              subject,
              body,
              receivedAt,
              customerId,
              isRead: false,
            },
          });
          result.inserted++;
        } catch (err) {
          result.errors.push(
            err instanceof Error ? err.message : "Unknown parse error",
          );
        }
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (err) {
    result.errors.push(
      err instanceof Error ? err.message : "IMAP connection failed",
    );
    try {
      await client.close();
    } catch {
      // ignore
    }
  }

  // Update lastSyncedAt regardless (so throttling still works after errors).
  try {
    const s = await getSettings();
    await prisma.settings.update({
      where: { id: s.id },
      data: { inboxLastSyncedAt: new Date() },
    });
  } catch {
    // non-fatal
  }

  return result;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
