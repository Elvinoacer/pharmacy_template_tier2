/**
 * Vaccination & preventive-health catalogue.
 * Kenya-first (PPB / MoH / KEPI) with WHO-aligned adult, travel, and seasonal
 * antigens. Childhood KEPI entries are education-only unless the pharmacy is
 * authorised to administer them.
 *
 * This is public-safe static content — no server-only imports.
 */

export type VaccineCategory =
  | "routine_adult"
  | "routine_child"
  | "seasonal"
  | "travel"
  | "occupational"
  | "outbreak"
  | "catch_up";

export type VaccineSeed = {
  slug: string;
  name: string;
  antigen: string;
  brandName: string | null;
  manufacturer: string | null;
  category: VaccineCategory;
  diseasesPrevented: string[];
  description: string;
  indications: string;
  whoShouldGet: string[];
  whoShouldWait: string[];
  contraindications: string[];
  precautions: string[];
  commonSideEffects: string[];
  rareRisks: string[];
  route: "IM" | "SC" | "oral" | "nasal" | "ID";
  siteOptions: string[];
  doseMl: number | null;
  seriesDoses: number;
  seriesIntervalDays: number | null;
  boosterIntervalMonths: number | null;
  minAgeMonths: number;
  maxAgeMonths: number | null;
  visTitle: string;
  visVersion: string;
  visSummary: string;
  storageRequirements: string;
  priceKes: number | null;
  pharmacyAdministered: boolean;
  travelRelated: boolean;
  seasonLabel: string | null;
  regulatoryNotes: string;
  sortOrder: number;
};

export const COLD_CHAIN_STANDARD =
  "Store at 2–8°C in a monitored pharmaceutical refrigerator. Do not freeze unless the product is labelled freeze-stable. Keep in original packaging, protect from light, and record min/max temperatures twice daily.";

