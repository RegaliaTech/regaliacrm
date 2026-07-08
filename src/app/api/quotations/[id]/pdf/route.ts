import { NextRequest, NextResponse } from "next/server";
import { getQuotation } from "@/lib/quotations";
import { generateQuotationPDFStream } from "@/lib/pdf";
import type { QuotationPDFData } from "@/components/quotations/quotation-pdf";
import { requireUser } from "@/lib/rbac";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    await requireUser();

    const { id } = await params;
    const quotation = await getQuotation(id);

    if (!quotation) {
      return NextResponse.json(
        { error: "Quotation not found" },
        { status: 404 }
      );
    }

    // Prepare data for PDF
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

    // Generate PDF stream
    const stream = await generateQuotationPDFStream(pdfData);

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    // Return PDF as downloadable file
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Quotation-${quotation.number}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
