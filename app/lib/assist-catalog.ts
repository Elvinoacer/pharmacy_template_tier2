import type { ElementType } from "react";
import {
  Activity,
  BookOpen,
  MessageCircle,
  Pill,
  ShoppingBag,
  Sparkles,
  Store,
  Syringe,
  Truck,
  Users,
  ShieldCheck,
} from "lucide-react";

/**
 * Client-safe assist catalog.
 *
 * Powers three UX surfaces:
 *  1. Smart search assist on the landing page (AI reads what the user types
 *     and SHOWS them what they need as action cards, instead of a text reply).
 *  2. Per-page quick assistance modal ("what is this page about?").
 *  3. The /api/assist intent router (server side, same catalog as ground truth).
 *
 * IMPORTANT: keep this file free of server-only imports (no "server-only",
 * no prisma) — it is bundled into client components.
 */

export type AssistAction = {
  label: string;
  href: string;
  description: string;
  primary?: boolean;
};

export type AssistIntent = {
  id: string;
  /** Short verb-first label shown on the pill, e.g. "Refill a prescription". */
  label: string;
  /** One-line explanation of what this intent means for the user. */
  blurb: string;
  icon: ElementType;
  actions: AssistAction[];
  keywords: string[];
  /** High-confidence anchors: when present they almost always decide the intent. */
  strongKeywords?: string[];
  examples: string[];
};

/**
 * All hrefs are platform-relative (e.g. "/refill"). Storefront surfaces pass
 * a `base` ("/p/{slug}") which the server route / page components prefix in.
 */
