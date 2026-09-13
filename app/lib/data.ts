import { searchVaccines } from "./vaccination-catalog";

/**
 * Platform identity (the Aether network) vs demo-tenant seed copy.
 * Public chrome on `/` uses `platform`. Per-pharmacy storefronts use
 * `getResolvedPharmacy()` — never this static shop as a silent fallback
 * when no tenant is selected.
 */

export const platform = {
  name: "Aether",
  legalName: "Aether Pharmacy Network",
  tagline: "The pharmacy network for Kenya",
  promise: "We promise life, and we promise caring.",
  description:
    "One patient account. Every neighbourhood pharmacy. Prescriptions, refills, vaccinations, and a pharmacist who still knows your name — from a licensed shop close to home.",
  email: "support@gtss.software",
  phone: "+254790670542",
  phoneHref: "tel:+254790670542",
  whatsapp: "+254790670542",
  whatsappHref: "https://wa.me/254790670542",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://pharmacy-template-tier2.vercel.app",
  country: "Kenya",
  regulator: "Pharmacy and Poisons Board",
  emergency: "999",
  emergencyAlt: "112",
  social: {
    facebook: "https://facebook.com",
    instagram: "https://instagram.com",
    linkedin: "https://linkedin.com",
  },
};

/**
 * Legacy storefront presentation copy. Operational pharmacy identity must never
 * use this object; it is retained only while old non-operational UI components
 * are migrated to tenant-aware brand/context data.
 */
export const pharmacy = {
  name: "Aether Pharmacy",
  tagline: "Your neighbourhood pharmacy, built on trust",
  description:
    "Aether Pharmacy has served families across the community for over 15 years with expert dispensing, personalised counselling, and convenient care services.",
  email: "support@gtss.software",
  phone: "+254790670542",
  phoneHref: "tel:+254790670542",
  whatsapp: "+254790670542",
  whatsappHref: "https://wa.me/254790670542",
  address: {
    street: "Kenyatta Avenue",
    city: "Nairobi",
    state: "Nairobi",
    zip: "00100",
    full: "Kenyatta Avenue, Nairobi 00100",
  },
  mapsEmbed:
    "https://www.google.com/maps?q=-1.286389,36.817223&z=16&output=embed",
  mapsDirections: "https://www.google.com/maps/dir/?api=1&destination=Kenyatta+Avenue,+Nairobi",
  social: {
    facebook: "https://facebook.com",
    instagram: "https://instagram.com",
    linkedin: "https://linkedin.com",
  },
  hours: [
    { day: "Monday – Friday", time: "8:00 AM – 8:00 PM" },
    { day: "Saturday", time: "9:00 AM – 6:00 PM" },
    { day: "Sunday", time: "10:00 AM – 4:00 PM" },
  ],
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
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://pharmacy-template-tier2.vercel.app",
};

export const team = [
  {
    id: "priya-nair",
    name: "Dr. Priya Nair, PharmD",
    role: "Lead Pharmacist & Owner",
    bio: "Priya founded Aether with a simple belief: every patient deserves clear answers and careful attention. She specialises in chronic disease management and medication therapy review.",
    qualifications: "PharmD, University of Nairobi · 18 years experience",
    photo: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/team/priya-nair.webp",
  },
  {
    id: "marcus-chen",
    name: "Marcus Chen, RPh",
    role: "Clinical Pharmacist",
    bio: "Marcus leads our vaccination and health screening programmes. Patients know him for patient explanations and a calm presence at the counter.",
    qualifications: "RPh · Immunization & MTM certified",
    photo: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/team/marcus-chen.webp",
  },
  {
    id: "sofia-alvarez",
    name: "Sofia Alvarez, CPhT",
    role: "Senior Pharmacy Technician",
    bio: "Sofia keeps refills flowing smoothly and is the friendly first face many customers meet. She coordinates delivery logistics and insurance queries.",
    qualifications: "Certified Pharmacy Technician · 9 years experience",
    photo: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/team/sofia-alvarez.webp",
  },
  {
    id: "james-okonkwo",
    name: "James Okonkwo",
    role: "Patient Care Coordinator",
    bio: "James helps patients navigate insurance, schedule consultations, and set up convenient pickup or delivery options.",
    qualifications: "Healthcare administration · Bilingual EN/ES",
    photo: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/team/david-kim.webp",
  },
];

