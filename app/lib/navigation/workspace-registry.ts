import type { SessionUser } from "@/app/lib/types";
import { canAccessAdminPath } from "@/app/lib/platform/admin-access";

export type WorkspaceRole = "admin" | "platform" | "portal" | "caregiver";

export type EntityType =
  | "page"
  | "action"
  | "workflow"
  | "report"
  | "setting"
  | "record"
  | "tool";

export type QuickAction = {
  id: string;
  label: string;
  href: string;
  description?: string;
  icon?: string;
  keywords?: readonly string[];
  intentKey?: string;
};

export type WorkspaceGroup = {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
  role: WorkspaceRole;
  priority: number;
  mobilePrimary?: boolean;
};

export type NavigationDestination = {
  id: string;
  label: string;
  description: string;
  keywords: readonly string[];
  href: string;
  icon: string;
  workspace: WorkspaceRole;
  groupId: string;
  entityType: EntityType;
  badgeKey?: "feel" | "unread" | "applications" | "prescriptions";
  quickActions?: readonly QuickAction[];
  searchAliases?: readonly string[];
  priority?: number;
  mobilePrimary?: boolean;
};

/* ============================================================
   WORKSPACE GROUPS (5–6 conceptual spaces per role)
   ============================================================ */

export const WORKSPACE_GROUPS: Record<WorkspaceRole, readonly WorkspaceGroup[]> = {
  admin: [
    {
      id: "today",
      label: "Today’s workspace",
      shortLabel: "Today",
      description: "Immediate operational tasks, requests and alerts",
      icon: "LayoutDashboard",
      role: "admin",
      priority: 1,
      mobilePrimary: true,
    },
    {
      id: "clinical",
      label: "Clinical & Prescriptions",
      shortLabel: "Clinical",
      description: "Prescriptions, refills, dispensing, screenings and vaccination clinic",
      icon: "Stethoscope",
      role: "admin",
      priority: 2,
      mobilePrimary: true,
    },
    {
      id: "stock",
      label: "Sales & Stock",
      shortLabel: "Stock",
      description: "Inventory, medicines, orders, POS, expiry and procurement",
      icon: "Package",
      role: "admin",
      priority: 3,
      mobilePrimary: true,
    },
    {
      id: "patients",
      label: "Patients & Care",
      shortLabel: "Patients",
      description: "Patient directory, conversations, adherence, enquiries and outreach",
      icon: "Users",
      role: "admin",
      priority: 4,
      mobilePrimary: true,
    },
    {
      id: "insights",
      label: "Growth & Insights",
      shortLabel: "Insights",
      description: "Financial analytics, margins, refill pipeline, staff and AI reviews",
      icon: "TrendingUp",
      role: "admin",
      priority: 5,
    },
    {
      id: "more",
      label: "Settings & Setup",
      shortLabel: "More",
      description: "Pharmacy configuration, storefront, integrations and go-live",
      icon: "Settings",
      role: "admin",
      priority: 6,
    },
  ],

  platform: [
    {
      id: "overview",
      label: "Platform Overview",
      shortLabel: "Overview",
      description: "Network health, live stats and platform telemetry",
      icon: "LayoutDashboard",
      role: "platform",
      priority: 1,
      mobilePrimary: true,
    },
    {
      id: "network",
      label: "Pharmacy Network",
      shortLabel: "Network",
      description: "Pharmacies, verification applications, shared catalog and users",
      icon: "Store",
      role: "platform",
      priority: 2,
      mobilePrimary: true,
    },
    {
      id: "operations",
      label: "Platform Operations",
      shortLabel: "Operations",
      description: "Billing, subscription plans, background jobs, webhooks and delivery",
      icon: "Activity",
      role: "platform",
      priority: 3,
      mobilePrimary: true,
    },
    {
      id: "governance",
      label: "Governance & Security",
      shortLabel: "Governance",
      description: "Security credentials, audit trail, compliance and feature flags",
      icon: "Shield",
      role: "platform",
      priority: 4,
      mobilePrimary: true,
    },
    {
      id: "system",
      label: "System & Tools",
      shortLabel: "System",
      description: "System integrations, marketplace link and developer tools",
      icon: "Layers3",
      role: "platform",
      priority: 5,
    },
  ],

  portal: [
    {
      id: "home",
      label: "My Health Home",
      shortLabel: "Home",
      description: "Personal health dashboard and nearby network pharmacies",
      icon: "LayoutDashboard",
      role: "portal",
      priority: 1,
      mobilePrimary: true,
    },
    {
      id: "medicines",
      label: "Medications & Refills",
      shortLabel: "Medicines",
      description: "Refills, prescriptions, dose calendar and refill sync",
      icon: "Pill",
      role: "portal",
      priority: 2,
      mobilePrimary: true,
    },
    {
      id: "care",
      label: "Care & Wellness",
      shortLabel: "Care",
      description: "Screenings, vaccinations, symptom check-ins and caregivers",
      icon: "HeartPulse",
      role: "portal",
      priority: 3,
      mobilePrimary: true,
    },
    {
      id: "orders",
      label: "Orders & Delivery",
      shortLabel: "Orders",
      description: "Purchase receipts, order tracking and payments",
      icon: "ShoppingCart",
      role: "portal",
      priority: 4,
      mobilePrimary: true,
    },
    {
      id: "messages",
      label: "Pharmacist Messages",
      shortLabel: "Messages",
      description: "Direct conversations with pharmacy clinicians",
      icon: "MessageSquare",
      role: "portal",
      priority: 5,
    },
    {
      id: "more",
      label: "Account & Rewards",
      shortLabel: "More",
      description: "Loyalty points, profile, notification preferences and feedback",
      icon: "Sparkles",
      role: "portal",
      priority: 6,
    },
  ],

  caregiver: [
    {
      id: "home",
      label: "Caregiver Dashboard",
      shortLabel: "Home",
      description: "Summary of supported patients, urgent needs and pending tasks",
      icon: "HeartHandshake",
      role: "caregiver",
      priority: 1,
      mobilePrimary: true,
    },
    {
      id: "patients",
      label: "My Patients",
      shortLabel: "Patients",
      description: "Managed patient profiles, regimens and histories",
      icon: "Users",
      role: "caregiver",
      priority: 2,
      mobilePrimary: true,
    },
    {
      id: "tasks",
      label: "Dose & Daily Tasks",
      shortLabel: "Tasks",
      description: "Today’s doses, verification checklist and adherence logs",
      icon: "CalendarCheck",
      role: "caregiver",
      priority: 3,
      mobilePrimary: true,
    },
    {
      id: "schedule",
      label: "Schedule & Reminders",
      shortLabel: "Schedule",
      description: "Timed dose reminders, calendar view and refill timings",
      icon: "Clock",
      role: "caregiver",
      priority: 4,
      mobilePrimary: true,
    },
    {
      id: "alerts",
      label: "Refills & Alerts",
      shortLabel: "Alerts",
      description: "Refill status, pickup notifications and clinician alerts",
      icon: "Bell",
      role: "caregiver",
      priority: 5,
    },
    {
      id: "more",
      label: "Reports & Care Tools",
      shortLabel: "More",
      description: "Adherence analytics, account settings and care history",
      icon: "Activity",
      role: "caregiver",
      priority: 6,
    },
  ],
};

/* ============================================================
   CANONICAL DESTINATIONS
   ============================================================ */