export const VACCINE_CATALOG: VaccineSeed[] = [
  {
    slug: "influenza",
    name: "Seasonal influenza vaccine",
    antigen: "Influenza (inactivated quadrivalent)",
    brandName: "Varies by season",
    manufacturer: "WHO-prequalified seasonal supply",
    category: "seasonal",
    diseasesPrevented: ["Seasonal influenza", "Influenza-related pneumonia"],
    description:
      "Annual inactivated influenza vaccine covering the WHO-recommended Northern/Southern hemisphere strains for the current season. The most requested pharmacy immunisation.",
    indications:
      "Prevention of influenza in adults and eligible adolescents. Particularly important for people 65+, pregnant people (inactivated only), those with chronic heart/lung/metabolic disease, healthcare workers, and caregivers of infants.",
    whoShouldGet: [
      "Adults 18 years and older (especially 65+)",
      "People with asthma, COPD, diabetes, heart disease, or immunosuppression",
      "Pregnant people (inactivated vaccine, any trimester — clinician-aligned)",
      "Healthcare workers and caregivers of high-risk household members",
      "Anyone who wants seasonal protection",
    ],
    whoShouldWait: [
      "People currently unwell with moderate/severe acute illness and fever — defer until recovered",
      "Anyone with a history of Guillain-Barré syndrome within 6 weeks of a previous flu vaccine — discuss with a clinician first",
    ],
    contraindications: [
      "Anaphylaxis to a previous influenza vaccine dose or a known vaccine component",
      "Live attenuated nasal spray is not used in this pharmacy programme",
    ],
    precautions: [
      "Egg allergy is not an automatic contraindication for modern inactivated vaccines — pharmacist will screen",
      "Anticoagulant therapy: apply firm pressure at the injection site",
    ],
    commonSideEffects: ["Sore arm", "Low-grade fever", "Fatigue", "Muscle aches for 1–2 days"],
    rareRisks: ["Severe allergic reaction (anaphylaxis)", "Guillain-Barré syndrome (very rare)"],
    route: "IM",
    siteOptions: ["Left deltoid", "Right deltoid"],
    doseMl: 0.5,
    seriesDoses: 1,
    seriesIntervalDays: null,
    boosterIntervalMonths: 12,
    minAgeMonths: 72,
    maxAgeMonths: null,
    visTitle: "Influenza vaccine information",
    visVersion: "2026-season",
    visSummary:
      "The influenza vaccine cannot give you the flu. Protection starts about 2 weeks after the dose and lasts through the season. Mild arm soreness is common. Stay for 15 minutes of observation.",
    storageRequirements: COLD_CHAIN_STANDARD,
    priceKes: 1500,
    pharmacyAdministered: true,
    travelRelated: false,
    seasonLabel: "March–August (Southern hemisphere) and year-round for travellers",
    regulatoryNotes:
      "Administered only by immunisation-certified pharmacists where PPB/MoH authorisation is in force. Lot, expiry, site, and immuniser are recorded.",
    sortOrder: 10,
  },
  {
    slug: "covid-19",
    name: "COVID-19 vaccine / booster",
    antigen: "SARS-CoV-2",
    brandName: "Current authorised product",
    manufacturer: "As supplied (MoH / PPB authorised)",
    category: "seasonal",
    diseasesPrevented: ["COVID-19", "Severe COVID-19", "COVID-related hospitalisation"],
    description:
      "Current nationally authorised COVID-19 vaccine or booster. Product and eligibility follow Ministry of Health circulars in force at the time of administration.",
    indications:
      "Primary series or booster immunisation against COVID-19 for eligible adults per current MoH guidance.",
    whoShouldGet: [
      "Adults eligible under current MoH booster guidance",
      "People 60+ and those with chronic illness",
      "Healthcare workers",
      "Immunocompromised people (may need additional doses — clinician-directed)",
    ],
    whoShouldWait: [
      "Acute febrile illness — defer",
      "Recent COVID-19 infection — follow current interval guidance (often 3 months)",
    ],
    contraindications: [
      "Anaphylaxis to a previous COVID-19 vaccine dose or a known component (e.g. PEG, where relevant)",
      "Myocarditis after a previous dose — refer to clinician before further doses",
    ],
    precautions: [
      "History of myocarditis/pericarditis — pharmacist will refer",
      "Pregnancy and lactation: follow current MoH/WHO position; inactivated/mRNA products are generally permitted",
    ],
    commonSideEffects: ["Sore arm", "Fatigue", "Headache", "Fever", "Chills for 24–48 hours"],
    rareRisks: ["Anaphylaxis", "Myocarditis/pericarditis (rare, mainly young males after some products)"],
    route: "IM",
    siteOptions: ["Left deltoid", "Right deltoid"],
    doseMl: 0.3,
    seriesDoses: 1,
    seriesIntervalDays: null,
    boosterIntervalMonths: 12,
    minAgeMonths: 216,
    maxAgeMonths: null,
    visTitle: "COVID-19 vaccine information",
    visVersion: "MoH-current",
    visSummary:
      "COVID-19 vaccines reduce the risk of severe disease. Product, dose, and interval follow current national guidance. Observation of 15 minutes is required; 30 minutes if you have a significant allergy history.",
    storageRequirements:
      "Follow the product insert. Many COVID-19 vaccines have ultra-cold or 2–8°C phases. Pharmacy uses only in-date, correctly thawed, labelled vials.",
    priceKes: 0,
    pharmacyAdministered: true,
    travelRelated: false,
    seasonLabel: "Year-round / campaign windows",
    regulatoryNotes:
      "Only products currently authorised by PPB/MoH. Batch recorded for national reporting where required.",
    sortOrder: 20,
  },
  {
    slug: "hepatitis-b",
    name: "Hepatitis B vaccine",
    antigen: "Hepatitis B surface antigen (HBsAg)",
    brandName: "Engerix-B / equivalent",
    manufacturer: "Varies",
    category: "routine_adult",
    diseasesPrevented: ["Hepatitis B", "Chronic hepatitis B", "Hepatitis B-related liver cancer"],
    description:
      "Recombinant hepatitis B vaccine. A 3-dose series (0, 1, 6 months) is the adult standard. Healthcare workers, people with diabetes, and those at occupational or household risk are priority groups.",
    indications:
      "Pre-exposure protection against hepatitis B for unvaccinated adults, catch-up, and occupational health.",
    whoShouldGet: [
      "Healthcare, laboratory, and first-responder workers",
      "People with diabetes, chronic liver or kidney disease, or HIV",
      "Household or sexual contacts of people living with hepatitis B",
      "Unvaccinated adults who want protection",
    ],
    whoShouldWait: ["Moderate/severe acute illness — defer"],
    contraindications: ["Anaphylaxis to a previous hepatitis B vaccine dose or yeast (where relevant)"],
    precautions: ["Pregnancy is not a contraindication to recombinant Hep B — still screen and document"],
    commonSideEffects: ["Sore arm", "Mild fever", "Fatigue"],
    rareRisks: ["Anaphylaxis"],
    route: "IM",
    siteOptions: ["Left deltoid", "Right deltoid"],
    doseMl: 1.0,
    seriesDoses: 3,
    seriesIntervalDays: 30,
    boosterIntervalMonths: null,
    minAgeMonths: 0,
    maxAgeMonths: null,
    visTitle: "Hepatitis B vaccine information",
    visVersion: "2024-adult",
    visSummary:
      "Hepatitis B vaccine is given as a 3-dose series. Protection after a complete series is long-lasting for most people. Keep your digital record — employers often request proof.",
    storageRequirements: COLD_CHAIN_STANDARD,
    priceKes: 1800,
    pharmacyAdministered: true,
    travelRelated: false,
    seasonLabel: null,
    regulatoryNotes: "Series tracking is mandatory. Next-due date is calculated and reminded via the portal.",
    sortOrder: 30,
  },
  {
    slug: "tdap",
    name: "Tdap (tetanus, diphtheria, pertussis)",
    antigen: "Tetanus toxoid, diphtheria toxoid, acellular pertussis",
    brandName: "Boostrix / Adacel equivalent",
    manufacturer: "Varies",
    category: "routine_adult",
    diseasesPrevented: ["Tetanus", "Diphtheria", "Pertussis (whooping cough)"],
    description:
      "Adult booster protecting against tetanus, diphtheria, and pertussis. Recommended every 10 years, and during each pregnancy (27–36 weeks) to protect newborns from whooping cough.",
    indications:
      "Booster immunisation; wound management (tetanus-prone injuries); pregnancy dose for infant protection.",
    whoShouldGet: [
      "Adults whose last tetanus-containing vaccine was ≥10 years ago",
      "Pregnant people in the third trimester (each pregnancy)",
      "People with tetanus-prone wounds if booster is overdue",
      "Adults in contact with young infants",
    ],
    whoShouldWait: ["Moderate/severe acute illness — defer unless a tetanus-prone wound"],
    contraindications: [
      "Anaphylaxis to a previous Td/Tdap dose",
      "Encephalopathy within 7 days of a previous pertussis-containing vaccine not attributable to another cause",
    ],
    precautions: ["Guillain-Barré syndrome within 6 weeks of a previous tetanus toxoid vaccine"],
    commonSideEffects: ["Sore, swollen arm", "Low-grade fever", "Tiredness"],
    rareRisks: ["Severe allergic reaction", "Brachial neuritis (very rare)"],
    route: "IM",
    siteOptions: ["Left deltoid", "Right deltoid"],
    doseMl: 0.5,
    seriesDoses: 1,
    seriesIntervalDays: null,
    boosterIntervalMonths: 120,
    minAgeMonths: 84,
    maxAgeMonths: null,
    visTitle: "Tdap vaccine information",
    visVersion: "2024",
    visSummary:
      "Tdap boosts protection against tetanus, diphtheria, and whooping cough. A dose in pregnancy helps protect newborns. Arm soreness is common. Tell the pharmacist about any previous severe reactions.",
    storageRequirements: COLD_CHAIN_STANDARD,
    priceKes: 2200,
    pharmacyAdministered: true,
    travelRelated: false,
    seasonLabel: null,
    regulatoryNotes: "Wound-related tetanus boosters may be given as walk-ins after screening.",
    sortOrder: 40,
  },
  {
    slug: "pneumococcal",
    name: "Pneumococcal vaccine (adult)",
    antigen: "Streptococcus pneumoniae (PCV / PPSV)",
    brandName: "Prevenar / Pneumovax equivalent",
    manufacturer: "Varies",
    category: "routine_adult",
    diseasesPrevented: ["Pneumococcal pneumonia", "Bacteraemia", "Meningitis"],
    description:
      "Adult pneumococcal immunisation (conjugate and/or polysaccharide, per current schedule). Strongly recommended for adults 65+ and younger adults with chronic disease.",
    indications:
      "Prevention of invasive pneumococcal disease in older adults and at-risk younger adults.",
    whoShouldGet: [
      "Adults 65 years and older",
      "Adults 19–64 with diabetes, heart, lung, liver, or kidney disease, HIV, or asplenia",
      "People who smoke or have alcohol-use disorder (risk-based)",
    ],
    whoShouldWait: ["Moderate/severe acute illness — defer"],
    contraindications: ["Anaphylaxis to a previous pneumococcal vaccine or a diphtheria-toxoid-containing vaccine (for PCV)"],
    precautions: ["PPSV23 is less immunogenic if given too soon after PCV — pharmacist follows interval rules"],
    commonSideEffects: ["Sore arm", "Redness", "Mild fever", "Muscle aches"],
    rareRisks: ["Anaphylaxis"],
    route: "IM",
    siteOptions: ["Left deltoid", "Right deltoid"],
    doseMl: 0.5,
    seriesDoses: 1,
    seriesIntervalDays: null,
    boosterIntervalMonths: null,
    minAgeMonths: 228,
    maxAgeMonths: null,
    visTitle: "Pneumococcal vaccine information",
    visVersion: "2024-adult",
    visSummary:
      "This vaccine helps prevent serious pneumococcal infections. Product choice (PCV vs PPSV) depends on your age and health history. The pharmacist will confirm which product and whether a second type is due later.",
    storageRequirements: COLD_CHAIN_STANDARD,
    priceKes: 4500,
    pharmacyAdministered: true,
    travelRelated: false,
    seasonLabel: null,
    regulatoryNotes: "Product (PCV13/15/20 vs PPSV23) is selected at the point of care and recorded on the certificate.",
    sortOrder: 50,
  },
  {
    slug: "hpv",
    name: "HPV vaccine",
    antigen: "Human papillomavirus (9-valent / current)",
    brandName: "Gardasil-9 equivalent",
    manufacturer: "Varies",
    category: "routine_adult",
    diseasesPrevented: ["Cervical cancer", "Other HPV-related cancers", "Genital warts"],
    description:
      "HPV vaccine preventing infection with cancer-causing and wart-causing HPV types. National school programmes cover many adolescents; the pharmacy offers catch-up for eligible young people where authorised.",
    indications:
      "Primary prevention of HPV-related disease. Typically 2 doses if started before age 15; 3 doses if started later.",
    whoShouldGet: [
      "Adolescents and young adults not fully vaccinated in the school programme",
      "People up to the nationally recommended upper age (often 26; some adults 27–45 after shared decision-making)",
    ],
    whoShouldWait: ["Pregnancy — defer HPV vaccine until after delivery", "Moderate/severe acute illness"],
    contraindications: ["Anaphylaxis to a previous HPV vaccine dose or yeast (where relevant)"],
    precautions: ["Syncope is more common in adolescents — observe seated for 15 minutes"],
    commonSideEffects: ["Sore arm", "Headache", "Fever", "Dizziness"],
    rareRisks: ["Anaphylaxis", "Fainting-related injury if not observed"],
    route: "IM",
    siteOptions: ["Left deltoid", "Right deltoid"],
    doseMl: 0.5,
    seriesDoses: 2,
    seriesIntervalDays: 180,
    boosterIntervalMonths: null,
    minAgeMonths: 108,
    maxAgeMonths: 312,
    visTitle: "HPV vaccine information",
    visVersion: "2024",
    visSummary:
      "HPV vaccine prevents several cancers. It does not treat existing HPV infection. Two or three doses are needed depending on age at first dose. Sit for 15 minutes after vaccination.",
    storageRequirements: COLD_CHAIN_STANDARD,
    priceKes: 6500,
    pharmacyAdministered: true,
    travelRelated: false,
    seasonLabel: null,
    regulatoryNotes:
      "Where a national school HPV programme exists, pharmacy catch-up is offered only if age-eligible and locally authorised. Parental consent required for minors.",
    sortOrder: 60,
  },
  {
    slug: "typhoid",
    name: "Typhoid vaccine (travel / outbreak)",
    antigen: "Salmonella Typhi (Vi polysaccharide or conjugate)",
    brandName: "Typhim Vi / equivalent",
    manufacturer: "Varies",
    category: "travel",
    diseasesPrevented: ["Typhoid fever"],
    description:
      "Injectable typhoid vaccine for travellers to endemic areas and during local outbreak responses. Complements food and water precautions — it is not 100% protective.",
    indications: "Travel to typhoid-endemic regions; outbreak response as directed by public health.",
    whoShouldGet: [
      "Travellers to South Asia, parts of Africa, and other endemic areas",
      "People with occupational exposure to S. Typhi",
    ],
    whoShouldWait: ["Moderate/severe acute illness — defer"],
    contraindications: ["Anaphylaxis to a previous typhoid vaccine"],
    precautions: ["Not a substitute for safe water and food practices"],
    commonSideEffects: ["Sore arm", "Fever", "Headache"],
    rareRisks: ["Anaphylaxis"],
    route: "IM",
    siteOptions: ["Left deltoid", "Right deltoid"],
    doseMl: 0.5,
    seriesDoses: 1,
    seriesIntervalDays: null,
    boosterIntervalMonths: 36,
    minAgeMonths: 24,
    maxAgeMonths: null,
    visTitle: "Typhoid vaccine information",
    visVersion: "2024-travel",
    visSummary:
      "Typhoid vaccine lowers but does not eliminate risk. Continue to drink safe water and eat thoroughly cooked food. Boosters are typically needed every 3 years for ongoing risk.",
    storageRequirements: COLD_CHAIN_STANDARD,
    priceKes: 2500,
    pharmacyAdministered: true,
    travelRelated: true,
    seasonLabel: null,
    regulatoryNotes: "Travel counselling is offered with every travel vaccine booking.",
    sortOrder: 70,
  },
  {
    slug: "hepatitis-a",
    name: "Hepatitis A vaccine",
    antigen: "Hepatitis A virus (inactivated)",
    brandName: "Havrix / equivalent",
    manufacturer: "Varies",
    category: "travel",
    diseasesPrevented: ["Hepatitis A"],
    description:
      "Inactivated hepatitis A vaccine. Two-dose series for long-term protection. Commonly paired with travel health counselling.",
    indications: "Travel to areas with intermediate/high Hep A endemicity; other risk groups (occupational, chronic liver disease).",
    whoShouldGet: [
      "Travellers to endemic areas",
      "People with chronic liver disease",
      "Men who have sex with men and other risk groups per clinician advice",
    ],
    whoShouldWait: ["Moderate/severe acute illness — defer"],
    contraindications: ["Anaphylaxis to a previous hepatitis A vaccine"],
    precautions: ["Give the first dose at least 2 weeks before travel when possible"],
    commonSideEffects: ["Sore arm", "Headache", "Loss of appetite", "Mild fever"],
    rareRisks: ["Anaphylaxis"],
    route: "IM",
    siteOptions: ["Left deltoid", "Right deltoid"],
    doseMl: 1.0,
    seriesDoses: 2,
    seriesIntervalDays: 180,
    boosterIntervalMonths: null,
    minAgeMonths: 12,
    maxAgeMonths: null,
    visTitle: "Hepatitis A vaccine information",
    visVersion: "2024",
    visSummary:
      "Hepatitis A vaccine is given as two doses, 6 months apart, for long-term protection. The first dose already provides substantial short-term protection for travel.",
    storageRequirements: COLD_CHAIN_STANDARD,
    priceKes: 3200,
    pharmacyAdministered: true,
    travelRelated: true,
    seasonLabel: null,
    regulatoryNotes: "Paediatric dosing differs — pharmacist confirms product and volume.",
    sortOrder: 80,
  },
  {
    slug: "yellow-fever",
    name: "Yellow fever vaccine (designated centre)",
    antigen: "Yellow fever virus (live attenuated 17D)",
    brandName: "Stamaril / equivalent",
    manufacturer: "Sanofi / authorised",
    category: "travel",
    diseasesPrevented: ["Yellow fever"],
    description:
      "Live attenuated yellow fever vaccine. International Health Regulations require administration at a designated yellow-fever vaccination centre and an International Certificate of Vaccination or Prophylaxis (ICVP, 'yellow card').",
    indications:
      "Travel to or from yellow-fever endemic countries; IHR certificate for entry requirements.",
    whoShouldGet: [
      "Travellers to yellow-fever risk countries (parts of Africa and South America)",
      "People who need an ICVP for border requirements",
    ],
    whoShouldWait: [
      "Acute illness",
      "Recent live vaccines — interval rules apply",
    ],
    contraindications: [
      "Anaphylaxis to eggs or a previous yellow fever vaccine",
      "Thymus disorder or thymectomy",
      "Severe immunosuppression",
      "Infants under 6–9 months (age cut-off depends on guidance)",
      "Pregnancy — generally avoid; refer",
    ],
    precautions: [
      "Age ≥60 years: higher risk of viscerotropic disease — shared decision-making",
      "Lactation: discuss with clinician for infants under 9 months",
    ],
    commonSideEffects: ["Sore arm", "Mild fever", "Headache", "Muscle aches 5–10 days later"],
    rareRisks: [
      "Yellow fever vaccine-associated viscerotropic disease (very rare, higher ≥60)",
      "Neurologic disease (very rare)",
      "Anaphylaxis",
    ],
    route: "SC",
    siteOptions: ["Left deltoid (SC)", "Right deltoid (SC)"],
    doseMl: 0.5,
    seriesDoses: 1,
    seriesIntervalDays: null,
    boosterIntervalMonths: null,
    minAgeMonths: 9,
    maxAgeMonths: null,
    visTitle: "Yellow fever vaccine & ICVP",
    visVersion: "IHR-2005",
    visSummary:
      "A single dose provides lifelong protection for most people. The ICVP ('yellow card') becomes valid 10 days after vaccination. This live vaccine is only given at designated centres.",
    storageRequirements: COLD_CHAIN_STANDARD + " Reconstitute immediately before use. Protect from light.",
    priceKes: 4500,
    pharmacyAdministered: false,
    travelRelated: true,
    seasonLabel: null,
    regulatoryNotes:
      "Kenya requires designated yellow-fever vaccination centres. If this pharmacy is not currently designated, we provide information, screening, and referral to an authorised centre and still record the counselling.",
    sortOrder: 90,
  },
  {
    slug: "cholera",
    name: "Oral cholera vaccine",
    antigen: "Vibrio cholerae (killed oral)",
    brandName: "Shanchol / Euvichol / Dukoral equivalent",
    manufacturer: "Varies",
    category: "outbreak",
    diseasesPrevented: ["Cholera"],
    description:
      "Killed oral cholera vaccine used in outbreak campaigns and for travellers to active outbreak settings. Complements safe water, sanitation, and oral rehydration education.",
    indications: "Outbreak response under public-health direction; selected high-risk travel.",
    whoShouldGet: [
      "People in or travelling to active cholera outbreak areas as advised by public health",
      "Front-line responders in outbreak settings",
    ],
    whoShouldWait: ["Acute gastrointestinal illness — defer until recovered"],
    contraindications: ["Anaphylaxis to a previous oral cholera vaccine"],
    precautions: ["Not a substitute for water, sanitation, and hygiene (WASH)"],
    commonSideEffects: ["Abdominal discomfort", "Diarrhoea", "Headache"],
    rareRisks: ["Allergic reaction"],
    route: "oral",
    siteOptions: ["Oral"],
    doseMl: null,
    seriesDoses: 2,
    seriesIntervalDays: 14,
    boosterIntervalMonths: 24,
    minAgeMonths: 12,
    maxAgeMonths: null,
    visTitle: "Oral cholera vaccine information",
    visVersion: "WHO-OCV",
    visSummary:
      "Oral cholera vaccine is swallowed, not injected. Two doses are usually needed. Continue to use safe water and hygiene — the vaccine is additional protection, not a replacement.",
    storageRequirements: COLD_CHAIN_STANDARD,
    priceKes: 1800,
    pharmacyAdministered: true,
    travelRelated: true,
    seasonLabel: "Outbreak windows",
    regulatoryNotes: "During MoH campaigns, eligibility and dosing follow the campaign protocol.",
    sortOrder: 100,
  },
  {
    slug: "meningococcal",
    name: "Meningococcal vaccine (ACWY / MenB)",
    antigen: "Neisseria meningitidis",
    brandName: "Menveo / Nimenrix / Bexsero equivalent",
    manufacturer: "Varies",
    category: "travel",
    diseasesPrevented: ["Meningococcal meningitis", "Meningococcal septicaemia"],
    description:
      "Meningococcal conjugate (ACWY) and, where stocked, MenB vaccines. Required or recommended for Hajj/Umrah, the meningitis belt, and certain boarding-school or campus settings.",
    indications: "Travel (Hajj, meningitis belt), occupational, and outbreak use.",
    whoShouldGet: [
      "Pilgrims to Hajj/Umrah (ACWY typically required)",
      "Travellers to the African meningitis belt in the dry season",
      "People with asplenia or complement deficiency (clinician-directed)",
    ],
    whoShouldWait: ["Moderate/severe acute illness — defer"],
    contraindications: ["Anaphylaxis to a previous meningococcal vaccine"],
    precautions: ["Confirm which serogroups are required for the destination (ACWY vs B)"],
    commonSideEffects: ["Sore arm", "Fever", "Headache", "Fatigue"],
    rareRisks: ["Anaphylaxis"],
    route: "IM",
    siteOptions: ["Left deltoid", "Right deltoid"],
    doseMl: 0.5,
    seriesDoses: 1,
    seriesIntervalDays: null,
    boosterIntervalMonths: 60,
    minAgeMonths: 24,
    maxAgeMonths: null,
    visTitle: "Meningococcal vaccine information",
    visVersion: "2024-travel",
    visSummary:
      "This vaccine protects against specific meningococcal serogroups. Hajj/Umrah and some countries require documented ACWY vaccination. Bring your travel dates so we can complete certificates correctly.",
    storageRequirements: COLD_CHAIN_STANDARD,
    priceKes: 5500,
    pharmacyAdministered: true,
    travelRelated: true,
    seasonLabel: "Hajj season / dry-season meningitis belt",
    regulatoryNotes: "International certificate of vaccination may be required — staff complete destination-specific paperwork.",
    sortOrder: 110,
  },
  {
    slug: "kep-childhood-schedule",
    name: "KEPI childhood immunisation (information)",
    antigen: "KEPI / NESI schedule (BCG, polio, pentavalent, PCV, rotavirus, measles, HPV)",
    brandName: null,
    manufacturer: "National programme",
    category: "routine_child",
    diseasesPrevented: [
      "Tuberculosis (BCG)",
      "Polio",
      "Diphtheria, tetanus, pertussis, hepatitis B, Hib",
      "Pneumococcal disease",
      "Rotavirus diarrhoea",
      "Measles",
      "HPV (school programme)",
    ],
    description:
      "Kenya Expanded Programme on Immunisation (KEPI) childhood schedule. These vaccines are primarily delivered in public immunisation clinics and maternal-child health (MCH) units. This pharmacy provides schedules, catch-up counselling, and records review — not a replacement for the national programme.",
    indications: "Information, catch-up counselling, and referral to KEPI/MCH clinics.",
    whoShouldGet: [
      "All infants and children per the national KEPI schedule",
      "Children with incomplete or unknown immunisation history (catch-up)",
    ],
    whoShouldWait: ["Follow KEPI clinic guidance for sick children"],
    contraindications: ["Product-specific — KEPI clinic will screen"],
    precautions: ["Bring the mother-child booklet (pink book) to every visit"],
    commonSideEffects: ["Varies by antigen — clinic will explain"],
    rareRisks: ["Varies by antigen"],
    route: "IM",
    siteOptions: ["Per KEPI clinic protocol"],
    doseMl: null,
    seriesDoses: 1,
    seriesIntervalDays: null,
    boosterIntervalMonths: null,
    minAgeMonths: 0,
    maxAgeMonths: 216,
    visTitle: "KEPI childhood immunisation schedule",
    visVersion: "MoH-KEPI",
    visSummary:
      "Childhood vaccines in Kenya are given on a national schedule at public immunisation clinics. Keep the mother-child booklet. This pharmacy can review the booklet, explain overdue doses, and refer you to the nearest KEPI site.",
    storageRequirements: "National programme cold chain (not routinely held as pharmacy stock).",
    priceKes: null,
    pharmacyAdministered: false,
    travelRelated: false,
    seasonLabel: null,
    regulatoryNotes:
      "Pharmacy does not substitute for KEPI. Paediatric on-site administration is off by default unless the pharmacy holds specific authorisation (policy flag).",
    sortOrder: 200,
  },
];