// Service records intentionally do not live in this static module. Public and
// tenant service discovery must use PharmacyService rows through
// listNetworkServiceListings/listPublicServices.

export const categories = [
  {
    slug: "pain-relief",
    title: "Pain Relief",
    description:
      "Over-the-counter options for headaches, muscle aches, joint pain, and everyday discomfort — with pharmacist guidance on safe use.",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/pain-relief.webp",
    brands: ["Advil", "Tylenol", "Aleve", "Aspercreme"],
    tips: [
      "Do not combine multiple products containing acetaminophen.",
      "Ask us before using NSAIDs if you have stomach, kidney, or heart concerns.",
      "Topical options can help localised muscle or joint pain.",
    ],
  },
  {
    slug: "vitamins-supplements",
    title: "Vitamins & Supplements",
    description:
      "Evidence-minded vitamins, minerals, and wellness supplements. We help you choose what is useful — and skip what is not.",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/vitamins-supplements.webp",
    brands: ["Nature Made", "Centrum", "Garden of Life", "Nordic Naturals"],
    tips: [
      "More is not always better — megadoses can be harmful.",
      "Tell us about all supplements; some interact with prescriptions.",
      "Look for USP or third-party tested products when possible.",
    ],
  },
  {
    slug: "baby-care",
    title: "Baby Care",
    description:
      "Gentle essentials for little ones: fever reducers, diaper care, feeding accessories, and pharmacist advice parents can trust.",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/baby-care.webp",
    brands: ["Pampers", "Johnson's", "Pedialyte", "Aveeno Baby"],
    tips: [
      "Always use weight-based dosing for children's medicines.",
      "Never give aspirin to children or teens with viral illness.",
      "Ask us about fever thresholds that warrant a doctor visit.",
    ],
  },
  {
    slug: "first-aid",
    title: "First Aid",
    description:
      "Bandages, antiseptics, wound care, and emergency basics so you are prepared at home, work, or on the go.",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/first-aid.webp",
    brands: ["Band-Aid", "Neosporin", "3M Nexcare", "Hydrogen Peroxide"],
    tips: [
      "Clean wounds gently; seek care for deep or dirty cuts.",
      "Keep a basic kit in the car and at home.",
      "Check expiry dates on antiseptics and ointments yearly.",
    ],
  },
  {
    slug: "skin-care",
    title: "Skin Care",
    description:
      "Dermatologist-friendly moisturisers, sunscreens, acne care, and treatments for eczema, rashes, and everyday skin concerns.",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/skin-care.webp",
    brands: ["CeraVe", "La Roche-Posay", "Cetaphil", "Neutrogena"],
    tips: [
      "Fragrance-free often means fewer irritations.",
      "Daily SPF is one of the best long-term skin investments.",
      "Persistent rashes deserve a professional look — we can advise.",
    ],
  },
  {
    slug: "diabetes-care",
    title: "Diabetes Care",
    description:
      "Meters, strips, lancets, glucose tablets, and supportive OTC products for everyday diabetes self-management.",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/articles/diabetes-everyday-tips.webp",
    brands: ["OneTouch", "Contour", "FreeStyle", "Dex4"],
    tips: [
      "Match strips to your exact meter model.",
      "Store test strips in a cool, dry place.",
      "Ask about insurance coverage for supplies.",
    ],
  },
  {
    slug: "womens-health",
    title: "Women's Health",
    description:
      "Reproductive health, prenatal vitamins, menopause support, and everyday wellness products selected with care.",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/womens-health.webp",
    brands: ["Always", "Summer's Eve", "Pregnacare", "Clearblue"],
    tips: [
      "Prenatal vitamins ideally start before conception when possible.",
      "Discuss hormone-related products with your pharmacist or clinician.",
      "We stock discreet options and private counselling space.",
    ],
  },
  {
    slug: "cold-flu",
    title: "Cold & Flu",
    description:
      "Symptom relief for coughs, congestion, sore throats, and seasonal illness — plus guidance on what actually helps.",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/cold-flu.webp",
    brands: ["Mucinex", "DayQuil", "Robitussin", "Halls", "Benylin", "Otrivin"],
    tips: [
      "Multi-symptom products can duplicate ingredients — check labels.",
      "Hydration and rest still matter more than most OTC combos.",
      "High fever, shortness of breath, or lasting symptoms need clinical care.",
    ],
  },
  {
    slug: "allergy-treatments",
    title: "Allergy Treatments",
    description:
      "Antihistamines, steroid nasal sprays, and eye drops for seasonal hay fever, pet dander, and allergic skin reactions.",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/articles/seasonal-allergy-guide.webp",
    brands: ["Zyrtec", "Clarityn", "Telfast", "Flixonase", "Optrex"],
    tips: [
      "Second-generation antihistamines provide 24-hour relief with minimal drowsiness.",
      "Steroid nasal sprays work best when used daily across allergy season.",
      "Seek emergency care for facial swelling or throat tightness.",
    ],
  },
  {
    slug: "digestive-health",
    title: "Digestive Health",
    description:
      "Antacids, acid reducers, rehydration salts, anti-diarrheals, laxatives, and daily probiotics for digestive balance.",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/services/medication-counselling.webp",
    brands: ["Gaviscon", "Imodium", "Dioralyte", "Dulcolax", "Bio-Kult"],
    tips: [
      "Oral rehydration salts are the first priority for acute fluid loss.",
      "Short-course acid reducers take 1–4 days for full 24-hour symptom control.",
      "Black tarry stools or difficulty swallowing require immediate doctor evaluation.",
    ],
  },
  {
    slug: "topical-treatments",
    title: "Topical Treatments",
    description:
      "Hydrocortisone anti-itch creams, antifungal treatments, calming lotions, and hemorrhoidal soothing care.",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/skin-care.webp",
    brands: ["Canesten", "Neosporin", "Anusol", "Cortizone", "Calamine"],
    tips: [
      "Apply hydrocortisone thinly for a maximum of 7 consecutive days.",
      "Continue antifungal creams for 1–2 weeks after symptoms disappear to prevent recurrence.",
      "Never apply steroid creams to open wounds or active viral infections.",
    ],
  },
  {
    slug: "antiseptics",
    title: "Antiseptics",
    description:
      "Povidone-iodine solutions, chlorhexidine washes, hydrogen peroxide, and sterile alcohol skin preparation wipes.",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/careful_dispensing.webp",
    brands: ["Betadine", "Dettol", "Savlon", "Hibiclens"],
    tips: [
      "Povidone-iodine provides broad antimicrobial protection without skin stinging.",
      "Allow antiseptic liquids to air dry completely on skin before dressing.",
      "Deep puncture wounds or dirty animal bites need doctor evaluation and tetanus review.",
    ],
  },
  {
    slug: "wound-care",
    title: "Wound Care",
    description:
      "Hydrocolloid dressings, sterile non-stick pads, wound irrigation saline, and medical silicone scar reduction gels.",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/first-aid.webp",
    brands: ["DuoDERM", "Melolin", "Kelo-Cote", "Steri-Strip"],
    tips: [
      "Moist wound healing under hydrocolloid dressings speeds healing and reduces scarring.",
      "Irrigate with sterile saline rather than harsh scrubbing.",
      "Seek care if wound edges gape or redness spreads outward.",
    ],
  },
  {
    slug: "oral-care",
    title: "Oral Care",
    description:
      "Chlorhexidine mouthwashes, mouth ulcer soothing gels, fast-acting toothache analgesics, and dry mouth hydrating rinses.",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/welcoming_retail_floor.webp",
    brands: ["Corsodyl", "Bonjela", "Orajel", "Biotène", "Sensodyne"],
    tips: [
      "Use chlorhexidine mouthwash 30 minutes after brushing to avoid toothpaste interference.",
      "Apply protective ulcer gels before meals to shield exposed nerve endings.",
      "Any mouth ulcer lasting more than 3 weeks must be examined by a dentist or clinician.",
    ],
  },
  {
    slug: "feminine-hygiene",
    title: "Feminine Hygiene",
    description:
      "pH-balanced intimate washes, organic sanitary protection, single-dose thrush treatments, and period pain heat patches.",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/womens-health.webp",
    brands: ["Always", "Tampax", "Femfresh", "Canesten", "Cura-Heat"],
    tips: [
      "Vaginal pessaries should be inserted at bedtime for optimal retention.",
      "Only use gentle cleansers externally; the internal vaginal canal is self-cleansing.",
      "Abnormal bleeding or fishy discharge warrants clinical consultation.",
    ],
  },
  {
    slug: "medical-consumables",
    title: "Medical Consumables",
    description:
      "Digital clinical thermometers, fingertip pulse oximeters, blood pressure monitors, glucose strips, and sterile gloves.",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/modern_care_tools.webp",
    brands: ["Omron", "OneTouch", "Accu-Chek", "Contec", "3M"],
    tips: [
      "Rest 5 minutes quietly before taking resting blood pressure readings.",
      "Store glucose strips tightly capped in their original container away from moisture.",
      "SpO2 under 92% or blood pressure >= 180/120 are critical clinical warning signs.",
    ],
  },
  {
    slug: "nutritional-products",
    title: "Nutritional Products",
    description:
      "Daily complete multivitamins, effervescent vitamin C + zinc, oral electrolyte hydration, gentle iron, and meal shakes.",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/vitamins-supplements.webp",
    brands: ["Wellman", "Wellwoman", "Berocca", "Hydralyte", "Feroglobin", "Ensure"],
    tips: [
      "Take iron supplements with vitamin C for enhanced absorption; avoid dairy or tea within 2 hours.",
      "Do not exceed upper limits for fat-soluble vitamins (A, D, E, K).",
      "Always disclose supplements to your pharmacist to check for prescription drug interactions.",
    ],
  },
];

