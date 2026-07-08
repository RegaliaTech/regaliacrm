# Quotation Draft Workflow

## Overview
The quotation system supports a complete draft-to-send workflow that allows you to:
1. **Create drafts** - Build quotations without sending them immediately
2. **Edit drafts** - Modify quotations before sending
3. **Send later** - Send quotations when ready via your email client

## How It Works

### 1. Creating a Draft Quotation

**Navigate to:** [/quotations/new](http://localhost:3000/quotations/new)

When you create a new quotation, it automatically starts with status **DRAFT**:

- Fill in customer details
- Add line items (products or custom items)
- Set tax rate and discount
- Add notes
- Set valid until date
- Click **Save** to create the draft

The draft is saved immediately and can be edited later.

### 2. Viewing All Quotations

**Navigate to:** [/quotations](http://localhost:3000/quotations)

The quotations list page shows all quotations with tabs for filtering:

- **All** - All quotations
- **Draft** - Quotations not yet sent
- **Sent** - Quotations sent to customers
- **Accepted** - Customer accepted quotations
- **Rejected** - Customer rejected quotations

Use the search box to find specific quotations by number, customer name, or company.

### 3. Editing a Draft

**From quotation detail page:** Click the **Edit** button (only visible for drafts)

**Or navigate to:** `/quotations/[id]/edit`

When editing a draft:
- ✅ All fields can be modified
- ✅ Line items can be added, removed, or changed
- ✅ Totals are automatically recalculated
- ✅ Changes are saved when you click **Save**

**Important:** Only quotations with status **DRAFT** can be edited. Once sent, quotations cannot be modified.

### 4. Sending a Quotation

**From quotation detail page:** Click the **Send via Email** button

This opens your default email client (Gmail, Outlook, Apple Mail, etc.) with:

✅ **Pre-filled recipient:** Customer's email address  
✅ **Pre-filled subject:** "Quotation [NUMBER] from Regalia CMS"  
✅ **Pre-filled body:** Professional email with quotation details  
✅ **PDF download link:** Link for customer to download the PDF

**Before sending:**
1. Review the pre-filled email
2. Make any edits if needed
3. Download the PDF and attach it (recommended)
4. Send from your own email account

**After sending:**
- Manually update quotation status to **SENT** (optional)
- Customer can download PDF using the link in email
- Or attach the PDF file directly to the email

### 5. Downloading PDF

**From quotation detail page:** Click the **Download PDF** button

This generates and downloads a professional PDF with:
- Company branding
- Quotation number and details
- Customer information
- Line items table
- Tax and discount calculations
- Total amount
- Notes

**Use cases:**
- Attach to email manually
- Print for records
- Share via other channels
- Archive for documentation

### 6. Deleting a Quotation

**From quotation detail page:** Click the **Delete** button

**Important:**
- Confirmation dialog appears before deletion
- Deletion is permanent and cannot be undone
- Consider archiving instead of deleting for record-keeping

## Status Flow

```
DRAFT → SENT → ACCEPTED
              ↘ REJECTED
```

- **DRAFT** - Initial status, editable
- **SENT** - After emailing to customer, not editable
- **ACCEPTED** - Customer accepts the quotation
- **REJECTED** - Customer declines the quotation

## Best Practices

### ✅ DO:
- Create drafts for all quotations first
- Review drafts carefully before sending
- Include detailed line item descriptions
- Add notes for special terms or conditions
- Set appropriate valid until dates
- Download PDF to verify formatting before sending
- Update status after sending emails

### ❌ DON'T:
- Send quotations without reviewing first
- Forget to attach or link the PDF
- Leave quotations in DRAFT status after sending
- Edit quotations after they've been sent
- Delete quotations that have been sent (for audit trail)

## Mock Data (Development Mode)

When the database is not connected, the system uses mock data:

**Available mock quotations:**
- `q-1042` - SENT status (Acme Industrial)
- `q-1041` - ACCEPTED status (Globex Corp)
- `q-1040` - DRAFT status (Falcon Trading) ← **Editable**
- `q-1039` - SENT status (Nova Engineering)
- `q-1038` - REJECTED status (Summit Build)

You can view and interact with these quotations to test the workflow without setting up a database.

## Technical Details

### Data Persistence
- **Production:** Quotations stored in PostgreSQL database via Prisma
- **Development:** Falls back to mock data if database unavailable
- **Mock data:** Located in `src/lib/mock.ts`

### Key Features
- **Auto-calculation:** Subtotal, tax, discount, and total calculated automatically
- **Validation:** Server-side validation with Zod schemas
- **Security:** Role-based access control (WRITE_ROLES required)
- **PDF Generation:** Uses `@react-pdf/renderer` for professional layouts
- **Email Integration:** Mailto links for client-side email composition

## Troubleshooting

### Quotation not showing?
1. Check you're logged in with appropriate role (ADMIN, SALES, ACCOUNTS)
2. Verify quotation ID is correct
3. Check database connection (or use mock data)

### Can't edit quotation?
- Only DRAFT status quotations can be edited
- Check your user role has WRITE permissions

### PDF not downloading?
- Check quotation has valid data and line items
- Verify quotation ID in URL is correct
- Check browser console for errors

### Email client not opening?
1. Verify you have a default email app configured
2. Check customer email is valid in quotation
3. Try copy-paste mailto link if browser blocks it

## Related Documentation

- [QUOTATION_EMAIL_PDF.md](QUOTATION_EMAIL_PDF.md) - Email and PDF setup guide
- [src/lib/quotations.ts](src/lib/quotations.ts) - Data access layer
- [src/app/(app)/quotations/actions.ts](src/app/(app)/quotations/actions.ts) - Server actions
- [prisma/schema.prisma](prisma/schema.prisma) - Database schema
