# **Aether Pharmacy Platform**

# **Complete Implementation & UX Improvement Specification**

## **1\. Global Platform Improvements**

These improvements apply across the entire platform, not just individual pages.

### **Notifications System**

Implement a complete notification management system for both administrators and customers.

Requirements:

* Mark notification as read  
* Mark all notifications as read  
* Read/unread badges  
* Correct unread counts in header badges  
* Full notification view inside a modal/page  
* Delete notifications  
* Search notifications  
* Filter notifications by:  
  * Status (Pending, Sent, Failed, Delivered)  
  * Channel (Email, SMS, WhatsApp, Push, In-app)  
* Retry all failed notifications with one click  
* Pagination for large notification lists  
* Incoming customer actions should notify administrators via Push/In-app  
* Admin should have an Inbox-like experience  
* Customer portal should also have:  
  * unread badges  
  * search  
  * pagination  
  * delete  
  * full notification view  
  * correct timestamps

---

### **Date & Time**

The entire platform currently has incorrect date/time calculations.

Standardize all date handling by ensuring:

* timezone awareness  
* correct scheduling  
* accurate timestamps  
* correct delivery times  
* correct timeline calculations  
* consistent formatting everywhere

This affects:

* Customer timeline  
* Scheduled messages  
* Campaigns  
* Notifications  
* Reminders  
* Staff notes  
* Refills  
* Prescription tracking  
* Everywhere dates are displayed.

---

### **Pagination & Search**

Every listing throughout the platform must support large datasets.

Every list should either use:

* pagination  
* infinite loading  
* virtualization

Every major listing should support search where appropriate.

This includes:

* Customers  
* Notifications  
* Drugs  
* Refills  
* Prescriptions  
* Campaigns  
* Messages  
* Coupons  
* Loyalty  
* Registered devices  
* Articles  
* etc.

---

### **Dropdown Improvements**

Current dropdowns are not scalable.

Replace them with searchable async dropdowns.

Requirements:

* Search while typing  
* Handles thousands of records  
* Alphabetically sorted  
* Distinguish users with identical names (show email)  
* Customer dropdowns should only display customers  
* Staff dropdowns should only display staff  
* Never mix user types.

---

### **UI / UX Polish**

Across the entire platform:

* Better loading states  
* Better hover states  
* Better empty states  
* Success/Error toasts  
* Better tables  
* Premium styling  
* Better button affordances  
* Better form validation  
* Responsive layouts  
* Premium admin dashboard feel

---

## **2\. Admin Portal**

---

# **Admin Refills**

### **Functional Improvements**

Implement:

* Search by:  
  * Medicine  
  * Rx Reference  
  * Customer name  
  * Registered customer full name  
* Empty state  
* Pagination  
* Clicking a refill row should navigate directly to the customer profile.

---

### **UI Improvements**

Improve:

* Table styling  
* Save button discoverability  
* Status update confirmations  
* Success toasts  
* Overall polish

---

# **Customer Management**

## **Customer List**

Improve:

* Clear search button  
* Better search UX

---

## **Customer Details**

### **Timeline**

Fix incorrect timezone calculations.

---

### **Send Message**

Current issue:

Subject field never hides.

Expected:

Email

Show Subject.

SMS

Hide Subject.

WhatsApp

Hide Subject.

Portal

Hide Subject.

---

### **Scheduled Messages**

Investigate why:

* scheduled sends happen early  
* emails are delayed  
* notifications send before time

Ensure scheduled delivery actually happens at the scheduled time.

---

### **Staff Notes**

Current pinning system is incorrect.

Implement:

* Multiple pinned notes  
* Drag-and-drop ordering  
* Administrator controls ordering  
* Pinned notes always appear first

---

# **Enquiries**

Public contact form submissions should appear in Admin Enquiries.

Also improve:

* Public contact form UI  
* Admin enquiry interface

---

# **Feedback**

Fix:

* "Appear on public" checkbox

Implement:

* Customer replies  
* Customer notification when staff responds

---

# **Articles**

Implement complete CRUD.

Currently missing:

* Edit  
* Delete

---

# **Loyalty**

Current manual adjustment remains.

Also implement automatic loyalty updates using cron jobs.

Automatic triggers may include:

* Purchases  
* Refills  
* Campaign participation  
* Referrals  
* Profile completion  
* Birthday rewards  
* Custom configurable events

Display:

* Last updated  
* Reason  
* Source (manual/system)

---

### **Coupon Generation**

Add one-click:

Generate Coupon

Requirements:

