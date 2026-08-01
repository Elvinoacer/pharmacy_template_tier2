Yes. I would actually document Tier 2 as a **complete Customer Engagement Platform**, not simply "CRM + AI." This makes it much easier to position and gives clear value before introducing the operational platform in Tier 3.

The maturity model becomes:

- **Tier 1:** Digital Presence (Website)
- **Tier 2:** Customer Engagement Platform (CRM + AI + Communication + Automation)
- **Tier 3:** Pharmacy Operations Platform (Inventory, POS, Internal Workflows)

---

# Tier 2 — Customer Engagement Platform

## Purpose

The Tier 2 Customer Engagement Platform transforms the pharmacy website into an interactive customer engagement system. It enables the pharmacy to manage customer relationships, automate communication, improve retention, and provide intelligent self-service while ensuring pharmacists remain responsible for all clinical decisions.

Unlike Tier 1, which focuses on providing information, Tier 2 introduces customer accounts, CRM, communication tools, AI-powered assistance, and workflow automation.

---

# Objectives

The platform shall enable the pharmacy to:

- Build long-term customer relationships
- Increase refill retention
- Reduce repetitive phone calls
- Improve communication
- Automate routine customer interactions
- Provide self-service capabilities
- Support pharmacists with AI-assisted workflows
- Collect customer insights
- Measure customer engagement

---

# User Roles

## Customer

Registered pharmacy customer.

## Caregiver

Authorized family member managing prescriptions for another customer.

## Pharmacist

Licensed pharmacist responsible for reviewing and approving clinical matters.

## Pharmacy Staff

Authorized staff managing customer communication.

## Pharmacy Manager

CRM management, campaigns, reports, analytics.

---

# Module 1 — Customer Accounts

Customers shall be able to:

- Register an account
- Login securely
- Reset password
- Verify email
- Verify phone number
- Enable two-factor authentication (optional)

---

## Customer Profile

Store:

- Full name
- Phone number
- Email
- Date of birth
- Gender (optional)
- Address
- Preferred communication method
- Emergency contact
- Preferred pharmacy branch

---

## Caregiver Management

Customers shall be able to:

- Add caregiver
- Remove caregiver
- Authorize refill requests
- Authorize pickup notifications

---

# Module 2 — Customer Dashboard

Customers shall have a personalized dashboard displaying:

- Active prescriptions
- Refill requests
- Previous requests
- Notifications
- Saved pharmacy
- Health reminders
- Communication history

---

# Module 3 — Customer CRM

Maintain a complete customer relationship history.

Track:

- Profile
- Interactions
- Website activity
- Refill requests
- Contact history
- Communication preferences
- Customer notes

---

## Customer Timeline

Every interaction is recorded.

Examples:

- Registered account
- Submitted refill
- Contacted pharmacy
- Received reminder
- Opened email
- AI conversation
- Pickup completed

---

# Module 4 — Customer Segmentation

Automatically categorize customers.

Examples:

- Monthly refill customers
- Diabetes care
- Hypertension
- Asthma
- Family customers
- Senior citizens
- New customers
- Dormant customers

Managers may also create custom segments.

---

# Module 5 — Communication Center

Centralized communication platform.

Channels:

- Email
- SMS
- WhatsApp
- Push notifications (future)

---

Communication history shall be stored.

Staff can:

- Send messages
- Schedule messages
- Reply to customers
- View conversation history

---

# Module 6 — AI Virtual Assistant

The AI assistant shall assist customers through:

- Website
- Customer Portal
- WhatsApp (future)

---

The AI may answer:

- Opening hours
- Services
- Delivery information
- Insurance information
- Location
- Prescription refill process
- Frequently asked questions

---

The AI shall NOT:

- Diagnose illness
- Recommend medication
- Modify prescriptions
- Interpret laboratory results
- Provide clinical decisions

Whenever uncertain, the AI shall escalate the conversation to pharmacy staff.

---

# Module 7 — AI Refill Assistant

Guide customers through refill requests.

Collect:

- Customer identity
- Medicine
- Prescription reference
- Pickup preference
- Preferred date

Validate missing information.

Create structured refill requests.

---

# Module 8 — Refill Management

Customers shall:

- Request refill
- Cancel request
- View request status

Statuses:

- Submitted
- Under Review
- Approved
- Preparing
- Ready for Pickup
- Collected
- Cancelled

---

# Module 9 — Reminder Engine

Automated reminders.

Examples:

### Refill Reminder

Medicine may be running out.

---

### Pickup Reminder

Prescription is ready.

---

### Follow-up Reminder

Medicine has not been collected.

---

### Wellness Reminder

Health campaign.

---

### Birthday Message

Optional.

---

Communication frequency shall respect customer consent.

---

# Module 10 — Campaign Management

Managers may create campaigns.

Examples:

- Diabetes Awareness
- Flu Season
- Blood Pressure Week
- Vaccination Campaign

Campaigns may target customer segments.

---

# Module 11 — Loyalty Program

Optional module.

Support:

- Points
- Rewards
- Membership tiers
- Coupons
- Referral rewards

---

# Module 12 — Online Enquiries

Customers may submit:

- General enquiries
- Product availability enquiries
- Delivery enquiries

Staff manage enquiries from one dashboard.

---

# Module 13 — Customer Feedback

Collect:

- Satisfaction rating
- Reviews
- Suggestions
- Complaints

Managers can respond.

---

# Module 14 — AI Knowledge Base

Administrators upload:

- FAQs
- Services
- Policies
- Delivery rules
- Store information

The AI shall answer only using approved knowledge.

---

# Module 15 — Notification Center

Manage all outgoing notifications.

Track:

- Delivered
- Failed
- Opened
- Clicked
- Replied

---

# Module 16 — Customer Preferences

Customers manage:

- Email preferences
- SMS preferences
- WhatsApp preferences
- Marketing consent
- Reminder consent

---

# Module 17 — Analytics Dashboard

Managers view:

## Customer Growth

- New registrations
- Active customers

---

## Retention

- Repeat customers
- Dormant customers

---

## Communication

- Messages sent
- Open rates
- Response rates

---

## AI

- Conversations
- Escalations
- Common questions

---

## Refills

- Requests submitted
- Completed
- Cancelled
- Average processing time

---

# Module 18 — CRM Administration

Managers manage:

- Customer records
- Segments
- Campaigns
- Templates
- AI knowledge
- Communication settings

---

# Security Requirements

The platform shall:

- Encrypt customer information
- Protect personal information
- Record audit logs
- Enforce role-based permissions
- Secure authentication
- Require consent for marketing communications

---

# Integrations

Support integration with:

- WhatsApp Business
- SMS Gateway
- Email Provider
- Google Maps
- Google Analytics
- Tier 1 Website
- Tier 3 Operations Platform (future)

---

# Non-Functional Requirements

### Performance

- Responsive on desktop and mobile
- Customer dashboard loads quickly
- AI responses returned promptly
- Reliable notification delivery

### Scalability

Support:

- Multiple pharmacy branches
- Thousands of customer records
- Growing communication volume

### Reliability

- High system availability
- Automatic backups
- Recovery procedures

---

# Out of Scope (Tier 2)

The following capabilities are intentionally deferred to Tier 3:

- Inventory management
- Point of Sale (POS)
- Supplier management
- Purchase orders
- Stock transfers
- Expiry tracking
- Internal dispensing workflow
- Barcode scanning
- Financial accounting
- Employee scheduling
- Payroll
- Internal document management
- Warehouse management

---

# Customer Journey

```text
Customer Visits Website
        │
        ▼
Creates Account
        │
        ▼
Customer Profile Created
        │
        ▼
AI Assists / Customer Requests Refill
        │
        ▼
CRM Records Interaction
        │
        ▼
Staff Reviews Request
        │
        ▼
Customer Receives Updates
        │
        ▼
Pickup Completed
        │
        ▼
CRM Updates Timeline
        │
        ▼
Reminder Engine Schedules Next Follow-up
```

## Product Positioning

Think of Tier 2 as the pharmacy's **digital relationship manager**. It doesn't run the pharmacy's back-office operations—that's Tier 3. Instead, it manages everything that happens **between the pharmacy and its customers**: accounts, communication, reminders, campaigns, AI-assisted self-service, and CRM. This separation keeps the product modular, easier to sell, and allows pharmacies to adopt capabilities gradually without paying for operational features they may not yet need.