export const WORKSPACE_DESTINATIONS: readonly NavigationDestination[] = [
  /* ------------------------------------------------------------
     ADMIN DESTINATIONS
     ------------------------------------------------------------ */
  {
    id: "admin-today",
    label: "Today’s workspace",
    description: "Start with open requests, patient follow-ups, and stock that needs attention.",
    keywords: ["today", "dashboard", "overview", "home", "tasks", "pending", "queue"],
    href: "/admin",
    icon: "LayoutDashboard",
    workspace: "admin",
    groupId: "today",
    entityType: "page",
    searchAliases: ["dashboard", "home", "start", "today", "work queue"],
    priority: 100,
    mobilePrimary: true,
    quickActions: [
      { id: "new-rx", label: "New Prescription", href: "/admin/prescriptions/new", icon: "FileText", intentKey: "new-prescription" },
      { id: "rec-sale", label: "Record Sale", href: "/admin/orders#pos", icon: "ShoppingCart", intentKey: "record-sale" },
    ],
  },
  {
    id: "admin-inbox",
    label: "Attention inbox",
    description: "Review operational alerts, enquiries, and escalations that need a response.",
    keywords: ["inbox", "notifications", "alerts", "escalations", "messages", "urgent"],
    href: "/admin/inbox",
    icon: "Inbox",
    workspace: "admin",
    groupId: "today",
    entityType: "workflow",
    badgeKey: "unread",
    searchAliases: ["inbox", "alerts", "attention queue", "unread notifications"],
    priority: 90,
  },
  {
    id: "admin-feel",
    label: "Symptom check-ins",
    description: "Review patient symptoms and pharmacist handoffs. Start with urgent check-ins.",
    keywords: ["feel", "symptoms", "check-in", "pharmacist handoff", "adherence", "urgent"],
    href: "/admin/feel",
    icon: "HeartPulse",
    workspace: "admin",
    groupId: "today",
    entityType: "workflow",
    badgeKey: "feel",
    searchAliases: ["symptoms", "how do you feel", "patient check-ins", "clinical escalations"],
    priority: 85,
  },
  {
    id: "admin-setup",
    label: "Go-live checklist",
    description: "Complete remaining setup items to prepare your pharmacy for patients.",
    keywords: ["setup", "onboarding", "go live", "checklist", "store setup", "launch"],
    href: "/admin/setup",
    icon: "ClipboardCheck",
    workspace: "admin",
    groupId: "today",
    entityType: "page",
    searchAliases: ["setup checklist", "go live", "getting ready"],
    priority: 20,
  },

  /* Admin Clinical */
  {
    id: "admin-prescriptions",
    label: "Prescriptions",
    description: "Review incoming prescriptions, verify details, and prepare medicines for collection.",
    keywords: ["prescriptions", "rx", "scripts", "intake", "dispense", "orders"],
    href: "/admin/prescriptions",
    icon: "FileText",
    workspace: "admin",
    groupId: "clinical",
    entityType: "page",
    searchAliases: ["rx", "scripts", "prescriptions", "incoming scripts"],
    priority: 95,
    mobilePrimary: true,
    quickActions: [
      { id: "create-rx", label: "+ New Prescription", href: "/admin/prescriptions/new", icon: "Plus", intentKey: "new-prescription" },
      { id: "refill-q", label: "Refill Queue", href: "/admin/refills", icon: "RefreshCw" },
    ],
  },
  {
    id: "admin-prescriptions-new",
    label: "New prescription",
    description: "Enter patient and prescription details. Review the information before saving.",
    keywords: ["new prescription", "create prescription", "write rx", "dispense", "add script"],
    href: "/admin/prescriptions/new",
    icon: "Plus",
    workspace: "admin",
    groupId: "clinical",
    entityType: "action",
    searchAliases: ["new prescription", "add prescription", "write rx", "manual prescription"],
    priority: 94,
  },
  {
    id: "admin-refills",
    label: "Refills & schedules",
    description: "Review requests, prepare refills, and follow up with patients who are due.",
    keywords: ["refills", "renewal", "repeat", "schedules", "dispense"],
    href: "/admin/refills",
    icon: "RefreshCw",
    workspace: "admin",
    groupId: "clinical",
    entityType: "workflow",
    searchAliases: ["refills", "refill requests", "repeat prescription", "renewals"],
    priority: 92,
  },
  {
    id: "admin-dispensing",
    label: "Dispensing register",
    description: "Find completed fills, sales, and substitutions in one searchable controlled log.",
    keywords: ["dispensing", "log", "controlled drug register", "fills", "substitutions", "audit"],
    href: "/admin/dispensing",
    icon: "ClipboardCheck",
    workspace: "admin",
    groupId: "clinical",
    entityType: "record",
    searchAliases: ["dispensing register", "dispense log", "controlled drug log", "substitution record"],
    priority: 80,
  },
  {
    id: "admin-services",
    label: "Clinical services",
    description: "Manage available services, prices, and online booking options.",
    keywords: ["services", "consultations", "screenings", "clinic", "appointments", "booking"],
    href: "/admin/services",
    icon: "Stethoscope",
    workspace: "admin",
    groupId: "clinical",
    entityType: "page",
    searchAliases: ["services", "clinical services", "consultations", "pharmacy services"],
    priority: 70,
  },
  {
    id: "admin-services-bookings",
    label: "Service bookings",
    description: "Review booking requests, confirm payments, and record completed appointments.",
    keywords: ["bookings", "appointments", "calendar", "schedule", "consultation slots"],
    href: "/admin/services/bookings",
    icon: "CalendarClock",
    workspace: "admin",
    groupId: "clinical",
    entityType: "workflow",
    searchAliases: ["service bookings", "appointments", "booked services", "clinic schedule"],
    priority: 68,
  },
  {
    id: "admin-screenings",
    label: "Screenings & referrals",
    description: "Record vital signs and screening results, then arrange referrals when needed.",
    keywords: ["screenings", "vitals", "blood pressure", "glucose", "bmi", "poct", "referrals"],
    href: "/admin/screenings",
    icon: "Activity",
    workspace: "admin",
    groupId: "clinical",
    entityType: "workflow",
    searchAliases: ["screenings", "vitals", "health check", "clinical referrals", "poct"],
    priority: 65,
  },
  {
    id: "admin-vaccinations",
    label: "Vaccination clinic",
    description: "Manage clinic requests, record vaccinations, and review follow-up information.",
    keywords: ["vaccinations", "immunisation", "vaccine", "aefi", "jab", "flu shot"],
    href: "/admin/vaccinations",
    icon: "Syringe",
    workspace: "admin",
    groupId: "clinical",
    entityType: "workflow",
    searchAliases: ["vaccines", "vaccinations", "immunisation", "clinic"],
    priority: 64,
  },
  {
    id: "admin-adherence",
    label: "Adherence & follow-up",
    description: "Prioritize patient follow-ups and manage ongoing medicine adherence schedules.",
    keywords: ["adherence", "compliance", "follow-up", "sync", "reminders", "care"],
    href: "/admin/adherence",
    icon: "Activity",
    workspace: "admin",
    groupId: "clinical",
    entityType: "workflow",
    searchAliases: ["adherence", "medication adherence", "patient follow-up", "pill sync"],
    priority: 62,
  },

  /* Admin Sales & Stock */
  {
    id: "admin-inventory",
    label: "Stock & inventory",
    description: "Review low stock, expired batches, FEFO lots, and reorder suggestions.",
    keywords: ["inventory", "stock", "batches", "expiry", "fefo", "low stock", "reorder", "lots"],
    href: "/admin/inventory",
    icon: "Boxes",
    workspace: "admin",
    groupId: "stock",
    entityType: "page",
    searchAliases: ["stock", "inventory", "low stock", "expired stock", "expiry lots", "reorder"],
    priority: 95,
    mobilePrimary: true,
    quickActions: [
      { id: "inv-low", label: "Low Stock Alert", href: "/admin/inventory#low", icon: "AlertTriangle" },
      { id: "inv-expiry", label: "Expiry Watch", href: "/admin/inventory#expiry", icon: "Clock" },
      { id: "add-med", label: "Add Medicine", href: "/admin/medications/add", icon: "Plus" },
    ],
  },
  {
    id: "admin-medications",
    label: "Medicine catalogue",
    description: "Find medicines, update prices and stock, and manage what patients can see.",
    keywords: ["medicines", "drugs", "medications", "catalogue", "price", "stock", "panadol"],
    href: "/admin/medications",
    icon: "Pill",
    workspace: "admin",
    groupId: "stock",
    entityType: "page",
    searchAliases: ["medicines", "drugs", "medicine catalogue", "drug master", "med list", "panadol"],
    priority: 93,
    quickActions: [
      { id: "med-add", label: "Add Medicine", href: "/admin/medications/add", icon: "Plus" },
      { id: "med-scan", label: "Scan Barcode", href: "/admin/medications/scan", icon: "Search" },
      { id: "med-lib", label: "Browse Library", href: "/admin/medications/library", icon: "BookOpen" },
    ],
  },
  {
    id: "admin-orders",
    label: "Sales & orders",
    description: "Record counter sales, manage reservations, and follow payments and deliveries.",
    keywords: ["orders", "pos", "counter sales", "checkout", "invoices", "sales", "cashier"],
    href: "/admin/orders",
    icon: "ShoppingCart",
    workspace: "admin",
    groupId: "stock",
    entityType: "page",
    searchAliases: ["orders", "sales", "pos", "counter sales", "point of sale", "checkout"],
    priority: 90,
  },
  {
    id: "admin-analytics-reconciliation-stock",
    label: "Payment reconciliation",
    description: "Compare expected sales with collections, M-Pesa statements, and bank deposits.",
    keywords: ["reconciliation", "payments", "settlements", "m-pesa", "collections", "audit"],
    href: "/admin/analytics/reconciliation",
    icon: "Scale",
    workspace: "admin",
    groupId: "stock",
    entityType: "report",
    searchAliases: ["reconciliation", "payment reconciliation", "settlements", "sales audit"],
    priority: 89,
  },
  {
    id: "admin-analytics-sales-stock",
    label: "Sales analytics",
    description: "Track revenue trends, top moving medications, and margins.",
    keywords: ["sales", "sales analytics", "revenue", "trends", "margins", "profit"],
    href: "/admin/analytics/sales",
    icon: "TrendingUp",
    workspace: "admin",
    groupId: "stock",
    entityType: "report",
    searchAliases: ["sales analytics", "sales report", "sales this month", "product trends"],
    priority: 88,
  },
  {
    id: "admin-orders-pos",
    label: "Point of Sale (POS)",
    description: "Counter sales, rapid dispense checkout, and cash/M-Pesa receipting.",
    keywords: ["pos", "point of sale", "counter sales", "cashier", "checkout"],
    href: "/admin/orders#pos",
    icon: "CreditCard",
    workspace: "admin",
    groupId: "stock",
    entityType: "tool",
    searchAliases: ["pos", "point of sale", "counter sale", "cash register"],
    priority: 87,
  },
  {
    id: "admin-inventory-expiry",
    label: "Expiry & batch watch",
    description: "Batches nearing 30, 60, and 90-day expiry thresholds requiring action.",
    keywords: ["expiry", "batches", "lots", "expired", "fefo", "shelf life"],
    href: "/admin/inventory#expiry",
    icon: "Clock",
    workspace: "admin",
    groupId: "stock",
    entityType: "workflow",
    searchAliases: ["expiry", "expiring batches", "batch watch", "expired lots"],
    priority: 86,
  },
  {
    id: "admin-medications-add",
    label: "Add a medicine",
    description: "Choose a method to add medicines to your pharmacy catalogue.",
    keywords: ["add medicine", "new drug", "create medicine", "import"],
    href: "/admin/medications/add",
    icon: "Plus",
    workspace: "admin",
    groupId: "stock",
    entityType: "action",
    searchAliases: ["add medicine", "new medicine", "add product"],
    priority: 82,
  },
  {
    id: "admin-medications-new-direct",
    label: "Create medicine entry",
    description: "Fill form to register a new custom medicine in your pharmacy catalog.",
    keywords: ["new medicine", "create drug", "add medicine form"],
    href: "/admin/medications/new",
    icon: "Plus",
    workspace: "admin",
    groupId: "stock",
    entityType: "action",
    searchAliases: ["new medicine form", "create medicine entry"],
    priority: 81,
  },
  {
    id: "admin-medications-library",
    label: "Medicine library",
    description: "Find an existing verified drug, then add your pharmacy’s price and stock details.",
    keywords: ["medicine library", "master catalog", "search library", "pre-loaded"],
    href: "/admin/medications/library",
    icon: "BookOpen",
    workspace: "admin",
    groupId: "stock",
    entityType: "workflow",
    searchAliases: ["medicine library", "shared catalog", "master drug list"],
    priority: 80,
  },
  {
    id: "admin-medications-scan",
    label: "Scan a medicine",
    description: "Scan a pack barcode or enter its barcode to find a matching medicine.",
    keywords: ["scan", "barcode", "upc", "ean", "pack scanner"],
    href: "/admin/medications/scan",
    icon: "Search",
    workspace: "admin",
    groupId: "stock",
    entityType: "tool",
    searchAliases: ["scan medicine", "barcode scan", "camera scan"],
    priority: 78,
  },
  {
    id: "admin-medications-import-csv",
    label: "Import medicine CSV",
    description: "Upload a CSV, match its columns, and review the preview before importing.",
    keywords: ["import csv", "bulk upload", "spreadsheet", "excel", "catalog import"],
    href: "/admin/medications/import/csv",
    icon: "FileText",
    workspace: "admin",
    groupId: "stock",
    entityType: "tool",
    searchAliases: ["import csv", "csv upload", "bulk medicines"],
    priority: 75,
  },
  {
    id: "admin-medications-import-ai",
    label: "Import with AI assistance",
    description: "Prepare an unstructured medicine list with AI parsing and verification.",
    keywords: ["import ai", "ai catalog", "parse list", "smart import"],
    href: "/admin/medications/import/ai",
    icon: "Sparkles",
    workspace: "admin",
    groupId: "stock",
    entityType: "tool",
    searchAliases: ["ai import", "smart import", "ai medicine list"],
    priority: 74,
  },
  {
    id: "admin-medications-incomplete",
    label: "Missing medicine details",
    description: "Find incomplete records and add the prices, images and info staff and patients need.",
    keywords: ["incomplete", "missing details", "draft medicines", "unlisted"],
    href: "/admin/medications/incomplete",
    icon: "AlertTriangle",
    workspace: "admin",
    groupId: "stock",
    entityType: "workflow",
    searchAliases: ["incomplete medicines", "missing prices", "unlisted medicines"],
    priority: 70,
  },
  {
    id: "admin-medications-categories",
    label: "Medicine categories",
    description: "Organize your catalogue so staff and patients can find the right medicines.",
    keywords: ["categories", "tags", "therapeutic class", "grouping"],
    href: "/admin/medications/categories",
    icon: "Boxes",
    workspace: "admin",
    groupId: "stock",
    entityType: "setting",
    searchAliases: ["categories", "medicine categories", "drug classes"],
    priority: 65,
  },

  /* Admin Patients */
  {
    id: "admin-customers",
    label: "Patients & customers",
    description: "Find a patient to view their medicines, requests, and communication history.",
    keywords: ["patients", "customers", "profiles", "contacts", "history", "records"],
    href: "/admin/customers",
    icon: "Users",
    workspace: "admin",
    groupId: "patients",
    entityType: "page",
    searchAliases: ["patients", "customers", "patient directory", "crm", "client list"],
    priority: 92,
    mobilePrimary: true,
  },
  {
    id: "admin-messages",
    label: "Patient conversations",
    description: "Find patient conversations across email, SMS, WhatsApp, and the portal.",
    keywords: ["conversations", "messages", "chat", "whatsapp", "sms", "email"],
    href: "/admin/messages",
    icon: "Send",
    workspace: "admin",
    groupId: "patients",
    entityType: "workflow",
    searchAliases: ["messages", "patient chat", "whatsapp messaging", "sms chat"],
    priority: 88,
  },
  {
    id: "admin-enquiries",
    label: "Patient enquiries",
    description: "Read questions from patients and keep each enquiry’s status up to date.",
    keywords: ["enquiries", "questions", "support", "helpdesk", "queries"],
    href: "/admin/enquiries",
    icon: "Inbox",
    workspace: "admin",
    groupId: "patients",
    entityType: "workflow",
    searchAliases: ["enquiries", "questions", "patient requests", "support tickets"],
    priority: 84,
  },
  {
    id: "admin-campaigns",
    label: "Campaigns & outreach",
    description: "Create outreach campaigns and review their audience, schedule, and progress.",
    keywords: ["campaigns", "outreach", "broadcast", "bulk sms", "marketing", "announcement"],
    href: "/admin/campaigns",
    icon: "Megaphone",
    workspace: "admin",
    groupId: "patients",
    entityType: "workflow",
    searchAliases: ["campaigns", "outreach", "bulk sms", "broadcast messages"],
    priority: 75,
  },
  {
    id: "admin-reminders",
    label: "Automated reminders",
    description: "Schedule refill, collection, and wellness reminders, then track delivery.",
    keywords: ["reminders", "automated sms", "refill reminder", "dose notifications"],
    href: "/admin/reminders",
    icon: "CalendarClock",
    workspace: "admin",
    groupId: "patients",
    entityType: "workflow",
    searchAliases: ["reminders", "automated reminders", "patient alerts"],
    priority: 74,
  },
  {
    id: "admin-segments",
    label: "Patient groups & segments",
    description: "Organize patients into groups for relevant reminders and clinical outreach.",
    keywords: ["segments", "groups", "cohorts", "audiences", "chronic conditions"],
    href: "/admin/segments",
    icon: "Users",
    workspace: "admin",
    groupId: "patients",
    entityType: "tool",
    searchAliases: ["segments", "patient groups", "audiences", "chronic cohort"],
    priority: 70,
  },
  {
    id: "admin-loyalty",
    label: "Loyalty & rewards",
    description: "Manage points, coupons, and earning rules for your patients and customers.",
    keywords: ["loyalty", "rewards", "points", "coupons", "discounts", "tiers"],
    href: "/admin/loyalty",
    icon: "Star",
    workspace: "admin",
    groupId: "patients",
    entityType: "tool",
    searchAliases: ["loyalty", "rewards", "points program", "customer rewards"],
    priority: 68,
  },
  {
    id: "admin-feedback",
    label: "Patient feedback & reviews",
    description: "Read reviews, respond to patient feedback, and investigate concerns.",
    keywords: ["feedback", "reviews", "ratings", "nps", "satisfaction"],
    href: "/admin/feedback",
    icon: "Star",
    workspace: "admin",
    groupId: "patients",
    entityType: "record",
    searchAliases: ["feedback", "reviews", "patient reviews", "star ratings"],
    priority: 65,
  },

  /* Admin Growth & Insights */
  {
    id: "admin-analytics",
    label: "Reports & analytics",
    description: "Choose a report to understand sales, margins, patient care, stock, or payments.",
    keywords: ["analytics", "reports", "revenue", "sales", "margin", "profit", "metrics"],
    href: "/admin/analytics",
    icon: "TrendingUp",
    workspace: "admin",
    groupId: "insights",
    entityType: "report",
    searchAliases: ["reports", "analytics", "business metrics", "kpis"],
    priority: 90,
  },
  {
    id: "admin-analytics-sales",
    label: "Sales report",
    description: "Review orders, units sold, gross merchandise, and reservation progress.",
    keywords: ["sales report", "revenue", "daily sales", "monthly sales", "orders count"],
    href: "/admin/analytics/sales",
    icon: "ShoppingCart",
    workspace: "admin",
    groupId: "insights",
    entityType: "report",
    searchAliases: ["sales report", "sales this month", "daily revenue", "order metrics"],
    priority: 88,
  },
  {
    id: "admin-analytics-revenue",
    label: "Revenue & profit margin",
    description: "Compare sales, collections, wholesale costs, and net margins.",
    keywords: ["revenue", "margin", "profit", "cogs", "collections"],
    href: "/admin/analytics/revenue",
    icon: "TrendingUp",
    workspace: "admin",
    groupId: "insights",
    entityType: "report",
    searchAliases: ["revenue", "margin", "profitability", "gross margin"],
    priority: 86,
  },
  {
    id: "admin-analytics-payments",
    label: "Payments & reconciliation",
    description: "Compare expected sales with collections, M-Pesa statements, and bank deposits.",
    keywords: ["payments", "reconciliation", "m-pesa", "bank", "settlements", "balances"],
    href: "/admin/analytics/payments",
    icon: "CreditCard",
    workspace: "admin",
    groupId: "insights",
    entityType: "report",
    searchAliases: ["payments", "payment reconciliation", "m-pesa audit", "settlement"],
    priority: 84,
  },
  {
    id: "admin-ai",
    label: "AI review queue",
    description: "Review clinical conversations and adherence alerts that need human sign-off.",
    keywords: ["ai review", "escalations", "human review", "safety", "ai checks"],
    href: "/admin/ai",
    icon: "Brain",
    workspace: "admin",
    groupId: "insights",
    entityType: "workflow",
    searchAliases: ["ai queue", "ai review", "assistant review", "human in the loop"],
    priority: 78,
  },
  {
    id: "admin-medications-metrics",
    label: "Catalogue activity & reuse",
    description: "See how medicines are added and how often existing records are reused.",
    keywords: ["catalogue metrics", "catalog stats", "reuse rate", "inventory health"],
    href: "/admin/medications/metrics",
    icon: "TrendingUp",
    workspace: "admin",
    groupId: "insights",
    entityType: "report",
    searchAliases: ["catalog metrics", "catalogue stats", "medicine performance"],
    priority: 70,
  },
  {
    id: "admin-analytics-overview",
    label: "Analytics overview",
    description: "High-level summary of dispensary performance, clinical trends, and growth.",
    keywords: ["analytics overview", "dashboard", "kpis", "pharmacy metrics", "executive summary"],
    href: "/admin/analytics/overview",
    icon: "LayoutDashboard",
    workspace: "admin",
    groupId: "insights",
    entityType: "report",
    searchAliases: ["analytics overview", "pharmacy summary", "kpi report"],
    priority: 85,
  },
  {
    id: "admin-analytics-reconciliation",
    label: "Payment reconciliation report",
    description: "Audit expected sales vs actual M-Pesa, card, cash, and bank collections.",
    keywords: ["reconciliation", "audit", "m-pesa statements", "variance", "banking"],
    href: "/admin/analytics/reconciliation",
    icon: "Scale",
    workspace: "admin",
    groupId: "insights",
    entityType: "report",
    searchAliases: ["reconciliation report", "payment audit", "cash reconciliation"],
    priority: 84,
  },
  {
    id: "admin-analytics-customers",
    label: "Patient & customer analytics",
    description: "Patient retention, new registrations, consultation volume, and demographics.",
    keywords: ["customer analytics", "patient trends", "retention", "patient volume"],
    href: "/admin/analytics/customers",
    icon: "Users",
    workspace: "admin",
    groupId: "insights",
    entityType: "report",
    searchAliases: ["patient analytics", "customer retention", "patient growth"],
    priority: 76,
  },
  {
    id: "admin-analytics-inventory",
    label: "Inventory analytics",
    description: "Stock turnover velocity, dead stock, wastage, and shrinkage analysis.",
    keywords: ["inventory analytics", "turnover", "stock velocity", "wastage", "shrinkage"],
    href: "/admin/analytics/inventory",
    icon: "Boxes",
    workspace: "admin",
    groupId: "insights",
    entityType: "report",
    searchAliases: ["inventory analytics", "stock turnover", "dead stock report"],
    priority: 75,
  },
  {
    id: "admin-analytics-prescriptions",
    label: "Prescription analytics",
    description: "Prescription intake volumes, doctor prescriber analysis, and fill times.",
    keywords: ["prescription analytics", "rx volume", "prescriber analysis", "fill turnaround"],
    href: "/admin/analytics/prescriptions",
    icon: "FileText",
    workspace: "admin",
    groupId: "insights",
    entityType: "report",
    searchAliases: ["rx analytics", "prescription metrics", "prescriber report"],
    priority: 74,
  },
  {
    id: "admin-analytics-products",
    label: "Product performance analytics",
    description: "Fastest moving SKUs, brand vs generic performance, and margin contributors.",
    keywords: ["product analytics", "best sellers", "fast moving medicines", "margins by drug"],
    href: "/admin/analytics/products",
    icon: "Pill",
    workspace: "admin",
    groupId: "insights",
    entityType: "report",
    searchAliases: ["product analytics", "top medicines", "sku velocity"],
    priority: 73,
  },
  {
    id: "admin-analytics-refills",
    label: "Refill retention analytics",
    description: "Refill adherence rates, chronic treatment renewals, and churn risks.",
    keywords: ["refill analytics", "refill retention", "chronic renewal", "refill adherence"],
    href: "/admin/analytics/refills",
    icon: "RefreshCw",
    workspace: "admin",
    groupId: "insights",
    entityType: "report",
    searchAliases: ["refill analytics", "refill adherence rate", "renewal metrics"],
    priority: 72,
  },
  {
    id: "admin-analytics-staff",
    label: "Staff dispensing analytics",
    description: "Staff productivity, dispensing activity, and dispensing log throughput.",
    keywords: ["staff analytics", "productivity", "dispenser metrics", "pharmacist activity"],
    href: "/admin/analytics/staff",
    icon: "Users",
    workspace: "admin",
    groupId: "insights",
    entityType: "report",
    searchAliases: ["staff productivity", "dispenser activity", "pharmacist metrics"],
    priority: 71,
  },

  /* Admin More & Settings */
  {
    id: "admin-billing",
    label: "Plans & billing",
    description: "Compare Free and Premium, review usage limits, apply an optional voucher, and upgrade the pharmacy.",
    keywords: ["premium", "upgrade", "plans", "billing", "pricing", "subscription", "voucher"],
    href: "/admin/billing",
    icon: "Sparkles",
    workspace: "admin",
    groupId: "more",
    entityType: "setting",
    searchAliases: ["upgrade to premium", "pricing", "billing", "subscription", "plan", "premium"],
    priority: 92,
  },
  {
    id: "admin-settings-location",
    label: "Pharmacy details & hours",
    description: "Update your location, opening hours, phone, and contact information.",
    keywords: ["settings", "location", "hours", "opening hours", "contact", "address", "branch"],
    href: "/admin/settings/location",
    icon: "Settings",
    workspace: "admin",
    groupId: "more",
    entityType: "setting",
    searchAliases: ["pharmacy settings", "change opening hours", "store hours", "branch details", "location"],
    priority: 85,
  },
  {
    id: "admin-settings-storefront",
    label: "Storefront appearance",
    description: "Customize your pharmacy’s branding, banner, logo and public website content.",
    keywords: ["storefront", "website", "branding", "logo", "theme", "design", "appearance"],
    href: "/admin/settings/storefront",
    icon: "Palette",
    workspace: "admin",
    groupId: "more",
    entityType: "setting",
    searchAliases: ["storefront settings", "website design", "brand colors", "storefront logo"],
    priority: 80,
  },
  {
    id: "admin-settings-integrations",
    label: "Connected services",
    description: "Manage your pharmacy’s M-Pesa, SMS gateway, WhatsApp, and POS connections.",
    keywords: ["integrations", "m-pesa", "sms", "whatsapp", "api keys", "connected apps"],
    href: "/admin/settings/integrations",
    icon: "Plug",
    workspace: "admin",
    groupId: "more",
    entityType: "setting",
    searchAliases: ["integrations", "mpesa config", "whatsapp setup", "sms gateway"],
    priority: 78,
  },
  {
    id: "admin-settings-payments",
    label: "Payment gateways & methods",
    description: "Configure M-Pesa Till/Paybill numbers, card processing, and cashier payment rules.",
    keywords: ["payments", "payment settings", "m-pesa till", "paybill", "card checkout"],
    href: "/admin/settings/payments",
    icon: "CreditCard",
    workspace: "admin",
    groupId: "more",
    entityType: "setting",
    searchAliases: ["payment settings", "mpesa paybill", "till setup", "card processor"],
    priority: 76,
  },
  {
    id: "admin-templates",
    label: "Message templates",
    description: "Create reusable messages for email, SMS, WhatsApp, and the portal.",
    keywords: ["templates", "sms copy", "email templates", "canned responses"],
    href: "/admin/templates",
    icon: "FileText",
    workspace: "admin",
    groupId: "more",
    entityType: "tool",
    searchAliases: ["templates", "message templates", "canned replies"],
    priority: 70,
  },
  {
    id: "admin-knowledge",
    label: "AI knowledge base",
    description: "Maintain approved pharmacy articles that guide AI assistant responses.",
    keywords: ["knowledge base", "faqs", "articles", "guidelines", "ai answers"],
    href: "/admin/knowledge",
    icon: "BookOpen",
    workspace: "admin",
    groupId: "more",
    entityType: "tool",
    searchAliases: ["knowledge base", "faqs", "assistant knowledge"],
    priority: 68,
  },
  {
    id: "admin-notifications",
    label: "Admin notification settings",
    description: "Review sent notifications and manage your staff alert preferences.",
    keywords: ["notifications", "alert settings", "history", "delivery status"],
    href: "/admin/notifications",
    icon: "Bell",
    workspace: "admin",
    groupId: "more",
    entityType: "setting",
    searchAliases: ["notification settings", "alert preferences", "notification log"],
    priority: 65,
  },
  {
    id: "admin-select",
    label: "Switch pharmacy",
    description: "Change the active pharmacy workspace you are currently managing.",
    keywords: ["switch", "change pharmacy", "tenant", "select pharmacy"],
    href: "/admin/select",
    icon: "Store",
    workspace: "admin",
    groupId: "more",
    entityType: "action",
    searchAliases: ["switch pharmacy", "change branch", "select store"],
    priority: 60,
  },

  /* ------------------------------------------------------------
     PLATFORM DESTINATIONS
     ------------------------------------------------------------ */
  {
    id: "platform-overview",
    label: "Platform overview",
    description: "Network aggregate telemetry, active tenants, order counts, and GMV.",
    keywords: ["overview", "telemetry", "kpis", "network", "dashboard", "health"],
    href: "/platform",
    icon: "LayoutDashboard",
    workspace: "platform",
    groupId: "overview",
    entityType: "page",
    searchAliases: ["platform home", "network overview", "control center"],
    priority: 100,
    mobilePrimary: true,
  },
  {
    id: "platform-applications",
    label: "Pharmacy applications",
    description: "Review new pharmacy onboarding submissions, licenses, and verifications.",
    keywords: ["applications", "verify", "onboarding", "approval", "compliance", "pharmacy review"],
    href: "/platform/applications",
    icon: "ClipboardCheck",
    workspace: "platform",
    groupId: "network",
    entityType: "workflow",
    searchAliases: ["verify pharmacy", "review applications", "pharmacy applications", "onboarding queue"],
    priority: 95,
    mobilePrimary: true,
  },
  {
    id: "platform-pharmacies",
    label: "All pharmacies",
    description: "Directory of active, paused, and suspended pharmacy tenants in Afyvia.",
    keywords: ["pharmacies", "tenants", "stores", "directory", "memberships"],
    href: "/platform/pharmacies",
    icon: "Store",
    workspace: "platform",
    groupId: "network",
    entityType: "page",
    searchAliases: ["pharmacy list", "tenant directory", "all pharmacies"],
    priority: 92,
  },
  {
    id: "platform-medications",
    label: "Shared medication library",
    description: "Master medication dictionary, standardized dosages, forms, and safety rules.",
    keywords: ["medications", "master catalog", "shared library", "drug database", "inn"],
    href: "/platform/medications",
    icon: "Pill",
    workspace: "platform",
    groupId: "network",
    entityType: "page",
    searchAliases: ["shared medication library", "master medications", "global drug list"],
    priority: 88,
  },
  {
    id: "platform-medications-import",
    label: "Import master catalog",
    description: "Upload and validate master drug CSVs to enrich the network library.",
    keywords: ["master import", "csv upload", "bulk medications", "catalog import"],
    href: "/platform/medications/import",
    icon: "FileText",
    workspace: "platform",
    groupId: "network",
    entityType: "tool",
    searchAliases: ["import master catalog", "csv import platform", "bulk drugs"],
    priority: 84,
  },
  {
    id: "platform-medications-review",
    label: "Review duplicate masters",
    description: "Audit ambiguous drug names, match barcodes, and merge master records.",
    keywords: ["duplicate review", "merge masters", "catalog curation", "drug review"],
    href: "/platform/medications/review",
    icon: "AlertTriangle",
    workspace: "platform",
    groupId: "network",
    entityType: "workflow",
    searchAliases: ["duplicate masters", "review duplicates", "catalog review"],
    priority: 83,
  },
  {
    id: "platform-users",
    label: "Platform & staff users",
    description: "Manage global user accounts, roles, access levels, and identity states.",
    keywords: ["users", "accounts", "staff", "roles", "super admin", "access"],
    href: "/platform/users",
    icon: "Users",
    workspace: "platform",
    groupId: "network",
    entityType: "page",
    searchAliases: ["users", "accounts", "staff list", "user management"],
    priority: 85,
  },
  {
    id: "platform-careers",
    label: "Careers & applications",
    description: "Manage public career job listings, applicants, and recruiting workflows.",
    keywords: ["careers", "jobs", "hiring", "recruitment", "applicants"],
    href: "/platform/careers",
    icon: "BriefcaseBusiness",
    workspace: "platform",
    groupId: "network",
    entityType: "workflow",
    searchAliases: ["careers", "job postings", "hiring"],
    priority: 70,
  },
  {
    id: "platform-billing",
    label: "Platform billing",
    description: "Manage tenant subscriptions, platform fees, invoices, and payment payouts.",
    keywords: ["billing", "invoices", "subscriptions", "payments", "fees", "payouts"],
    href: "/platform/billing",
    icon: "CreditCard",
    workspace: "platform",
    groupId: "operations",
    entityType: "workflow",
    searchAliases: ["billing", "tenant billing", "platform invoices", "subscription fees"],
    priority: 90,
    mobilePrimary: true,
  },
  {
    id: "platform-plans",
    label: "Subscription plans",
    description: "Define tier pricing, usage allowances, and feature packages for pharmacies.",
    keywords: ["plans", "pricing", "tiers", "packages", "limits"],
    href: "/platform/plans",
    icon: "Layers3",
    workspace: "platform",
    groupId: "operations",
    entityType: "setting",
    searchAliases: ["subscription plans", "pricing plans", "tenant tiers"],
    priority: 84,
  },
  {
    id: "platform-jobs",
    label: "Background tasks & jobs",
    description: "Monitor asynchronous tasks, queue workers, health checks, and retry failed jobs.",
    keywords: ["jobs", "background tasks", "queue", "workers", "cron", "async"],
    href: "/platform/jobs",
    icon: "Activity",
    workspace: "platform",
    groupId: "operations",
    entityType: "tool",
    searchAliases: ["background jobs", "queue workers", "failed tasks"],
    priority: 82,
  },
  {
    id: "platform-notifications",
    label: "Message delivery",
    description: "Monitor SMS, WhatsApp, and email delivery rates, failure codes, and vendor costs.",
    keywords: ["message delivery", "sms delivery", "email delivery", "vendor status", "logs"],
    href: "/platform/notifications",
    icon: "Bell",
    workspace: "platform",
    groupId: "operations",
    entityType: "report",
    searchAliases: ["message delivery", "notification logs", "sms dispatch"],
    priority: 80,
  },
  {
    id: "platform-webhooks",
    label: "Webhooks",
    description: "View incoming/outgoing webhook payloads, signatures, and delivery retries.",
    keywords: ["webhooks", "callbacks", "payloads", "m-pesa ipn", "retries"],
    href: "/platform/webhooks",
    icon: "Webhook",
    workspace: "platform",
    groupId: "operations",
    entityType: "tool",
    searchAliases: ["webhooks", "webhook events", "ipn callbacks"],
    priority: 76,
  },
  {
    id: "platform-integrations",
    label: "Platform integrations",
    description: "Configure central provider connectors for payment gateways, SMS, and cloud storage.",
    keywords: ["integrations", "connectors", "providers", "m-pesa gateway", "sms provider"],
    href: "/platform/integrations",
    icon: "Plug",
    workspace: "platform",
    groupId: "operations",
    entityType: "setting",
    searchAliases: ["platform integrations", "gateways", "connectors"],
    priority: 74,
  },
  {
    id: "platform-invoices",
    label: "Platform invoices",
    description: "Generated subscription invoices, tax receipts, and payment settlements.",
    keywords: ["invoices", "receipts", "billing history", "tax statements", "payouts"],
    href: "/platform/invoices",
    icon: "Receipt",
    workspace: "platform",
    groupId: "operations",
    entityType: "record",
    searchAliases: ["platform invoices", "billing receipts", "invoicing"],
    priority: 78,
  },
  {
    id: "platform-subscriptions",
    label: "Tenant subscriptions",
    description: "Active pharmacy subscription contracts, renew dates, and payment states.",
    keywords: ["subscriptions", "contracts", "tenant plans", "renewals", "billing status"],
    href: "/platform/subscriptions",
    icon: "CreditCard",
    workspace: "platform",
    groupId: "operations",
    entityType: "workflow",
    searchAliases: ["tenant subscriptions", "pharmacy plans", "active subscriptions"],
    priority: 77,
  },
  {
    id: "platform-usage",
    label: "API & platform usage",
    description: "Monitor API quota limits, storage, bandwidth, and per-tenant resource utilization.",
    keywords: ["usage", "quotas", "limits", "telemetry", "bandwidth", "resource consumption"],
    href: "/platform/usage",
    icon: "Activity",
    workspace: "platform",
    groupId: "operations",
    entityType: "report",
    searchAliases: ["platform usage", "api quotas", "resource usage"],
    priority: 73,
  },
  {
    id: "platform-integrations-conflicts",
    label: "Integration conflict log",
    description: "Resolve sync discrepancies, external webhook payload collisions, and schema mismatches.",
    keywords: ["conflicts", "sync errors", "discrepancies", "integration errors", "schema mismatches"],
    href: "/platform/integrations/conflicts",
    icon: "AlertTriangle",
    workspace: "platform",
    groupId: "operations",
    entityType: "workflow",
    searchAliases: ["integration conflicts", "sync collisions", "error log"],
    priority: 71,
  },
  {
    id: "platform-security",
    label: "Security & MFA",
    description: "Configure 2FA requirements, enforce session policies, and view credential health.",
    keywords: ["security", "mfa", "2fa", "authentication", "sessions", "passwords"],
    href: "/platform/security",
    icon: "Shield",
    workspace: "platform",
    groupId: "governance",
    entityType: "setting",
    searchAliases: ["security", "mfa settings", "two factor", "admin credentials"],
    priority: 90,
    mobilePrimary: true,
  },
  {
    id: "platform-audit",
    label: "Audit log",
    description: "Immutable trail of administrative changes, security modifications, and overrides.",
    keywords: ["audit", "audit log", "security trail", "history", "who did what"],
    href: "/platform/audit",
    icon: "FileText",
    workspace: "platform",
    groupId: "governance",
    entityType: "record",
    searchAliases: ["audit log", "change log", "compliance trail"],
    priority: 86,
  },
  {
    id: "platform-compliance",
    label: "Compliance & verification",
    description: "Pharmacy board license validation, controlled medicine compliance, and data policies.",
    keywords: ["compliance", "regulatory", "ppb", "licenses", "controlled substances"],
    href: "/platform/compliance",
    icon: "KeyRound",
    workspace: "platform",
    groupId: "governance",
    entityType: "workflow",
    searchAliases: ["compliance", "regulatory checks", "pharmacy license"],
    priority: 84,
  },
  {
    id: "platform-feature-flags",
    label: "Feature flags & rollout",
    description: "Gradually roll out features, toggle experimental capabilities, and manage beta access.",
    keywords: ["feature flags", "flags", "toggles", "beta", "experiments", "rollout"],
    href: "/platform/feature-flags",
    icon: "Flag",
    workspace: "platform",
    groupId: "governance",
    entityType: "setting",
    searchAliases: ["feature flags", "system flags", "experiment toggles"],
    priority: 80,
  },

  /* ------------------------------------------------------------
     PORTAL (CUSTOMER) DESTINATIONS
     ------------------------------------------------------------ */
  {
    id: "portal-home",
    label: "My health dashboard",
    description: "Snapshot of your prescriptions, upcoming refills, dose reminders, and loyalty points.",
    keywords: ["home", "dashboard", "portal", "my health", "overview"],
    href: "/portal",
    icon: "LayoutDashboard",
    workspace: "portal",
    groupId: "home",
    entityType: "page",
    searchAliases: ["portal home", "my dashboard", "health home"],
    priority: 100,
    mobilePrimary: true,
    quickActions: [
      { id: "req-refill", label: "Request Refill", href: "/portal/refills/new", icon: "Plus", intentKey: "my-refill" },
      { id: "find-pharmacy", label: "Find Pharmacy", href: "/portal/pharmacies", icon: "Store" },
    ],
  },
  {
    id: "portal-pharmacies",
    label: "Nearby pharmacies",
    description: "Find accredited pharmacies in the Afyvia network near your location.",
    keywords: ["pharmacies", "nearby", "branches", "locations", "network"],
    href: "/portal/pharmacies",
    icon: "Store",
    workspace: "portal",
    groupId: "home",
    entityType: "page",
    searchAliases: ["nearby pharmacies", "pharmacy directory", "find store"],
    priority: 90,
  },
  {
    id: "portal-refills",
    label: "Refills & renewals",
    description: "Check status of open refill requests and request renewals for current medicines.",
    keywords: ["refills", "refill requests", "my refill", "medicine refill", "renew"],
    href: "/portal/refills",
    icon: "Pill",
    workspace: "portal",
    groupId: "medicines",
    entityType: "workflow",
    searchAliases: ["my refill", "refills", "request refill", "repeat medication"],
    priority: 95,
    mobilePrimary: true,
    quickActions: [
      { id: "portal-new-refill", label: "+ Request Refill", href: "/portal/refills/new", icon: "Plus", intentKey: "my-refill" },
    ],
  },
  {
    id: "portal-refills-new",
    label: "Request a refill",
    description: "Submit an ongoing prescription refill request for pickup or delivery.",
    keywords: ["request refill", "order refill", "new refill", "repeat prescription"],
    href: "/portal/refills/new",
    icon: "Plus",
    workspace: "portal",
    groupId: "medicines",
    entityType: "action",
    searchAliases: ["request refill", "order refill", "new refill request"],
    priority: 94,
  },
  {
    id: "portal-prescriptions",
    label: "My prescriptions",
    description: "View verified doctor prescriptions, dosage instructions, and remaining fills.",
    keywords: ["prescriptions", "rx", "doctor scripts", "medication list"],
    href: "/portal/prescriptions",
    icon: "FileText",
    workspace: "portal",
    groupId: "medicines",
    entityType: "record",
    searchAliases: ["prescriptions", "my rx", "doctor prescription"],
    priority: 92,
  },
  {
    id: "portal-calendar",
    label: "Medication calendar",
    description: "Daily and weekly schedule of what medicines to take and when.",
    keywords: ["calendar", "dose schedule", "pill schedule", "routine", "daily doses"],
    href: "/portal/calendar",
    icon: "Calendar",
    workspace: "portal",
    groupId: "medicines",
    entityType: "tool",
    searchAliases: ["medication calendar", "dose calendar", "schedule"],
    priority: 85,
  },
  {
    id: "portal-sync",
    label: "Align refill dates (MedSync)",
    description: "Synchronize multiple ongoing prescriptions so you pick them up on one single date.",
    keywords: ["medsync", "align refills", "sync dates", "one pickup"],
    href: "/portal/sync",
    icon: "RefreshCw",
    workspace: "portal",
    groupId: "medicines",
    entityType: "workflow",
    searchAliases: ["align refills", "medsync", "sync medications"],
    priority: 80,
  },
  {
    id: "portal-counselling",
    label: "Medicine advice & leaflets",
    description: "Safety guidance, side effects, food interactions, and storage directions.",
    keywords: ["advice", "counselling", "side effects", "interactions", "instructions"],
    href: "/portal/counselling",
    icon: "HeartPulse",
    workspace: "portal",
    groupId: "medicines",
    entityType: "page",
    searchAliases: ["medicine advice", "side effects", "drug info"],
    priority: 75,
  },
  {
    id: "portal-screenings",
    label: "Health screenings",
    description: "Review vitals history, blood pressure readings, glucose tests, and referrals.",
    keywords: ["screenings", "vitals", "blood pressure", "glucose", "health checks"],
    href: "/portal/screenings",
    icon: "Activity",
    workspace: "portal",
    groupId: "care",
    entityType: "record",
    searchAliases: ["screenings", "vitals record", "health checks"],
    priority: 86,
    mobilePrimary: true,
  },
  {
    id: "portal-vaccinations",
    label: "Vaccinations",
    description: "Your official immunisation records, certificates, and upcoming boosters.",
    keywords: ["vaccinations", "immunisation", "vaccine certificate", "boosters", "shots"],
    href: "/portal/vaccinations",
    icon: "Syringe",
    workspace: "portal",
    groupId: "care",
    entityType: "record",
    searchAliases: ["vaccines", "vaccinations", "immunisation records"],
    priority: 84,
  },
  {
    id: "portal-feel",
    label: "How do you feel today?",
    description: "Report symptoms, side effects, or recovery progress to your care team.",
    keywords: ["feel", "how do you feel", "symptoms", "side effects", "check in", "health log"],
    href: "/portal/feel",
    icon: "HeartPulse",
    workspace: "portal",
    groupId: "care",
    entityType: "action",
    badgeKey: "feel",
    searchAliases: ["how do you feel", "symptom check in", "report side effects"],
    priority: 90,
  },
  {
    id: "portal-preventive",
    label: "Preventive care recommendations",
    description: "Age and condition-tailored wellness advice, recommended checks, and reminders.",
    keywords: ["preventive", "wellness", "lifestyle", "routine checks", "preventive care"],
    href: "/portal/preventive",
    icon: "HeartPulse",
    workspace: "portal",
    groupId: "care",
    entityType: "page",
    searchAliases: ["preventive care", "wellness advice"],
    priority: 78,
  },
  {
    id: "portal-caregivers",
    label: "Caregivers & family access",
    description: "Authorize family members or caregivers to request refills and track adherence.",
    keywords: ["caregivers", "family", "dependents", "authorized person", "delegates"],
    href: "/portal/caregivers",
    icon: "HeartHandshake",
    workspace: "portal",
    groupId: "care",
    entityType: "setting",
    searchAliases: ["caregivers", "family access", "assign caregiver"],
    priority: 75,
  },
  {
    id: "portal-orders",
    label: "Orders & purchase history",
    description: "Review receipts, tracking numbers, and delivery status for store purchases.",
    keywords: ["orders", "purchases", "receipts", "deliveries", "invoices", "tracking"],
    href: "/portal/orders",
    icon: "ShoppingCart",
    workspace: "portal",
    groupId: "orders",
    entityType: "record",
    searchAliases: ["orders", "purchase history", "my orders", "receipts"],
    priority: 88,
    mobilePrimary: true,
  },
  {
    id: "portal-orders-new",
    label: "New medicine order",
    description: "Browse products, fill your cart, and check out for delivery or pickup.",
    keywords: ["new order", "buy medicines", "checkout", "cart"],
    href: "/portal/orders/new",
    icon: "Plus",
    workspace: "portal",
    groupId: "orders",
    entityType: "action",
    searchAliases: ["new order", "buy medicines", "checkout portal"],
    priority: 87,
  },
  {
    id: "portal-messages",
    label: "Messages with pharmacy",
    description: "Secure, direct messaging with your dispensing pharmacist.",
    keywords: ["messages", "chat", "pharmacist chat", "questions", "conversation"],
    href: "/portal/messages",
    icon: "MessageSquare",
    workspace: "portal",
    groupId: "messages",
    entityType: "workflow",
    searchAliases: ["messages", "chat with pharmacist", "ask question"],
    priority: 85,
  },
  {
    id: "portal-loyalty",
    label: "Loyalty points & rewards",
    description: "Check your reward point balance, active vouchers, and redemption options.",
    keywords: ["loyalty", "rewards", "points", "coupons", "discounts", "vouchers"],
    href: "/portal/loyalty",
    icon: "Sparkles",
    workspace: "portal",
    groupId: "more",
    entityType: "tool",
    searchAliases: ["loyalty", "rewards", "points", "my vouchers"],
    priority: 80,
  },
  {
    id: "portal-profile",
    label: "Personal profile",
    description: "Manage your name, phone number, allergies, and emergency contact information.",
    keywords: ["profile", "personal info", "allergies", "emergency contact", "address"],
    href: "/portal/profile",
    icon: "User",
    workspace: "portal",
    groupId: "more",
    entityType: "setting",
    searchAliases: ["profile", "my details", "allergies"],
    priority: 75,
  },
  {
    id: "portal-preferences",
    label: "Preferences & notifications",
    description: "Choose whether you prefer WhatsApp, SMS, or email reminders.",
    keywords: ["preferences", "notification settings", "sms vs whatsapp", "opt in"],
    href: "/portal/preferences",
    icon: "Settings",
    workspace: "portal",
    groupId: "more",
    entityType: "setting",
    searchAliases: ["preferences", "notification preferences", "communication settings"],
    priority: 70,
  },
  {
    id: "portal-feedback",
    label: "Feedback & reviews",
    description: "Share your pharmacy experience and review past care interactions.",
    keywords: ["feedback", "review", "ratings", "share experience"],
    href: "/portal/feedback",
    icon: "Star",
    workspace: "portal",
    groupId: "more",
    entityType: "action",
    searchAliases: ["feedback", "leave review", "rate care"],
    priority: 65,
  },
  {
    id: "portal-onboarding",
    label: "Portal onboarding",
    description: "Connect to your preferred local pharmacy and set up your profile.",
    keywords: ["onboarding", "welcome", "connect pharmacy", "start portal"],
    href: "/portal/onboarding",
    icon: "HeartPulse",
    workspace: "portal",
    groupId: "more",
    entityType: "workflow",
    searchAliases: ["portal onboarding", "welcome portal", "setup portal"],
    priority: 60,
  },

  /* ------------------------------------------------------------
     CAREGIVER DESTINATIONS
     ------------------------------------------------------------ */
  {
    id: "caregiver-home",
    label: "Caregiver dashboard",
    description: "Track medications, request refills, and verify doses across all linked patients.",
    keywords: ["caregiver", "home", "dashboard", "patients summary", "overview"],
    href: "/caregiver",
    icon: "HeartHandshake",
    workspace: "caregiver",
    groupId: "home",
    entityType: "page",
    searchAliases: ["caregiver home", "caregiver dashboard", "summary"],
    priority: 100,
    mobilePrimary: true,
  },
  {
    id: "caregiver-patients",
    label: "My patients",
    description: "View patients you care for, their active medicines, schedules, and doctors.",
    keywords: ["patients", "dependents", "family", "medication list", "john medication"],
    href: "/caregiver/patients",
    icon: "Users",
    workspace: "caregiver",
    groupId: "patients",
    entityType: "page",
    searchAliases: ["my patients", "patient list", "john medication", "dependents"],
    priority: 95,
    mobilePrimary: true,
    quickActions: [
      { id: "cg-log-dose", label: "Check Doses", href: "/caregiver#doses", icon: "CalendarCheck" },
      { id: "cg-refill", label: "Request Refill", href: "/caregiver/refills", icon: "Pill" },
    ],
  },
  {
    id: "caregiver-refills",
    label: "Refill requests",
    description: "Submit and follow refill requests on behalf of your linked patients.",
    keywords: ["refills", "patient refills", "renew prescription", "medication renewal"],
    href: "/caregiver/refills",
    icon: "Pill",
    workspace: "caregiver",
    groupId: "alerts",
    entityType: "workflow",
    searchAliases: ["caregiver refills", "patient refills", "request refill"],
    priority: 90,
    mobilePrimary: true,
    quickActions: [
      { id: "cg-new-refill", label: "+ Request Refill", href: "/caregiver/refills/new", icon: "Plus" },
    ],
  },
  {
    id: "caregiver-refills-new",
    label: "Request patient refill",
    description: "Submit a medication refill request for one of your assigned patients.",
    keywords: ["request refill", "patient refill", "new refill request", "pharmacy order"],
    href: "/caregiver/refills/new",
    icon: "Plus",
    workspace: "caregiver",
    groupId: "alerts",
    entityType: "action",
    searchAliases: ["request patient refill", "order refill caregiver", "new refill"],
    priority: 88,
  },
  {
    id: "caregiver-reminders",
    label: "Reminders & schedules",
    description: "Upcoming medication reminders and scheduled alerts for your patients.",
    keywords: ["reminders", "schedule", "timed doses", "patient calendar", "alerts"],
    href: "/caregiver/reminders",
    icon: "Clock",
    workspace: "caregiver",
    groupId: "schedule",
    entityType: "tool",
    searchAliases: ["caregiver reminders", "dose schedule", "upcoming doses"],
    priority: 85,
    mobilePrimary: true,
  },
  {
    id: "caregiver-notifications",
    label: "Pickup notifications",
    description: "Alerts when prescriptions are ready for collection at the pharmacy.",
    keywords: ["notifications", "ready for pickup", "collection", "ready"],
    href: "/caregiver/notifications",
    icon: "Bell",
    workspace: "caregiver",
    groupId: "alerts",
    entityType: "workflow",
    searchAliases: ["pickup notifications", "ready for pickup", "alerts"],
    priority: 84,
  },
  {
    id: "caregiver-adherence",
    label: "Adherence reports",
    description: "Review adherence percentage, missed doses, and compliance trends.",
    keywords: ["adherence", "compliance", "missed doses", "reports", "stats"],
    href: "/caregiver/adherence",
    icon: "Activity",
    workspace: "caregiver",
    groupId: "more",
    entityType: "report",
    searchAliases: ["adherence reports", "patient compliance", "dose history"],
    priority: 80,
  },
  {
    id: "caregiver-accept",
    label: "Accept caregiver invite",
    description: "Accept an invitation from a patient or doctor to manage care regimens.",
    keywords: ["accept invite", "invitation", "caregiver consent", "link patient"],
    href: "/caregiver/accept",
    icon: "HeartHandshake",
    workspace: "caregiver",
    groupId: "more",
    entityType: "action",
    searchAliases: ["accept invite", "caregiver invitation", "join patient care"],
    priority: 70,
  },
] as const;