* unique code  
* collision detection  
* retry until unique

---

### **Coupon CRUD**

Implement:

* Edit  
* Delete  
* Archive

---

# **Reminders**

Current limitations:

Only scheduled reminders.

Need:

* Send immediately  
* Schedule  
* Cron processing  
* AI-assisted reminder suggestions  
* Admin configurable automation

Fix:

* Process Due Now button  
* Time calculations

---

# **Templates**

Implement:

Full CRUD

Improve UX by:

* AI-assisted writing  
* Better message composition  
* Variable insertion UX

---

# **Campaigns**

Current issues:

Campaign scheduling is unclear.

Need:

* Send now  
* Schedule later  
* Automatic cron launch

Improve:

* Variable insertion UX  
* AI assistance  
* Notification rendering  
* Full notification display  
* Read/unread badges

---

### **Email Templates**

Replace

support@aetherpharmacy.com

with

support@gtss.software

Format markdown correctly.

Improve template rendering.

---

# **Notifications**

Implement:

* Search  
* Filters  
* Badges  
* Pagination  
* Retry failed  
* Read/unread  
* Full message  
* Delete  
* Inbox

---

# **AI Dashboard**

Investigate:

Escalation system.

Ensure it works correctly.

---

## **3\. Prescription Management**

This should become one of the core modules of the platform.

---

### **Prescription Creation**

Administrators should be able to:

* Create  
* Edit  
* Delete  
* Assign prescriptions

Customers should never manually create prescriptions.

---

### **Prescription Linking**

Every prescription must be linked directly to:

* Drug catalogue  
* Pharmacy stock

During prescription creation:

Search medicine

↓

Select from stock

↓

Medicine details auto-populate.

Avoid duplicate medicine entry.

---

### **Prescription Intelligence**

AI should analyse:

* adherence  
* missed doses  
* refill behaviour  
* dosage trends  
* pharmacist recommendations

Reports available to:

* customer  
* pharmacist

---

### **Medication Tracking**

Customers should record:

* doses taken  
* missed doses  
* skipped days  
* notes

Generate:

* adherence graphs  
* projected refill dates  
* medication completion estimates

AI should:

* predict refill dates  
* detect adherence issues  
* notify pharmacist

---

### **Prescription Lifecycle**

Support:

* start date  
* end date  
* duration  
* refills remaining  
* expiry  
* pharmacist notes  
* reminders

---

## **4\. Customer Portal**

---

### **Onboarding**

Currently missing.

Implement onboarding flow protected by proxy.ts.

Require profile completion before accessing the portal.

---

### **Profile**

Improve:

Success toast after saving.

Birthday:

* no future dates  
* automatically assign age segment:

Examples:

* Infant  
* Child  
* Teenager  
* Young Adult  
* Adult  
* Senior

---

### **Preferences**

If a user disables Email/SMS/etc,

absolutely no communication should use that channel.

---

### **Prescriptions**

Ensure:

* Active prescription list  
* Medicine  
* Rx Reference  
* Refills remaining  
* Status

Request refill should:

* pre-select prescription  
* disable if no refills remain

Correct empty state.

---

### **Refill Requests**

Remove manual prescription entry.

Only allow:

Existing prescription selection.

Selecting prescription should automatically populate medicine information.

Ensure the complete documented workflow actually matches implementation.

---

### **Loyalty**

Current implementation is incomplete.

Implement:

* Correct coupon redemption  
* Prevent duplicate redemption  
* Redemption history  
* Usage tracking  
* Coupon validity  
* Tier recalculation  
* Atomic transactions  
* Admin synchronization

---

### **Payments**

Introduce Daraja API (test mode configurable, production-ready code).

Refills should require payment unless waived.

Administrator controls:

* prescription price  
* waiver  
* one-time waiver  
* recurring waiver  
* expiry conditions

Track:

* payment status  
* waived status  
* due dates  
* repayment status

Coupons should apply during:

* OTC purchases  
* Prescription refills

---

### **Caregivers**

Implement:

Undo revoke.

Caregiver invitation email.

Dedicated caregiver portal.

Caregivers may:

* request refills  
* receive pickup notifications  
* manage medication  
* track adherence

---

### **Messages**

Ensure customer sees:

* conversation threads  
* subject  
* body  
* timestamps

If replies are enabled:

* validation  
* thread updates  
* admin synchronization

Push notifications should work correctly.

---

## **5\. Drug Catalogue & Inventory**

Develop a complete digital pharmacy inventory.

---

### **Drug Catalogue**