export const articles = [
  {
    slug: "when-is-self-care-appropriate",
    title: "When is a Condition Appropriate for Self-Care? (And When to See a Doctor)",
    excerpt:
      "A pharmacist's comprehensive guide to distinguishing mild self-treatable symptoms from red-flag warning signs that require clinical evaluation.",
    category: "Self-Care & Triage",
    readTime: "7 min",
    date: "2026-03-18",
    author: "Dr. Priya Nair, PharmD",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/articles/seasonal-allergy-guide.webp",
    content: [
      "Over-the-counter (OTC) medicines empower individuals and families to safely manage everyday health complaints — from headaches and seasonal allergies to minor cuts and heartburn.",
      "However, responsible self-care requires knowing when a symptom is safe for home management and when it demands prompt medical attention.",
      "General Rule 1: Mild, transient symptoms with an identifiable cause (e.g. tension headache after a long screen day, mild nasal congestion from a viral cold) are ideal candidates for OTC self-care.",
      "General Rule 2: Respect the time limit. OTC remedies are formulated for short-term relief (typically 3 to 7 days). If your symptoms fail to improve or worsen after this window, you must pause self-care and consult a pharmacist or physician.",
      "Red Flags: Never attempt self-care if you experience 'red flag' symptoms — including sudden unbearable pain ('thunderclap' headache), chest pressure or pain radiating to the jaw/arm, shortness of breath, blood in vomit or stool, sudden confusion or weakness, or any fever in an infant under 3 months.",
      "Watch for active ingredient duplication: Multi-symptom cold sachets, sleep aids, and pain tablets often contain paracetamol. Taking them together can lead to dangerous accidental liver toxicity.",
      "Check our interactive Self-Care vs Medical Attention Guide or ask our pharmacists in store or online anytime you are unsure.",
    ],
  },
  {
    slug: "medication-safety-at-home",
    title: "Medication Safety at Home: 8 Habits That Protect Your Family",
    excerpt:
      "From child-proof storage to never sharing prescriptions — practical habits every household should follow.",
    category: "Medication Safety",
    readTime: "6 min",
    date: "2026-03-12",
    author: "Dr. Priya Nair, PharmD",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/articles/seasonal-allergy-guide.webp",
    content: [
      "Medications only work when they are taken correctly — and stored safely. Small household habits prevent big problems.",
      "Keep medicines in a cool, dry place away from bathrooms and kitchen heat. Humidity and temperature swings degrade many products faster than people realise.",
      "Use the original labelled container whenever possible. Pill organisers are helpful for adherence, but keep a master list of what each slot contains.",
      "Never share prescription medication, even if symptoms seem identical. Dosing, interactions, and diagnoses differ person to person.",
      "Set calendar or phone reminders for time-sensitive doses. Missed antibiotics and blood pressure medicines are among the most common issues we see.",
      "Dispose of expired or unused medicines through our in-store take-back programme rather than flushing them or tossing them in the trash.",
      "If a child or pet accidentally ingests medication, call poison control immediately and bring the bottle with you if you seek emergency care.",
      "When in doubt, ask. Our pharmacists would rather answer a 'simple' question than help fix a preventable mishap.",
    ],
  },
  {
    slug: "understanding-blood-pressure",
    title: "Understanding Your Blood Pressure Numbers",
    excerpt:
      "What systolic and diastolic readings mean, when to worry, and how lifestyle and medication work together.",
    category: "Blood Pressure",
    readTime: "5 min",
    date: "2026-02-28",
    author: "Marcus Chen, RPh",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/articles/understanding-blood-pressure.webp",
    content: [
      "Blood pressure measures the force of blood against artery walls. The top number (systolic) is pressure during heartbeats; the bottom (diastolic) is pressure between beats.",
      "A normal reading for most adults is under 120/80 mmHg. Elevated and high ranges warrant lifestyle attention and often medical follow-up.",
      "One high reading does not equal a diagnosis — but a pattern does. Home monitoring with a validated cuff can reveal useful trends.",
      "Sodium reduction, regular activity, healthy weight, limited alcohol, and stress management all meaningfully affect readings.",
      "If you take blood pressure medication, take it consistently. Skipping doses can cause dangerous swings.",
      "Visit us for a free walk-in check anytime during open hours. We will explain your numbers in plain language.",
    ],
  },
  {
    slug: "diabetes-everyday-tips",
    title: "Living Well with Diabetes: Everyday Tips from Your Pharmacist",
    excerpt:
      "Glucose checks, sick-day rules, foot care, and medication timing — distilled into practical daily habits.",
    category: "Diabetes",
    readTime: "7 min",
    date: "2026-02-10",
    author: "Dr. Priya Nair, PharmD",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/articles/diabetes-everyday-tips.webp",
    content: [
      "Consistent routines beat perfect days. Aim for regular meals, medication timing, and glucose checks that fit your real life.",
      "Know your personal targets with your clinician. General ranges are guides — your plan may differ.",
      "Always carry a rapid sugar source if you use insulin or medicines that can cause low blood sugar.",
      "Check feet daily for cuts, blisters, or colour changes. Diabetes can reduce sensation, so small issues become big ones quietly.",
      "Stay stocked on strips and supplies. Running out mid-week is stressful and avoidable — we can set supply reminders.",
      "On sick days, never stop diabetes medication without guidance. Illness can raise glucose unexpectedly.",
      "Ask us about meter technique, injection sites, or new devices anytime. Technology only helps when it is used correctly.",
    ],
  },
  {
    slug: "seasonal-allergy-guide",
    title: "Seasonal Allergies: Choosing Relief That Actually Helps",
    excerpt:
      "Antihistamines, nasal sprays, eye drops — and when combination products create more confusion than comfort.",
    category: "Wellness",
    readTime: "5 min",
    date: "2026-01-22",
    author: "Sofia Alvarez, CPhT",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/cold-flu.webp",
    content: [
      "Allergies are an immune overreaction to pollen, dust, or other triggers. Treatment aims to calm symptoms without unnecessary drowsiness or interactions.",
      "Non-drowsy antihistamines work well for many people. First-generation options (like diphenhydramine) can help at night but impair alertness.",
      "Steroid nasal sprays are often the most effective daily option for congestion — consistency matters more than occasional use.",
      "Avoid stacking multi-symptom cold products on top of allergy meds without checking ingredients.",
      "If symptoms include wheezing, facial swelling, or trouble breathing, seek urgent care — that is not ordinary hay fever.",
      "Bring your current medication list; we will help you build a simple, effective seasonal plan.",
    ],
  },
  {
    slug: "nutrition-basics-for-heart-health",
    title: "Nutrition Basics for Heart Health",
    excerpt: "Simple plate patterns, label reading, and pharmacist insights on supplements that claim heart benefits.",
    category: "Nutrition",
    readTime: "6 min",
    date: "2026-01-08",
    author: "Marcus Chen, RPh",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/articles/flu-season-preparation.webp",
    content: [
      "Heart-friendly eating is less about perfection and more about patterns: more plants, fibre, and unsaturated fats; less ultra-processed sodium bombs.",
      "Read labels for serving size first. Sodium and added sugar add up quickly across 'small' portions.",
      "Omega-3s from fish are well supported; supplement quality varies. Ask before combining with blood thinners.",
      "Fibre helps cholesterol and fullness. Oats, beans, fruits, and vegetables are affordable workhorses.",
      "If you take cholesterol or blood pressure medication, food still matters — medicine and lifestyle are partners, not rivals.",
      "We stock heart-health vitamins and can flag interactions with your prescriptions.",
    ],
  },
  {
    slug: "flu-season-preparation",
    title: "How to Prepare for Flu Season",
    excerpt: "Vaccination timing, household kits, and when fever or cough needs more than rest and fluids.",
    category: "Seasonal Health",
    readTime: "4 min",
    date: "2025-12-15",
    author: "Dr. Priya Nair, PharmD",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/articles/nutrition-basics-for-heart-health.webp",
    content: [
      "The best time to get a flu vaccine is before flu activity peaks in your area — often early autumn, but later is still worthwhile.",
      "Build a simple sick-day kit: thermometer, oral rehydration, tissues, and any clinician-approved fever reducers.",
      "Hand hygiene and staying home when ill protect vulnerable neighbours and family members.",
      "Antivirals work best when started early for eligible patients — call your clinician promptly if you are high risk.",
      "Walk in for your flu shot at Aether during open hours; no appointment needed most days.",
    ],
  },
  {
    slug: "pharmacy-vaccines-what-to-expect",
    title: "Getting vaccinated at the pharmacy: what to expect",
    excerpt:
      "Screening questions, vaccine information, consent, a 15-minute wait, and a digital certificate — how community pharmacy immunisation works.",
    category: "Immunisation",
    readTime: "5 min",
    date: "2026-08-12",
    author: "Marcus Chen, RPh",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/services/vaccinations.webp",
    content: [
      "Pharmacy vaccination is only offered where the pharmacy and the immuniser are locally authorised. In Kenya that sits with the Pharmacy and Poisons Board and Ministry of Health circulars in force.",
      "Before any dose we complete a contraindication questionnaire, give you a vaccine information sheet, and capture written consent (self, parent/guardian, or caregiver).",
      "The immuniser records antigen, lot, expiry, route, site, dose number, and their credentials. You stay for 15 minutes of observation — 30 minutes if you have a significant allergy history.",
      "Mild arm soreness and tiredness are common. Breathing difficulty, collapse, or rapidly spreading rash is an emergency — call 999/112.",
      "Childhood KEPI vaccines remain at public immunisation clinics. We help you read the mother-child booklet and plan catch-up; we do not replace the national programme.",
      "Your digital certificate appears in the patient portal with lot number and next-due date.",
    ],
  },
  {
    slug: "travel-vaccines-from-nairobi",
    title: "Travel vaccines from Nairobi: yellow fever, typhoid, and more",
    excerpt: "When to start, which certificates you need, and how malaria prevention sits beside vaccination.",
    category: "Travel",
    readTime: "6 min",
    date: "2026-07-28",
    author: "Dr. Priya Nair, PharmD",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/articles/flu-season-preparation.webp",
    content: [
      "Start a travel consult 4–6 weeks before you fly so series vaccines (hepatitis A, some typhoid schedules) can be completed.",
      "Yellow fever ICVP ('yellow card') cards are issued only by designated centres and become valid 10 days after the dose. If we are not currently designated, we still counsel and refer.",
      "Hajj and Umrah typically require documented meningococcal ACWY vaccination.",
      "Typhoid and hepatitis A vaccines lower risk; they do not replace safe water and food.",
      "Malaria is prevented with nets, repellents, and sometimes tablets — not a routine vaccine. Ask during counselling.",
    ],
  },
];