/* ============================================================
   ACCESS CONTROL & PERMISSION FILTERING
   ============================================================ */

export function canAccessDestination(
  user: SessionUser | null | undefined,
  destination: NavigationDestination,
): boolean {
  if (!user) return false;

  // Platform super-admins have access across all workspaces
  if (user.platformAdmin) return true;

  // Platform paths require platformAdmin
  if (destination.workspace === "platform") {
    return Boolean(user.platformAdmin);
  }

  // Admin paths use authoritative platform admin access check with query/hash stripped
  if (destination.workspace === "admin") {
    const cleanPath = destination.href.split("?")[0].split("#")[0];
    return canAccessAdminPath(user, cleanPath);
  }

  // Portal paths require customer role or customer identity
  if (destination.workspace === "portal") {
    return Boolean(user.customerId || user.role === "customer");
  }

  // Caregiver paths require caregiver role or active caregiver linkage
  if (destination.workspace === "caregiver") {
    return Boolean(
      user.role === "caregiver" ||
      user.customerId ||
      user.memberships.length > 0
    );
  }

  return false;
}

/* ============================================================
   RETRIEVAL & QUERY HELPERS
   ============================================================ */

export function getWorkspaceGroups(role: WorkspaceRole): readonly WorkspaceGroup[] {
  return WORKSPACE_GROUPS[role] || [];
}

