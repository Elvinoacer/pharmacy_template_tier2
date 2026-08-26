/**
 * Aether storefront TEMPLATE — the shared baseline for every `/p/{slug}` room.
 *
 * Architecture ("template + overrides"):
 *
 *   Layer 0  STOREFRONT_TEMPLATE      This file. Static information available
 *                                    across all /p/* pages — the polished
 *                                    starting point every pharmacy inherits.
 *   Layer 1  Pharmacy + Settings row  Contact identity: name, tagline, about,
 *                                    phone, hours, logo, cover, delivery facts.
 *                                    Already stored on the tenant rows.
 *   Layer 2  `storefront` JSON col    Per-tenant structural overrides saved by
 *                                    the Storefront Studio (/admin/settings/
 *                                    storefront). Deep-merged over layer 0/1.
 *   Layer 3  Dedicated settings cols  brandPrimary/Accent, social, team, faq,
 *                                    insurance, certifications — legacy CMS
 *                                    columns win last so existing data keeps
 *                                    working.
 *
 * Merge rules (see mergeStorefrontContent):
 *   - Objects merge recursively; arrays and strings REPLACE wholesale.
 *   - Explicit `null` in an override restores the template value.
 *   - Anything left untouched simply falls through to the template.
 *
 * This module is imported by server components AND client components (the FAQ
 * accordion ships its default list from here), so it must stay free of
 * server-only imports.
 */

// ── Shapes ────────────────────────────────────────────────────────────────

export type TemplateQuickAction = {
  /** Functional binding — renderer decides the href from the tenant profile. */
  key: "refill" | "photo" | "feel" | "call" | "whatsapp";
  title: string;
  desc: string;
};

export type TemplateHero = {
  kickerBadge: string | null;
  headlineStart: string;
  /** Word rendered with the animated gradient + hand-drawn underline. */
  highlight: string;
  headlineEnd: string;
  /** Italic second line under the headline. */
  subline: string;
  /** Paragraph under the headline. `{description}` resolves to the tenant's own description/tagline. */
  description: string;
  secondaryLineLabel: string;
};

export type TemplateWhyChooseUs = {
  eyebrow: string | null;
  title: string;
  /**
   * The literal token `__DELIVERY__` is replaced at render time with the
   * tenant's live delivery promise (radius-aware). Remove it to opt out.
   */
  bullets: string[];
  imageUrl: string;
};

export type TemplateValue = { title: string; description: string };

export type TemplateTeamMember = {
  id: string;
  name: string;
  role: string;
  bio: string;
  qualifications: string;
  photo: string;
};

export type TemplateGalleryItem = { src: string; alt: string; caption: string };

export type TemplateFaqItem = { category: string; question: string; answer: string };

export type TemplateJob = {
  id: string;
  title: string;
  type: string;
  location: string;
  posted: string;
  summary: string;
  requirements: string[];
};

export type TemplateCtaLink = { label: string; href: string };

export type TemplateCtaBanner = {
  eyebrow: string;
  title: string;
  description: string;
  primary: TemplateCtaLink;
  secondary: TemplateCtaLink;
};

export type TemplateSections = {
  services: boolean;
  whyChooseUs: boolean;
  gallery: boolean;
  healthTips: boolean;
  testimonials: boolean;
  insuranceStrip: boolean;
};

export type TemplateSocial = {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
};

export type StorefrontTheme = {
  /** Hex colour tints accents across the glass surface (null = network teal). */
  brandPrimary: string | null;
  brandAccent: string | null;
};

export type StorefrontTemplate = {
  version: 1;
  hero: TemplateHero;
  quickActions: TemplateQuickAction[];
  sections: TemplateSections;
  whyChooseUs: TemplateWhyChooseUs;
  /** People at the counter — shown on the storefront + about page. */
  team: TemplateTeamMember[];
  /** “Inside the pharmacy” photo wall (storefront home + about page). */
  gallery: TemplateGalleryItem[];
  about: {
    storyHeading: string;
    closingNote: string;
    values: TemplateValue[];
    showTeam: boolean;
    showGallery: boolean;
  };
  faq: Array<{ category: string; question: string; answer: string }>;
  deliverySteps: string[];
  careers: {
    heading: string;
    description: string;
    jobs: TemplateJob[];
  };
  healthLibrary: {
    eyebrow: string;
    title: string;
  };
  ctaBanner: TemplateCtaBanner;
  social: TemplateSocial;
  insurance: string[];
  certifications: string[];
};

// ── The template itself ───────────────────────────────────────────────────

const R2 = "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev";

