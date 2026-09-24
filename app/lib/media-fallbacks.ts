/**
 * Universal media resolution engine for medicines, pharmacy services, and pharmacies.
 * Ensures every item on public-facing storefronts (/p/[slug], /pharmacies, /medicines, /services)
 * has a high-definition, visually stunning, relevant clinical/photographic image.
 */

export const MEDICINE_CATEGORY_IMAGES: Record<string, string> = {
  // Database seeded categories
  "anti-infectives": "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/careful_dispensing.webp",
  "antimalarials-anthelmintics-tb": "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/articles/medication-safety-at-home.webp",
  "pain-relief-anesthesia": "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/pain-relief.webp",
  "analgesics": "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/pain-relief.webp",
  "cardiovascular": "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/articles/understanding-blood-pressure.webp",
  "endocrine-metabolic": "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/diabetes-management.webp",
  "gastrointestinal": "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/services/medication-counselling.webp",
  "respiratory-allergy": "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/articles/seasonal-allergy-guide.webp",
  "cns-psychiatric": "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/private_counselling.webp",
  "dermatology-ophthalmic-otic": "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/skin-care.webp",
  "antibiotics": "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/careful_dispensing.webp",
  "general": "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/curated_wellness_aisle.webp",

  // OTC categories
  "pain-relief": "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/pain-relief.webp",
  "cold-flu": "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/cold-flu.webp",
  "allergy": "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/articles/seasonal-allergy-guide.webp",
  "allergy-treatments": "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/articles/seasonal-allergy-guide.webp",
  "vitamins-supplements": "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/vitamins-supplements.webp",
  "vitamins": "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/vitamins-supplements.webp",
  "baby-care": "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/baby-care.webp",
  "first-aid": "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/first-aid.webp",
  "skin-care": "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/skin-care.webp",
  "diabetes-care": "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/diabetes-management.webp",
  "diabetes": "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/diabetes-management.webp",
  "womens-health": "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/womens-health.webp",
  "digestive": "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/services/medication-counselling.webp",
  "respiratory": "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/cold-flu.webp",
};

export const MEDICINE_ROTATING_FALLBACKS = [
  "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/curated_wellness_aisle.webp",
  "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/careful_dispensing.webp",
  "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/modern_care_tools.webp",
  "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/project-assets/images/care/medicine-still-life.png",
];

export const DEFAULT_MEDICINE_IMAGE = MEDICINE_ROTATING_FALLBACKS[0];

export const SERVICE_DEFAULT_IMAGES = {
  vaccination: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/services/vaccinations.webp",
  screening: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/articles/understanding-blood-pressure.webp",
  counselling: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/services/medication-counselling.webp",
  dispensing: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/services/prescription-dispensing.webp",
  refill: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/services/prescription-refills.webp",
  delivery: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/services/delivery-services.webp",
  homeCare: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/services/home-care-support.webp",
  diabetes: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/articles/diabetes-everyday-tips.webp",
  fluSeason: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/articles/flu-season-preparation.webp",
  heartHealth: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/articles/nutrition-basics-for-heart-health.webp",
  general: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/curated_wellness_aisle.webp",
};

export const PHARMACY_COVERS = [
  "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/welcoming_retail_floor.webp",
  "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/curated_wellness_aisle.webp",
  "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/comfortable_waiting_area.webp",
  "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/careful_dispensing.webp",
  "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/modern_care_tools.webp",
  "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/private_counselling.webp",
];

function stringHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Returns a high-definition image for a medicine. If an explicit imageUrl is provided,
 * it is verified; otherwise, a category- and name-matched visual is returned.
 */