export const PRE_VACCINATION_QUESTIONS: Array<{
  id: string;
  prompt: string;
  flag: "allergyFlag" | "pregnancyFlag" | "immunocompromisedFlag" | "recentIllnessFlag" | "previousReactionFlag" | "anticoagulantFlag" | null;
  help: string;
}> = [
  {
    id: "feeling_well",
    prompt: "Are you feeling well today (no fever, vomiting, or acute illness)?",
    flag: "recentIllnessFlag",
    help: "If you have a moderate or severe illness, we usually wait until you recover. Mild colds are often fine.",
  },
  {
    id: "allergy_vaccine",
    prompt: "Have you ever had a severe allergic reaction (anaphylaxis) to a vaccine or an injectable medicine?",
    flag: "allergyFlag",
    help: "A previous anaphylactic reaction may mean this vaccine is contraindicated or needs extra observation.",
  },
  {
    id: "allergy_components",
    prompt: "Do you have a known severe allergy to eggs, gelatin, yeast, latex, or polyethylene glycol (PEG)?",
    flag: "allergyFlag",
    help: "Some vaccines contain these. The pharmacist will match the product to your history.",
  },
  {
    id: "previous_reaction",
    prompt: "Have you had a serious reaction after a previous dose of this (or a similar) vaccine?",
    flag: "previousReactionFlag",
    help: "Includes high fever, extensive swelling, or neurologic symptoms.",
  },
  {
    id: "pregnant",
    prompt: "Are you pregnant, trying to conceive, or breastfeeding?",
    flag: "pregnancyFlag",
    help: "Some vaccines are recommended in pregnancy (inactivated flu, Tdap). Live vaccines are usually deferred.",
  },
  {
    id: "immune",
    prompt: "Do you have a weakened immune system (HIV, cancer treatment, steroids, transplant, asplenia)?",
    flag: "immunocompromisedFlag",
    help: "Live vaccines may be contraindicated. Inactivated vaccines are often especially important.",
  },
  {
    id: "bleeding",
    prompt: "Do you have a bleeding disorder or take anticoagulants (warfarin, DOACs) or high-dose antiplatelets?",
    flag: "anticoagulantFlag",
    help: "We can still vaccinate with a fine needle and prolonged pressure. IM vs SC choice may change.",
  },
  {
    id: "gbs",
    prompt: "Have you ever had Guillain-Barré syndrome?",
    flag: "previousReactionFlag",
    help: "Relevant mainly for influenza and tetanus-containing vaccines.",
  },
  {
    id: "recent_vaccines",
    prompt: "Have you received any other vaccine in the last 4 weeks?",
    flag: null,
    help: "Live vaccines sometimes need spacing. Inactivated vaccines can usually be co-administered.",
  },
  {
    id: "history_this_antigen",
    prompt: "Have you already completed this vaccine series (bring records if you have them)?",
    flag: null,
    help: "We check your digital record and any paper certificates so we do not duplicate doses unnecessarily.",
  },
];