export const faqs = [
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
      "We accept most major insurance plans including Blue Cross Blue Shield, Aetna, UnitedHealthcare, Cigna, Medicare, Medicaid, and Humana. Bring your card and we will verify coverage.",
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
      "Call +254790670542, message us on WhatsApp, email support@gtss.software, or use the contact form. For medical emergencies in Kenya, call 999 or 112.",
  },
  {
    category: "General",
    question: "Is my personal health information kept private?",
    answer:
      "Yes. We follow the Kenya Data Protection Act (2019) and only share information as needed for care, payment, or as required by law. See our Privacy Policy for full details.",
  },
];

export const testimonials = [
  {
    quote:
      "The team always explains my medications clearly. I never feel rushed at the counter — that alone is worth the short drive.",
    name: "Maya R.",
    role: "Long-time patient",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
  },
  {
    quote:
      "Refills are ready when they say they will be, and delivery has been a lifesaver for my dad. Professional and kind every time.",
    name: "Jordan K.",
    role: "Caregiver",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
  },
  {
    quote: "I got my flu shot in ten minutes on my lunch break. Friendly staff, clean space, zero fuss.",
    name: "Elena V.",
    role: "Neighbourhood resident",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80",
  },
  {
    quote:
      "They helped sort out an insurance rejection that another pharmacy would not touch. Genuine advocates for patients.",
    name: "David M.",
    role: "New patient",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
  },
];