export function getDestinationsForRole(
  role: WorkspaceRole,
  user?: SessionUser | null,
): NavigationDestination[] {
  return WORKSPACE_DESTINATIONS.filter((dest) => {
    if (dest.workspace !== role) return false;
    if (user && !canAccessDestination(user, dest)) return false;
    return true;
  });
}

export function getDestinationsForGroup(
  role: WorkspaceRole,
  groupId: string,
  user?: SessionUser | null,
): NavigationDestination[] {
  return WORKSPACE_DESTINATIONS.filter((dest) => {
    if (dest.workspace !== role || dest.groupId !== groupId) return false;
    if (user && !canAccessDestination(user, dest)) return false;
    return true;
  });
}

export function getDestinationForPath(
  pathname: string,
  role?: WorkspaceRole,
): NavigationDestination | undefined {
  const cleanPath = (pathname || "").split("?")[0].split("#")[0];

  const matching = WORKSPACE_DESTINATIONS.filter((dest) => {
    if (role && dest.workspace !== role) return false;
    const destClean = dest.href.split("?")[0].split("#")[0];
    if (destClean === cleanPath) return true;
    return false;
  });
  if (matching.length > 0) return matching[0];

  // Prefix match (sort by longest href)
  const prefixMatching = WORKSPACE_DESTINATIONS.filter((dest) => {
    if (role && dest.workspace !== role) return false;
    const destClean = dest.href.split("?")[0].split("#")[0];
    if (
      destClean !== "/admin" &&
      destClean !== "/platform" &&
      destClean !== "/portal" &&
      destClean !== "/caregiver"
    ) {
      return cleanPath.startsWith(`${destClean}/`);
    }
    return false;
  }).sort((a, b) => b.href.length - a.href.length);

  return prefixMatching[0];
}

