import type {
  QuotationStatus,
  CustomerStatus,
  FollowUpStatus,
  EmailStatus,
  ProductKind,
  ExpenseCategory,
} from "@prisma/client";

type Tone = "default" | "primary" | "success" | "warning" | "danger" | "muted";

export function quotationStatusTone(s: QuotationStatus): Tone {
  switch (s) {
    case "ACCEPTED":
      return "success";
    case "SENT":
      return "primary";
    case "REJECTED":
      return "danger";
    case "EXPIRED":
      return "muted";
    default:
      return "default";
  }
}

export function customerStatusTone(s: CustomerStatus): Tone {
  switch (s) {
    case "ACTIVE":
      return "success";
    case "LEAD":
      return "primary";
    case "CHURNED":
      return "danger";
    default:
      return "muted";
  }
}

export function followUpStatusTone(s: FollowUpStatus): Tone {
  switch (s) {
    case "SENT":
      return "success";
    case "SCHEDULED":
      return "primary";
    case "FAILED":
      return "danger";
    default:
      return "muted";
  }
}

export function emailStatusTone(s: EmailStatus): Tone {
  switch (s) {
    case "SENT":
      return "success";
    case "FAILED":
      return "danger";
    default:
      return "default";
  }
}

export function productKindTone(k: ProductKind): Tone {
  switch (k) {
    case "MODEL":
      return "primary";
    case "PHOTOGRAPHER":
      return "default";
    case "RENTAL":
      return "warning";
    case "CUSTOM":
      return "success";
    default:
      return "default";
  }
}

export function productKindLabel(k: ProductKind): string {
  switch (k) {
    case "MODEL":
      return "Model";
    case "PHOTOGRAPHER":
      return "Photographer";
    case "RENTAL":
      return "Rental";
    case "CUSTOM":
      return "Custom";
    default:
      return k;
  }
}

export function expenseCategoryTone(c: ExpenseCategory): Tone {
  switch (c) {
    case "RENT":
      return "primary";
    case "SALARIES":
      return "warning";
    case "MARKETING":
      return "success";
    case "MAINTENANCE":
      return "danger";
    default:
      return "default";
  }
}

export function expenseCategoryLabel(c: ExpenseCategory): string {
  switch (c) {
    case "RENT":
      return "Rent";
    case "UTILITIES":
      return "Utilities";
    case "SALARIES":
      return "Salaries";
    case "MARKETING":
      return "Marketing";
    case "MAINTENANCE":
      return "Maintenance";
    default:
      return "Other";
  }
}

/** Tone for rental availability based on free vs total units. */
export function availabilityTone(available: number, total: number): Tone {
  if (total <= 0 || available <= 0) return "danger";
  if (available / total <= 0.34) return "warning";
  return "success";
}