export type ScreeningAnswers = Record<string, "yes" | "no" | "unsure">;

export function evaluatePreVaccinationScreening(answers: ScreeningAnswers): {
  outcome: "eligible" | "defer" | "refer" | "contraindicated";
  reason: string;
  flags: {
    allergyFlag: boolean;
    pregnancyFlag: boolean;
    immunocompromisedFlag: boolean;
    recentIllnessFlag: boolean;
    previousReactionFlag: boolean;
    anticoagulantFlag: boolean;
  };
} {
  const yes = (id: string) => answers[id] === "yes";
  const flags = {
    allergyFlag: yes("allergy_vaccine") || yes("allergy_components"),
    pregnancyFlag: yes("pregnant"),
    immunocompromisedFlag: yes("immune"),
    recentIllnessFlag: answers["feeling_well"] === "no",
    previousReactionFlag: yes("previous_reaction") || yes("gbs"),
    anticoagulantFlag: yes("bleeding"),
  };

  if (yes("allergy_vaccine") || yes("previous_reaction")) {
    return {
      outcome: "contraindicated",
      reason:
        "History of severe vaccine reaction. Do not administer. Refer to a clinician / allergist and document.",
      flags,
    };
  }
  if (flags.recentIllnessFlag) {
    return {
      outcome: "defer",
      reason: "Acute illness today. Defer until recovered unless a tetanus-prone wound or outbreak protocol says otherwise.",
      flags,
    };
  }
  if (flags.immunocompromisedFlag && flags.pregnancyFlag) {
    return {
      outcome: "refer",
      reason: "Pregnancy plus immunosuppression — pharmacist must confirm product choice with a clinician.",
      flags,
    };
  }
  if (yes("gbs")) {
    return {
      outcome: "refer",
      reason: "Prior Guillain-Barré syndrome — shared decision-making with a clinician before influenza or tetanus boosters.",
      flags,
    };
  }
  return {
    outcome: "eligible",
    reason: "No absolute contraindications flagged. Pharmacist will still confirm product, dose, and observation time.",
    flags,
  };
}