/* ============================================================
   CONTEXTUAL TASK SURFACES
   Dynamic actions relevant to the specific page/entity being viewed
   ============================================================ */

export type ContextualAction = {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: string;
  variant?: "primary" | "secondary" | "danger" | "subtle";
};

export function getContextualActions(
  pathname: string,
  role: WorkspaceRole,
  user?: SessionUser | null,
): ContextualAction[] {
  const actions: ContextualAction[] = [];
  const cleanPath = (pathname || "").split("?")[0].split("#")[0];

  // Medication context
  // Requirement 3: "When viewing a medication, surface appropriate nearby actions such as:
  // Update stock, Receive stock, Change price, View sales, View batches, Edit medicine"
  if (cleanPath.startsWith("/admin/medications") || cleanPath === "/admin/inventory") {
    actions.push(
      {
        id: "ctx-update-stock",
        label: "Update stock",
        description: "Receive batches, adjust physical counts or record write-offs",
        href: "/admin/inventory#adjust",
        icon: "Boxes",
        variant: "primary",
      },
      {
        id: "ctx-receive-stock",
        label: "Receive stock",
        description: "Log incoming supplier delivery invoice with FEFO batches",
        href: "/admin/inventory#receive",
        icon: "Package",
      },
      {
        id: "ctx-change-price",
        label: "Change price",
        description: "Adjust retail prices, dispensing fees, or patient discounts",
        href: "/admin/medications#pricing",
        icon: "Tag",
      },
      {
        id: "ctx-view-sales",
        label: "View sales",
        description: "Review sales velocity, margins, and movement for this medicine",
        href: "/admin/analytics/products",
        icon: "TrendingUp",
      },
      {
        id: "ctx-view-batches",
        label: "View batches",
        description: "Inspect active FEFO batch numbers and expiration dates",
        href: "/admin/inventory#batches",
        icon: "Clock",
      },
      {
        id: "ctx-edit-medicine",
        label: "Edit medicine",
        description: "Modify clinical guidelines, pack sizes, and public storefront listing",
        href: "/admin/medications#edit",
        icon: "FileEdit",
      },
      {
        id: "ctx-scan-pack",
        label: "Scan pack",
        description: "Identify item by physical barcode",
        href: "/admin/medications/scan",
        icon: "Search",
      },
      {
        id: "ctx-view-expiry",
        label: "View expiring",
        description: "Inspect batches nearing 30/60-day expiry threshold",
        href: "/admin/inventory#expiry",
        icon: "Clock",
      }
    );
  }

  // Patient / Customer context
  // Requirement 3: "When viewing a patient:
  // Prescription, Refill, Message, Adherence, Orders, Care history"
  else if (cleanPath.startsWith("/admin/customers")) {
    actions.push(
      {
        id: "ctx-new-rx",
        label: "Write prescription",
        description: "Create a verified prescription for this patient",
        href: "/admin/prescriptions/new",
        icon: "FileText",
        variant: "primary",
      },
      {
        id: "ctx-request-refill",
        label: "Submit refill",
        description: "Start refill course on patient's behalf",
        href: "/admin/refills#new",
        icon: "RefreshCw",
      },
      {
        id: "ctx-send-msg",
        label: "Send message",
        description: "Contact patient via SMS, WhatsApp or Portal",
        href: "/admin/messages",
        icon: "Send",
      },
      {
        id: "ctx-check-adherence",
        label: "Adherence history",
        description: "Check past pickup intervals and compliance trends",
        href: "/admin/adherence",
        icon: "Activity",
      },
      {
        id: "ctx-patient-orders",
        label: "Orders",
        description: "Review past purchases, receipts, and counter sales for this customer",
        href: "/admin/orders",
        icon: "ShoppingCart",
      },
      {
        id: "ctx-care-history",
        label: "Care history",
        description: "View consultations, screening results, and clinical interventions",
        href: "/admin/adherence#history",
        icon: "HeartPulse",
      }
    );
  }

  // Prescription / Clinical context
  else if (cleanPath.startsWith("/admin/prescriptions") || cleanPath.startsWith("/admin/refills")) {
    actions.push(
      {
        id: "ctx-new-rx-page",
        label: "New prescription",
        description: "Intake and review a new doctor prescription",
        href: "/admin/prescriptions/new",
        icon: "Plus",
        variant: "primary",
      },
      {
        id: "ctx-dispense-log",
        label: "Dispensing register",
        description: "Search historical dispensing records and substitutions",
        href: "/admin/dispensing",
        icon: "ClipboardCheck",
      },
      {
        id: "ctx-refill-queue",
        label: "Refill queue",
        description: "Process requests awaiting pharmacist verification",
        href: "/admin/refills",
        icon: "RefreshCw",
      }
    );
  }

  // Platform Applications context
  // Requirement 3: "When reviewing a pharmacy application:
  // Verification, Documents, Compliance, Billing, Communication, Audit trail"
  else if (cleanPath.startsWith("/platform/applications")) {
    actions.push(
      {
        id: "ctx-verify-app",
        label: "Pending applications",
        description: "Review submissions awaiting board check",
        href: "/platform/applications?status=submitted",
        icon: "ClipboardCheck",
        variant: "primary",
      },
      {
        id: "ctx-app-verification",
        label: "Verification",
        description: "Review superintendent pharmacist credentials and approval checklist",
        href: "/platform/applications?tab=verification",
        icon: "ClipboardCheck",
      },
      {
        id: "ctx-app-documents",
        label: "Documents",
        description: "Inspect uploaded premises licenses and board certifications",
        href: "/platform/applications?tab=documents",
        icon: "FileText",
      },
      {
        id: "ctx-verify-compliance",
        label: "Compliance checks",
        description: "Validate pharmacy superintendent board registration",
        href: "/platform/compliance",
        icon: "KeyRound",
      },
      {
        id: "ctx-app-billing",
        label: "Billing",
        description: "Review onboarding fee settlement and platform subscription tier",
        href: "/platform/billing",
        icon: "CreditCard",
      },
      {
        id: "ctx-app-communication",
        label: "Communication",
        description: "Send formal notice or request supplementary license documents",
        href: "/platform/notifications",
        icon: "MessageSquare",
      },
      {
        id: "ctx-audit-trail",
        label: "Audit log",
        description: "Inspect application review timestamps and staff notes",
        href: "/platform/audit",
        icon: "FileText",
      }
    );
  }

  // Customer Refills / Medications context
  else if (cleanPath.startsWith("/portal/refills") || cleanPath.startsWith("/portal/prescriptions")) {
    actions.push(
      {
        id: "ctx-portal-req-refill",
        label: "Request a refill",
        description: "Request preparation of your ongoing prescription",
        href: "/portal/refills/new",
        icon: "Plus",
        variant: "primary",
      },
      {
        id: "ctx-portal-sync-dates",
        label: "Align refill dates",
        description: "Synchronize multiple medicines for single-trip collection",
        href: "/portal/sync",
        icon: "RefreshCw",
      },
      {
        id: "ctx-portal-ask-advice",
        label: "Ask pharmacist",
        description: "Send a question regarding your medicine instructions",
        href: "/portal/messages",
        icon: "MessageSquare",
      }
    );
  }

  // Caregiver context
  else if (role === "caregiver") {
    actions.push(
      {
        id: "ctx-cg-dose",
        label: "Confirm today’s doses",
        description: "Mark morning and evening doses as taken",
        href: "/caregiver#doses",
        icon: "CalendarCheck",
        variant: "primary",
      },
      {
        id: "ctx-cg-refill",
        label: "Request patient refill",
        description: "Notify pharmacy when medicine is running low",
        href: "/caregiver/refills/new",
        icon: "Pill",
      },
      {
        id: "ctx-cg-adherence",
        label: "View adherence",
        description: "Review adherence report for doctors and family",
        href: "/caregiver/adherence",
        icon: "Activity",
      }
    );
  }

  // Filter actions based on permissions if user is provided
  if (user) {
    return actions.filter((act) => {
      if (role === "admin") {
        const pathOnly = act.href.split("#")[0].split("?")[0];
        return canAccessAdminPath(user, pathOnly);
      }
      return true;
    });
  }

  return actions;
}

