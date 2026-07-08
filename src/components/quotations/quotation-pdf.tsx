import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// Register fonts (optional - using default system fonts)
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 30,
  },
  companyName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#1e293b",
  },
  quotationNumber: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#6366f1",
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#334155",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: "30%",
    color: "#64748b",
    fontSize: 9,
  },
  value: {
    width: "70%",
    color: "#1e293b",
    fontWeight: "bold",
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    padding: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    fontWeight: "bold",
    fontSize: 9,
    color: "#475569",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    padding: 8,
    fontSize: 9,
  },
  col1: { width: "50%" },
  col2: { width: "15%", textAlign: "right" },
  col3: { width: "20%", textAlign: "right" },
  col4: { width: "15%", textAlign: "right" },
  totalsSection: {
    marginTop: 20,
    marginLeft: "60%",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
    fontSize: 9,
  },
  totalLabel: {
    color: "#64748b",
  },
  totalValue: {
    fontWeight: "bold",
    color: "#1e293b",
  },
  grandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: "#6366f1",
    fontSize: 12,
  },
  grandTotalLabel: {
    fontWeight: "bold",
    color: "#1e293b",
  },
  grandTotalValue: {
    fontWeight: "bold",
    color: "#6366f1",
    fontSize: 14,
  },
  notes: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 4,
    fontSize: 9,
    color: "#475569",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#94a3b8",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
  },
});

export type QuotationPDFData = {
  number: string;
  status: string;
  customer: {
    name: string;
    company: string | null;
    email: string | null;
  };
  currency: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  subtotal: number;
  discountRate: number;
  discountTotal: number;
  taxRate: number;
  taxTotal: number;
  total: number;
  notes: string | null;
  createdAt: Date;
  issuedAt: Date | null;
  validUntil: Date | null;
};

function formatCurrency(amount: number, currency: string): string {
  return `${currency} ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function QuotationPDF({ data }: { data: QuotationPDFData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.companyName}>Regalia CMS</Text>
          <Text style={styles.quotationNumber}>Quotation {data.number}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <Text style={styles.value}>{data.status}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>{formatDate(data.createdAt)}</Text>
          </View>
          {data.issuedAt && (
            <View style={styles.row}>
              <Text style={styles.label}>Issued:</Text>
              <Text style={styles.value}>{formatDate(data.issuedAt)}</Text>
            </View>
          )}
          {data.validUntil && (
            <View style={styles.row}>
              <Text style={styles.label}>Valid Until:</Text>
              <Text style={styles.value}>{formatDate(data.validUntil)}</Text>
            </View>
          )}
        </View>

        {/* Customer */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill To</Text>
          <Text style={{ fontSize: 11, fontWeight: "bold", marginBottom: 2 }}>
            {data.customer.name}
          </Text>
          {data.customer.company && (
            <Text style={{ fontSize: 9, color: "#64748b", marginBottom: 2 }}>
              {data.customer.company}
            </Text>
          )}
          {data.customer.email && (
            <Text style={{ fontSize: 9, color: "#64748b" }}>
              {data.customer.email}
            </Text>
          )}
        </View>

        {/* Line Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>Description</Text>
              <Text style={styles.col2}>Qty</Text>
              <Text style={styles.col3}>Unit Price</Text>
              <Text style={styles.col4}>Total</Text>
            </View>
            {data.items.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.col1}>{item.description}</Text>
                <Text style={styles.col2}>{item.quantity}</Text>
                <Text style={styles.col3}>
                  {formatCurrency(item.unitPrice, data.currency)}
                </Text>
                <Text style={styles.col4}>
                  {formatCurrency(item.lineTotal, data.currency)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(data.subtotal, data.currency)}
            </Text>
          </View>
          {data.discountTotal > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                Discount ({data.discountRate}%):
              </Text>
              <Text style={[styles.totalValue, { color: "#dc2626" }]}>
                -{formatCurrency(data.discountTotal, data.currency)}
              </Text>
            </View>
          )}
          {data.taxTotal > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax ({data.taxRate}%):</Text>
              <Text style={styles.totalValue}>
                +{formatCurrency(data.taxTotal, data.currency)}
              </Text>
            </View>
          )}
          <View style={styles.grandTotal}>
            <Text style={styles.grandTotalLabel}>Total:</Text>
            <Text style={styles.grandTotalValue}>
              {formatCurrency(data.total, data.currency)}
            </Text>
          </View>
        </View>

        {/* Notes */}
        {data.notes && (
          <View style={styles.notes}>
            <Text style={{ fontWeight: "bold", marginBottom: 4 }}>Notes:</Text>
            <Text>{data.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            Thank you for your business. For questions, please contact us.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
