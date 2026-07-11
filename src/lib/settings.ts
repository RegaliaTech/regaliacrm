import { prisma } from "@/lib/db";
import type { Settings as PrismaSettings } from "@prisma/client";

// Type for Settings - will be replaced by Prisma type after migration
type Settings = {
  id: string;
  companyName: string;
  companyLogo: string | null;
  companyAddress: string | null;
  companyPhone: string | null;
  companyEmail: string | null;
  companyWebsite: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUsername: string | null;
  smtpPassword: string | null;
  smtpFrom: string | null;
  smtpFromName: string | null;
  smtpSecure: boolean;
  imapHost: string | null;
  imapPort: number | null;
  imapSecure: boolean;
  imapUsername: string | null;
  imapPassword: string | null;
  inboxLastSyncedAt: Date | null;
  currency: string;
  defaultTaxRate: number;
  quotationPrefix: string;
  quotationValidityDays: number;
  defaultCommissionRate: number;
  timezone: string;
  dateFormat: string;
  updatedAt: Date;
  updatedById: string | null;
};

// Default settings to use before migration
const getDefaultSettings = (): Settings => ({
  id: "mock-settings",
  companyName: "Regalia CMS",
  companyLogo: null,
  companyAddress: null,
  companyPhone: null,
  companyEmail: null,
  companyWebsite: null,
  smtpHost: null,
  smtpPort: 587,
  smtpUsername: null,
  smtpPassword: null,
  smtpFrom: null,
  smtpFromName: null,
  smtpSecure: false,
  imapHost: null,
  imapPort: 993,
  imapSecure: true,
  imapUsername: null,
  imapPassword: null,
  inboxLastSyncedAt: null,
  currency: "AED",
  defaultTaxRate: 5,
  quotationPrefix: "QUO-",
  quotationValidityDays: 30,
  defaultCommissionRate: 10,
  timezone: "Asia/Dubai",
  dateFormat: "DD/MM/YYYY",
  updatedAt: new Date(),
  updatedById: null,
});

// Convert the Prisma row (which carries Decimal fields) into a plain,
// serializable object safe to pass to Client Components. `Number()` handles
// both Decimal and already-numeric values — unlike `instanceof Decimal`, which
// can silently fail across module boundaries under Turbopack.
function normalizeSettings(settings: PrismaSettings): Settings {
  return {
    ...settings,
    defaultTaxRate: Number(settings.defaultTaxRate),
    defaultCommissionRate: Number(settings.defaultCommissionRate ?? 10),
  };
}

/**
 * Get system settings (singleton pattern)
 * Creates default settings if none exist
 * 
 * NOTE: Returns mock data until database migration is run
 */
export async function getSettings(): Promise<Settings> {
  try {
    // 
    const settings = await prisma.settings.findFirst();
    
    if (!settings) {
      // Create default settings on first access
      const created = await prisma.settings.create({
        data: {
          companyName: "Regalia CMS",
          currency: "AED",
          defaultTaxRate: 5,
          quotationPrefix: "QUO-",
          quotationValidityDays: 30,
          timezone: "Asia/Dubai",
          dateFormat: "DD/MM/YYYY",
          smtpPort: 587,
          smtpSecure: false,
        },
      });
      return normalizeSettings(created);
    }
    
    return normalizeSettings(settings);
  } catch {
    // Settings table doesn't exist yet - return mock defaults
    console.warn("Settings table not found. Please run: npx prisma migrate dev");
    return getDefaultSettings();
  }
}

/**
 * Update settings
 */
export async function updateSettings(
  data: Partial<Omit<Settings, "id" | "updatedAt">>,
  userId?: string
): Promise<Settings> {
  const settings = await getSettings();

  // The dev-only preview auth bypass returns a synthetic user id that has no
  // matching User row, so it can't be written as a foreign key.
  const updatedById = userId === "preview-user" ? null : userId;

  const updated = await prisma.settings.update({
    where: { id: settings.id },
    data: {
      ...data,
      updatedById,
    },
  });

  return normalizeSettings(updated);
}
