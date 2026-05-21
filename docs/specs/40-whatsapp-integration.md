# WhatsApp Integration — Specification

## Overview

| Property | Value |
|----------|-------|
| **Type** | New feature — parallel communication channel |
| **API** | WhatsApp Business Platform (Meta Cloud API) |
| **Pattern** | Mirror the existing email module flow (template selection → customer → attach → send) |
| **Pricing** | Per message: Meta Utility rate (~$0.004–$0.046) + Twilio $0.005 if using BSP, or Meta direct |
| **Dependencies** | Client must have Meta Business Account + WhatsApp Business Account (WABA) |
| **Status** | Research complete — awaiting client credentials |

---

## Architecture

### Message Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     WhatsApp Integration Flow                             │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [1] Template Selection (whatsapp.vb — new form)                        │
│      └─ User clicks: INVOICE / QUOTATION / STATEMENT / RECEIPT          │
│      └─ Loads template from tbl_whatsapp by identify field               │
│         • content_sid, body variables, header_type                       │
│                                                                          │
│  [2] Recipient Selection                                                 │
│      └─ Type 3+ chars in recipient_id → search tbl_customer             │
│      └─ DataGridView shows matching customers                           │
│      └─ Select customer → auto-fill:                                    │
│         • body = "Dear {title} {name},"                                 │
│         • recipient_id = {customer_telephone}                           │
│                                                                          │
│  [3] Attachment Selection (optional)                                    │
│      └─ Button opens file dialog (PDF only)                              │
│      └─ PDF uploaded to public URL or base64 inline                      │
│                                                                          │
│  [4] Send Action                                                         │
│      └─ Button validates: recipient_id, template selected                │
│      └─ POST to Meta Cloud API                                          │
│                                                                          │
│  [5] API Delivery (whatsapp_module.vb — new module)                     │
│      └─ Configures: phone_id, waba_id, access_token                      │
│      └─ Resolves template content_sid + variables                        │
│      └─ POST to graph.facebook.com/vXX.0/{phone_id}/messages            │
│      └─ Returns: sid, status, timestamp                                  │
│                                                                          │
│  [6] Status Tracking                                                     │
│      └─ Webhook optional for delivery receipts                           │
│      └─ Status stored: queued → sent → delivered → read                  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### API Architecture

```
Desktop App → REST POST → Meta Cloud API → WhatsApp User
                 ↓
            graph.facebook.com/vXX.0/{phone_id}/messages
            Authorization: Bearer {access_token}
```

No BSP required. Direct Meta Cloud API integration.

---

## Comparison with Email Module

| Dimension | Email (existing) | WhatsApp (new) |
|-----------|-----------------|----------------|
| **Channel** | SMTP / Gmail | WhatsApp Business API |
| **Template table** | `tbl_email` | `tbl_whatsapp` |
| **Recipient field** | `tbl_customer.email` | `tbl_customer.telephone` |
| **Attachment** | File path (local) | URL (must be publicly accessible) |
| **Proactive send** | Any time | Template required (Utility category) |
| **Cost** | Negligible (SMTP relay) | $0.004–$0.05/msg (Meta rate) |
| **Approval** | None | Template must be pre-approved by Meta |
| **Delivery receipt** | None | Webhook (delivered, read) |
| **Rate limit** | Soft | 250–unlimited unique users/24h |
| **User init → reply** | Email reply | WhatsApp reply (free within 24h) |

---

## What Client Must Provide

Client needs a **Meta Business Account** and a **WhatsApp Business Account (WABA)** already set up.

### Required Credentials (client shares with developer)

| Field | Where to find |
|-------|--------------|
| `PHONE_NUMBER_ID` | Meta Developer Console → WhatsApp → Senders |
| `WABA_ID` | Meta Developer Console → WhatsApp → Business Account |
| `ACCESS_TOKEN` | Meta Business Manager → System User → generate permanent token |

### What Client Must Do

| Step | Action | Where |
|------|--------|-------|
| 1 | Create/confirm Meta Business Account | https://business.facebook.com |
| 2 | Create a **Meta Developer App** with WhatsApp Business product | https://developers.facebook.com |
| 3 | Create a **WhatsApp Business Account (WABA)** linked to their business | Meta Business Manager |
| 4 | Register a **dedicated phone number** (cannot be on consumer WhatsApp) | WABA setup |
| 5 | Add developer as **Developer** role on the app | Meta Developer Console → Roles |
| 6 | Create **message templates** and submit for Meta approval | Meta Business Manager |
| 7 | Share `PHONE_NUMBER_ID`, `WABA_ID`, `ACCESS_TOKEN` | — |