export const ASSIST_INTENTS: AssistIntent[] = [
  {
    id: "refill",
    label: "Refill a prescription",
    blurb: "Send your existing prescription to your pharmacy and track it to ready.",
    icon: Pill,
    actions: [
      {
        label: "Request a refill now",
        href: "/refill",
        description: "Takes about a minute — no account needed.",
        primary: true,
      },
      {
        label: "See how refills work",
        href: "/faq",
        description: "Steps, timing and status meanings.",
      },
    ],
    keywords: [
      "refill",
      "refills",
      "prescription",
      "repeat",
      "renew",
      "rx",
      "run out",
      "running out",
      "out of",
      "repeat script",
      "meds finished",
      "finished my",
      "top up",
      "last tablet",
    ],
    strongKeywords: ["refill", "refills", "renew prescription", "repeat prescription", "rx refill"],
    examples: ["I need to refill my blood pressure meds", "My prescription is running out"],
  },
  {
    id: "find-medicine",
    label: "Find a medicine or product",
    blurb: "Check what a medicine is for, see OTC options and live pharmacy stock.",
    icon: ShoppingBag,
    actions: [
      {
        label: "Browse OTC medicines",
        href: "/medicines",
        description: "Catalogue with prices and live stock.",
        primary: true,
      },
      {
        label: "Photo search a pack",
        href: "/medicines?photo=1",
        description: "Snap the pack — AI matches it to stock.",
      },
      {
        label: "Who stocks it near me?",
        href: "/pharmacies",
        description: "Search the directory by medicine name.",
      },
    ],
    keywords: [
      "medicine",
      "medication",
      "panadol",
      "paracetamol",
      "ibrup",
      "ibuprofen",
      "amox",
      "augmentin",
      "buy",
      "otc",
      "stock",
      "do you have",
      "have in stock",
      "price of",
      "cost of",
      "cream",
      "syrup",
      "tablets",
      "capsules",
      "antibiotic",
      "cough",
      "fever medicine",
    ],
    strongKeywords: ["do you have", "in stock", "price of", "cost of", "photo of my pack", "snap a pack"],
    examples: ["Do you have Panadol?", "paracetamol price"],
  },
  {
    id: "find-pharmacy",
    label: "Find a pharmacy",
    blurb: "Search verified pharmacies by name, area or service — with opening hours.",
    icon: Store,
    actions: [
      {
        label: "Search the pharmacy directory",
        href: "/pharmacies",
        description: "Filter by area, service, delivery and stock.",
        primary: true,
      },
      {
        label: "Ask the directory assistant",
        href: "/pharmacies",
        description: "Type naturally — “who has Panadol near Westlands?”",
      },
    ],
    keywords: [
      "pharmacy",
      "pharmacies",
      "chemist",
      "near me",
      "nearby",
      "around",
      "open now",
      "open late",
      "24 hour",
      "westlands",
      "nairobi",
      "kisumu",
      "mombasa",
      "nakuru",
      "area",
      "branch",
      "location",
      "address",
      "hours",
      "directions",
    ],
    examples: ["Pharmacy near Westlands", "Which chemists are open now?"],
  },
  {
    id: "symptom-check",
    label: "Check how you feel",
    blurb: "Describe symptoms and get a pharmacist-level triage suggestion in seconds.",
    icon: Sparkles,
    actions: [
      {
        label: "Start the AI symptom check",
        href: "/how-do-you-feel",
        description: "Guided, private, and free.",
        primary: true,
      },
      {
        label: "Self-care or see a doctor?",
        href: "/health/self-care-guide",
        description: "A quick rule-of-thumb guide.",
      },
    ],
    keywords: [
      "feel",
      "feeling",
      "symptom",
      "symptoms",
      "headache",
      "migraine",
      "fever",
      "flu",
      "cold",
      "cough",
      "sore throat",
      "stomach",
      "cramp",
      "nausea",
      "dizzy",
      "dizziness",
      "rash",
      "itch",
      "pain",
      "hurts",
      "ache",
      "sick",
      "unwell",
      "vomit",
      "diarrhoea",
      "diarrhea",
      "allergies",
      "congestion",
    ],
    strongKeywords: ["symptoms", "symptom", "how do i feel", "how do you feel"],
    examples: ["I have a headache and fever", "My child has a cough"],
  },
  {
    id: "vaccination",
    label: "Book a vaccination",
    blurb: "Reserve flu, travel and routine vaccines at a pharmacy clinic near you.",
    icon: Syringe,
    actions: [
      {
        label: "See vaccines & book",
        href: "/vaccinations",
        description: "Browse the catalogue and pick a slot.",
        primary: true,
      },
    ],
    keywords: [
      "vaccine",
      "vaccines",
      "vaccination",
      "jab",
      "flu shot",
      "flu",
      "immunisation",
      "immunization",
      "yellow fever",
      "typhoid",
      "hpv",
      "covid",
      "booster",
      "travel vaccine",
      "hepatitis",
    ],
    strongKeywords: ["vaccine", "vaccines", "vaccination", "jab", "flu shot", "immunisation", "immunization", "booster"],
    examples: ["flu shot near me", "yellow fever vaccine"],
  },
  {
    id: "delivery",
    label: "Get medicines delivered",
    blurb: "Same-day prescription and OTC delivery to your door.",
    icon: Truck,
    actions: [
      {
        label: "Request delivery",
        href: "/delivery",
        description: "Check zones, fees and timelines.",
        primary: true,
      },
      {
        label: "Track an existing order",
        href: "/order",
        description: "Follow your order status live.",
      },
    ],
    keywords: [
      "deliver",
      "delivery",
      "deliveries",
      "bring to",
      "ship",
      "home",
      "doorstep",
      "same day",
      "courier",
      "send to me",
      "bring my",
      "track my order",
      "where is my order",
      "track order",
    ],
    strongKeywords: ["deliver", "delivery", "deliveries", "doorstep", "courier", "track my order", "track order"],
    examples: ["Can you deliver to my house?", "Track my order"],
  },
  {
    id: "health-info",
    label: "Learn about a health topic",
    blurb: "Plain-language medication guides, counselling and wellness articles.",
    icon: BookOpen,
    actions: [
      {
        label: "Open the health library",
        href: "/health",
        description: "Guides reviewed by pharmacists.",
        primary: true,
      },
      {
        label: "Medication counselling",
        href: "/health/counselling",
        description: "How and when to take common medicines.",
      },
    ],
    keywords: [
      "how do i take",
      "side effect",
      "side effects",
      "safe",
      "interact",
      "interaction",
      "with food",
      "dosage",
      "dose",
      "what is",
      "information about",
      "learn",
      "guide",
      "article",
      "pregnancy",
      "breastfeeding",
      "storage",
      "expired",
    ],
    strongKeywords: ["side effect", "side effects", "how do i take", "can i take", "interaction"],
    examples: ["paracetamol side effects", "How do I take amoxicillin?"],
  },
  {
    id: "screening",
    label: "Get a health screening",
    blurb: "Walk-in blood pressure, glucose, BMI checks with pharmacist advice.",
    icon: Activity,
    actions: [
      {
        label: "See screenings & vitals",
        href: "/screenings",
        description: "What we measure and what it costs.",
        primary: true,
      },
    ],
    keywords: [
      "screening",
      "screenings",
      "blood pressure",
      "bp",
      "glucose",
      "sugar test",
      "bmi",
      "weight",
      "cholesterol",
      "check up",
      "checkup",
      "vitals",
      "test my",
      "malaria test",
    ],
    strongKeywords: ["screening", "screenings", "checkup", "check up", "vitals", "bmi check"],
    examples: ["blood pressure check", "Where can I test my sugar?"],
  },
  {
    id: "caregiver",
    label: "Care for someone else",
    blurb: "Manage refills and reminders for a parent, child or patient.",
    icon: Users,
    actions: [
      {
        label: "Open the caregiver portal",
        href: "/caregiver",
        description: "Link a family member and manage their meds.",
        primary: true,
      },
    ],
    keywords: [
      "parent",
      "mother",
      "father",
      "mum",
      "mom",
      "dad",
      "child",
      "son",
      "daughter",
      "family",
      "elderly",
      "grandmother",
      "grandfather",
      "caregiver",
      "dependant",
      "dependent",
      "patient",
      "someone else",
      "manage for",
    ],
    strongKeywords: ["for my mum", "for my mom", "for my mother", "for my dad", "for my father", "for my son", "for my daughter", "caregiver"],
    examples: ["Refill for my mum", "I manage my dad's medicines"],
  },
  {
    id: "talk-human",
    label: "Talk to a person",
    blurb: "Message or call a real pharmacist when you need a human.",
    icon: MessageCircle,
    actions: [
      {
        label: "Contact the pharmacy",
        href: "/contact",
        description: "Phone, WhatsApp, email and enquiry form.",
        primary: true,
      },
      {
        label: "Read the FAQ",
        href: "/faq",
        description: "Quick answers to common questions.",
      },
    ],
    keywords: [
      "call",
      "phone",
      "talk to",
      "speak to",
      "human",
      "person",
      "whatsapp",
      "email",
      "manager",
      "complaint",
      "complain",
      "refund",
      "escalate",
      "pharmacist",
      "help me",
    ],
    strongKeywords: ["talk to", "speak to", "talk to a pharmacist", "call the pharmacy", "talk to a human"],
    examples: ["Let me talk to a pharmacist", "I want to make a complaint"],
  },
  {
    id: "account",
    label: "Account & sign-in help",
    blurb: "Create an account, sign in, or recover your password.",
    icon: ShieldCheck,
    actions: [
      {
        label: "Sign in",
        href: "/login",
        description: "Access refills, orders and reminders.",
        primary: true,
      },
      {
        label: "Create an account",
        href: "/register",
        description: "One account for every pharmacy.",
      },
    ],
    keywords: [
      "account",
      "sign in",
      "signin",
      "log in",
      "login",
      "register",
      "password",
      "forgot",
      "reset",
      "locked out",
      "profile",
      "my portal",
    ],
    strongKeywords: ["password", "sign in", "log in", "login", "forgot password", "create account"],
    examples: ["I forgot my password", "How do I sign in?"],
  },
];