Each medication should contain:

* Images  
* Categories  
* Price  
* Description  
* Side effects  
* Uses  
* Dosage  
* Contraindications  
* Storage  
* OTC/Prescription tag

---

### **Public Store**

Public users can browse selected medications.

Only logged-in customers access full catalogue.

OTC drugs:

Purchasable online.

Prescription drugs:

Require valid prescription.

---

### **Inventory Integration**

Allow pharmacy POS integration.

Sync:

* stock  
* images  
* descriptions  
* prices  
* categories

Display integration contact inside admin.

---

### **Drug Relationships**

Allow prescriptions to recommend equivalent or alternative medications.

---

## **6\. Over-the-Counter Sales**

When staff sells medication physically:

Single workflow should:

* Record sale  
* Create customer if needed  
* Record prescription if applicable  
* Record dosage  
* Link medication  
* Reduce stock  
* Record revenue  
* Generate prescription when necessary

Automatically:

* Create customer account  
* Send onboarding email  
* Enable portal access  
* Display prescriptions immediately

---

### **Revenue Analytics**

Provide analytics for:

* Daily  
* Weekly  
* Monthly  
* Quarterly  
* Annual

Track:

* OTC sales  
* Prescription sales  
* Revenue trends

---

## **7\. Authentication & Onboarding**

New users created by:

* OTC sales  
* Caregiver invitations

should receive email invitations to complete their account.

After onboarding:

* enable notifications  
* complete profile  
* access dashboard  
* view medications  
* manage prescriptions

---

## **8\. General Quality Assurance**

Review every documented testing scenario and ensure the implementation fully satisfies the expected behavior, particularly for:

* Refills (`/portal/refills/new`)  
* Prescriptions (`/portal/prescriptions`)  
* Loyalty (`/portal/loyalty`)  
* Messages (`/portal/messages`)

# **Aether Pharmacy – Implementation Tasks & UX Improvements**

## **1\. Prescription ↔ Medication Catalogue Integration (High Priority)**

The prescription workflow should be tightly integrated with the medication catalogue to eliminate duplicate data entry and improve consistency.

### **Requirements**

* Every medication created in the system should have an associated **Rx Reference** (or equivalent identifier).  
* During medication creation (`Admin → Medications → New`), the pharmacy should enter this Rx Reference.  
* When creating a prescription, administrators should **not manually type medication details**.  
* Instead:  
  * Search for an existing medication.  
  * Select it from a searchable dropdown.  
  * Automatically populate all relevant medication information from the catalogue.

### **Data Source**

The prescription module should reuse medication information from the medication catalogue whenever possible.

If the prescription requires fields that currently do not exist in the medication schema:

* Extend the medication schema.  
* Update the medication creation form.  
* Ensure prescriptions consume those values instead of asking users to re-enter them.

This keeps medication information centralized and prevents inconsistent records.

---

## **2\. Prescription Dispatch & Stock Management (Critical)**

Prescriptions **must not** immediately affect inventory.

### **Required Workflow**

1. Prescription is created.  
2. Prescription remains pending.  
3. Admin reviews the prescription.  
4. Admin explicitly marks it as **Dispatched**.  
5. **Only then** should stock quantities be deducted.

Stock should **never** change simply because a prescription exists.

The dispatch workflow should be designed with an efficient UX so administrators can complete it quickly without unnecessary clicks or repeated data entry.

---

## **3\. AI Template Generation (Critical Bug)**

AI-assisted drafting is currently unreliable throughout the application.

### **Issues**

* Clicking the AI button frequently produces no response.  
* In some places AI returns content but never injects it into the form.  
* Some pages throw unexplained errors after AI generation.

### **Affected Pages**

* Admin Templates  
* Campaigns  
* Customer Details (`customer/[id]`)  
* Any other page using AI-assisted form completion

### **Expected Behaviour**

When AI successfully generates content:

* Display loading state.  
* Handle errors gracefully.  
* Automatically populate the appropriate form fields.  
* Never require the user to manually copy AI output.

This functionality should be standardized across the entire project.

---

## **4\. Searchable Dropdown Standards**

Every dropdown throughout the admin panel should support large datasets.

### **Requirements**

All dropdowns should:

* Be searchable.  
* Handle hundreds (or thousands) of records efficiently.  
* Support virtualization or lazy rendering if necessary.  
* Have responsive loading states.  
* Display meaningful empty states.

This should become the standard component used across the project.

---

# **Caregiver Module**

## **5\. Invitation Link Bug**

