import { NextRequest, NextResponse } from "next/server";
import { getInvoicesDueForReminder, sendPaymentReminder } from "@/lib/payments";

/**
 * Background worker that sends payment reminder emails for overdue invoices.
 * Protected by CRON_SECRET; schedule via vercel.json.
 */
export async function GET(req: NextRequest) {
  const expectedToken = process.env.CRON_SECRET;
  if (!expectedToken) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 },
    );
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = await getInvoicesDueForReminder();

  let sent = 0;
  let failed = 0;
  for (const inv of due) {
    const result = await sendPaymentReminder(inv.id);
    if (result.ok) sent++;
    else failed++;
  }

  return NextResponse.json({ success: true, processed: due.length, sent, failed });
}