export const DEFAULT_INTENT_ID = "find-pharmacy";

export function getAssistIntent(id: string | undefined | null): AssistIntent | undefined {
  if (!id) return undefined;
  return ASSIST_INTENTS.find((i) => i.id === id);
}

/** Popular chips shown when the search bar is focused with an empty query. */
export const POPULAR_INTENT_IDS = [
  "find-pharmacy",
  "refill",
  "symptom-check",
  "find-medicine",
  "vaccination",
  "delivery",
] as const;

/* ------------------------------------------------------------------ */
/* Rules-based fallback (used when AI is unavailable)                  */
/* ------------------------------------------------------------------ */

export function matchIntentByKeywords(query: string): AssistIntent {
  const q = ` ${query.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ")} `;
  let best: { intent: AssistIntent; score: number } | null = null;

  const hit = (kw: string) => q.includes(` ${kw}`) || q.includes(`${kw} `) || q.trim() === kw;

  for (const intent of ASSIST_INTENTS) {
    let score = 0;
    for (const kw of intent.strongKeywords ?? []) {
      if (hit(kw)) score += kw.includes(" ") ? 7 : 5;
    }
    for (const kw of intent.keywords) {
      if (hit(kw)) score += kw.includes(" ") ? 3 : 2; // phrase matches are stronger
    }
    if (score > 0 && (!best || score > best.score)) best = { intent, score };
  }

  return best?.intent ?? getAssistIntent(DEFAULT_INTENT_ID)!;
}