export function resolveMedicineImage(
  imageUrl?: string | null,
  category?: string | null,
  name?: string | null,
): string {
  if (imageUrl && imageUrl.trim().length > 0) {
    return imageUrl.trim();
  }

  const catKey = (category || "").toLowerCase().trim();
  if (catKey && MEDICINE_CATEGORY_IMAGES[catKey]) {
    return MEDICINE_CATEGORY_IMAGES[catKey];
  }

  // Name / generic name keyword matching for high-precision clinical aesthetics
  const text = `${category || ""} ${name || ""}`.toLowerCase();

  // Malaria & Tropical
  if (/malaria|coartem|artemether|lumefantrine|albendazole|mebendazole|worm|duocotecxin|dawa/.test(text)) {
    return MEDICINE_CATEGORY_IMAGES["antimalarials-anthelmintics-tb"];
  }

  // Pain / Fever / Analgesics
  if (/pain|paracetamol|ibuprofen|panadol|brufen|aspirin|voltaren|diclofenac|ache|headache|tramadol|naproxen|celebrex|deep heat|moov/.test(text)) {
    return MEDICINE_CATEGORY_IMAGES["pain-relief"];
  }

  // Cold, Flu & Respiratory
  if (/cough|flu|cold|throat|strepsils|benylin|decongest|otrivin|vicks|phlegm|congestion|bronch|ascoril|fluticasone|salbutamol|ventolin|inhaler|asthma/.test(text)) {
    return MEDICINE_CATEGORY_IMAGES["cold-flu"];
  }

  // Allergies & Antihistamines
  if (/allergy|histamin|zyrtec|clarityn|telfast|cetirizine|loratadine|hay fever|itch|eyes|piriton|chlorpheniramine|montelukast/.test(text)) {
    return MEDICINE_CATEGORY_IMAGES["allergy"];
  }

  // Vitamins, Minerals & Supplements
  if (/vitamin|calcium|zinc|iron|supplement|folic|omega|centrum|nutri|magnesium|multivitamin|pharmaton|osteocare|wellman|wellwoman|cod liver/.test(text)) {
    return MEDICINE_CATEGORY_IMAGES["vitamins-supplements"];
  }

  // Pediatric & Baby Care
  if (/baby|infant|pediatric|diaper|nappy|teething|calpol|junior|gripe water/.test(text)) {
    return MEDICINE_CATEGORY_IMAGES["baby-care"];
  }

  // First Aid, Antiseptics & Wound Care
  if (/first aid|bandage|antiseptic|dettol|iodine|gauze|wound|burn|dressing|cotton|plaster|betadine|savlon/.test(text)) {
    return MEDICINE_CATEGORY_IMAGES["first-aid"];
  }

  // Skin Care & Dermatology
  if (/skin|cream|ointment|lotion|derma|rash|eczema|fungal|acne|clotrimazole|canesten|betamethasone|hydrocortisone|candid|funbact/.test(text)) {
    return MEDICINE_CATEGORY_IMAGES["skin-care"];
  }

  // Diabetes & Blood Sugar
  if (/diabet|glucose|insulin|metformin|sugar|strip|lancet|glibenclamide|lantus|glucometer|hba1c/.test(text)) {
    return MEDICINE_CATEGORY_IMAGES["diabetes-care"];
  }

  // Women's Health & Maternal
  if (/women|female|prenatal|pregnancy|maternal|menstru|contracept|postinor|sanitary|always/.test(text)) {
    return MEDICINE_CATEGORY_IMAGES["womens-health"];
  }

  // Cardiovascular & Hypertension
  if (/pressure|hypertens|cardio|heart|amlodipine|losartan|atorvastatin|statin|atenolol|enalapril|carvedilol|rosuvastatin|hydrochlorothiazide/.test(text)) {
    return MEDICINE_CATEGORY_IMAGES["cardiovascular"];
  }

  // Antibiotics & Anti-infectives
  if (/amoxicillin|antibiotic|augmentin|azithromycin|cipro|penicillin|bacteri|doxycycline|erythromycin|flagyl|metronidazole|cefixime|ceftriaxone/.test(text)) {
    return MEDICINE_CATEGORY_IMAGES["antibiotics"];
  }

  // Digestive & Gastrointestinal
  if (/digest|stomach|gastric|antacid|gaviscon|omeprazole|imodium|laxative|gut|esomeprazole|pantoprazole|actal|milk of magnesia|loperamide|buscopan/.test(text)) {
    return MEDICINE_CATEGORY_IMAGES["digestive"];
  }

  // CNS & Mental Wellness
  if (/sleep|anxiety|nerve|neuro|calm|sedative|mental|depression/.test(text)) {
    return MEDICINE_CATEGORY_IMAGES["cns-psychiatric"];
  }

  // Deterministic fallback rotation based on medicine name
  if (name && name.trim()) {
    const idx = stringHash(name.trim()) % MEDICINE_ROTATING_FALLBACKS.length;
    return MEDICINE_ROTATING_FALLBACKS[idx];
  }

  return DEFAULT_MEDICINE_IMAGE;
}

/**
 * Returns a high-definition clinical/editorial image for a pharmacy service.
 */
