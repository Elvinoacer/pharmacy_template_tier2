export interface OtcCategoryGuidance {
  slug: string;
  name: string;
  shortDescription: string;
  selfCareAppropriate: string[];
  medicalAttentionCriteria: string[];
  pharmacistTips: string[];
  commonActiveIngredients: string[];
  featuredBrands: string[];
  maxSelfCareDuration: string;
  emergencyWarning?: string;
}

export interface SelfCareCondition {
  id: string;
  categorySlug: string;
  categoryName: string;
  conditionName: string;
  description: string;
  selfCareSigns: string[];
  recommendedOtcTypes: string[];
  homeMeasures: string[];
  pharmacistConsultTriggers: string[];
  emergencyRedFlags: string[];
  expectedRecovery: string;
}

export const OTC_CATEGORIES_GUIDANCE: Record<string, OtcCategoryGuidance> = {
  "pain-relief": {
    slug: "pain-relief",
    name: "Pain Relief",
    shortDescription:
      "Non-prescription analgesics, anti-inflammatories, and topical rubs for mild-to-moderate headaches, muscle aches, joint stiffness, and fever.",
    selfCareAppropriate: [
      "Mild to moderate tension headaches or stress headaches",
      "Minor muscle soreness, post-exercise stiffness, or minor backache",
      "Mild osteoarthritis pain in known diagnosed joints",
      "Occasional menstrual cramps (dysmenorrhea)",
      "Mild fever associated with a simple viral cold",
      "Temporary toothache while waiting for a confirmed dental appointment",
    ],
    medicalAttentionCriteria: [
      "Sudden, severe 'thunderclap' headache (worst headache of your life)",
      "Headache accompanied by stiff neck, fever, confusion, or sensitivity to light",
      "Headache following a head injury or accompanied by numbness/weakness",
      "Pain radiating to chest, left shoulder, neck, or jaw, or pain with shortness of breath",
      "Severe abdominal pain, especially if sudden, sharp, or localized",
      "Pain persisting longer than 7–10 days without clear improvement",
      "Pain in individuals with a history of stomach ulcers, kidney disease, or heart failure before taking NSAIDs",
    ],
    pharmacistTips: [
      "Check all product labels carefully: do not combine multiple medicines containing paracetamol (acetaminophen) — max 4,000 mg daily for adults.",
      "Take oral NSAIDs (ibuprofen, naproxen, diclofenac) with food or milk to protect your stomach lining.",
      "Topical gels (e.g. diclofenac, menthol) provide targeted relief with lower systemic side effects for joint and muscle aches.",
      "Avoid combining oral NSAIDs with blood thinners (warfarin, apixaban) or high-dose aspirin without clinician guidance.",
    ],
    commonActiveIngredients: [
      "Paracetamol (Acetaminophen)",
      "Ibuprofen",
      "Diclofenac Diethylamine",
      "Aspirin (Acetylsalicylic Acid)",
      "Menthol & Methyl Salicylate",
    ],
    featuredBrands: ["Panadol", "Brufen", "Voltaren", "Deep Heat", "Disprin", "Advil"],
    maxSelfCareDuration: "3 to 5 days for fever; 7 to 10 days for pain",
    emergencyWarning: "Call emergency services immediately if pain is accompanied by chest pressure, radiating arm pain, or sudden neurological deficits.",
  },

  "cold-flu": {
    slug: "cold-flu",
    name: "Cold & Flu",
    shortDescription:
      "Symptom-targeted treatments for nasal congestion, sore throats, coughs, and seasonal upper respiratory viral infections.",
    selfCareAppropriate: [
      "Mild viral upper respiratory symptoms: runny nose, sneezing, scratchy throat",
      "Dry, tickly cough or mild chesty cough without breathing difficulty",
      "Mild congestion and head stuffiness without severe sinus pain",
      "Low-grade fever (< 38.5°C) in adults with general fatigue",
    ],
    medicalAttentionCriteria: [
      "Shortness of breath, wheezing, or difficulty breathing at rest",
      "High persistent fever (> 39°C) or fever lasting more than 3 consecutive days",
      "Coughing up blood, rust-coloured sputum, or thick foul-tasting mucus",
      "Severe chest pain when inhaling or coughing",
      "Symptoms that improve briefly and then suddenly worsen with high fever (secondary infection)",
      "Any cold or flu in infants under 3 months, or elderly/immunocompromised patients",
    ],
    pharmacistTips: [
      "Limit topical decongestant nasal sprays (e.g. xylometazoline, oxymetazoline) to a maximum of 3–5 consecutive days to prevent rebound congestion (rhinitis medicamentosa).",
      "Hydration (warm broths, water) and steam inhalation thin mucus more effectively than many multi-ingredient syrups.",
      "Watch for duplicate active ingredients: multi-symptom cold sachets often contain paracetamol, so avoid taking extra painkillers.",
      "Oral decongestants (pseudoephedrine, phenylephrine) can elevate blood pressure — check with a pharmacist if you have hypertension.",
    ],
    commonActiveIngredients: [
      "Xylometazoline HCl",
      "Dextromethorphan HBr",
      "Guaifenesin",
      "Diphenhydramine",
      "Amylmetacresol & Dichlorobenzyl Alcohol",
      "Menthol & Camphor",
    ],
    featuredBrands: ["Benylin", "Otrivin", "Strepsils", "Vicks", "Actifed", "Mucinex"],
    maxSelfCareDuration: "7 to 10 days for cough; 3 to 5 days for nasal sprays",
    emergencyWarning: "Seek urgent medical attention if you experience severe breathlessness, blue-tinted lips, or confusion.",
  },

  "allergy-treatments": {
    slug: "allergy-treatments",
    name: "Allergy Treatments",
    shortDescription:
      "Non-drowsy antihistamines, corticosteroid nasal sprays, and soothing eye drops for seasonal and perennial allergic rhinitis, hives, and pet allergies.",
    selfCareAppropriate: [
      "Seasonal hay fever: sneezing, clear watery nasal discharge, itchy nose and roof of mouth",
      "Mild allergic conjunctivitis: itchy, red, watery eyes without pain or vision changes",
      "Mild localized allergic skin reactions or transient hives (urticaria)",
      "Allergic reactions to pollen, house dust mites, or animal dander",
    ],
    medicalAttentionCriteria: [
      "Signs of anaphylaxis: swelling of lips, tongue, throat, tightness in the chest, difficulty swallowing or breathing (EMERGENCY)",
      "Eye pain, significant sensitivity to light (photophobia), or altered visual acuity",
      "Severe extensive hives accompanied by fever, joint pain, or dizziness",
      "Allergy symptoms completely unresponsive to 2 weeks of consistent OTC therapy",
    ],
    pharmacistTips: [
      "Second-generation antihistamines (cetirizine, loratadine, fexofenadine) cause significantly less drowsiness than first-generation options.",
      "Steroid nasal sprays (fluticasone, mometasone) are most effective when used daily rather than intermittently on high-pollen days.",
      "Aim nasal spray nozzles slightly outward towards the ear, rather than directly at the nasal septum, to prevent nosebleeds.",
      "Rinse eyes with sterile saline or artificial tears before using medicated allergy eye drops for optimal comfort.",
    ],
    commonActiveIngredients: [
      "Cetirizine Dihydrochloride",
      "Loratadine",
      "Fexofenadine HCl",
      "Fluticasone Propionate",
      "Sodium Cromoglicate",
    ],
    featuredBrands: ["Zyrtec", "Clarityn", "Telfast", "Flixonase", "Optrex", "Allegra"],
    maxSelfCareDuration: "14 days of OTC trial; ongoing chronic management should be reviewed annually",
    emergencyWarning: "If you experience swelling in the throat or difficulty breathing, use an epinephrine auto-injector if prescribed and call emergency services immediately.",
  },

  "digestive-health": {
    slug: "digestive-health",
    name: "Digestive Health Products",
    shortDescription:
      "Antacids, proton pump inhibitors, oral rehydration salts, anti-diarrheals, laxatives, and probiotics for common gastrointestinal discomforts.",
    selfCareAppropriate: [
      "Occasional heartburn or acid reflux related to specific rich, spicy foods",
      "Mild, acute uncomplicated diarrhea with good fluid intake",
      "Mild episodic constipation responding to increased fiber and hydration",
      "Mild indigestion, bloating, or trapped intestinal gas",
      "Maintenance of healthy gut flora during or after dietary changes",
    ],
    medicalAttentionCriteria: [
      "Black, tarry stools (melena) or visible bright red blood in stool or vomit",
      "Difficulty or pain when swallowing food or liquids (dysphagia)",
      "Unexplained significant weight loss accompanying gastrointestinal symptoms",
      "Severe or persistent vomiting preventing all fluid retention (dehydration risk)",
      "Diarrhea lasting > 48 hours in adults or > 24 hours in children",
      "Severe, sharp, or worsening abdominal pain, or pain with high fever",
      "New onset of persistent altered bowel habits in adults over 50",
    ],
    pharmacistTips: [
      "Oral Rehydration Salts (ORS) are the cornerstone of diarrhea management — replace lost electrolytes before taking motility blockers.",
      "Do not give loperamide if fever is present or if stool contains blood or mucus (indicates bacterial dysentery).",
      "Antacids provide fast, short-term relief (1–2 hours); short-course PPIs (omeprazole) take 1–4 days for full effect but provide 24-hour acid suppression.",
      "Stimulant laxatives (bisacodyl, senna) should be used short-term (under 7 days); osmotic laxatives (lactulose, macrogol) and dietary fiber are preferred for regular regularity.",
    ],
    commonActiveIngredients: [
      "Sodium Alginate & Calcium Carbonate",
      "Omeprazole",
      "Loperamide HCl",
      "Oral Rehydration Salts (WHO Formula)",
      "Bisacodyl",
      "Multi-Strain Probiotics",
    ],
    featuredBrands: ["Gaviscon", "Imodium", "Dioralyte", "Dulcolax", "Bio-Kult", "Prilosec"],
    maxSelfCareDuration: "14 days for acid reflux PPIs; 2 days for anti-diarrheals; 7 days for laxatives",
    emergencyWarning: "Vomiting blood or coffee-ground material, or passing black tarry stools requires emergency medical evaluation.",
  },

  "first-aid": {
    slug: "first-aid",
    name: "First-Aid Products",
    shortDescription:
      "Essential medical emergency supplies, sterile bandages, tapes, burn dressings, and cold compresses for home, workplace, and travel care.",
    selfCareAppropriate: [
      "Minor superficial cuts, scrapes, and abrasions with stopped bleeding",
      "Minor first-degree burns (redness, mild pain, no blistering, < 2 inches)",
      "Mild acute sprains or strains managed with R.I.C.E. (Rest, Ice, Compression, Elevation)",
      "Intact minor insect bites or stings without systemic allergic reaction",
      "Basic home and vehicle emergency preparedness kits",
    ],
    medicalAttentionCriteria: [
      "Deep, gaping wounds or cuts that do not stop bleeding after 10 minutes of firm direct pressure (needs stitches)",
      "Animal or human bites, or dirty wounds from rusty metal (tetanus and rabies risk)",
      "Second- or third-degree burns: blistering, white/charred skin, or any burn on face, hands, groin, or major joints",
      "Suspected bone fracture: deformity, severe pain, inability to bear any weight, or visible bone",
      "Foreign objects deeply embedded in eyes, puncture wounds, or joint spaces",
    ],
    pharmacistTips: [
      "Clean fresh wounds with clean running water or sterile saline; avoid harsh alcohol or hydrogen peroxide directly on open tissue as it slows healing.",
      "Cool burns immediately with cool (not freezing) running tap water for at least 10–20 minutes before applying hydrogel or non-stick dressings.",
      "Keep first-aid kits stocked and inspect expiry dates on sterile dressings and ointments every 6 to 12 months.",
      "Apply elastic support bandages firmly for support, but ensure toes/fingers stay warm and pink (never too tight).",
    ],
    commonActiveIngredients: [
      "Sterile Hydrogel Burn Dressings",
      "Microporous Adhesive Tapes",
      "Sterile Gauze",
      "Elastic Crepe Support Bandages",
    ],
    featuredBrands: ["Band-Aid", "Burnshield", "3M Nexcare", "Elastoplast", "Curad"],
    maxSelfCareDuration: "Assess wound daily; seek care if not healing within 5–7 days",
    emergencyWarning: "Uncontrolled bleeding or suspected fractures require emergency medical rescue.",
  },

  "topical-treatments": {
    slug: "topical-treatments",
    name: "Topical Treatments",
    shortDescription:
      "Targeted creams, ointments, and lotions for localized skin inflammation, superficial fungal infections, minor insect stings, and hemorrhoidal comfort.",
    selfCareAppropriate: [
      "Mild localized insect bite reactions and contact dermatitis itching",
      "Athlete's foot (tinea pedis) between toes with mild itching and peeling",
      "Mild jock itch (tinea cruris) or localized ringworm (tinea corporis)",
      "Mild hemorrhoidal discomfort, burning, or itching around the external rectal area",
      "Minor localized skin irritation from jewelry, plants, or detergents",
    ],
    medicalAttentionCriteria: [
      "Rash covering large areas of the body, blistering, peeling, or spreading rapidly",
      "Signs of bacterial infection: yellow crusting, spreading warmth, red streaks, pus, or fever",
      "Rashes located on the face, eyelids, or around the genitals without previous clinical diagnosis",
      "Fungal infections affecting fingernails or toenails (requires prolonged systemic or specialized prescription treatment)",
      "Rectal bleeding, severe rectal pain, or black stools",
    ],
    pharmacistTips: [
      "Hydrocortisone 1% cream should be applied thinly once or twice daily for a maximum of 7 consecutive days; do not use on broken skin or viral infections (like cold sores).",
      "Continue antifungal creams (clotrimazole, miconazole) for 1–2 weeks AFTER symptoms completely clear to prevent fungal recurrence.",
      "Keep fungal treatment areas clean, dry, and expose them to air where possible (e.g. change socks twice daily for athlete's foot).",
      "Wash hands thoroughly before and after applying any medicated topical product.",
    ],
    commonActiveIngredients: [
      "Hydrocortisone 1%",
      "Clotrimazole 1%",
      "Bacitracin & Polymyxin B",
      "Calamine & Zinc Oxide",
      "Bismuth Oxide & Zinc Oxide",
    ],
    featuredBrands: ["Canesten", "Neosporin", "Anusol", "Cortizone", "Calamine"],
    maxSelfCareDuration: "7 days for topical hydrocortisone; 2–4 weeks for topical antifungals",
    emergencyWarning: "Spreading red streaks, high fever, or skin blistering after starting a new medication is a medical emergency (possible drug eruption).",
  },

  "skin-care": {
    slug: "skin-care",
    name: "Skin-Care Products",
    shortDescription:
      "Dermatologist-tested barrier repair creams, medical emollients, broad-spectrum sunscreens, and OTC acne therapies for healthy skin maintenance.",
    selfCareAppropriate: [
      "Everyday dry, rough, or sensitive skin maintenance",
      "Mild-to-moderate atopic eczema and xerosis barrier support",
      "Mild acne vulgaris: non-inflammatory whiteheads, blackheads, and occasional minor pimples",
      "Daily UV protection for anti-aging and skin cancer prevention",
      "Chapped lips, cracked heels, and winter dryness",
    ],
    medicalAttentionCriteria: [
      "Severe cystic acne with deep, painful nodules that risk permanent scarring",
      "Sudden flare of severe, weeping, infected eczema with fever",
      "New, changing, irregular, or dark moles (ABCDE melanoma rule: Asymmetry, Border, Color, Diameter, Evolving)",
      "Severe sunburn with blistering covering large body surface areas, chills, or dizziness",
      "Persistent non-healing skin sores lasting longer than 4 weeks",
    ],
    pharmacistTips: [
      "Apply thick ceramide or emollient creams immediately after bathing while skin is still slightly damp to lock in maximum hydration.",
      "Benzoyl peroxide (2.5% to 5%) and salicylic acid are gold-standard OTC acne actives; introduce gradually every other night to minimize dryness.",
      "Wear broad-spectrum SPF 30+ or SPF 50+ daily, and reapply every 2 hours during continuous outdoor activity or swimming.",
      "Avoid fragrance and harsh sulfates in body washes if you are prone to eczema or reactive dermatitis.",
    ],
    commonActiveIngredients: [
      "Ceramides (1, 3, 6-II) & Hyaluronic Acid",
      "Colloidal Oatmeal",
      "Benzoyl Peroxide",
      "Salicylic Acid (BHA)",
      "Broad Spectrum SPF 50+ Filters",
      "Urea 10%",
    ],
    featuredBrands: ["CeraVe", "La Roche-Posay", "Epimax", "Cetaphil", "PanOxyl", "Eucerin"],
    maxSelfCareDuration: "4 to 8 weeks for OTC acne improvement; ongoing for daily sun protection and emollients",
    emergencyWarning: "Changing moles or rapidly growing skin lesions should be evaluated by a dermatologist promptly.",
  },

  "antiseptics": {
    slug: "antiseptics",
    name: "Antiseptics",
    shortDescription:
      "Medical-grade antimicrobial skin cleansers, povidone-iodine solutions, hydrogen peroxide, and alcohol swabs for disinfecting minor wounds and intact skin.",
    selfCareAppropriate: [
      "Skin preparation before self-monitoring fingerstick blood glucose or injections",
      "Disinfecting intact skin surrounding minor cuts, grazes, or splinters",
      "Short-term skin cleansing for minor superficial scrapes",
      "General sanitization of intact hands when soap and water are unavailable",
    ],
    medicalAttentionCriteria: [
      "Deep puncture wounds, animal bites, or wounds with heavily embedded gravel/soil",
      "Wounds exhibiting signs of cellulitis: expanding hot red borders, extreme tenderness, systemic fever",
      "Antiseptic exposure in the eyes, ears (ruptured eardrum risk), or deep body cavities",
      "Known allergy or sensitivity to iodine (for povidone-iodine products)",
    ],
    pharmacistTips: [
      "Povidone-iodine (Betadine) provides broad-spectrum antibacterial, antifungal, and antiviral coverage without stinging.",
      "Allow alcohol wipes or iodine solutions to fully air-dry on skin before piercing with lancets or applying dressings for complete antimicrobial action.",
      "Avoid using undiluted hydrogen peroxide repeatedly in healing wounds; it can damage healthy new granulation tissue.",
      "Store antiseptic solutions tightly capped away from direct heat and sunlight to maintain active potency.",
    ],
    commonActiveIngredients: [
      "Povidone Iodine 10%",
      "Chlorhexidine Gluconate 0.5% - 4%",
      "70% Isopropyl Alcohol",
      "Hydrogen Peroxide 3%",
      "Chloroxylenol",
    ],
    featuredBrands: ["Betadine", "Dettol", "Savlon", "Hibiclens", "Medi-Swab"],
    maxSelfCareDuration: "Single use or up to 3 days for initial wound preparation",
    emergencyWarning: "Spreading infection from an unclean wound requires prompt oral or IV antibiotics from a physician.",
  },

  "wound-care": {
    slug: "wound-care",
    name: "Wound-Care Products",
    shortDescription:
      "Advanced hydrocolloid dressings, non-stick pads, sterile saline washes, silicone scar sheets, and adhesive skin closures for optimal moist wound healing.",
    selfCareAppropriate: [
      "Clean, superficial grazes, friction blisters, and paper cuts",
      "Minor post-surgical incision care after suture removal as instructed by surgeon",
      "Non-infected shallow abrasions healing under moist wound therapy",
      "Matured closed scars for silicone scar gel or sheet flattening",
    ],
    medicalAttentionCriteria: [
      "Gaped wound edges that pull apart (needs adhesive strips, glue, or sutures within 6–8 hours of injury)",
      "Pus drainage, foul odor, or worsening redness spreading outward from wound margins",
      "Numbness, loss of sensation, or inability to move fingers/toes distal to the wound",
      "Diabetic foot ulcers or chronic non-healing sores on lower legs (risk of severe tissue loss)",
      "Lack of tetanus vaccination within the past 5–10 years",
    ],
    pharmacistTips: [
      "Moist wound healing with hydrocolloid or non-stick dressings prevents scabbing and reduces scar formation by up to 40%.",
      "Irrigate wounds gently with sterile saline before applying clean dressings; never scrub forcefully.",
      "Change dressings whenever they become wet, soiled, loose, or strike-through drainage appears.",
      "Start silicone scar reduction gel only after the wound is 100% closed and re-epithelialized with no scabs.",
    ],
    commonActiveIngredients: [
      "Hydrocolloid Polymer Matrices",
      "Medical Grade Silicone Gel",
      "0.9% Sterile Sodium Chloride Saline",
      "Non-Adherent Polyester/Viscose Pads",
    ],
    featuredBrands: ["DuoDERM", "Melolin", "Kelo-Cote", "Steri-Strip", "Opsite", "Hansaplast"],
    maxSelfCareDuration: "7 to 10 days for acute healing; 60–90 days for scar maturation therapy",
    emergencyWarning: "Diabetic wounds or non-healing ulcers should never be managed with self-care alone.",
  },

  "oral-care": {
    slug: "oral-care",
    name: "Oral-Care Products",
    shortDescription:
      "Medicated antiseptic mouthwashes, mouth ulcer gels, emergency toothache analgesics, dry mouth hydrating rinses, and desensitizing toothpastes.",
    selfCareAppropriate: [
      "Minor aphthous mouth ulcers (canker sores) < 1cm in size",
      "Mild teething discomfort in babies and toddlers",
      "Temporary tooth sensitivity to cold or sweet foods",
      "Dry mouth (xerostomia) relief due to medication side effects",
      "Short-term gum inflammation (gingivitis) support with antiseptic rinse",
    ],
    medicalAttentionCriteria: [
      "Mouth ulcers lasting longer than 3 weeks without healing (requires screening for oral pathology)",
      "Severe throbbing toothache with facial swelling, gum abscess (pustule), or fever",
      "Difficulty opening the mouth (trismus) or difficulty swallowing saliva",
      "Bleeding gums that do not improve after 2 weeks of proper oral hygiene",
      "White patches inside mouth (oral thrush) or unexplained red velvet patches",
    ],
    pharmacistTips: [
      "Chlorhexidine mouthwash (Corsodyl) should be used 30 minutes after brushing (toothpaste detergents can inactivate chlorhexidine) and limited to 2 weeks to avoid temporary teeth staining.",
      "Apply protective barrier ulcer gels before meals to shield exposed nerve endings from acidic or spicy foods.",
      "Topical toothache gels (benzocaine) offer temporary numbing only; they do not treat underlying dental decay or nerve infection — see your dentist.",
      "For babies teething, chilled teething rings and sugar-free soothing gels provide gentle relief.",
    ],
    commonActiveIngredients: [
      "Chlorhexidine Digluconate 0.2%",
      "Choline Salicylate & Cetalkonium Chloride",
      "Benzocaine 20%",
      "Stannous Fluoride / Potassium Nitrate",
      "Enzyme-Based Hydrating Rinses (Xylitol, Lysozyme)",
    ],
    featuredBrands: ["Corsodyl", "Bonjela", "Orajel", "Biotène", "Sensodyne", "Colgate"],
    maxSelfCareDuration: "7 days for ulcer gels; 2–3 days for temporary toothache relief before dental visit",
    emergencyWarning: "Facial swelling spreading to the eye or neck from a dental infection is an urgent medical emergency.",
  },

  "feminine-hygiene": {
    slug: "feminine-hygiene",
    name: "Feminine Hygiene Products",
    shortDescription:
      "pH-balanced intimate washes, organic sanitary protection, single-dose thrush treatments, and period pain heat therapies for women's comfort.",
    selfCareAppropriate: [
      "Typical monthly menstrual flow management with breathable pads or tampons",
      "Recurrent diagnosed vaginal thrush (candida) with classic cottage-cheese discharge and itching",
      "Mild primary menstrual cramps responding to warmth and OTC analgesics",
      "Everyday external intimate cleansing with non-soap, pH-balanced washes",
    ],
    medicalAttentionCriteria: [
      "First episode of vaginal symptoms (needs initial clinical confirmation to rule out BV or STIs)",
      "Abnormal vaginal bleeding between cycles, after intercourse, or post-menopausal bleeding",
      "Discharge with a strong fishy odor, gray/green color, or accompanied by pelvic/lower abdominal pain",
      "Vaginal symptoms accompanied by fever, chills, or burning upon urination",
      "More than 2 thrush episodes in the past 6 months (recurrent thrush requires medical workup)",
      "Suspected pregnancy with unexplained pelvic pain or bleeding",
    ],
    pharmacistTips: [
      "Vaginal pessaries (clotrimazole 500mg) should be inserted at bedtime using the applicator; wear a pantyliner as residue will dissolve.",
      "The vagina is self-cleansing; only use gentle washes externally on the vulva — never douche, as douching destroys protective lactobacilli.",
      "Change tampons every 4 to 8 hours to prevent Toxic Shock Syndrome (TSS); use the lowest absorbency suitable for your flow.",
      "Warm therapeutic heat patches applied over the lower abdomen improve blood flow and relieve uterine cramping naturally.",
    ],
    commonActiveIngredients: [
      "Clotrimazole 500mg Pessary & 2% External Cream",
      "Fluconazole 150mg Oral Capsule (OTC in select jurisdictions)",
      "Lactic Acid & Aloe Vera Intimate Wash",
      "Therapeutic Iron-Powder Air-Activated Heat Elements",
    ],
    featuredBrands: ["Canesten", "Always", "Tampax", "Femfresh", "Cura-Heat", "Clearblue"],
    maxSelfCareDuration: "Single dose with 7 days for complete thrush resolution; see doctor if persistent",
    emergencyWarning: "Sudden high fever, vomiting, diarrhea, sunburn-like rash, and dizziness while using tampons may indicate Toxic Shock Syndrome — seek emergency care immediately.",
  },

  "baby-care": {
    slug: "baby-care",
    name: "Baby-Care Products",
    shortDescription:
      "Gentle pediatric fever drops with dosing syringes, zinc barrier diaper creams, simethicone infant colic drops, and sterile saline nasal mists.",
    selfCareAppropriate: [
      "Simple mild diaper rash (redness confined to diaper area with skin folds spared)",
      "Infant gas, bloating, and post-feeding colic fussiness in thriving infants",
      "Mild viral nasal congestion in infants over 3 months, managed with saline drops and suction",
      "Fever and irritability following childhood vaccinations in infants over 2–3 months",
      "Normal teething irritability, excessive drooling, and gum tenderness",
    ],
    medicalAttentionCriteria: [
      "ANY fever in an infant under 3 months of age (temperature > 38.0°C / 100.4°F is an immediate medical emergency)",
      "Fever > 39.0°C in infants 3–6 months, or fever lasting longer than 24–48 hours",
      "Signs of dehydration: dry nappies/diapers for > 6 hours, sunken fontanelle, no tears when crying, extreme lethargy",
      "Difficulty breathing: flared nostrils, chest retractions (skin sucking in between ribs), grunting, or rapid breathing",
      "Diaper rash with satellite red pustules spreading into skin folds (suggests secondary candida infection)",
      "Inconsolable crying lasting hours, high-pitched shrieking, or inability to wake the baby",
    ],
    pharmacistTips: [
      "Always dose infant liquid medicines by the baby's exact WEIGHT, not by age alone. Always use the included oral measuring syringe (never kitchen spoons).",
      "NEVER give aspirin or products containing salicylates to children or teenagers due to the risk of Reye's syndrome.",
      "Apply thick zinc oxide diaper paste (Sudocrem) at every nappy change to create a physical moisture barrier against urine and stool enzymes.",
      "Use sterile saline drops before feeds to clear blocked infant nasal passages, as babies are obligate nose-breathers.",
    ],
    commonActiveIngredients: [
      "Paracetamol (Acetaminophen) Infant Suspension 120mg/5ml",
      "Simethicone 40mg/ml Infant Drops",
      "Zinc Oxide 15% - 40% Barrier Paste",
      "Isotonic 0.9% Sterile Saline Nasal Mist",
    ],
    featuredBrands: ["Calpol", "Infacol", "Sudocrem", "Little Remedies", "Ashton & Parsons", "Aveeno Baby"],
    maxSelfCareDuration: "24 hours for fever in infants 3–6 months; 3 days for diaper rash before review",
    emergencyWarning: "Infant fever under 3 months, breathing retractions, or lethargy requires immediate emergency hospital assessment.",
  },

  "medical-consumables": {
    slug: "medical-consumables",
    name: "Medical Consumables & Devices",
    shortDescription:
      "Clinically calibrated blood pressure monitors, pulse oximeters, digital thermometers, blood glucose test strips, sterile gloves, and surgical masks.",
    selfCareAppropriate: [
      "Routine home blood pressure monitoring for wellness and hypertension tracking",
      "Self-monitoring of blood glucose (SMBG) for diagnosed diabetes management",
      "Measuring household body temperature during feverish illness",
      "Monitoring oxygen saturation (SpO2) during respiratory recovery",
      "Basic home infection control, wound cleaning gloves, and protective face masks",
    ],
    medicalAttentionCriteria: [
      "Blood pressure reading >= 180 systolic or >= 120 diastolic (Hypertensive Crisis — check for chest pain/vision changes, seek emergency care)",
      "Pulse oximeter reading SpO2 < 92% (or < 95% with shortness of breath)",
      "Blood glucose reading < 3.9 mmol/L (70 mg/dL) with hypoglycemia symptoms, or > 16.7 mmol/L (300 mg/dL) with ketones/vomiting",
      "Temperature > 40.0°C (104°F) in any adult or child not responding to antipyretics",
    ],
    pharmacistTips: [
      "Rest quietly for 5 minutes before taking blood pressure: sit upright, feet flat on the floor, arm supported at heart level; avoid caffeine 30 minutes prior.",
      "Ensure blood glucose test strips match your exact meter model and store them tightly capped in their original vial away from humidity.",
      "Warm cold hands before placing fingertip pulse oximeters, and remove dark nail polish for accurate optical sensor readings.",
      "Disinfect reusable thermometer probes with 70% alcohol swabs before and after every use.",
    ],
    commonActiveIngredients: [
      "Calibrated Upper-Arm Oscillometric Sensors",
      "Dual-Wavelength LED Optical Pulse Sensors",
      "Glucose Oxidase / Dehydrogenase Biosensor Strips",
      "Medical Grade Powder-Free Nitrile",
    ],
    featuredBrands: ["Omron", "OneTouch", "Accu-Chek", "Contec", "Beurer", "3M"],
    maxSelfCareDuration: "Diagnostic devices used continuously; replace test strips prior to printed expiry",
    emergencyWarning: "Severely abnormal vital signs (SpO2 < 90%, BP >= 180/120 with symptoms) are medical emergencies.",
  },

  "nutritional-products": {
    slug: "nutritional-products",
    name: "Nutritional Products & Supplements",
    shortDescription:
      "Targeted multivitamins, effervescent vitamin C + zinc, oral electrolyte solutions, gentle iron tonics, and balanced meal replacement shakes.",
    selfCareAppropriate: [
      "Daily dietary multivitamin supplementation for general wellness and micronutrient adequacy",
      "Rapid rehydration during periods of heavy sweating, sports, or hot weather",
      "Short-term immune support during cold and flu season (Vitamin C, Zinc, Vitamin D3)",
      "Supportive gentle iron supplementation for low dietary iron intake in non-pregnant adults",
      "Nutritional calorie and protein supplementation for recovering convalescent adults",
    ],
    medicalAttentionCriteria: [
      "Severe fatigue accompanied by pale skin, breathlessness, dizziness, or heart palpitations (indicates severe anemia needing full blood count)",
      "Signs of vitamin toxicity (e.g. chronic high-dose Vitamin A or Vitamin D excess)",
      "Unexplained dramatic weight loss or inability to consume solid foods",
      "Nutritional deficiencies secondary to severe malabsorption disorders (e.g. Crohn's, Celiac) requiring specialist oversight",
    ],
    pharmacistTips: [
      "More is not always better: fat-soluble vitamins (A, D, E, K) accumulate in body tissues; do not exceed daily recommended upper limits.",
      "Take iron supplements with a source of Vitamin C (e.g. orange juice) to boost absorption, and avoid taking with tea, coffee, or milk.",
      "Effervescent vitamin tablets contain sodium — patients on strict low-sodium diets should choose standard tablets.",
      "Always inform your pharmacist of all vitamins and herbals you take, as supplements can interact with blood thinners, thyroid medicines, and antibiotics.",
    ],
    commonActiveIngredients: [
      "Comprehensive Multivitamins (A, B-Complex, C, D3, E, K)",
      "Ascorbic Acid (Vitamin C 1000mg) & Zinc Gluconate",
      "Oral Electrolytes (Sodium, Potassium, Magnesium, Glucose)",
      "Ferrous Gluconate / Bisglycinate with Folic Acid & B12",
      "Whey / Soy Protein & Essential Fatty Acids",
    ],
    featuredBrands: ["Wellman", "Wellwoman", "Berocca", "Hydralyte", "Feroglobin", "Ensure", "Centrum"],
    maxSelfCareDuration: "30-day nutritional trials; long-term supplementation should be discussed during annual health reviews",
    emergencyWarning: "Iron supplement overdose in young children is a life-threatening toxicity emergency — keep all supplements strictly out of reach of children.",
  },
};