### Template Approval

For proactive invoice notifications, templates must be pre-approved by Meta.

**Template categories for invoice app:**

| Template | Category | Example | Purpose |
|----------|----------|---------|---------|
| `invoice_ready` | Utility | "Dear {{1}}, your invoice #{{2}} for {{3}} is ready." | Invoice delivery |
| `quotation_ready` | Utility | "Dear {{1}}, your quotation #{{2}} for {{3}} is ready." | Quotation delivery |
| `payment_reminder` | Utility | "Dear {{1}}, invoice #{{2}} for {{3}} is due on {{4}}." | Payment reminder |

Approval typically takes minutes to 24 hours. Rejected templates require edit + resubmit.

---

## Database Changes

### New Table: `tbl_whatsapp`

```sql
CREATE TABLE tbl_whatsapp (
    [ID] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    identify VARCHAR(100) NOT NULL,          -- INVOICE, QUOTATION, STATEMENT, RECEIPT
    content_sid VARCHAR(100) NOT NULL,       -- Meta template ID (HX...)
    body VARCHAR(MAX) NOT NULL,              -- Template body with {{1}} placeholders
    header_type VARCHAR(50),                 -- TEXT, IMAGE, VIDEO, DOCUMENT
    header_url VARCHAR(MAX),                 -- URL for media header (optional)
    footer VARCHAR(MAX),                     -- Footer text (opt-out notice)
    status VARCHAR(50),                      -- active, paused, rejected
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME
)
```

### New Table: `tbl_whatsapp_settings`

```sql
CREATE TABLE tbl_whatsapp_settings (
    [ID] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    company_id BIGINT DEFAULT 1,
    phone_id VARCHAR(100) NOT NULL,          -- Meta Phone Number ID
    waba_id VARCHAR(100) NOT NULL,           -- WhatsApp Business Account ID
    access_token VARCHAR(MAX) NOT NULL,       -- Permanent access token (encrypt)
    display_name VARCHAR(200),               -- Business display name on WhatsApp
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE()
)
```

### New Table: `tbl_whatsapp_log`

```sql
CREATE TABLE tbl_whatsapp_log (
    [ID] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    customer_id BIGINT,
    identify VARCHAR(100),                   -- INVOICE, QUOTATION, etc.
    recipient_phone VARCHAR(50) NOT NULL,
    message_sid VARCHAR(100),                -- Meta message SID
    status VARCHAR(50),                     -- queued, sent, delivered, read, failed
    error_code VARCHAR(50),
    error_message VARCHAR(MAX),
    sent_at DATETIME DEFAULT GETDATE()
)
```

### Optional: Add to `tbl_customer`

Add `whatsapp_opt_in` BIT DEFAULT 0 for consent tracking (recommended for compliance).

---

## File Structure (New Modules)

```
WhatsApp/                          -- New module folder
├── whatsapp.vb                     -- Template management form (mirror of emails.vb)
├── whatsapp_module.vb              -- Core API function (mirror of email_module.vb)
├── direct_whatsapp.vb              -- Direct send form (mirror of direct_email.vb)
└── whatsapp_settings.vb            -- API credentials management
```

---

## API Integration

### Endpoint

```
POST https://graph.facebook.com/vXX.0/{PHONE_NUMBER_ID}/messages
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json
```

### Send Template Message (proactive outbound)

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "+18551234567",
  "type": "template",
  "template": {
    "name": "invoice_ready",
    "language": { "code": "en_US" },
    "components": [
      {
        "type": "header",
        "parameters": [
          { "type": "document", "document": { "link": "https://..." } }
        ]
      },
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "Mr. Smith" },
          { "type": "text", "text": "INV-2024-042" },
          { "type": "text", "text": "$1,250.00" }
        ]
      }
    ]
  }
}
```

### Send Free-Form Message (within 24h window — customer initiated)

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "+18551234567",
  "type": "text",
  "text": {
    "preview_url": false,
    "body": "Your invoice is attached."
  }
}
```