export const ADULT_IMMUNIZATION_SCHEDULE: Array<{
  ageOrTrigger: string;
  vaccines: string[];
  note: string;
}> = [
  {
    ageOrTrigger: "Every year",
    vaccines: ["Influenza"],
    note: "Especially 65+, pregnancy, chronic disease, healthcare workers.",
  },
  {
    ageOrTrigger: "Every 10 years",
    vaccines: ["Tdap / Td"],
    note: "One Tdap if never received in adulthood, then Td or Tdap boosters. Extra Tdap each pregnancy.",
  },
  {
    ageOrTrigger: "Age 65+",
    vaccines: ["Pneumococcal", "Influenza", "COVID-19 booster (per MoH)"],
    note: "Product sequence for pneumococcal is confirmed at the counter.",
  },
  {
    ageOrTrigger: "Once in adulthood if unvaccinated",
    vaccines: ["Hepatitis B (3 doses)", "HPV catch-up if age-eligible"],
    note: "Healthcare workers: hepatitis B is occupationally essential.",
  },
  {
    ageOrTrigger: "Travel / pilgrimage",
    vaccines: ["Yellow fever (designated centre)", "Typhoid", "Hepatitis A", "Meningococcal ACWY", "Cholera if outbreak"],
    note: "Start travel consults 4–6 weeks before departure.",
  },
];