export const gallery = [
  {
    src: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/welcoming_retail_floor.webp",
    alt: "Bright pharmacy interior with organised shelves",
    caption: "Welcoming retail floor",
  },
  {
    src: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/careful_dispensing.webp",
    alt: "Pharmacist reviewing medication bottles",
    caption: "Careful dispensing",
  },
  {
    src: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/services/medication-counselling.webp",
    alt: "Consultation between pharmacist and patient",
    caption: "Private counselling",
  },
  {
    src: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/modern_care_tools.webp",
    alt: "Healthcare professional with digital tablet",
    caption: "Modern care tools",
  },
  {
    src: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/curated_wellness_aisle.webp",
    alt: "Wellness and vitamin products on display",
    caption: "Curated wellness aisle",
  },
  {
    src: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/services/home-care-support.webp",
    alt: "Calm modern clinic waiting area",
    caption: "Comfortable waiting area",
  },
];

export const jobs = [
  {
    id: "pharmacist-ft",
    title: "Staff Pharmacist (Full-time)",
    type: "Full-time",
    location: "Nairobi · On-site",
    posted: "2026-03-01",
    summary: "Dispense prescriptions, counsel patients, and support clinical services including immunisations and MTM.",
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
    summary: "Support dispensing workflow, inventory, and customer service during weekday afternoons and Saturdays.",
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
    summary: "Structured 12-month programme rotating through dispensing, clinical services, and operations mentorship.",
    requirements: [
      "Recent PharmD graduate or pending licensure",
      "Passion for community pharmacy",
      "Leadership potential and learning mindset",
      "Authorisation to work in Kenya",
    ],
  },
];

export const values = [
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
];

export const trustIndicators = [
  { label: "Years serving Nairobi", value: "15+" },
  { label: "Prescriptions filled yearly", value: "48k+" },
  { label: "Patient satisfaction", value: "4.9★" },
  { label: "Avg. fill time", value: "35 min" },
];

/**
 * Static search is reserved for editorial/educational content. Operational
 * services are deliberately excluded and must be queried from the database.
 */
export function searchContent(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return { services: [], articles: [], faqs: [], categories: [], vaccines: [] };

  return {
    services: [],
    articles: articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q),
    ),
    faqs: faqs.filter(
      (f) =>
        f.question.toLowerCase().includes(q) ||
        f.answer.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q),
    ),
    categories: categories.filter((c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)),
    vaccines: searchVaccines(q),
  };
}

export function getArticle(slug: string) {
  return articles.find((a) => a.slug === slug);
}

export function getCategory(slug: string) {
  return categories.find((c) => c.slug === slug);
}