### Response

```json
{
  "messaging_product": "whatsapp",
  "contacts": [{ "wa_id": "15551234567" }],
  "messages": [{
    "id": "wamid.HBgLOT",
    "message_status": "accepted"
  }]
}
```

---

## UI Components (Parallel to Email)

### `whatsapp.vb` — Template Management

```
┌─────────────────────────────────────────────────┐
│ [INVOICE] [QUOTATION] [STATEMENT] [RECEIPT]     │
│                                                  │
│ Content SID:    [___________________________]     │
│ Template Name:  [___________________________]     │
│ Body:          [___________________________]     │
│ Header Type:   [TEXT ▼]                         │
│ Header URL:    [___________________________]     │
│                                                  │
│ [Save] [Send Test] [Cancel]                    │
└─────────────────────────────────────────────────┘
```

### `direct_whatsapp.vb` — Direct Send

```
┌─────────────────────────────────────────────────┐
│ Template:    [INVOICE ▼]                        │
│ Recipient:   [____Search...________▼]           │
│              ┌──────────────────────┐             │
│              │ Name    │ Phone     │             │
│              └──────────────────────┘             │
│                                                  │
│ Attachment: [___________________________]        │
│ Files:     ☑ C:\docs\invoice.pdf               │
│            [Browse...]                           │
│                                                  │
│            [Send WhatsApp] [Cancel]             │
└─────────────────────────────────────────────────┘
```

---

## Pricing (Per Message)

### Meta Rates (utility category — invoice app use case)

| Country | Rate/msg |
|---------|-----------|
| US | ~$0.0034 |
| UK | ~$0.0082 |
| India | ~$0.0040 |
| Vietnam | ~$0.0034 |

### Cost Scenarios

| Scenario | Monthly volume | Cost |
|----------|---------------|------|
| Customer asks first → reply (free-form, within 24h) | 100 replies | **~$0.50** (Twilio $0.005/msg) |
| Proactive invoice push (utility template) | 100 invoices | **~$0.84–$1.00** |
| Proactive invoice push (utility template, Meta direct) | 100 invoices | **~$0.34–$0.50** |

**Recommendation**: Start with Meta Cloud API direct (no BSP markup). Switch to BSP (Twilio) only if DX becomes a burden.

---

## Setup Checklist

### Client Side

- [ ] Confirm Meta Business Account exists
- [ ] Create Meta Developer App with WhatsApp Business product
- [ ] Create/connect WhatsApp Business Account (WABA)
- [ ] Register dedicated phone number
- [ ] Submit utility templates for approval (invoice_ready, quotation_ready, etc.)
- [ ] Share credentials: `PHONE_NUMBER_ID`, `WABA_ID`, `ACCESS_TOKEN`
- [ ] Add developer as Developer role on the Meta App

### Developer Side

- [ ] Create `tbl_whatsapp`, `tbl_whatsapp_settings`, `tbl_whatsapp_log` tables
- [ ] Build `whatsapp_module.vb` — API integration function
- [ ] Build `whatsapp.vb` — template CRUD form
- [ ] Build `direct_whatsapp.vb` — manual send form
- [ ] Build `whatsapp_settings.vb` — credentials management form
- [ ] Add WhatsApp button to HOME navigation bar
- [ ] Integrate PDF hosting/upload (media URL required for attachments)
- [ ] Add WhatsApp log view to track sent messages
- [ ] Optional: Add webhook receiver for delivery receipts

---

## Key Constraints

1. **Template required for proactive send** — cannot send free-form outside 24h customer-initiated window
2. **PDF must be publicly accessible** — WhatsApp downloads media from URL. Local file paths won't work. Must upload to a public URL first.
3. **Dedicated phone number** — cannot use a number already on consumer WhatsApp
4. **Phone number must be E.164 format** — `+14155552671`
5. **Rate limits** — starts at 250 unique users/24h, scales with quality score
6. **No filename on attachments** — WhatsApp doesn't preserve filenames from URLs

---

## Resources

- Meta Developer Portal: https://developers.facebook.com
- WhatsApp Cloud API Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
- Meta Business Manager: https://business.facebook.com
- Template Guidelines: https://developers.facebook.com/docs/whatsapp/templates