/** Alias mapping to normalize alternate slugs to their primary guidance object */
export const CATEGORY_GUIDANCE_ALIASES: Record<string, string> = {
  "pain-relief": "pain-relief",
  "cold-flu": "cold-flu",
  "allergy": "allergy-treatments",
  "allergy-treatments": "allergy-treatments",
  "digestive": "digestive-health",
  "digestive-health": "digestive-health",
  "first-aid": "first-aid",
  "topical-treatments": "topical-treatments",
  "skin-care": "skin-care",
  "antiseptics": "antiseptics",
  "wound-care": "wound-care",
  "oral-care": "oral-care",
  "womens-health": "feminine-hygiene",
  "feminine-hygiene": "feminine-hygiene",
  "baby-care": "baby-care",
  "medical-consumables": "medical-consumables",
  "diabetes-care": "medical-consumables",
  "vitamins-supplements": "nutritional-products",
  "nutritional-products": "nutritional-products",
  "vitamins": "nutritional-products",
};

export function getOtcCategoryGuidance(slug: string): OtcCategoryGuidance | null {
  const normalized = (slug || "").toLowerCase().trim();
  const targetKey = CATEGORY_GUIDANCE_ALIASES[normalized] || normalized;
  return OTC_CATEGORIES_GUIDANCE[targetKey] || null;
}