export const STOREFRONT_TEMPLATE: StorefrontTemplate = {
  version: 1,

  team: [
    {
      id: "priya-nair",
      name: "Dr. Priya Nair, PharmD",
      role: "Lead Pharmacist & Owner",
      bio: "Priya founded Aether with a simple belief: every patient deserves clear answers and careful attention. She specialises in chronic disease management and medication therapy review.",
      qualifications: "PharmD, University of Nairobi · 18 years experience",
      photo: `${R2}/images/team/priya-nair.webp`,
    },
    {
      id: "marcus-chen",
      name: "Marcus Chen, RPh",
      role: "Clinical Pharmacist",
      bio: "Marcus leads our vaccination and health screening programmes. Patients know him for patient explanations and a calm presence at the counter.",
      qualifications: "RPh · Immunization & MTM certified",
      photo: `${R2}/images/team/marcus-chen.webp`,
    },
    {
      id: "sofia-alvarez",
      name: "Sofia Alvarez, CPhT",
      role: "Senior Pharmacy Technician",
      bio: "Sofia keeps refills flowing smoothly and is the friendly first face many customers meet. She coordinates delivery logistics and insurance queries.",
      qualifications: "Certified Pharmacy Technician · 9 years experience",
      photo: `${R2}/images/team/sofia-alvarez.webp`,
    },
    {
      id: "james-okonkwo",
      name: "James Okonkwo",
      role: "Patient Care Coordinator",
      bio: "James helps patients navigate insurance, schedule consultations, and set up convenient pickup or delivery options.",
      qualifications: "Healthcare administration · Bilingual EN/ES",
      photo: `${R2}/images/team/david-kim.webp`,
    },
  ],

  gallery: [
    {
      src: `${R2}/images/gallery/welcoming_retail_floor.webp`,
      alt: "Bright pharmacy interior with organised shelves",
      caption: "Welcoming retail floor",
    },
    {
      src: `${R2}/images/gallery/careful_dispensing.webp`,
      alt: "Pharmacist reviewing medication bottles",
      caption: "Careful dispensing",
    },
    {
      src: `${R2}/images/services/medication-counselling.webp`,
      alt: "Consultation between pharmacist and patient",
      caption: "Private counselling",
    },
    {
      src: `${R2}/images/gallery/modern_care_tools.webp`,
      alt: "Healthcare professional with digital tablet",
      caption: "Modern care tools",
    },
    {
      src: `${R2}/images/gallery/curated_wellness_aisle.webp`,
      alt: "Wellness and vitamin products on display",
      caption: "Curated wellness aisle",
    },
    {
      src: `${R2}/images/services/home-care-support.webp`,
      alt: "Calm modern clinic waiting area",
      caption: "Comfortable waiting area",
    },
  ],

  hero: {
    kickerBadge: null, // null → live "Open today · …" badge derived from real hours
    headlineStart: "Care you can",
    highlight: "trust",
    headlineEnd: ",",
    subline: "right in your neighbourhood.",
    description: "{description} Visit us for prescriptions, vaccinations, health checks, and friendly pharmacist advice.",
    secondaryLineLabel: "Your neighbourhood pharmacy",
  },

  quickActions: [
    { key: "refill", title: "Request a refill", desc: "Submit online in under a minute" },
    { key: "photo", title: "Snap a medicine pack", desc: "Photo search against live stock" },
    { key: "feel", title: "How do you feel?", desc: "Describe symptoms, get guidance" },
    { key: "call", title: "Call the pharmacy", desc: "{phone}" },
    { key: "whatsapp", title: "WhatsApp us", desc: "Message the care team" },
  ],

  sections: {
    services: true,
    whyChooseUs: true,
    gallery: true,
    healthTips: true,
    testimonials: true,
    insuranceStrip: true,
  },

  whyChooseUs: {
    eyebrow: "Why {name}",
    title: "A pharmacy that still knows your name",
    bullets: [
      "Licensed pharmacists on every shift",
      "__DELIVERY__",
      "Private counselling space",
      "Vaccinations and health screenings on site",
    ],
    imageUrl: `${R2}/images/gallery/modern_care_tools.webp`,
  },

  about: {
    storyHeading: "A neighbourhood pharmacy on the Aether network",
    closingNote:
      "We are an independent shop — not a chain white-label. Aether gives patients a way to find us. The care is ours.",
    values: [
      {
        title: "Patient First",
        description: "Every decision starts with what is safest and clearest for the person in front of us.",
      },
      {
        title: "Accuracy",
        description: "We double-check because trust is built one correct label, dose, and conversation at a time.",
      },
      {
        title: "Accessibility",
        description: "Care should be easy to reach — by phone, WhatsApp, walk-in, or delivery to your door.",
      },
      {
        title: "Community",
        description: "We are neighbours first. Local health education and fair pricing keep our community well.",
      },
    ],
    showTeam: true,
    showGallery: true,
  },

  faq: [
    {
      category: "Hours & Location",
      question: "What are your opening hours?",
      answer:
        "We are open Monday–Friday 8:00 AM–8:00 PM, Saturday 9:00 AM–6:00 PM, and Sunday 10:00 AM–4:00 PM. Holiday hours are posted on our homepage and social channels.",
    },
    {
      category: "Hours & Location",
      question: "Where are you located and is parking available?",
      answer:
        "We are at Kenyatta Avenue, Nairobi 00100. Free customer parking is available in the lot directly behind the store, with two accessible spaces near the entrance.",
    },
    {
      category: "Prescriptions",
      question: "How do prescription refills work?",
      answer:
        "Request a refill online, by phone, or in person. If refills remain on your prescription, we will prepare it. If not, we can contact your prescriber for authorisation. You will be notified when it is ready for pickup or delivery.",
    },
    {
      category: "Prescriptions",
      question: "Can someone collect medicine for me?",
      answer:
        "Yes. A family member or caregiver can collect your prescription if they bring a valid photo ID and know your full name and date of birth. For controlled substances, additional verification may apply.",
    },
    {
      category: "Prescriptions",
      question: "Can I transfer my prescriptions from another pharmacy?",
      answer:
        "Absolutely. Provide us with your previous pharmacy details and medication list. We handle the transfer process and will call you when everything is ready.",
    },
    {
      category: "Prescriptions",
      question: "How long does it take to fill a new prescription?",
      answer:
        "Most new prescriptions are ready within 30–45 minutes. Complex therapies, prior authorisations, or high volume times may take longer — we will keep you informed.",
    },
    {
      category: "Delivery",
      question: "Do you deliver?",
      answer:
        "Yes. We deliver across greater Nairobi within our service zones. Same-day options are available on select routes. Submit a delivery enquiry or call us to confirm your area.",
    },
    {
      category: "Delivery",
      question: "Is there a delivery fee?",
      answer:
        "Standard delivery is free for orders over $30. A small fee may apply for smaller orders or remote zones. Ask our team for current rates.",
    },
    {
      category: "Insurance",
      question: "Do you accept insurance?",
      answer:
        "We accept most major Kenyan medical covers including SHA/NHIF, AAR, Jubilee, Britam, CIC, Madison, and Resolution. Bring your card and we will verify coverage.",
    },
    {
      category: "Insurance",
      question: "What if my insurance does not cover a medication?",
      answer:
        "We will explain your options: manufacturer coupons, generic alternatives, discount programmes, or working with your prescriber on covered alternatives.",
    },
    {
      category: "Services",
      question: "Do you offer vaccinations?",
      answer:
        "Yes, where locally authorised. We administer adult, seasonal, and selected travel vaccines (flu, COVID-19, hepatitis B, Tdap, pneumococcal, typhoid, hepatitis A, meningococcal, oral cholera) after a screening questionnaire, vaccine information, and signed consent. Childhood KEPI vaccines remain at public immunisation clinics — we provide schedules, catch-up counselling, and referral. Book at /vaccinations or walk in. Digital lot-traced certificates appear in your patient portal.",
    },
    {
      category: "Services",
      question: "How do I prepare for a pharmacy vaccine?",
      answer:
        "Bring photo ID and any previous immunisation records. Wear a short sleeve. Tell us about allergies, pregnancy, immune conditions, and recent illness. You will stay for 15 minutes of observation (30 minutes if you have a significant allergy history).",
    },
    {
      category: "Services",
      question: "Do you provide preventive-health counselling and campaigns?",
      answer:
        "Yes. Pharmacists offer preventive counselling (travel health, smoking cessation, heart-risk, diabetes prevention, malaria, immunisation education) and run public-health campaigns such as flu season and outbreak response. Book via the Preventive health page.",
    },
    {
      category: "Services",
      question: "Can I get my blood pressure checked without an appointment?",
      answer: "Yes — blood pressure checks are free and available as walk-ins during open hours.",
    },
    {
      category: "Services",
      question: "Do you provide medication counselling in private?",
      answer:
        "Yes. We have a private consultation area. Ask at the counter anytime, or book a longer medication therapy review in advance.",
    },
    {
      category: "General",
      question: "Do you stock over-the-counter medicines and first aid?",
      answer:
        "Yes. We carry a curated range of OTC medicines, vitamins, baby care, skin care, and first aid. Pharmacists are happy to help you choose safely.",
    },
    {
      category: "General",
      question: "How can I contact you quickly?",
      answer:
        "Call us, message us on WhatsApp, email the team, or use the contact form. For medical emergencies in Kenya, call 999 or 112.",
    },
    {
      category: "General",
      question: "Is my personal health information kept private?",
      answer:
        "Yes. We follow the Kenya Data Protection Act (2019) and only share information as needed for care, payment, or as required by law. See our Privacy Policy for full details.",
    },
  ],

  deliverySteps: [
    "Confirm your address is in a delivery zone via the form or phone.",
    "Request a refill or have a prescription ready at the pharmacy.",
    "We prepare your order and schedule a delivery window.",
    "Receive WhatsApp or phone updates; signature available on request.",
  ],

  careers: {
    heading: "Build a career in community pharmacy",
    description:
      "We are looking for people who care about accuracy, kindness, and local health. Browse open roles or send a general application.",
    jobs: [
      {
        id: "pharmacist-ft",
        title: "Staff Pharmacist (Full-time)",
        type: "Full-time",
        location: "Nairobi · On-site",
        posted: "2026-03-01",
        summary:
          "Dispense prescriptions, counsel patients, and support clinical services including immunisations and MTM.",
        requirements: [
          "Active PPB pharmacist licence in good standing",
          "PharmD or BS Pharmacy",
          "Immunization certification preferred",
          "Strong communication and accuracy under pressure",
        ],
      },
      {
        id: "technician-pt",
        title: "Pharmacy Technician (Part-time)",
        type: "Part-time",
        location: "Nairobi · On-site",
        posted: "2026-02-18",
        summary:
          "Support dispensing workflow, inventory, and customer service during weekday afternoons and Saturdays.",
        requirements: [
          "CPhT certification or willingness to obtain",
          "Retail or healthcare experience a plus",
          "Reliable, detail-oriented, team-minded",
          "Comfortable with computer systems",
        ],
      },
      {
        id: "intern-summer",
        title: "Pharmacy Intern (Summer)",
        type: "Internship",
        location: "Nairobi · On-site",
        posted: "2026-02-05",
        summary:
          "Hands-on internship for pharmacy students seeking community practice experience under pharmacist supervision.",
        requirements: [
          "Enrolled in a recognised pharmacy programme",
          "Eligible for PPB intern registration",
          "Curious, professional, patient-first attitude",
          "Availability June–August",
        ],
      },
      {
        id: "graduate-rotational",
        title: "Graduate Pharmacist — Rotational Programme",
        type: "Graduate",
        location: "Nairobi · On-site",
        posted: "2026-01-20",
        summary:
          "Structured 12-month programme rotating through dispensing, clinical services, and operations mentorship.",
        requirements: [
          "Recent PharmD graduate or pending licensure",
          "Passion for community pharmacy",
          "Leadership potential and learning mindset",
          "Authorisation to work in Kenya",
        ],
      },
    ],
  },

  healthLibrary: {
    eyebrow: "Aether health library",
    title: "Practical advice from licensed pharmacists",
  },

  ctaBanner: {
    eyebrow: "Get in touch",
    title: "Ready to visit or need a refill?",
    description: "Call us, message on WhatsApp, or use a quick online form — we are here to help.",
    primary: { label: "Contact us", href: "/contact" },
    secondary: { label: "Request a refill", href: "/refill" },
  },

  social: {
    facebook: "https://facebook.com",
    instagram: "https://instagram.com",
    linkedin: "https://linkedin.com",
  },

  insurance: [
    "SHA / NHIF",
    "AAR Insurance",
    "Jubilee Health",
    "Britam",
    "CIC Insurance",
    "Madison Health",
    "Resolution Health",
    "Most major Kenyan medical covers",
  ],

  certifications: [
    "PPB licensed premises",
    "Immunisation certified",
    "Data Protection Act 2019",
    "Good Pharmacy Practice",
  ],
};

/** Deep clone helper usable on both server and client. */
export function cloneStorefrontTemplate(): StorefrontTemplate {
  return JSON.parse(JSON.stringify(STOREFRONT_TEMPLATE)) as StorefrontTemplate;
}

/** Token swapped at render time for the tenant's live delivery promise. */
export const DELIVERY_BULLET_TOKEN = "__DELIVERY__";

/**
 * Resolve `{token}` placeholders against tenant basics.
 * Supported: {name}, {phone}, {city}, {description}.
 */
export function interpolateTokens(
  input: string,
  ctx: { name?: string; phone?: string; city?: string; description?: string },
): string {
  return input.replace(/\{(name|phone|city|description)\}/g, (_m, key: string) => {
    switch (key) {
      case "name":
        return ctx.name || "our pharmacy";
      case "phone":
        return ctx.phone || "our front desk";
      case "city":
        return ctx.city || "your neighbourhood";
      case "description":
        return ctx.description || "";
      default:
        return "";
    }
  });
}
