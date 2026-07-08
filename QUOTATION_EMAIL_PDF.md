# Quotation Email & PDF Feature

## Overview
The quotation system now supports:
- **PDF Generation** — Download quotations as professional PDFs
- **Email via Mail Client** — Open your default email application with quotation details pre-filled

## Setup Required

### Application URL
Add this environment variable to your `.env` file:

```env
# Application URL (for PDF download links in emails)
NEXTAUTH_URL=http://localhost:3000
```

For production, set this to your actual domain (e.g., `https://yourdomain.com`).

## Features

### 1. PDF Download
- Navigate to any quotation detail page
- Click **"Download PDF"** button
- PDF file downloads with name `Quotation-{NUMBER}.pdf`

**API Endpoint:** `GET /api/quotations/[id]/pdf`

### 2. Send via Email
- Navigate to any quotation detail page
- Click **"Send via Email"** button
- Your default email client opens with:
  - Customer's email address pre-filled
  - Professional subject line
  - Pre-written email body with quotation details
  - Link to download the PDF
- **Manually attach** the PDF by downloading it first, or the customer can use the download link in the email

**How it works:**
- Uses `mailto:` protocol to open your system's default email application (Gmail, Outlook, Apple Mail, etc.)
- All quotation details are pre-filled in the email body
- No SMTP configuration needed!

## Email Template

The email automatically includes:
- Personalized greeting to customer
- Quotation number
- Total amount
- Valid until date (if set)
- Notes (if any)
- Direct link to download the PDF
- Professional closing signature

## File Structure

```
src/
├── app/
│   └── api/
│       └── quotations/
│           └── [id]/
│               ├── pdf/
│               │   └── route.ts      # PDF download endpoint
│               └── send/
│                   └── route.ts      # (Optional) Automated email endpoint
├── components/
│   └── quotations/
│       └── quotation-pdf.tsx         # PDF template component
└── lib/
    ├── pdf.ts                        # PDF generation utilities
    └── mailer.ts                     # (Optional) Email sending utilities
```

## Technical Details

### PDF Generation
- Uses `@react-pdf/renderer` library
- Professional layout with:
  - Company branding
  - Customer details
  - Line items table
  - Tax and discount calculations
  - Total breakdown
  - Notes section

### Email System
- Uses `mailto:` protocol (opens user's default email client)
- No server-side email configuration required
- Works with any email application installed on the user's system
- Pre-fills: recipient, subject, and body
- **Note:** PDF must be manually attached or customer uses the download link

## Security
- PDF download endpoint requires authentication
- WRITE_ROLES permission required (ADMIN, SALES, ACCOUNTS)
- Customer email validation before generating mailto link

## User Experience

### Workflow:
1. User clicks "Send via Email" button
2. Default email application opens
3. Email is pre-filled with all details
4. User can:
   - Review and edit the email if needed
   - Download the PDF and attach it manually (recommended)
   - Or send with just the download link
5. User sends the email from their own account

### Benefits:
- ✅ No SMTP configuration needed
- ✅ Emails sent from user's own email account
- ✅ User can review/edit before sending
- ✅ Proper email threading and delivery tracking
- ✅ Works with any email client

## Troubleshooting

### Email client not opening?
1. Check that you have a default email application set in your system
2. On macOS: System Preferences → Internet Accounts
3. On Windows: Settings → Apps → Default apps → Email
4. Browser may block mailto links - check browser settings

### PDF not generating?
1. Verify quotation exists and has valid data
2. Check that line items are not empty
3. Review browser console for errors

## Alternative: Automated Email (Optional)

If you prefer automated server-side email sending instead of mailto links, the system also includes an API endpoint at `/api/quotations/[id]/send`. To use it:

1. Configure SMTP in `.env` (see commented section in the file)
2. Update the quotation detail page to use the server action instead of mailto link

## Future Enhancements
- [ ] Option to toggle between mailto and automated sending
- [ ] Email preview before opening mail client
- [ ] CC/BCC support in mailto link
- [ ] Custom email templates
- [ ] Attachment size optimization
- [ ] Multiple currency support in PDF
- [ ] Custom PDF branding/logo upload