export const KEPI_CHILDHOOD_SCHEDULE: Array<{
  age: string;
  vaccines: string[];
}> = [
  { age: "Birth", vaccines: ["BCG", "OPV-0"] },
  { age: "6 weeks", vaccines: ["OPV-1", "Pentavalent-1", "PCV-1", "Rota-1", "IPV"] },
  { age: "10 weeks", vaccines: ["OPV-2", "Pentavalent-2", "PCV-2", "Rota-2"] },
  { age: "14 weeks", vaccines: ["OPV-3", "Pentavalent-3", "PCV-3", "IPV"] },
  { age: "9 months", vaccines: ["Measles-rubella 1", "Yellow fever (where indicated)"] },
  { age: "18 months", vaccines: ["Measles-rubella 2"] },
  { age: "10 years (school)", vaccines: ["HPV (girls — national school programme; follow current MoH circulars)"] },
];

export const COUNSELLING_TOPICS: Array<{
  slug: string;
  title: string;
  durationMinutes: number;
  summary: string;
  goals: string[];
  resources: string[];
}> = [
  {
    slug: "immunization_education",
    title: "Immunisation education & schedule review",
    durationMinutes: 20,
    summary:
      "Walk through adult, travel, or childhood schedules; review records; plan overdue doses; explain VIS and consent.",
    goals: ["Complete overdue doses", "Understand next due dates", "Know when to seek care after vaccination"],
    resources: ["Printed/digital schedule", "Vaccine information sheets", "Portal immunisation card"],
  },
  {
    slug: "travel_health",
    title: "Travel health counselling",
    durationMinutes: 30,
    summary:
      "Destination-specific vaccines, malaria chemoprophylaxis (where a prescription is appropriate), mosquito bite prevention, food and water safety, and yellow-fever certificate rules.",
    goals: ["Right vaccines for the itinerary", "Malaria prevention plan", "ICVP / certificate paperwork"],
    resources: ["Travel vaccine checklist", "MoH/WHO destination notes", "Bite-prevention leaflet"],
  },
  {
    slug: "smoking_cessation",
    title: "Tobacco cessation counselling",
    durationMinutes: 25,
    summary:
      "Brief 5A's counselling, NRT product selection, trigger planning, and follow-up. Pharmacist support, not a diagnosis.",
    goals: ["Set a quit date", "Choose NRT or non-drug strategies", "Plan follow-up at 1–2 weeks"],
    resources: ["Quit plan card", "NRT how-to", "National quit-line contacts"],
  },
  {
    slug: "diabetes_prevention",
    title: "Diabetes prevention & metabolic health",
    durationMinutes: 25,
    summary:
      "Lifestyle counselling after a pharmacy glucose/BMI screening: plate method, walking targets, when to see a clinician.",
    goals: ["Understand screening vs diagnosis", "Agree 2–3 lifestyle changes", "Book a follow-up screening"],
    resources: ["Plate-method card", "Screening referral if indicated"],
  },
  {
    slug: "cardiovascular_risk",
    title: "Blood pressure & heart-risk counselling",
    durationMinutes: 20,
    summary:
      "Explain BP categories, salt and activity, medication adherence if already prescribed, and red-flag symptoms.",
    goals: ["Know personal BP category", "Home-monitor technique if buying a cuff", "Urgent-care thresholds"],
    resources: ["BP category chart", "DASH-style food tips"],
  },
  {
    slug: "weight_management",
    title: "Weight & nutrition counselling",
    durationMinutes: 25,
    summary:
      "BMI context, sustainable eating patterns, and when specialist referral is appropriate. No fad-diet prescriptions.",
    goals: ["Set a realistic 5–10% goal if indicated", "Identify one nutrition swap", "Activity plan"],
    resources: ["BMI explainer", "Label-reading tips"],
  },
  {
    slug: "malaria_prevention",
    title: "Malaria prevention counselling",
    durationMinutes: 20,
    summary:
      "Bite prevention, when Rapid Diagnostic Tests are appropriate, danger signs of severe malaria, and travel prophylaxis education.",
    goals: ["Recognise fever as an emergency in endemic settings", "Correct RDT counselling", "Net and repellent use"],
    resources: ["Danger-signs card", "RDT vs lab testing explainer"],
  },
  {
    slug: "hiv_prevention",
    title: "HIV prevention & testing information",
    durationMinutes: 20,
    summary:
      "Information on testing sites, condoms, and when to discuss PrEP with a clinician. Pharmacy provides education and referral — not a diagnosis.",
    goals: ["Know local testing options", "Understand PrEP is clinician-initiated", "Stigma-free questions answered"],
    resources: ["NASCOP / local testing directory", "Referral slip"],
  },
  {
    slug: "alcohol",
    title: "Alcohol-use brief intervention",
    durationMinutes: 20,
    summary: "Brief screening conversation, harm-reduction tips, and referral to counselling or medical care.",
    goals: ["Honest baseline", "One reduction strategy", "Crisis contacts if needed"],
    resources: ["Standard-drink card", "Local support contacts"],
  },
  {
    slug: "family_planning",
    title: "Reproductive health & family-planning information",
    durationMinutes: 20,
    summary:
      "OTC emergency contraception counselling where legally supplied, condom education, and referral for prescribed methods. Always within local regulatory scope.",
    goals: ["Correct product use", "Know when to see a clinician", "STI prevention alongside contraception"],
    resources: ["Method comparison leaflet", "Clinic referral"],
  },
  {
    slug: "nutrition",
    title: "General nutrition for prevention",
    durationMinutes: 20,
    summary: "Salt, sugar, fibre, hydration, and supplement interaction checks against the patient's medicine list.",
    goals: ["Flag supplement–drug interactions", "Simple plate pattern", "When a supplement is unnecessary"],
    resources: ["Heart-health nutrition article", "Interaction checklist"],
  },
  {
    slug: "general_wellness",
    title: "General preventive-health counselling",
    durationMinutes: 20,
    summary:
      "Open session covering screening, vaccines due, lifestyle, and how to use the patient portal for records.",
    goals: ["Personal prevention plan", "Book any due vaccines or screenings"],
    resources: ["Portal how-to", "Annual prevention checklist"],
  },
];