export function resolveServiceImage(
  imageUrl?: string | null,
  title?: string | null,
  description?: string | null,
): string {
  if (imageUrl && imageUrl.trim().length > 0) {
    return imageUrl.trim();
  }

  const text = `${title || ""} ${description || ""}`.toLowerCase();

  // Blood sugar / Diabetes
  if (/sugar|glucose|diabetes|hba1c/.test(text)) {
    return SERVICE_DEFAULT_IMAGES.diabetes;
  }

  // Vaccines & Immunization
  if (/vaccin|immun|shot|dose|jab|covid|travel|yellow fever|flu shot|rabies/.test(text)) {
    return SERVICE_DEFAULT_IMAGES.vaccination;
  }

  // Screenings, Tests & Vitals
  if (/screen|check|test|pressure|bmi|blood|cardio|cholesterol|vitals|pressure check/.test(text)) {
    return SERVICE_DEFAULT_IMAGES.screening;
  }

  // Consultations & Medication Therapy
  if (/consult|counsel|review|doctor|clinic|advice|mtm|telehealth|specialist|pharmacist visit/.test(text)) {
    return SERVICE_DEFAULT_IMAGES.counselling;
  }

  // Refills & Repeat Scripts
  if (/refill|repeat|sync/.test(text)) {
    return SERVICE_DEFAULT_IMAGES.refill;
  }

  // Delivery & Dispatch
  if (/deliver|courier|transport|dispatch|doorstep|express/.test(text)) {
    return SERVICE_DEFAULT_IMAGES.delivery;
  }

  // Home Care & Support
  if (/home|domiciliary|support|elderly|nurse/.test(text)) {
    return SERVICE_DEFAULT_IMAGES.homeCare;
  }

  // Dispensing & Packaging
  if (/dispens|prescription|medicine|blister/.test(text)) {
    return SERVICE_DEFAULT_IMAGES.dispensing;
  }

  // Flu & Seasonal
  if (/flu|season|fever|cough/.test(text)) {
    return SERVICE_DEFAULT_IMAGES.fluSeason;
  }

  // Deterministic fallback based on title
  if (title && title.trim()) {
    const options = [
      SERVICE_DEFAULT_IMAGES.screening,
      SERVICE_DEFAULT_IMAGES.counselling,
      SERVICE_DEFAULT_IMAGES.vaccination,
      SERVICE_DEFAULT_IMAGES.dispensing,
      SERVICE_DEFAULT_IMAGES.general,
    ];
    return options[stringHash(title.trim()) % options.length];
  }

  return SERVICE_DEFAULT_IMAGES.general;
}

/**
 * Returns a high-definition architectural photo for a pharmacy cover image.
 */
export function resolvePharmacyCover(
  coverImageUrl?: string | null,
  indexOrSeed?: number | string | null,
): string {
  if (coverImageUrl && coverImageUrl.trim().length > 0) {
    return coverImageUrl.trim();
  }

  let index = 0;
  if (typeof indexOrSeed === "number") {
    index = Math.abs(indexOrSeed) % PHARMACY_COVERS.length;
  } else if (typeof indexOrSeed === "string" && indexOrSeed.trim().length > 0) {
    index = stringHash(indexOrSeed.trim()) % PHARMACY_COVERS.length;
  }

  return PHARMACY_COVERS[index];
}

/**
 * Clinical category styling tokens for subtle ambient backlighting and badges.
 */
export function getCategoryAesthetic(category?: string | null): {
  accent: string;
  glow: string;
  pillBg: string;
  pillBorder: string;
  pillText: string;
} {
  const cat = (category || "").toLowerCase();
  if (/pain|analgesic/.test(cat)) {
    return {
      accent: "#f59e0b",
      glow: "rgba(245, 158, 11, 0.14)",
      pillBg: "rgba(245, 158, 11, 0.12)",
      pillBorder: "rgba(245, 158, 11, 0.35)",
      pillText: "#d97706",
    };
  }
  if (/infective|antibiotic/.test(cat)) {
    return {
      accent: "#06b6d4",
      glow: "rgba(6, 182, 212, 0.14)",
      pillBg: "rgba(6, 182, 212, 0.12)",
      pillBorder: "rgba(6, 182, 212, 0.35)",
      pillText: "#0891b2",
    };
  }
  if (/cardio|heart|pressure/.test(cat)) {
    return {
      accent: "#ef4444",
      glow: "rgba(239, 68, 68, 0.14)",
      pillBg: "rgba(239, 68, 68, 0.12)",
      pillBorder: "rgba(239, 68, 68, 0.35)",
      pillText: "#dc2626",
    };
  }
  if (/diabet|endocrine/.test(cat)) {
    return {
      accent: "#8b5cf6",
      glow: "rgba(139, 92, 246, 0.14)",
      pillBg: "rgba(139, 92, 246, 0.12)",
      pillBorder: "rgba(139, 92, 246, 0.35)",
      pillText: "#7c3aed",
    };
  }
  if (/skin|derma/.test(cat)) {
    return {
      accent: "#ec4899",
      glow: "rgba(236, 72, 153, 0.14)",
      pillBg: "rgba(236, 72, 153, 0.12)",
      pillBorder: "rgba(236, 72, 153, 0.35)",
      pillText: "#db2777",
    };
  }
  if (/vitamin|wellness/.test(cat)) {
    return {
      accent: "#10b981",
      glow: "rgba(16, 185, 129, 0.14)",
      pillBg: "rgba(16, 185, 129, 0.12)",
      pillBorder: "rgba(16, 185, 129, 0.35)",
      pillText: "#059669",
    };
  }
  if (/respiratory|allergy|cold|flu/.test(cat)) {
    return {
      accent: "#0284c7",
      glow: "rgba(2, 132, 199, 0.14)",
      pillBg: "rgba(2, 132, 199, 0.12)",
      pillBorder: "rgba(2, 132, 199, 0.35)",
      pillText: "#0284c7",
    };
  }
  // Default clean emerald/brand clinical style
  return {
    accent: "#0d9488",
    glow: "rgba(13, 148, 136, 0.12)",
    pillBg: "rgba(13, 148, 136, 0.10)",
    pillBorder: "rgba(13, 148, 136, 0.30)",
    pillText: "#0f766e",
  };
}
