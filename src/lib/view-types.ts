import type { ExpenseCategory, ProductKind, ProductTier } from "@prisma/client";

/**
 * Plain, serializable view shapes shared between the data layer and the UI.
 * These mirror the Prisma models with Decimal fields coerced to `number`, so
 * they are safe to pass from Server Components to Client Components.
 */

export type ProductImageView = {
  id: string;
  url: string;
  caption: string | null;
  position: number;
};

export type ProductView = {
  id: string;
  sku: string;
  name: string;
  kind: ProductKind;
  model: string | null;
  figure: string | null;
  category: string | null;
  tier: ProductTier | null;
  description: string | null;
  coverImage: string | null;
  specs: Record<string, string> | null;
  height: string | null;
  weight: string | null;
  nationality: string | null;
  languages: string[];
  unitPrice: number;
  unitCost: number;
  currency: string;
  isActive: boolean;
  dailyRate: number | null;
  weeklyRate: number | null;
  deposit: number | null;
  qtyTotal: number | null;
  qtyOnRent: number;
  isBespoke: boolean;
  leadTimeDays: number | null;
  images: ProductImageView[];
  createdAt: Date;
};

export type ExpenseView = {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  incurredAt: Date;
  notes: string | null;
  createdById: string | null;
  createdByName: string | null;
  createdAt: Date;
};