export const PUBLIC_HEALTH_EDUCATION: Array<{
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  readTime: string;
  points: string[];
}> = [
  {
    slug: "why-vaccines-matter",
    title: "Why community pharmacy vaccines matter",
    category: "Immunisation",
    excerpt: "Pharmacies make adult and travel vaccines easier to access — without replacing national childhood programmes.",
    readTime: "4 min",
    points: [
      "Vaccines train the immune system to recognise a disease before you meet it.",
      "Community pharmacies add evening and weekend access for busy adults.",
      "Childhood KEPI vaccines still belong at public immunisation clinics; we help you understand the booklet.",
      "Every dose we give is lot-traced and observed for at least 15 minutes.",
    ],
  },
  {
    slug: "after-your-vaccine",
    title: "What to expect after a vaccine",
    category: "Immunisation",
    excerpt: "Sore arms are normal. Breathing difficulty is not — that is why we observe you.",
    readTime: "3 min",
    points: [
      "Stay on site for 15 minutes (30 if you have a significant allergy history).",
      "Paracetamol or ibuprofen can help arm pain unless your clinician has advised otherwise.",
      "Red-flag symptoms: widespread rash, swelling of the face or throat, trouble breathing, collapse — call 999/112 or return immediately.",
      "Mild fever and tiredness for 24–48 hours is common, especially after COVID-19 or influenza vaccines.",
    ],
  },
  {
    slug: "travel-health-kenya",
    title: "Travel health from Nairobi: a practical checklist",
    category: "Travel",
    excerpt: "Yellow fever certificates, typhoid, hepatitis A, malaria, and timing.",
    readTime: "5 min",
    points: [
      "Book a travel consult 4–6 weeks before you fly.",
      "Yellow fever ICVP cards are only issued by designated centres and are valid 10 days after the dose.",
      "Hajj/Umrah typically requires documented meningococcal ACWY.",
      "Malaria prevention is not a vaccine — ask about nets, repellents, and whether prophylaxis is indicated.",
    ],
  },
  {
    slug: "flu-myths",
    title: "Flu vaccine myths, answered by a pharmacist",
    category: "Seasonal",
    excerpt: "The shot cannot give you influenza. Timing still matters.",
    readTime: "3 min",
    points: [
      "Inactivated flu vaccine contains no live virus.",
      "You can still catch other viruses that feel like 'flu'.",
      "Protection takes about two weeks to build.",
      "It is better to vaccinate late in the season than not at all.",
    ],
  },
  {
    slug: "aefi-what-to-do",
    title: "Adverse events following immunisation (AEFI)",
    category: "Safety",
    excerpt: "How Kenya reports vaccine safety issues, and what the pharmacy does.",
    readTime: "4 min",
    points: [
      "Most reactions are mild and expected.",
      "Serious events are rare and must be documented with lot number and time of onset.",
      "We can file an AEFI report to PPB / disease surveillance on your behalf.",
      "Never ignore breathing difficulty, collapse, or rapidly spreading rash.",
    ],
  },
  {
    slug: "prevention-year-round",
    title: "A year-round prevention plan",
    category: "Wellness",
    excerpt: "Vaccines, screenings, counselling, and campaigns — how they fit together.",
    readTime: "4 min",
    points: [
      "Know your adult vaccine due dates (flu annually, Tdap every 10 years, pneumococcal at 65+).",
      "Pair immunisation visits with BP, glucose, or BMI checks.",
      "Join pharmacy health campaigns (flu season, diabetes month, outbreak response).",
      "Use the patient portal as your digital immunisation card.",
    ],
  },
];

