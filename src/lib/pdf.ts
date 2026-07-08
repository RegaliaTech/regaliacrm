import { renderToBuffer, renderToStream } from "@react-pdf/renderer";
import { QuotationPDF, type QuotationPDFData } from "@/components/quotations/quotation-pdf";

/** Generate PDF buffer for a quotation (for attachments) */
export async function generateQuotationPDF(
  data: QuotationPDFData
): Promise<Buffer> {
  const pdfBuffer = await renderToBuffer(QuotationPDF({ data }));
  return pdfBuffer;
}

/** Generate PDF stream for a quotation (for HTTP responses) */
export async function generateQuotationPDFStream(data: QuotationPDFData) {
  return renderToStream(QuotationPDF({ data }));
}
