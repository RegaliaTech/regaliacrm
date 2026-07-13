import { prisma } from "@/lib/db";
import { safeQuery } from "@/lib/safe-query";
import { sendEmail } from "@/lib/mailer";

export type OutstandingInvoice = {
  id: string;
  number: string;
  currency: string;
  total: number;
  paid: number;
  balance: number;
  dueDate: Date | null;
  daysOverdue: number | null;
  customer: { id: string; name: string; company: string | null; email: string | null };
  payments: { id: string; amount: number; paidAt: Date; method: string | null }[];
};

function num(v: unknown): number {
  return v == null ? 0 : Number(v);
}

async function fetchOutstanding(): Promise<OutstandingInvoice[]> {
  const rows = await prisma.quotation.findMany({
    where: { status: { in: ["SENT", "ACCEPTED"] } },
    include: {
      customer: true,
      payments: { orderBy: { paidAt: "desc" } },
    },
    orderBy: { dueDate: "asc" },
  });

  const now = new Date();
  return rows
    .map((row) => {
      const paid = row.payments.reduce((sum, p) => sum + num(p.amount), 0);
      const total = num(row.total);
      const balance = total - paid;
      const daysOverdue = row.dueDate
        ? Math.floor((now.getTime() - row.dueDate.getTime()) / 86_400_000)
        : null;
      return {
        id: row.id,
        number: row.number,
        currency: row.currency,
        total,
        paid,
        balance,
        dueDate: row.dueDate,
        daysOverdue,
        customer: {
          id: row.customer.id,
          name: row.customer.name,
          company: row.customer.company,
          email: row.customer.email,
        },
        payments: row.payments.map((p) => ({
          id: p.id,
          amount: num(p.amount),
          paidAt: p.paidAt,
          method: p.method,
        })),
      };
    })
    .filter((inv) => inv.balance > 0.01);
}

export async function getOutstandingInvoices(): Promise<OutstandingInvoice[]> {
  const res = await safeQuery(fetchOutstanding, []);
  return res.data;
}

/** Invoices past their due date and not reminded in the last N days. */
export async function getInvoicesDueForReminder(
  throttleDays = 3,
): Promise<OutstandingInvoice[]> {
  const invoices = await getOutstandingInvoices();
  const now = new Date();
  const rows = await prisma.quotation.findMany({
    where: { id: { in: invoices.map((i) => i.id) } },
    select: { id: true, lastReminderAt: true },
  });
  const lastReminderById = new Map(rows.map((r) => [r.id, r.lastReminderAt]));

  return invoices.filter((inv) => {
    if (inv.daysOverdue === null || inv.daysOverdue < 0) return false;
    const last = lastReminderById.get(inv.id);
    if (!last) return true;
    const daysSinceReminder = Math.floor(
      (now.getTime() - last.getTime()) / 86_400_000,
    );
    return daysSinceReminder >= throttleDays;
  });
}

function reminderEmail(inv: OutstandingInvoice): { subject: string; body: string } {
  const subject = `Payment reminder: Quotation ${inv.number}`;
  const overdueLine =
    inv.daysOverdue !== null && inv.daysOverdue > 0
      ? `This payment is ${inv.daysOverdue} day(s) overdue.\n\n`
      : "";
  const body = `Dear ${inv.customer.name},

This is a reminder that an outstanding balance remains on quotation ${inv.number}.

${overdueLine}Total: ${inv.currency} ${inv.total.toFixed(2)}
Paid: ${inv.currency} ${inv.paid.toFixed(2)}
Balance due: ${inv.currency} ${inv.balance.toFixed(2)}

Please arrange payment at your earliest convenience. If you have already paid, kindly disregard this message.

Best regards,
Regalia CRM Team`;
  return { subject, body };
}

/** Sends a reminder email for a single invoice and logs it. */
export async function sendPaymentReminder(
  quotationId: string,
  senderId?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const invoices = await getOutstandingInvoices();
  const inv = invoices.find((i) => i.id === quotationId);
  if (!inv) return { ok: false, error: "Invoice not found or already settled" };
  if (!inv.customer.email) return { ok: false, error: "Customer has no email" };

  const { subject, body } = reminderEmail(inv);

  try {
    await sendEmail({ to: inv.customer.email, subject, body });
    await prisma.emailLog.create({
      data: {
        customerId: inv.customer.id,
        quotationId: inv.id,
        senderId: senderId ?? null,
        toEmail: inv.customer.email,
        subject,
        body,
        status: "SENT",
        sentAt: new Date(),
      },
    });
    await prisma.quotation.update({
      where: { id: inv.id },
      data: { lastReminderAt: new Date() },
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to send" };
  }
}