export const DEFAULT_IMMUNIZATION_POLICY = {
  enabled: true,
  jurisdiction: "Kenya",
  authorizingBody: "Pharmacy and Poisons Board (PPB) / Ministry of Health",
  authorizingRegulation:
    "Pharmacy-based immunisation is permitted only where the pharmacy and the individual immuniser hold current local authorisation and training. Childhood KEPI antigens remain with national immunisation clinics unless a specific authorisation exists.",
  supervisingPharmacistRequired: true,
  observationMinutesDefault: 15,
  visRequired: true,
  aefiReportingContact: "PPB pharmacovigilance / Division of Disease Surveillance and Response",
  aefiReportingAuthority: "PPB / Division of Disease Surveillance and Response",
  coldChainNotes: COLD_CHAIN_STANDARD,
  publicDisclaimer:
    "Vaccination and preventive services at this pharmacy are offered only where authorised and staffed. A pharmacy vaccine does not replace your clinician, hospital emergency care, or the national childhood immunisation programme. Screening questions, vaccine information, and consent are required before every dose.",
  walkInAccepted: true,
  paediatricOnSite: false,
};

export const CONSENT_TEXT = `I confirm that I have been given vaccine information in a language I understand, had the chance to ask questions, and that the answers on the pre-vaccination questionnaire are true to the best of my knowledge.

I understand:
• Vaccination is voluntary.
• Common reactions include a sore arm, mild fever, and tiredness.
• Serious allergic reactions are rare; I will remain for the observation period.
• This service is offered under local pharmacy immunisation rules and is not a medical diagnosis.
• Childhood KEPI vaccines are normally given at public immunisation clinics.

I consent to administration of the selected vaccine, to the pharmacy keeping a clinical record (lot, site, immuniser, consent), and to sharing the record with me (and, if I agree, with a national immunisation information system or my clinician).`;

export const VACCINE_CATEGORY_LABELS: Record<VaccineCategory, string> = {
  routine_adult: "Routine adult",
  routine_child: "Childhood (KEPI information)",
  seasonal: "Seasonal",
  travel: "Travel",
  occupational: "Occupational",
  outbreak: "Outbreak response",
  catch_up: "Catch-up",
};

export function getVaccineBySlug(slug: string): VaccineSeed | undefined {
  return VACCINE_CATALOG.find((v) => v.slug === slug);
}

export function searchVaccines(query: string): VaccineSeed[] {
  const q = query.trim().toLowerCase();
  if (!q) return VACCINE_CATALOG.filter((v) => v.pharmacyAdministered);
  return VACCINE_CATALOG.filter((v) => {
    const hay = [
      v.name,
      v.antigen,
      v.category,
      v.description,
      ...v.diseasesPrevented,
      v.brandName || "",
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}
