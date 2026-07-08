import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, can, WRITE_ROLES } from "@/lib/rbac";
import { getQuotation } from "@/lib/quotations";
import { sendEmail } from "@/lib/mailer";
import { generateQuotationPDF } from "@/lib/pdf";
import type { QuotationPDFData } from "@/components/quotations/quotation-pdf";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    if (!can(user.role, WRITE_ROLES)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const quotation = await getQuotation(id);

    if (!quotation) {
      return NextResponse.json(
        { error: "Quotation not found" },
        { status: 404 }
      );
    }

    const toEmail = quotation.customer.email;
    if (!toEmail) {
      return NextResponse.json(
        { error: "Customer email not found" },
        { status: 400 }
      );
    }

    // Prepare PDF data
    const pdfData: QuotationPDFData = {
      number: quotation.number,
      status: quotation.status,
      customer: {
        name: quotation.customer.name,
        company: quotation.customer.company,
        email: quotation.customer.email,
      },
      currency: quotation.currency,
      items: quotation.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
      subtotal: quotation.subtotal,
      discountRate: quotation.discountRate,
      discountTotal: quotation.discountTotal,
      taxRate: quotation.taxRate,
      taxTotal: quotation.taxTotal,
      total: quotation.total,
      notes: quotation.notes,
      createdAt: quotation.createdAt,
      issuedAt: quotation.issuedAt,
      validUntil: quotation.validUntil,
    };

    // Generate PDF buffer
    const pdfBuffer = await generateQuotationPDF(pdfData);

    // Compose email
    const subject = `Quotation ${quotation.number} from Regalia CMS`;
    const body = `Dear ${quotation.customer.name},

Please find attached quotation ${quotation.number} for your review.

Quotation Details:
- Total: ${quotation.currency} ${quotation.total.toFixed(2)}
${quotation.validUntil ? `- Valid Until: ${new Date(quotation.validUntil).toLocaleDateString()}` : ""}

${quotation.notes ? `\nNotes:\n${quotation.notes}\n` : ""}
If you have any questions or need clarification, please don't hesitate to contact us.

Best regards,
Regalia CMS Team`;

    // Send email with PDF attachment
    await sendEmail({
      to: toEmail,
      subject,
      body,
      attachments: [
        {
          filename: `Quotation-${quotation.number}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    // Update quotation status to SENT if it was DRAFT
    if (quotation.status === "DRAFT") {
      await prisma.quotation.update({
        where: { id },
        data: {
          status: "SENT",
          issuedAt: new Date(),
        },
      });
    }

    // Log email
    await prisma.emailLog.create({
      data: {
        customerId: quotation.customerId,
        toEmail,
        subject,
        body,
        status: "SENT",
        aiGenerated: false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending quotation email:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send email" },
      { status: 500 }
    );
  }
}