Invitation links currently result in a **404 Page Not Found**.

Example:

[https://pharmacy-template-tier2.vercel.app/caregiver/accept?token=](https://pharmacy-template-tier2.vercel.app/caregiver/accept?token=)...

This acceptance route should correctly:

* Validate the token.  
* Display the caregiver acceptance page.  
* Handle expired or invalid tokens gracefully.

---

## **6\. Invitation Email Spam Prevention**

The **Send Invite Link** button can currently be clicked repeatedly, causing multiple invitation emails.

### **Required Improvements**

* Disable the button immediately after click.  
* Show a success toast once the email has been sent.  
* Prevent duplicate requests.  
* Add a cooldown period before another invitation can be sent.  
* Re-enable only after cooldown or after the request fails.

---

# **Medication Management**

## **7\. Separate Listing & Creation Pages**

Medication creation should not happen inside the listing page.

### **Desired Structure**

* `admin/medications`  
  * Medication listing  
  * Search  
  * Filters  
  * Bulk actions  
  * Pagination  
* `admin/medications/new`  
  * Medication creation form only

The listing page should focus exclusively on management.

---

## **8\. Medication Categories**

The Categories dropdown beside search currently returns no data.

Investigate whether category management exists.

If it does not, implement full CRUD:

* Create category  
* Edit category  
* Delete category  
* Assign medications to categories  
* Populate category dropdown dynamically

---

# **Refill Requests**

## **9\. Prescription Required Before Refill**

Customers can currently submit refill requests without having a prescription.

This should not be allowed.

### **Required Flow**

Customer should:

1. Select one of their active prescriptions.  
2. Complete any additional refill information.  
3. Submit the refill request.

If no prescription exists:

* Disable submission.  
* Explain why.

Only **Over-the-Counter (OTC)** medications should be ordered without a prescription.

---

# **Orders**

## **10\. Coupon Verification During Order Entry**

The admin order creation process currently trusts any coupon entered manually.

This creates opportunities for abuse.

### **Improve Validation**

Before accepting a coupon:

* Verify it exists.  
* Verify it belongs to the intended customer.  
* Verify it has not already been redeemed.  
* Verify expiration.  
* Prefer matching against the customer's email where applicable.

The admin should immediately receive validation feedback.

---

# **Image Uploads**

## **11\. Cloudflare R2 Integration**

Image handling currently relies solely on pasted URLs.

Replace this approach.

### **Requirements**

Every image field should support:

* Upload to Cloudflare R2.  
* Manual URL input (optional).  
* Image preview.  
* Upload progress.  
* Error handling.

The upload experience should become the default throughout the application.

---

# **Campaigns**

## **12\. AI Response Injection**

AI successfully generates campaign messages but does not populate the UI.

Example generated content:

> Hello {{name}}, ...

never appears inside the editor.

Fix the binding so generated content automatically fills the message body.

The same issue exists on the Customer page and other AI-enabled forms.

---

# **Reminder Management**

## **13\. Process Due Now UX Improvements**

The **Process Due Now** action under:

`/admin/reminders`

requires better interaction.

### **Improvements**

* Loading state.  
* Disable button while processing.  
* Success/error toast.  
* Optimistic UI updates.  
* Automatically refresh reminder data after completion.  
* No manual page refresh required.

---

# **Loyalty Portal**

## **14\. Coupon Redemption Feedback**

Coupon redemption currently provides poor feedback.

### **Improvements**

After successful redemption:

* Change button text from **Redeem** to **Redeemed**.  
* Disable the button.  
* Show success toast.  
* Prevent duplicate redemption attempts.  
* Update UI immediately.

---

# **General AI Improvements**

## **15\. Standardize AI Form Filling**

Across the application, AI-assisted form filling should follow a consistent implementation.

### **Standard Behaviour**

* User clicks AI button.  
* Loading indicator appears.  
* AI request executes.  
* Generated content is automatically inserted into the correct fields.  
* Errors are clearly communicated.  
* Retry is available if generation fails.

This implementation should be shared across all AI-enabled pages rather than having separate inconsistent logic.

---

# **Overall Goal**

The overarching objective is to improve:

* Data consistency  
* Workflow efficiency  
* Inventory accuracy  
* AI reliability  
* User feedback  
* Performance  
* Large dataset usability  
* Prevention of duplicate actions  
* Cleaner separation of concerns  
* Better administrator experience

The admin interface should minimize repetitive data entry, provide immediate feedback for every important action, and ensure all workflows are both intuitive and resilient.