export const SELF_CARE_CONDITIONS_DATA: SelfCareCondition[] = [
  {
    id: "headache-tension",
    categorySlug: "pain-relief",
    categoryName: "Pain Relief",
    conditionName: "Tension & Mild Headaches",
    description: "Dull, aching head pain, band-like tightness around forehead, scalp, or neck.",
    selfCareSigns: [
      "Gradual onset, mild-to-moderate dull ache",
      "No nausea or light sensitivity",
      "Triggered by stress, fatigue, or eye strain",
    ],
    recommendedOtcTypes: ["Paracetamol 500mg-1000mg", "Ibuprofen 400mg with food", "Topical menthol temple rubs"],
    homeMeasures: ["Rest in a quiet, dark room", "Hydrate with plenty of water", "Neck and shoulder gentle stretching"],
    pharmacistConsultTriggers: [
      "Headache persisting > 3 days despite OTC relief",
      "Needing pain relievers more than 3 days per week (rebound risk)",
      "Migraine episodes with moderate nausea",
    ],
    emergencyRedFlags: [
      "Sudden thunderclap onset ('worst headache of life')",
      "Headache with stiff neck, high fever, or confusion",
      "Weakness, numbness, speech difficulty, or vision loss",
    ],
    expectedRecovery: "1 to 24 hours",
  },
  {
    id: "common-cold",
    categorySlug: "cold-flu",
    categoryName: "Cold & Flu",
    conditionName: "Common Cold & Nasal Congestion",
    description: "Runny nose, nasal blockage, sneezing, mild sore throat, and low-grade fatigue.",
    selfCareSigns: [
      "Mild nasal discharge (clear to cloudy)",
      "Scratchy or sore throat without trouble swallowing",
      "Mild dry cough without breathlessness",
      "Fever < 38.5°C in adults",
    ],
    recommendedOtcTypes: [
      "Decongestant nasal sprays (max 3-5 days)",
      "Medicated throat lozenges",
      "Saline nasal rinses",
      "Paracetamol / Ibuprofen for aches",
    ],
    homeMeasures: ["Drink plenty of warm liquids", "Steam inhalation or warm showers", "Adequate rest and sleep"],
    pharmacistConsultTriggers: [
      "Symptoms lasting > 10 days without improvement",
      "Severe facial pain / sinus pressure > 7 days",
      "Cough lasting > 3 weeks",
    ],
    emergencyRedFlags: [
      "Shortness of breath or difficulty breathing",
      "Coughing up blood or rust-coloured sputum",
      "Chest pain when breathing",
      "High persistent fever > 39°C",
    ],
    expectedRecovery: "7 to 10 days",
  },
  {
    id: "seasonal-allergies",
    categorySlug: "allergy-treatments",
    categoryName: "Allergy Treatments",
    conditionName: "Seasonal Hay Fever & Allergic Rhinitis",
    description: "Sneezing fits, itchy watery eyes, itchy roof of mouth, and clear nasal drainage.",
    selfCareSigns: [
      "Clear, watery nasal discharge with frequent sneezing",
      "Itchy, red eyes and itchy palate",
      "Symptoms flare with pollen, dust, or pet exposure",
      "No fever or body aches",
    ],
    recommendedOtcTypes: [
      "Non-drowsy oral antihistamines (Cetirizine, Loratadine, Fexofenadine)",
      "Fluticasone corticosteroid nasal spray",
      "Sodium cromoglicate allergy eye drops",
    ],
    homeMeasures: ["Keep windows closed during high pollen counts", "Shower and change clothes after outdoor walks", "Saline nasal wash to flush allergens"],
    pharmacistConsultTriggers: [
      "Incomplete control after 2 weeks of OTC therapy",
      "Disrupting work, school, or sleep significantly",
      "History of asthma getting triggered by allergies",
    ],
    emergencyRedFlags: [
      "Swelling of tongue, lips, throat, or difficulty swallowing",
      "Wheezing, chest tightness, or respiratory distress (Anaphylaxis)",
      "Severe generalized hives with dizziness or fainting",
    ],
    expectedRecovery: "Managed continuously throughout allergy season",
  },
  {
    id: "heartburn-reflux",
    categorySlug: "digestive-health",
    categoryName: "Digestive Health",
    conditionName: "Occasional Heartburn & Acid Reflux",
    description: "Burning sensation in chest (behind breastbone) or sour taste after eating heavy meals.",
    selfCareSigns: [
      "Burning sensation behind breastbone after meals or lying down",
      "Sour or bitter acid regurgitation into mouth",
      "Symptoms relieved by liquid antacids within minutes",
    ],
    recommendedOtcTypes: [
      "Alginate antacid oral liquids (Gaviscon)",
      "Short-course Omeprazole 20mg OTC (up to 14 days)",
      "Chewable calcium carbonate tablets",
    ],
    homeMeasures: ["Avoid eating within 3 hours of bedtime", "Elevate head of bed by 15cm", "Limit fatty, spicy foods, caffeine, and alcohol"],
    pharmacistConsultTriggers: [
      "Heartburn occurring more than twice a week",
      "Symptoms persisting beyond 14 days of OTC treatment",
      "Chronic reliance on antacids for more than 4 weeks",
    ],
    emergencyRedFlags: [
      "Chest pain radiating to shoulder, arm, back, or jaw",
      "Chest pain accompanied by sweating, shortness of breath, or nausea",
      "Difficulty or pain when swallowing food (dysphagia)",
      "Vomiting blood or passing black tarry stools",
    ],
    expectedRecovery: "Immediate relief with antacids; 1–4 days with PPIs",
  },
  {
    id: "acute-diarrhea",
    categorySlug: "digestive-health",
    categoryName: "Digestive Health",
    conditionName: "Acute Mild Diarrhea & Dehydration",
    description: "Frequent loose, watery bowel movements often accompanied by mild cramping.",
    selfCareSigns: [
      "Loose, watery stools starting abruptly",
      "No high fever and no blood in stool",
      "Patient able to drink fluids and stay hydrated",
    ],
    recommendedOtcTypes: [
      "Oral Rehydration Salts (ORS) sachets (Dioralyte)",
      "Loperamide 2mg capsules (adults only, uncomplicated cases)",
      "Multi-strain probiotic capsules",
    ],
    homeMeasures: ["Sip ORS solution after every loose stool", "Eat bland foods: rice, bananas, toast, applesauce", "Avoid dairy, greasy foods, and high-sugar drinks"],
    pharmacistConsultTriggers: [
      "Diarrhea lasting > 48 hours in adults or > 24 hours in young children",
      "Signs of moderate dehydration (dry mouth, dark urine, dizziness)",
      "Diarrhea following international travel to high-risk areas",
    ],
    emergencyRedFlags: [
      "Blood, pus, or mucus in stool",
      "High fever (> 38.5°C) accompanying diarrhea",
      "Severe, unremitting abdominal pain",
      "Inability to keep any fluids down",
    ],
    expectedRecovery: "1 to 3 days",
  },
  {
    id: "minor-cuts-burns",
    categorySlug: "first-aid",
    categoryName: "First Aid & Wound Care",
    conditionName: "Minor Cuts, Scrapes & Superficial Burns",
    description: "Superficial skin breaks, shallow paper cuts, grazes, or minor first-degree heat burns.",
    selfCareSigns: [
      "Small cut with edges close together",
      "Bleeding stops within 5–10 minutes of direct pressure",
      "Burn is red, painful, but has no blisters and is < 2 inches wide",
    ],
    recommendedOtcTypes: [
      "Sterile hydrogel burn gel (Burnshield)",
      "Sterile saline wound spray",
      "Non-stick sterile pads and micropore tape",
      "Hydrocolloid blister dressings",
    ],
    homeMeasures: ["Cool burns immediately under cool tap water for 15–20 minutes", "Wash scrapes gently with sterile saline or water", "Keep wound covered with a clean, moist barrier dressing"],
    pharmacistConsultTriggers: [
      "Wound not showing healing progress within 5 days",
      "Increasing redness, warmth, or mild swelling around edges",
      "Unsure of tetanus vaccination status in past 10 years",
    ],
    emergencyRedFlags: [
      "Uncontrolled bleeding that spurts or continues after 10 min firm pressure",
      "Large, deep, gaping wound needing stitches",
      "Second- or third-degree burns (blistered, white/charred) or any burn on face/hands",
      "Spreading red streaks or pus drainage with fever (Cellulitis)",
    ],
    expectedRecovery: "3 to 7 days for superficial cuts; 7 to 10 days for minor burns",
  },
  {
    id: "mild-eczema-itch",
    categorySlug: "topical-treatments",
    categoryName: "Topical Treatments & Skin Care",
    conditionName: "Mild Eczema, Insect Bites & Itchy Rashes",
    description: "Localized itchy patches, dry flaky skin, or red itchy bumps from insect bites.",
    selfCareSigns: [
      "Localized patch of dry, itchy, irritated skin",
      "Known mild eczema flare on arms, legs, or torso",
      "Isolated mosquito or bug bites without swelling in mouth/throat",
    ],
    recommendedOtcTypes: [
      "Hydrocortisone 1% cream (max 7 days)",
      "Soothing Calamine lotion",
      "Ceramide-rich emollient creams (CeraVe, Epimax)",
      "Antihistamines for nighttime itching",
    ],
    homeMeasures: ["Apply cold compress to relieve acute itch", "Avoid scratching to prevent secondary infection", "Apply thick moisturizer within 3 minutes of bathing"],
    pharmacistConsultTriggers: [
      "Rash not improving after 7 days of hydrocortisone cream",
      "Rash affecting delicate areas like eyelids or groin",
      "Frequent eczema flares requiring personalized maintenance plan",
    ],
    emergencyRedFlags: [
      "Rash spreading rapidly across whole body or forming blisters/skin shedding",
      "Signs of bacterial infection: honey-colored crusts (impetigo), pus, fever",
      "Rash accompanied by facial/throat swelling or breathing difficulty",
    ],
    expectedRecovery: "3 to 7 days",
  },
  {
    id: "mouth-ulcer-canker",
    categorySlug: "oral-care",
    categoryName: "Oral Care",
    conditionName: "Mouth Ulcers (Canker Sores)",
    description: "Small, painful, round or oval white/yellow sores with red borders inside lips, cheeks, or tongue.",
    selfCareSigns: [
      "Small (< 1cm) shallow sore inside the mouth",
      "Caused by accidental cheek biting, hard food scratch, or stress",
      "Painful when eating acidic, salty, or hot foods",
    ],
    recommendedOtcTypes: [
      "Soothing mouth ulcer gels (Bonjela, Orajel)",
      "Chlorhexidine antiseptic mouthwash (Corsodyl)",
      "Warm saline mouth rinses",
    ],
    homeMeasures: ["Rinse with warm salt water 3–4 times daily", "Avoid spicy, acidic, crunchy, or very hot foods", "Use a soft-bristle toothbrush"],
    pharmacistConsultTriggers: [
      "Multiple large ulcers (> 1cm) or clusters interfering with eating",
      "Ulcer recurring very frequently (several times a month)",
    ],
    emergencyRedFlags: [
      "Any mouth ulcer or lesion lasting longer than 3 weeks without healing",
      "Ulcer accompanied by high fever, severe difficulty swallowing, or swollen neck glands",
      "Unexplained bleeding or painless hard white/red patches in oral cavity",
    ],
    expectedRecovery: "7 to 10 days",
  },
  {
    id: "infant-colic-diaper-rash",
    categorySlug: "baby-care",
    categoryName: "Baby Care",
    conditionName: "Infant Diaper Rash & Colic Fussiness",
    description: "Redness in the diaper region or excessive gassiness and crying after feeds in infants.",
    selfCareSigns: [
      "Redness confined to diaper area with skin folds remaining clear",
      "Infant alert, feeding well, gaining weight normally",
      "Passing normal stool and urine with no fever",
    ],
    recommendedOtcTypes: [
      "Zinc Oxide 15%-40% diaper barrier cream (Sudocrem)",
      "Simethicone infant colic drops (Infacol)",
      "Saline infant nasal drops for stuffiness",
    ],
    homeMeasures: ["Change diapers frequently and leave baby nappy-free to air dry", "Gently cleanse with warm water and soft cotton, avoid alcohol wipes", "Hold baby upright for 20–30 minutes after feedings and burp thoroughly"],
    pharmacistConsultTriggers: [
      "Diaper rash not resolving after 3 days of barrier cream",
      "Rash with bright red spots or satellite pustules extending into skin folds (fungal)",
      "Persistent feeding difficulties",
    ],
    emergencyRedFlags: [
      "ANY fever in an infant under 3 months (> 38.0°C) is an immediate emergency",
      "Sunken fontanelle, dry diapers > 6 hours, or extreme lethargy (Dehydration)",
      "Grunting, nostril flaring, or rapid breathing in infant",
      "Inconsolable crying with hard, distended abdomen or vomiting green bile",
    ],
    expectedRecovery: "2 to 4 days for simple diaper rash",
  },
];