/* ------------------------------------------------------------------ */
/* Per-page quick assistance content ("what is this page about?")      */
/* ------------------------------------------------------------------ */

export type PageAssistContent = {
  /** Route key used for logging / matching. */
  key: string;
  kicker: string;
  title: string;
  /** 2–3 sentences: what this page IS, in plain language. */
  about: string;
  /** "What you can do here" bullets — verb first, one line each. */
  highlights: string[];
  actions: AssistAction[];
  /** Suggested questions to feed the inline AI assist box. */
  suggestions: string[];
};

const P = (c: PageAssistContent) => c;

const PAGE_CONTENT: PageAssistContent[] = [
  P({
    key: "/",
    kicker: "Getting started",
    title: "Welcome to the network",
    about:
      "This is the front door to a network of verified neighbourhood pharmacies across Kenya. You can find a pharmacy, request refills, get AI health guidance, or order products for delivery — all without an account to start.",
    highlights: [
      "Search pharmacies by name, area or service",
      "Request a prescription refill in about a minute",
      "Describe how you feel for a free AI triage check",
      "Browse vaccines, screenings and health guides",
    ],
    actions: [
      { label: "Find a pharmacy", href: "/pharmacies", description: "Verified, with hours and services", primary: true },
      { label: "Request a refill", href: "/refill", description: "No account needed" },
      { label: "AI symptom check", href: "/how-do-you-feel", description: "Free and private" },
    ],
    suggestions: ["I need a pharmacy near Westlands", "How do refills work?", "Do you deliver?"],
  }),
  P({
    key: "/pharmacies",
    kicker: "Pharmacy directory",
    title: "Choose a trusted local pharmacy",
    about:
      "This page lists every verified pharmacy on the network. Search by name, area or service, or ask the directory assistant a question like “who has Panadol near Westlands?” — it only uses live public listings.",
    highlights: [
      "Search and filter pharmacies by area, service or stock",
      "Ask the assistant natural-language questions",
      "Open a pharmacy to see hours, services and its storefront",
    ],
    actions: [
      { label: "Ask the directory assistant", href: "/pharmacies", description: "AI search across live listings", primary: true },
      { label: "How verification works", href: "/about", description: "Every pharmacy is PPB-licensed" },
    ],
    suggestions: ["Who has Panadol near me?", "Pharmacies open on Sunday?"],
  }),
  P({
    key: "/medicines",
    kicker: "Medicines catalogue",
    title: "Browse OTC medicines & categories",
    about:
      "This is the over-the-counter catalogue of the selected pharmacy, with prices and live stock. Not sure of the name? Snap a photo of the pack and AI will match it for you. Educational guidance is included with every product.",
    highlights: [
      "Search or filter by category, price and stock",
      "Use photo search to identify a pack",
      "Order directly or add to an OTC order",
    ],
    actions: [
      { label: "Photo search a pack", href: "/medicines?photo=1", description: "AI matches the pack to stock", primary: true },
      { label: "Order OTC direct", href: "/order", description: "Quick checkout for household items" },
    ],
    suggestions: ["Do you have children's paracetamol?", "What is this pack in my photo?"],
  }),
  P({
    key: "/refill",
    kicker: "Refills",
    title: "Request a prescription refill",
    about:
      "Send a refill request straight to your pharmacy's team. You provide the medicine details once — the pharmacy verifies and updates you as your request moves from received, to reviewing, to ready. No phone calls needed.",
    highlights: [
      "Submit a refill in about a minute",
      "Track the status live (received → reviewing → ready)",
      "Sign in to keep your refill history in one place",
    ],
    actions: [
      { label: "Start a refill request", href: "/refill", description: "The form is right on this page", primary: true },
      { label: "Refill FAQ", href: "/faq", description: "Timing, IDs and exceptions" },
    ],
    suggestions: ["How long do refills take?", "Can I refill for my mum?"],
  }),
  P({
    key: "/order",
    kicker: "OTC orders",
    title: "Order healthcare items directly",
    about:
      "A fast checkout for over-the-counter items — no prescription needed. Add products, choose pickup or delivery, and the pharmacy confirms your order in real time.",
    highlights: [
      "Order OTC products without a prescription",
      "Choose pickup or same-day delivery",
      "Guest checkout available",
    ],
    actions: [
      { label: "Browse the catalogue", href: "/medicines", description: "Live stock and prices", primary: true },
      { label: "Delivery zones & fees", href: "/delivery", description: "Check your area" },
    ],
    suggestions: ["Can I order without an account?", "Do you deliver today?"],
  }),
  P({
    key: "/delivery",
    kicker: "Delivery",
    title: "Medicines delivered to your door",
    about:
      "Same-day delivery for prescriptions and OTC orders. Check whether your area is covered, estimated timelines and fees, then request a delivery with your order or refill.",
    highlights: [
      "Check delivery zones and fees",
      "Request delivery for refills or OTC orders",
      "Track your delivery while it's on the way",
    ],
    actions: [
      { label: "Request a delivery", href: "/delivery", description: "The form is on this page", primary: true },
      { label: "Track my order", href: "/order", description: "Live status" },
    ],
    suggestions: ["Do you deliver to my area?", "How much is delivery?"],
  }),
  P({
    key: "/vaccinations",
    kicker: "Vaccinations",
    title: "Book a vaccination",
    about:
      "Pharmacy-based clinics for flu, travel and routine vaccines. Browse the catalogue with prices, see what each vaccine protects against, and reserve a slot at your pharmacy.",
    highlights: [
      "Browse vaccines with plain-language descriptions",
      "Book a slot at a participating pharmacy",
      "Bring your ID — some vaccines need a quick screening",
    ],
    actions: [
      { label: "Browse & book", href: "/vaccinations", description: "The catalogue is on this page", primary: true },
      { label: "Talk to us first", href: "/contact", description: "Not sure which you need?" },
    ],
    suggestions: ["Which travel vaccines do I need?", "Is the flu shot available?"],
  }),
  P({
    key: "/screenings",
    kicker: "Screenings & vitals",
    title: "Walk-in health screenings",
    about:
      "Quick checks like blood pressure, blood glucose and BMI at the pharmacy counter — no appointment needed. A pharmacist explains your numbers and refers you to a doctor when results warrant it.",
    highlights: [
      "Walk in — no appointment required",
      "Get your numbers explained on the spot",
      "Clinical referral if anything needs a doctor",
    ],
    actions: [
      { label: "See what we measure", href: "/screenings", description: "Services and fees on this page", primary: true },
      { label: "Find a screening pharmacy", href: "/pharmacies", description: "Filter by screening service" },
    ],
    suggestions: ["How much is a blood pressure check?", "Do I need to fast for glucose?"],
  }),
  P({
    key: "/how-do-you-feel",
    kicker: "AI triage",
    title: "Describe how you feel",
    about:
      "A private, free AI check-in: describe your symptoms in your own words and get a pharmacist-level suggestion — self-care options, an OTC product to consider, or when to see a doctor right away. It never replaces a clinician for emergencies.",
    highlights: [
      "Describe symptoms in plain language",
      "Get self-care vs see-a-doctor guidance",
      "Escalates immediately for red-flag symptoms",
    ],
    actions: [
      { label: "Start the check-in", href: "/how-do-you-feel", description: "Free, private, about a minute", primary: true },
      { label: "Self-care guide", href: "/health/self-care-guide", description: "The rules of thumb we use" },
    ],
    suggestions: ["I have a headache and mild fever", "My child has a cough — what can I do?"],
  }),
  P({
    key: "/health",
    kicker: "Health library",
    title: "Pharmacist-reviewed health guides",
    about:
      "Plain-language articles on medicines, conditions and wellness — the same guidance a pharmacist would give you at the counter. Browse by category or search for a specific medicine or topic.",
    highlights: [
      "Read medication guides and counselling notes",
      "Learn when self-care is enough vs when to see a doctor",
      "Everything reviewed by licensed pharmacists",
    ],
    actions: [
      { label: "Browse guides", href: "/health", description: "Categories and latest articles", primary: true },
      { label: "Search everything", href: "/search", description: "Medicines, services, articles" },
    ],
    suggestions: ["How do I take paracetamol safely?", "What helps a dry cough?"],
  }),
  P({
    key: "/services",
    kicker: "Pharmacy services",
    title: "Services at the counter",
    about:
      "Everything the pharmacy offers beyond dispensing: vaccinations, screenings, wellness consults, delivery and more. Each service page explains what to bring and what it costs.",
    highlights: [
      "See all services with pricing and requirements",
      "Book directly from a service page",
      "Some services need a chosen pharmacy first",
    ],
    actions: [
      { label: "Browse services", href: "/services", description: "Listed on this page", primary: true },
      { label: "Choose a pharmacy", href: "/pharmacies", description: "Pick your local shop" },
    ],
    suggestions: ["What services do you offer?", "Do you do malaria tests?"],
  }),
  P({
    key: "/search",
    kicker: "Search",
    title: "Search everything",
    about:
      "One search across this pharmacy's medicines, services, vaccines and health articles. If nothing comes up, the smart assistant can interpret what you meant and point you to the right page.",
    highlights: [
      "Searches medicines, services, vaccines and articles",
      "Results come from the live catalogue",
      "Zero results? Ask the assistant below the search bar",
    ],
    actions: [
      { label: "Browse medicines instead", href: "/medicines", description: "Full catalogue", primary: true },
      { label: "Ask the assistant", href: "/pharmacies", description: "Natural-language directory search" },
    ],
    suggestions: ["children's fever syrup", "blood pressure check"],
  }),
  P({
    key: "/faq",
    kicker: "FAQ",
    title: "Frequently asked questions",
    about:
      "Quick answers about refills, delivery, accounts, payments and privacy. If your question isn't here, the contact page reaches a real person during opening hours.",
    highlights: [
      "Search or browse by category",
      "Answers cover the whole network",
      "Still stuck? Contact a human",
    ],
    actions: [
      { label: "Contact the pharmacy", href: "/contact", description: "Phone, WhatsApp or form", primary: true },
    ],
    suggestions: ["How long do refills take?", "What payment methods work?"],
  }),
  P({
    key: "/contact",
    kicker: "Contact",
    title: "Reach a real person",
    about:
      "Call, WhatsApp, email or send an enquiry form. A pharmacist or staff member replies during opening hours — usually within a few hours for WhatsApp.",
    highlights: [
      "Phone and WhatsApp for urgent questions",
      "Enquiry form for anything non-urgent",
      "Include your order or refill number to speed things up",
    ],
    actions: [
      { label: "Read the FAQ first", href: "/faq", description: "Most answers live here", primary: true },
    ],
    suggestions: ["What are your opening hours?", "Can I talk to a pharmacist?"],
  }),
  P({
    key: "/caregiver",
    kicker: "Caregiver",
    title: "Manage care for someone else",
    about:
      "Link a parent, child or patient to your account, then request refills and receive reminders on their behalf. Their pharmacy history stays separate and private.",
    highlights: [
      "Invite via email, or accept an invitation",
      "Refill and track on behalf of a dependant",
      "Switch between people you care for",
    ],
    actions: [
      { label: "Open the caregiver portal", href: "/caregiver", description: "Sign in to manage dependants", primary: true },
      { label: "How permissions work", href: "/faq", description: "What caregivers can and can't see" },
    ],
    suggestions: ["How do I refill for my mother?", "What can a caregiver see?"],
  }),
  P({
    key: "/preventive",
    kicker: "Preventive health",
    title: "Prevention and healthy habits",
    about:
      "Counselling, campaigns and education that keep small issues from becoming big ones — from seasonal wellness drives to one-on-one preventive advice at the counter.",
    highlights: [
      "See current health campaigns",
      "Book preventive counselling sessions",
      "Learn which screenings to schedule and when",
    ],
    actions: [
      { label: "See screenings", href: "/screenings", description: "BP, glucose, BMI walk-ins", primary: true },
      { label: "Browse the health library", href: "/health", description: "Prevention-focused guides" },
    ],
    suggestions: ["What screenings should I get?", "When is the next wellness campaign?"],
  }),
  P({
    key: "/about",
    kicker: "About",
    title: "About the network",
    about:
      "Who we are, how pharmacies are verified, and the promise behind the network: genuine medicines, licensed shops and pharmacists who know your name.",
    highlights: [
      "How pharmacy verification works",
      "The team behind the network",
      "Careers and partnership openings",
    ],
    actions: [
      { label: "Find a pharmacy", href: "/pharmacies", description: "Start where it matters", primary: true },
      { label: "Work with us", href: "/careers", description: "Open roles" },
    ],
    suggestions: ["How are pharmacies verified?", "Where are you located?"],
  }),
  P({
    key: "/careers",
    kicker: "Careers",
    title: "Join the network",
    about:
      "Open roles at pharmacies across the network — pharmacists, technicians, riders and support staff. Applications go straight to the hiring pharmacy.",
    highlights: [
      "Browse open roles by location and type",
      "Apply once — reach many pharmacies",
      "Hear back within the listed window",
    ],
    actions: [
      { label: "For pharmacies", href: "/for-pharmacies", description: "Join as a partner", primary: true },
    ],
    suggestions: ["What roles are open?", "Do riders get benefits?"],
  }),
  P({
    key: "/for-pharmacies",
    kicker: "For pharmacies",
    title: "Bring your pharmacy online",
    about:
      "Everything a pharmacy needs to go digital: storefront, refills, delivery, CRM, AI assistant and analytics — set up in days, not months.",
    highlights: [
      "Storefront + catalogue with live stock",
      "Refill pipeline, reminders and campaigns",
      "AI assistant grounded in your own knowledge base",
    ],
    actions: [
      { label: "List your pharmacy", href: "/onboard", description: "KES 500 a month after you go live", primary: true },
      { label: "See the platform console", href: "/platform", description: "Super-admin overview" },
    ],
    suggestions: ["What does onboarding involve?", "How much does it cost?"],
  }),
  P({
    key: "storefront-home",
    kicker: "Pharmacy storefront",
    title: "Your pharmacy's digital front door",
    about:
      "This is the storefront of your chosen pharmacy — its services, opening hours, catalogue and contact details. Everything you do here (refills, orders, questions) goes directly to this team.",
    highlights: [
      "Browse this pharmacy's catalogue and services",
      "Request refills and order OTC items",
      "Chat with its AI care assistant (bottom right)",
    ],
    actions: [
      { label: "Browse medicines", href: "/medicines", description: "Live stock for this pharmacy", primary: true },
      { label: "Request a refill", href: "/refill", description: "Sent to this team" },
      { label: "Contact the pharmacy", href: "/contact", description: "Call or WhatsApp" },
    ],
    suggestions: ["What are your hours?", "Do you deliver?"],
  }),
];