/* ============================================================
   ADVANCED DETERMINISTIC & NATURAL LANGUAGE SEARCH
   ============================================================ */

export type SearchMatch = {
  destination: NavigationDestination;
  matchType: "exact" | "action" | "intent" | "keyword" | "partial";
  score: number;
  highlightAction?: QuickAction;
  intentParam?: string;
};

const INTENT_STOPWORDS = new Set([
  "new", "add", "create", "write", "my", "your", "the", "a", "an", "all",
  "active", "get", "view", "find", "check", "change", "update", "verify",
  "review", "opening", "hours", "sales", "month", "billing", "prescriptions",
  "prescription", "refill", "refills", "medication", "medications", "order", "orders"
]);

/**
 * Deterministic command parser.
 * Understands natural healthcare intents:
 * "update Panadol stock" -> Inventory / Medications with prepopulated Panadol search
 * "new prescription" -> /admin/prescriptions/new
 * "low stock" -> /admin/inventory#low
 * "verify pharmacy" -> /platform/applications
 * "billing" -> /platform/billing
 * "my refill" -> /portal/refills
 * "John medication" -> /caregiver/patients?search=John
 * "change opening hours" -> /admin/settings/location
 * "sales this month" -> /admin/analytics/sales
 */
export function searchWorkspace(
  query: string,
  role: WorkspaceRole,
  user?: SessionUser | null,
  currentPath?: string,
): SearchMatch[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  const destinations = getDestinationsForRole(role, user);
  const results: SearchMatch[] = [];

  // Special Priority Intent: "new prescription"
  if (
    normalized === "new prescription" ||
    normalized === "create prescription" ||
    normalized === "write prescription"
  ) {
    const rxNew = destinations.find((d) => d.id === "admin-prescriptions-new");
    if (rxNew) {
      results.push({
        destination: rxNew,
        matchType: "exact",
        score: 160,
      });
    }
  }

  // Intent Pattern 1: Stock Update / Check for specific medicine ("update Panadol stock", "panadol stock")
  const stockKeywords = ["stock", "inventory", "price", "lots", "batches"];
  const isStockQuery = stockKeywords.some((w) => normalized.includes(w));
  if (isStockQuery) {
    const drugTokens = normalized
      .replace(/\b(?:update|check|receive|adjust|add|find|of|for|the|current|stock|inventory|price|lots|batches)\b/gi, "")
      .trim();
    if (drugTokens.length > 1 && !INTENT_STOPWORDS.has(drugTokens)) {
      if (role === "admin") {
        const invDest = destinations.find((d) => d.id === "admin-inventory");
        if (invDest) {
          results.push({
            destination: {
              ...invDest,
              label: `Update ${drugTokens} stock`,
              description: `Jump straight to inventory with “${drugTokens}” filtered`,
              href: `/admin/inventory?search=${encodeURIComponent(drugTokens)}`,
            },
            matchType: "intent",
            score: 135,
            intentParam: drugTokens,
          });
        }
        const medDest = destinations.find((d) => d.id === "admin-medications");
        if (medDest) {
          results.push({
            destination: {
              ...medDest,
              label: `Find “${drugTokens}” in catalogue`,
              description: `Filter medicine catalogue for ${drugTokens}`,
              href: `/admin/medications?q=${encodeURIComponent(drugTokens)}`,
            },
            matchType: "intent",
            score: 125,
            intentParam: drugTokens,
          });
        }
      }
    }
  }

  // Intent Pattern 2: Patient context lookup ("John medication", "patient John")
  const patientMatch = normalized.match(
    /([a-z]+)\s+(?:medication|meds|rx|prescription|refill|doses|adherence)/i
  ) || normalized.match(/(?:patient|customer)\s+([a-z]+)/i);

  if (patientMatch && patientMatch[1] && patientMatch[1].trim().length > 1) {
    const personName = patientMatch[1].trim();
    if (!INTENT_STOPWORDS.has(personName)) {
      if (role === "admin") {
        const custDest = destinations.find((d) => d.id === "admin-customers");
        if (custDest) {
          results.push({
            destination: {
              ...custDest,
              label: `Search patient: ${personName}`,
              description: `Find ${personName}’s record, prescriptions and history`,
              href: `/admin/customers?search=${encodeURIComponent(personName)}`,
            },
            matchType: "intent",
            score: 118,
            intentParam: personName,
          });
        }
      } else if (role === "caregiver") {
        const ptDest = destinations.find((d) => d.id === "caregiver-patients");
        if (ptDest) {
          results.push({
            destination: {
              ...ptDest,
              label: `Patient: ${personName}’s medications`,
              description: `View ${personName}’s active prescriptions and dose schedule`,
              href: `/caregiver/patients?search=${encodeURIComponent(personName)}`,
            },
            matchType: "intent",
            score: 125,
            intentParam: personName,
          });
        }
      }
    }
  }

  // Standard Deterministic Matching across all destinations
  for (const dest of destinations) {
    let score = 0;
    let matchType: SearchMatch["matchType"] = "partial";
    let highlightAction: QuickAction | undefined;

    const labelLower = dest.label.toLowerCase();
    const descLower = dest.description.toLowerCase();

    // 1. Exact label match
    if (labelLower === normalized) {
      score += 100;
      matchType = "exact";
    }
    // 2. Exact alias match
    else if (dest.searchAliases?.some((a) => a.toLowerCase() === normalized)) {
      score += 95;
      matchType = "intent";
    }
    // 3. Alias contains query or query contains alias
    else if (
      dest.searchAliases?.some(
        (a) => a.toLowerCase().includes(normalized) || normalized.includes(a.toLowerCase())
      )
    ) {
      score += 85;
      matchType = "intent";
    }
    // 4. Label starts with or contains query
    else if (labelLower.startsWith(normalized)) {
      score += 75;
      matchType = "exact";
    } else if (labelLower.includes(normalized)) {
      score += 65;
      matchType = "keyword";
    }
    // 5. Keyword match
    else if (dest.keywords.some((k) => k.toLowerCase() === normalized)) {
      score += 70;
      matchType = "keyword";
    } else if (dest.keywords.some((k) => k.toLowerCase().includes(normalized))) {
      score += 55;
      matchType = "keyword";
    }
    // 6. Description match
    else if (descLower.includes(normalized)) {
      score += 40;
      matchType = "partial";
    }

    // Check quick actions
    if (dest.quickActions) {
      for (const qa of dest.quickActions) {
        const qaLower = qa.label.toLowerCase();
        if (qaLower.includes(normalized) || normalized.includes(qaLower)) {
          score += 50;
          highlightAction = qa;
          matchType = "action";
        }
      }
    }

    if (score > 0) {
      // Prioritize primary pages slightly over deep sub-pages
      score += (dest.priority || 50) / 10;
      results.push({
        destination: dest,
        matchType,
        score,
        highlightAction,
      });
    }
  }

  // General fallback intent matching:
  // If the query is an unmapped name or word (e.g. "amoxicillin", "metformin", "ciprofloxacin", "aspirin"),
  // provide instant direct lookup links to catalogue and inventory!
  if (normalized.length >= 3 && !INTENT_STOPWORDS.has(normalized)) {
    if (role === "admin") {
      const medDest = destinations.find((d) => d.id === "admin-medications");
      if (medDest && !results.some((r) => r.destination.href.includes(encodeURIComponent(normalized)))) {
        results.push({
          destination: {
            ...medDest,
            label: `Search “${query}” in medicine catalogue`,
            description: `Filter your pharmacy medications catalogue for “${query}”`,
            href: `/admin/medications?q=${encodeURIComponent(normalized)}`,
          },
          matchType: "intent",
          score: 80,
          intentParam: normalized,
        });
      }
      const invDest = destinations.find((d) => d.id === "admin-inventory");
      if (invDest && !results.some((r) => r.destination.href.startsWith("/admin/inventory?search="))) {
        results.push({
          destination: {
            ...invDest,
            label: `Check “${query}” stock & inventory`,
            description: `Search current stock levels and batch expiry for “${query}”`,
            href: `/admin/inventory?search=${encodeURIComponent(normalized)}`,
          },
          matchType: "intent",
          score: 78,
          intentParam: normalized,
        });
      }
    } else if (role === "portal") {
      const refDest = destinations.find((d) => d.id === "portal-refills");
      if (refDest && !results.some((r) => r.destination.href.includes(encodeURIComponent(normalized)))) {
        results.push({
          destination: {
            ...refDest,
            label: `Search “${query}” in medications`,
            description: `Find prescriptions and refill options for “${query}”`,
            href: `/portal/refills?search=${encodeURIComponent(normalized)}`,
          },
          matchType: "intent",
          score: 80,
          intentParam: normalized,
        });
      }
    } else if (role === "caregiver") {
      const ptDest = destinations.find((d) => d.id === "caregiver-patients");
      if (ptDest && !results.some((r) => r.destination.href.includes(encodeURIComponent(normalized)))) {
        results.push({
          destination: {
            ...ptDest,
            label: `Search “${query}” in patient records`,
            description: `Find patient regimens matching “${query}”`,
            href: `/caregiver/patients?search=${encodeURIComponent(normalized)}`,
          },
          matchType: "intent",
          score: 80,
          intentParam: normalized,
        });
      }
    }
  }

  // Sort descending by score
  results.sort((a, b) => b.score - a.score);

  // Deduplicate by href
  const seen = new Set<string>();
  const deduped: SearchMatch[] = [];
  for (const item of results) {
    if (!seen.has(item.destination.href)) {
      seen.add(item.destination.href);
      deduped.push(item);
    }
  }

  return deduped;
}

