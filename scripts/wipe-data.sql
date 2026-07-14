-- =============================================================================
-- Regalia CRM — one-shot data wipe
-- Clears every business record but KEEPS the User table (login accounts) and
-- Settings (company config). Runs as a single transaction — all-or-nothing.
--
-- HOW TO RUN
--   Supabase dashboard -> SQL Editor -> paste this file -> Run.
--   Or from psql:   \i scripts/wipe-data.sql
--
-- WARNING: This is destructive and cannot be undone. Take a backup first if
-- there's anything on this database you might want back.
-- =============================================================================

BEGIN;

-- TRUNCATE ... RESTART IDENTITY CASCADE handles FK order automatically. Users
-- and settings are deliberately omitted from the list.
TRUNCATE TABLE
  "BulkEmailRecipient",
  "BulkEmail",
  "EmailLog",
  "FollowUpSequenceStep",
  "FollowUpSequence",
  "FollowUp",
  "Payment",
  "QuotationItem",
  "Quotation",
  "VendorStock",
  "VendorReceipt",
  "Vendor",
  "ProductImage",
  "Product",
  "CustomerNote",
  "Contact",
  "Customer",
  "Expense"
RESTART IDENTITY CASCADE;

-- Sanity check: user + settings rows should be untouched.
SELECT 'users_remaining'    AS metric, COUNT(*) FROM "User"     UNION ALL
SELECT 'settings_remaining' AS metric, COUNT(*) FROM settings   UNION ALL
SELECT 'customers'          AS metric, COUNT(*) FROM "Customer" UNION ALL
SELECT 'products'           AS metric, COUNT(*) FROM "Product"  UNION ALL
SELECT 'quotations'         AS metric, COUNT(*) FROM "Quotation" UNION ALL
SELECT 'expenses'           AS metric, COUNT(*) FROM "Expense";

COMMIT;