const FALLBACK_CONTENT: PageAssistContent = P({
  key: "generic",
  kicker: "Quick help",
  title: "What you can do here",
  about:
    "You're on the Aether pharmacy network. Find a verified pharmacy, refill a prescription, order OTC products for delivery, or get free AI health guidance — describe what you need below and we'll point you to the right page.",
  highlights: [
    "Find a pharmacy near you",
    "Request refills and order medicines",
    "Get AI health guidance for free",
  ],
  actions: [
    { label: "Find a pharmacy", href: "/pharmacies", description: "Verified, with hours", primary: true },
    { label: "Request a refill", href: "/refill", description: "No account needed" },
  ],
  suggestions: ["I need help with a refill", "Where can I get a flu shot?"],
});

/**
 * Resolve page-assist content for a pathname.
 * Understands storefront URLs (`/p/{slug}/...`) by re-matching on the
 * remainder of the path.
 */
export function getPageAssist(pathname: string): PageAssistContent {
  let path = pathname || "/";
  try {
    path = path.split("?")[0].split("#")[0];
  } catch {
    /* ignore */
  }
  if (!path.startsWith("/")) path = `/${path}`;
  // Strip trailing slash
  if (path.length > 1) path = path.replace(/\/+$/, "");

  // Storefront: /p/{slug}/... → match on the remainder
  const storeMatch = path.match(/^\/p\/[a-z0-9][a-z0-9-]{1,60}(\/.*)?$/i);
  if (storeMatch) {
    const rest = storeMatch[1] || "/";
    const restResolved = resolveByPath(rest);
    return rest === "/" ? byKey("storefront-home") : restResolved;
  }

  return resolveByPath(path);

  function resolveByPath(p: string): PageAssistContent {
    if (p === "/") return byKey("/");
    // Exact match first
    const exact = PAGE_CONTENT.find((c) => c.key === p);
    if (exact) return exact;
    // Prefix match, longest key wins (e.g. /health/counselling → /health)
    const prefixed = PAGE_CONTENT.filter(
      (c) => c.key !== "/" && p.startsWith(`${c.key}/`),
    ).sort((a, b) => b.key.length - a.key.length)[0];
    return prefixed ?? FALLBACK_CONTENT;
  }

  function byKey(key: string): PageAssistContent {
    return PAGE_CONTENT.find((c) => c.key === key) ?? FALLBACK_CONTENT;
  }
}