/* ============================================================
   LOADING LABELS (Destination-Oriented Status)
   No fake technical stages like "Running SQL" or fake percentage.
   ============================================================ */

export function getDestinationLoadingInfo(
  pathname: string,
  role: WorkspaceRole,
): { title: string; subtitle: string } {
  // Deep pattern checks first before base page match
  if (pathname.startsWith("/admin/medications/") && pathname !== "/admin/medications") {
    return {
      title: "Opening Medicine Record…",
      subtitle: "Loading prices, active inventory, and batch details…",
    };
  }
  if (pathname.startsWith("/admin/customers/") && pathname !== "/admin/customers") {
    return {
      title: "Opening Patient Record…",
      subtitle: "Loading prescriptions, refills, and communication history…",
    };
  }
  if (pathname.startsWith("/admin/prescriptions/") && pathname !== "/admin/prescriptions") {
    return {
      title: "Opening Prescription…",
      subtitle: "Loading script image, verification status, and medication line items…",
    };
  }
  if (pathname.startsWith("/platform/pharmacies/") && pathname !== "/platform/pharmacies") {
    return {
      title: "Opening Pharmacy Tenant…",
      subtitle: "Loading account configuration and compliance records…",
    };
  }
  if (pathname.startsWith("/platform/applications/") && pathname !== "/platform/applications") {
    return {
      title: "Opening Pharmacy Application…",
      subtitle: "Loading registration documents and verification checklist…",
    };
  }
  if (pathname.startsWith("/caregiver/patients/") && pathname !== "/caregiver/patients") {
    return {
      title: "Opening Patient Care Record…",
      subtitle: "Loading medication schedule and adherence history…",
    };
  }

  const dest = getDestinationForPath(pathname, role);
  if (dest) {
    return {
      title: `Opening ${dest.label}…`,
      subtitle: dest.description,
    };
  }

  return {
    title: "Opening workspace…",
    subtitle: "Preparing your task surface…",
  };
}
