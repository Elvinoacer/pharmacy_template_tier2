export type FoodRuleType = "with_food" | "empty_stomach" | "with_or_without_food" | "special";

export type DosageFormGuideType =
  | "inhaler_mdi"
  | "inhaler_dpi"
  | "eye_drops"
  | "ear_drops"
  | "nasal_spray"
  | "transdermal_patch"
  | "suppository"
  | "sublingual"
  | "effervescent"
  | "oral_suspension"
  | "topical_cream";

export type DeviceGuideType =
  | "spacer"
  | "glucometer"
  | "bp_monitor"
  | "insulin_pen"
  | "nebulizer"
  | "autoinjector"
  | "pill_box";

export interface SideEffectItem {
  effect: string;
  frequency: "very_common" | "common" | "uncommon";
  homeManagement: string;
}

export interface SpecialDosageFormGuide {
  id: DosageFormGuideType;
  title: string;
  shortDescription: string;
  iconName: string;
  steps: Array<{ stepNumber: number; title: string; instruction: string; keyNote?: string }>;
  crucialDoList: string[];
  crucialDontList: string[];
  cleaningAndMaintenance?: string;
}

export interface MedicalDeviceGuide {
  id: DeviceGuideType;
  title: string;
  shortDescription: string;
  iconName: string;
  steps: Array<{ stepNumber: number; title: string; instruction: string; keyNote?: string }>;
  preparation: string[];
  safetyWarnings: string[];
  troubleshooting: Array<{ problem: string; solution: string }>;
}

export interface MedicationCounsellingProfile {
  medicineKey: string;
  genericName: string;
  brandNames: string[];
  categorySlug: string;
  categoryName: string;
  standardDosageSummary: string;

  // Pillar 1: How to take
  howToTake: {
    administrationRoute: string;
    technique: string;
    instructions: string[];
    swallowWholeWarning: boolean;
    postureAdvice?: string;
  };

  // Pillar 2: When to take
  whenToTake: {
    bestTimeOfDay: string;
    circadianRationale: string;
    routineIntegrationTip: string;
  };

  // Pillar 3: How often to take
  howOftenToTake: {
    frequencySchedule: string;
    intervalHours: string;
    maxDailyDose: string;
    prnLimits?: string;
  };

  // Pillar 4: Food & drink instructions
  foodAndDrink: {
    rule: FoodRuleType;
    summary: string;
    detailedGuidance: string;
    grapefruitInteraction: boolean;
    dairyCalciumInteraction: boolean;
    alcoholWarning: string;
    caffeineWarning?: string;
  };

  // Pillar 5: Storage
  storage: {
    temperatureRange: string;
    refrigerationRequired: boolean;
    moistureSensitive: boolean;
    lightSensitive: boolean;
    inUseExpirationDays?: number;
    childSafetyGuidance: string;
    homeLocationAdvice: string;
  };

  // Pillar 6: Special dosage forms
  specialDosageForm?: {
    guideId: DosageFormGuideType;
    formName: string;
    highlightedInstruction: string;
  };

  // Pillar 7: Expected common side effects
  sideEffects: {
    expected: SideEffectItem[];
    emergencyRedFlags: string[];
    whenToPauseAndCall: string;
  };

  // Pillar 8: What to do when a dose is missed
  missedDose: {
    ruleOfThumb: string;
    cutoffHoursNotice?: string;
    neverDoubleUpRule: string;
    specificScenarioGuidance: string;
  };

  // Pillar 9: Importance of completing treatment
  courseCompletion: {
    importance: "critical" | "high" | "essential";
    rationale: string;
    antimicrobialResistanceWarning?: string;
    reboundOrRelapseRisk?: string;
    asymptomaticAdherenceAdvice: string;
  };

  // Pillar 10: Device use
  device?: {
    guideId: DeviceGuideType;
    deviceName: string;
    quickInstructions: string;
  };

  // Pillar 11: Safe handling & disposal
  safeHandling: {
    handHygiene: string;
    specialPrecautions?: string;
    childProofing: string;
    safeDisposal: string;
    neverShareMessage: string;
  };

  // Pillar 12: When to return to a healthcare professional
  whenToReturn: {
    expectedImprovementTimeline: string;
    pharmacistConsultTriggers: string[];
    doctorEmergencyTriggers: string[];
    routineLabMonitoring?: string[];
  };
}

// ── Special Dosage Form Standard Guides ──────────────────────────────
export const SPECIAL_DOSAGE_FORM_GUIDES: Record<DosageFormGuideType, SpecialDosageFormGuide> = {
  inhaler_mdi: {
    id: "inhaler_mdi",
    title: "Metered Dose Inhaler (MDI / Puffers)",
    shortDescription: "Aerosol spray inhalers used for asthma, COPD, and bronchospasm.",
    iconName: "Wind",
    steps: [
      {
        stepNumber: 1,
        title: "Prepare and Shake",
        instruction: "Remove the mouthpiece cover. Inspect inside to ensure it is clean. Shake the inhaler vigorously up and down 4 to 5 times.",
        keyNote: "Shaking ensures the active drug and propellant mix evenly.",
      },
      {
        stepNumber: 2,
        title: "Breathe Out Gently",
        instruction: "Sit or stand up straight. Breathe out gently and completely away from the inhaler to empty your lungs.",
      },
      {
        stepNumber: 3,
        title: "Position and Seal",
        instruction: "Place the mouthpiece into your mouth between your teeth and close your lips tightly around it, forming a snug airtight seal without biting.",
      },
      {
        stepNumber: 4,
        title: "Inhale Slowly & Press",
        instruction: "Start to breathe in slowly and deeply through your mouth. As you begin inhaling, press down firmly on the top of the canister once. Continue breathing in slowly for 4–5 seconds.",
        keyNote: "Breathing slowly carries the aerosol deep into small airways rather than hitting the back of your throat.",
      },
      {
        stepNumber: 5,
        title: "Hold Your Breath for 10 Seconds",
        instruction: "Remove the inhaler from your mouth, close your lips, and hold your breath for 10 seconds or as long as comfortable. Then breathe out gently.",
      },
      {
        stepNumber: 6,
        title: "Wait Between Puffs & Rinse",
        instruction: "If a second puff is prescribed, wait 30–60 seconds before repeating. If using a corticosteroid inhaler (e.g. Fluticasone, Beclomethasone), rinse your mouth thoroughly with water and spit it out.",
        keyNote: "Rinsing prevents oral fungal thrush and hoarseness.",
      },
    ],
    crucialDoList: [
      "Use a spacer device whenever possible for 50%+ better lung deposition",
      "Rinse and spit after steroid inhalers",
      "Check dose counter or track puffs to avoid running out on empty canisters",
      "Prime by test-spraying into the air if unused for > 5 days",
    ],
    crucialDontList: [
      "Do NOT breathe in too fast (aerosol will hit your throat instead of lungs)",
      "Do NOT breathe out into the inhaler mouthpiece",
      "Do NOT immerse pressurized canisters in water to test float level",
    ],
    cleaningAndMaintenance:
      "Remove metal canister once a week. Wash the plastic casing under warm running water for 30 seconds. Air dry completely before reassembling.",
  },

  inhaler_dpi: {
    id: "inhaler_dpi",
    title: "Dry Powder Inhaler (DPI: Diskus / Turbuhaler / Ellipta)",
    shortDescription: "Breath-actuated breath-powered inhalers requiring a quick, deep inhalation.",
    iconName: "Flame",
    steps: [
      {
        stepNumber: 1,
        title: "Load the Dose",
        instruction: "Hold the inhaler level. Slide the lever or twist the grip until it clicks to load exactly one dose into the chamber.",
        keyNote: "Only load when ready to inhale immediately.",
      },
      {
        stepNumber: 2,
        title: "Exhale Fully Away From Inhaler",
        instruction: "Turn your head away from the device and breathe out completely. Never blow moisture or breath into the mouthpiece.",
      },
      {
        stepNumber: 3,
        title: "Seal Lips and Inhale Rapidly",
        instruction: "Put the mouthpiece between your lips and form a tight seal. Inhale forcefully and deeply through your mouth in one continuous strong breath.",
        keyNote: "Unlike MDIs, DPIs need a fast, forceful breath to de-aggregate the dry powder.",
      },
      {
        stepNumber: 4,
        title: "Hold Breath 10 Seconds",
        instruction: "Remove device from mouth and hold breath for 10 seconds. Breathe out gently.",
      },
      {
        stepNumber: 5,
        title: "Close & Rinse",
        instruction: "Close the cover. If your medication contains a steroid, rinse your mouth with water and spit.",
      },
    ],
    crucialDoList: [
      "Inhale fast and forcefully from the very start of the breath",
      "Keep device completely dry at all times",
      "Store with cover closed in a cool, dry room (never bathroom)",
    ],
    crucialDontList: [
      "Never breathe out into the device (humidity destroys powder)",
      "Never wash with water (wipe mouthpiece with dry cloth only)",
      "Never use a spacer with a DPI",
    ],
  },

  eye_drops: {
    id: "eye_drops",
    title: "Eye Drops & Ophthalmic Solutions",
    shortDescription: "Technique for liquid eye drops ensuring sterile application and minimal systemic absorption.",
    iconName: "Eye",
    steps: [
      {
        stepNumber: 1,
        title: "Wash Hands Thoroughly",
        instruction: "Wash hands with soap and water and dry with a clean towel.",
      },
      {
        stepNumber: 2,
        title: "Tilt Head & Form Lower Pocket",
        instruction: "Tilt your head back and look up at the ceiling. Gently pull down your lower eyelid with your index finger to create a small V-shaped pocket.",
      },
      {
        stepNumber: 3,
        title: "Instill 1 Single Drop",
        instruction: "Hold the dropper directly above the eye pocket (1-2 cm away). Squeeze gently to release exactly one drop into the pocket. Do not touch the dropper tip to your eye, eyelashes, or skin.",
        keyNote: "The eye can only hold 1 drop (~25-50 µL); extra drops just spill out and waste medicine.",
      },
      {
        stepNumber: 4,
        title: "Close Eye & Press Inner Corner (Punctal Occlusion)",
        instruction: "Close your eye gently without squeezing or blinking. Press your fingertip firmly against the inner corner of your eye (next to your nose) for 2 full minutes.",
        keyNote: "This blocks the tear duct, keeping the medicine inside the eye and preventing systemic side effects or bitter taste in throat.",
      },
      {
        stepNumber: 5,
        title: "Wait 5 Minutes If Using Multiple Drops",
        instruction: "If you have a second drop or different eye medication, wait at least 5 minutes before applying the next drop.",
      },
    ],
    crucialDoList: [
      "Perform punctal occlusion (press tear duct) for 2 minutes",
      "Discard bottle 28 days after first opening (bacterial contamination risk)",
      "Remove soft contact lenses 15 minutes before application (unless lenses-safe formula)",
    ],
    crucialDontList: [
      "Never touch the dropper tip to any surface (eyelid, fingers, tissue)",
      "Never blink rapidly or squeeze eyelids shut after instilling",
      "Never share eye drops between family members",
    ],
    cleaningAndMaintenance:
      "Keep cap tightly sealed. If dropper touches anything, wipe with sterile alcohol swab or replace.",
  },

  ear_drops: {
    id: "ear_drops",
    title: "Ear Drops (Otic Solutions)",
    shortDescription: "Proper positioning and application for ear canal infections and wax removal.",
    iconName: "Ear",
    steps: [
      {
        stepNumber: 1,
        title: "Warm the Bottle in Hands",
        instruction: "Roll the bottle between your palms for 1–2 minutes. Instilling cold ear drops can trigger sudden dizziness, nausea, or vertigo.",
      },
      {
        stepNumber: 2,
        title: "Lie on Your Side",
        instruction: "Lie down on your side or tilt your head so the affected ear faces upwards toward the ceiling.",
      },
      {
        stepNumber: 3,
        title: "Straighten the Ear Canal",
        instruction: "For ADULTS & children over 3: Gently pull the upper ear lobe UP and BACK. For CHILDREN under 3: Gently pull the lower ear lobe DOWN and BACK.",
        keyNote: "This straightens the natural bend in the ear canal so drops reach the eardrum.",
      },
      {
        stepNumber: 4,
        title: "Instill Drops and Stay in Position",
        instruction: "Squeeze the prescribed number of drops into the ear canal without touching the dropper to the ear. Stay lying on your side for 3 to 5 minutes.",
      },
      {
        stepNumber: 5,
        title: "Gentle Tragus Massage",
        instruction: "Gently press the small flap of cartilage in front of the ear (the tragus) 4-5 times to pump the drops deep into the canal.",
      },
    ],
    crucialDoList: [
      "Warm bottle to body temperature before use",
      "Stay in side-lying position for a full 3–5 minutes",
      "Consult doctor immediately if you have a suspected perforated/ruptured eardrum",
    ],
    crucialDontList: [
      "Never insert cotton buds or sharp objects into the ear canal",
      "Never use boiling or hot water to warm the bottle",
    ],
  },

  nasal_spray: {
    id: "nasal_spray",
    title: "Nasal Sprays & Decongestants",
    shortDescription: "Proper spray angle technique preventing nosebleeds and maximizing sinus absorption.",
    iconName: "Sparkles",
    steps: [
      {
        stepNumber: 1,
        title: "Blow Nose Gently & Prime",
        instruction: "Gently blow your nose to clear nostrils. Shake the bottle and prime by pumping into air if unused for several days.",
      },
      {
        stepNumber: 2,
        title: "Tilt Head Slightly Forward",
        instruction: "Look down at your toes or keep head slightly tilted forward (do NOT tilt head backwards).",
      },
      {
        stepNumber: 3,
        title: "Aim Contralaterally (Away From Septum)",
        instruction: "Hold spray with your RIGHT hand to spray into your LEFT nostril (and LEFT hand into RIGHT nostril). Point the nozzle slightly outward towards your ear, away from the middle wall (septum).",
        keyNote: "Aiming away from the septum prevents nosebleeds, irritation, and cartilage thinning.",
      },
      {
        stepNumber: 4,
        title: "Spray with Gentle Inhale",
        instruction: "Close the opposite nostril with your finger. Press spray pump firmly while breathing in GENTLY through your nose. Do not snort hard.",
      },
      {
        stepNumber: 5,
        title: "Breathe Out Through Mouth",
        instruction: "Breathe out through your mouth. Avoid blowing your nose for at least 15 minutes.",
      },
    ],
    crucialDoList: [
      "Look down at your toes, not up at the ceiling",
      "Aim outward toward the corner of your eye/ear",
      "Limit OTC decongestant sprays (Xylometazoline, Oxymetazoline) to max 3–5 days to prevent rebound congestion",
    ],
    crucialDontList: [
      "Do NOT snort forcefully (medicine will go down throat and be swallowed)",
      "Do NOT spray directly onto the central nasal septum",
    ],
  },

  transdermal_patch: {
    id: "transdermal_patch",
    title: "Transdermal Medication Patches",
    shortDescription: "Continuous skin-absorption patches for pain, cardiovascular, hormone, or smoking cessation.",
    iconName: "Layers",
    steps: [
      {
        stepNumber: 1,
        title: "Select & Clean Application Site",
        instruction: "Choose a clean, dry, hairless area of intact skin (e.g. upper outer arm, chest, upper back). Avoid cuts, rashes, or scars.",
      },
      {
        stepNumber: 2,
        title: "Peel Protective Liner",
        instruction: "Carefully tear the pouch along the notch. Peel off half the protective plastic backing without touching the sticky surface with your fingers.",
      },
      {
        stepNumber: 3,
        title: "Apply and Press Firmly for 30 Seconds",
        instruction: "Place sticky side on skin, peel the second half of liner, and press firmly with the palm of your hand for 30 seconds. Ensure edges adhere completely.",
      },
      {
        stepNumber: 4,
        title: "Rotate Sites Every Time",
        instruction: "Never apply a new patch to the exact same skin area twice in a row. Wait at least 7 days before reusing a site.",
      },
      {
        stepNumber: 5,
        title: "Safe Removal & Disposal",
        instruction: "Peel old patch off, fold it in half with sticky sides together, and dispose in household trash immediately out of reach of children and pets. Wash hands with soap and water.",
        keyNote: "Used patches still contain 50%+ active medication which is lethal to toddlers or pets.",
      },
    ],
    crucialDoList: [
      "Press firmly with whole palm for a full 30 seconds",
      "Rotate application sites on every change",
      "Remove old patch before applying a new one",
    ],
    crucialDontList: [
      "Never apply heating pads, hot water bottles, or sit in saunas with patch on (heat dangerously accelerates drug overdose)",
      "Never cut patches unless explicitly marked as cuttable by pharmacist",
      "Never apply on broken, oily, or recently shaved skin",
    ],
  },

  suppository: {
    id: "suppository",
    title: "Rectal & Vaginal Suppositories / Pessaries",
    shortDescription: "Solid dosage forms designed to melt at body temperature for local or systemic absorption.",
    iconName: "ShieldAlert",
    steps: [
      {
        stepNumber: 1,
        title: "Chill If Soft",
        instruction: "If the suppository feels soft, place it in the refrigerator or hold under cold running water for 2-3 minutes before removing the wrapper.",
      },
      {
        stepNumber: 2,
        title: "Wash Hands & Remove Foil",
        instruction: "Wash hands thoroughly. Peel open the plastic or foil blister pack completely.",
      },
      {
        stepNumber: 3,
        title: "Lubricate Tip",
        instruction: "Moisten the pointed tip with cold tap water or water-soluble lubricant (e.g. K-Y Jelly). Do NOT use petroleum jelly (Vaseline).",
      },
      {
        stepNumber: 4,
        title: "Assume Position and Insert",
        instruction: "Lie on your side with lower leg straight and upper knee bent towards chest. Gently push the suppository pointed-end first into rectum past the muscular sphincter (~2.5 cm for adults, 1.5 cm for infants).",
      },
      {
        stepNumber: 5,
        title: "Remain Lying Down for 15 Minutes",
        instruction: "Stay lying down for 15-20 minutes to prevent the melting suppository from slipping out. Wash hands thoroughly.",
      },
    ],
    crucialDoList: [
      "Store in a cool place or refrigerator",
      "Empty bowel before rectal administration if possible",
      "Use water or water-based lube for ease of insertion",
    ],
    crucialDontList: [
      "Never swallow suppositories (rectal/vaginal use only)",
      "Do NOT use oil-based lubricants like Vaseline (prevents absorption)",
    ],
  },

  sublingual: {
    id: "sublingual",
    title: "Sublingual & Buccal Dissolving Tablets",
    shortDescription: "Tablets dissolved under tongue or between cheek and gum for rapid bloodstream absorption.",
    iconName: "Smile",
    steps: [
      {
        stepNumber: 1,
        title: "Place Under Tongue / Against Cheek",
        instruction: "Place the tablet directly under your tongue (sublingual) or between your upper cheek and gum (buccal).",
      },
      {
        stepNumber: 2,
        title: "Allow to Dissolve Naturally",
        instruction: "Keep your mouth closed and let the tablet dissolve completely. Do not chew, crush, or swallow the tablet whole.",
      },
      {
        stepNumber: 3,
        title: "Do Not Eat or Drink",
        instruction: "Avoid drinking liquids, eating, or smoking until the tablet has completely dissolved and disappeared.",
      },
    ],
    crucialDoList: [
      "Let dissolve completely for fast vascular absorption",
      "Sit down when taking sublingual nitroglycerin (may cause dizziness)",
    ],
    crucialDontList: [
      "Do NOT swallow with water like a regular tablet (stomach acid destroys it)",
      "Do NOT chew or crush",
    ],
  },

  effervescent: {
    id: "effervescent",
    title: "Effervescent & Soluble Tablets / Sachets",
    shortDescription: "Tablets and powders designed to dissolve in water before drinking.",
    iconName: "Coffee",
    steps: [
      {
        stepNumber: 1,
        title: "Dissolve in Full Glass of Water",
        instruction: "Drop the tablet or empty the sachet into a full glass of room temperature water (150–200 ml).",
      },
      {
        stepNumber: 2,
        title: "Wait Until Fizzing Stops",
        instruction: "Allow the tablet to dissolve completely until all bubbling has ceased. Stir gently with a spoon.",
      },
      {
        stepNumber: 3,
        title: "Drink Entire Contents Promptly",
        instruction: "Drink the entire solution immediately to ensure you receive the full therapeutic dose.",
      },
    ],
    crucialDoList: [
      "Always dissolve in water before consuming",
      "Be aware of sodium content in effervescent formulations if on a low-salt diet",
    ],
    crucialDontList: [
      "NEVER swallow an effervescent tablet whole (risk of choking & severe gas)",
    ],
  },

  oral_suspension: {
    id: "oral_suspension",
    title: "Reconstituted Oral Suspensions & Syrups",
    shortDescription: "Liquid antibiotics and pediatric suspensions where drug particles settle at the bottom.",
    iconName: "Beaker",
    steps: [
      {
        stepNumber: 1,
        title: "Shake Vigorously Before EVERY Single Dose",
        instruction: "Shake bottle up and down vigorously for 10–15 seconds before every dose so medicine is evenly dispersed.",
        keyNote: "If not shaken, early doses are too weak and final doses are dangerously concentrated!",
      },
      {
        stepNumber: 2,
        title: "Use Calibrated Oral Syringe or Spoon",
        instruction: "Always measure dose using the calibrated oral syringe, dosing cup, or spoon provided with the medicine. Never use household kitchen teaspoons (which vary between 2.5 ml and 8 ml).",
      },
      {
        stepNumber: 3,
        title: "Administer Slowly into Cheek",
        instruction: "For infants and children, place the syringe tip inside the corner of the mouth between the cheek and lower gum. Slowly squirt small amounts to prevent choking.",
      },
      {
        stepNumber: 4,
        title: "Check Storage & Expiration",
        instruction: "Check if the suspension requires refrigeration (e.g. Augmentin must be refrigerated at 2–8°C; Azithromycin stays at room temp). Discard remaining liquid after 7, 10, or 14 days as stated on bottle.",
      },
    ],
    crucialDoList: [
      "Shake vigorously every single time",
      "Use only calibrated measuring syringes",
      "Check refrigeration requirements immediately upon getting from pharmacy",
    ],
    crucialDontList: [
      "Never use kitchen teaspoons or tablespoons",
      "Never freeze antibiotic suspensions",
      "Never keep leftover antibiotic suspensions for future illnesses",
    ],
  },

  topical_cream: {
    id: "topical_cream",
    title: "Topical Creams, Ointments & Steroids",
    shortDescription: "Dermatological preparations applied directly to skin surfaces.",
    iconName: "Shield",
    steps: [
      {
        stepNumber: 1,
        title: "Cleanse Skin and Wash Hands",
        instruction: "Wash hands with soap and water. Clean and pat dry the affected skin area gently.",
      },
      {
        stepNumber: 2,
        title: "Measure with Fingertip Unit (FTU)",
        instruction: "Squeeze cream from the tube along the tip of your index finger from the distal skin crease to the fingertip (1 FTU = ~0.5g, covers an area equal to two adult hand palms).",
      },
      {
        stepNumber: 3,
        title: "Apply Thin, Even Layer",
        instruction: "Smooth the cream gently into the skin in the direction of hair growth until absorbed. Do not rub vigorously.",
      },
      {
        stepNumber: 4,
        title: "Wash Hands After Application",
        instruction: "Wash hands thoroughly unless your hands are the treatment site.",
      },
    ],
    crucialDoList: [
      "Apply a thin layer using Fingertip Units (FTU)",
      "Wait 30 minutes between applying moisturizers/emollients and active medicated creams",
    ],
    crucialDontList: [
      "Never cover high-potency steroid creams with airtight plastic wrap or bandages unless instructed",
      "Do NOT apply potent steroid creams to face or eyelids without specialist supervision",
    ],
  },
};

// ── Medical Device Guides ───────────────────────────────────────────
export const MEDICAL_DEVICE_GUIDES: Record<DeviceGuideType, MedicalDeviceGuide> = {
  spacer: {
    id: "spacer",
    title: "Inhaler Spacer Device (with Mouthpiece or Mask)",
    shortDescription: "Holding chamber that slows aerosol delivery, ensuring 50%+ more medicine reaches the lungs.",
    iconName: "Wind",
    steps: [
      {
        stepNumber: 1,
        title: "Assemble and Shake Inhaler",
        instruction: "Remove caps from inhaler and spacer. Fit inhaler mouthpiece snugly into the rubber end of the spacer. Shake vigorously 4-5 times.",
      },
      {
        stepNumber: 2,
        title: "Place in Mouth or Fit Mask",
        instruction: "Put spacer mouthpiece in mouth between teeth and seal lips. For children with mask: press mask firmly over nose and mouth with no gaps.",
      },
      {
        stepNumber: 3,
        title: "Press Inhaler Once",
        instruction: "Press down on the inhaler canister ONCE to release a single puff of medication into the spacer chamber.",
      },
      {
        stepNumber: 4,
        title: "Breathe In (Tidal or Deep)",
        instruction: "Option A (Deep): Take one slow, deep breath in and hold for 10 seconds. Option B (Tidal for children/elderly): Breathe in and out steadily 5 times through the spacer.",
      },
      {
        stepNumber: 5,
        title: "Repeat for Next Puff",
        instruction: "If a second puff is prescribed, wait 1 minute, shake inhaler again, and repeat. NEVER spray multiple puffs into spacer at once.",
      },
    ],
    preparation: [
      "Inspect spacer chamber for cracks or foreign objects",
      "Ensure one-way valve moves freely with breathing",
    ],
    safetyWarnings: [
      "Never fire 2 puffs into the spacer simultaneously (causes droplets to collide and precipitate)",
      "If the spacer makes a whistling sound, you are breathing in too fast — slow down!",
    ],
    troubleshooting: [
      {
        problem: "Whistling noise during inhalation",
        solution: "Breathe in more slowly and gently. The whistle is a warning that speed is too high.",
      },
      {
        problem: "Medicine sticking to plastic walls",
        solution: "Static charge buildup. Clean monthly with mild detergent and AIR DRY without towel rubbing.",
      },
    ],
  },

  glucometer: {
    id: "glucometer",
    title: "Blood Glucose Monitor (Glucometer & Lancets)",
    shortDescription: "Home capillary blood sugar testing device for diabetes management.",
    iconName: "Activity",
    steps: [
      {
        stepNumber: 1,
        title: "Wash Hands with Warm Water",
        instruction: "Wash hands with warm soapy water and dry thoroughly. Warm water increases capillary blood flow to fingers.",
        keyNote: "Never use alcohol wet wipes right before testing — alcohol dilutes blood and gives inaccurate readings.",
      },
      {
        stepNumber: 2,
        title: "Prepare Lancet and Strip",
        instruction: "Insert a new lancet into the lancing device. Set depth (usually 2-3 for soft skin, 4-5 for calloused skin). Insert test strip into meter; meter will turn on automatically.",
      },
      {
        stepNumber: 3,
        title: "Lance the Side of Fingertip",
        instruction: "Press lancing device firmly against the SIDE of your fingertip (not the center pad). Press the release button.",
        keyNote: "The sides of fingers have fewer nerve endings and produce less pain.",
      },
      {
        stepNumber: 4,
        title: "Apply Blood Drop to Strip",
        instruction: "Gently squeeze from base of finger to form a round drop of blood. Touch the tip of the test strip to the blood drop until meter beeps.",
      },
      {
        stepNumber: 5,
        title: "Read, Log & Safe Disposal",
        instruction: "Results appear in 5 seconds. Log result with note (e.g. fasting, 2h post-meal). Eject used lancet directly into a puncture-proof sharps container.",
      },
    ],
    preparation: [
      "Check expiration date on test strip vial",
      "Keep strip vial tightly closed to protect from humidity",
    ],
    safetyWarnings: [
      "Never reuse lancets (dulled needles cause tissue trauma and risk infection)",
      "Target ranges: Fasting 4.0–7.0 mmol/L (70–130 mg/dL); Post-meal < 8.5 mmol/L (< 154 mg/dL)",
      "If blood sugar is < 4.0 mmol/L (hypoglycemia), immediately consume 15g fast sugar (juice/honey) and retest in 15 mins (Rule of 15)",
    ],
    troubleshooting: [
      {
        problem: "Error message / insufficient blood",
        solution: "Warm hands under warm water, dangle hand below heart level, and squeeze gently from palm upwards.",
      },
      {
        problem: "Unusually high/low reading",
        solution: "Wash hands again, dry thoroughly, and retest with a fresh strip.",
      },
    ],
  },

  bp_monitor: {
    id: "bp_monitor",
    title: "Home Blood Pressure Monitor",
    shortDescription: "Automatic digital upper-arm blood pressure monitor for hypertension tracking.",
    iconName: "HeartPulse",
    steps: [
      {
        stepNumber: 1,
        title: "Rest Quietly for 5 Minutes",
        instruction: "Avoid caffeine, exercise, and smoking for 30 minutes before testing. Empty your bladder. Sit quietly in a supportive chair for 5 full minutes.",
      },
      {
        stepNumber: 2,
        title: "Correct Seating Posture",
        instruction: "Sit with back supported, legs uncrossed, and feet flat on the floor. Rest your arm on a table so the cuff is at heart level.",
      },
      {
        stepNumber: 3,
        title: "Position Cuff on Bare Arm",
        instruction: "Wrap the cuff around your bare upper arm about 2 cm (1 inch) above the bend of your elbow. The tubing should run down the center of your inner arm.",
        keyNote: "Cuff must fit snugly — you should be able to slide 2 fingertips between cuff and arm.",
      },
      {
        stepNumber: 4,
        title: "Press Start & Remain Silent",
        instruction: "Press the start button. Do not move, speak, or laugh while the cuff is inflating and deflating.",
      },
      {
        stepNumber: 5,
        title: "Take 2 Readings 1 Minute Apart",
        instruction: "Wait 1 to 2 minutes and take a second reading. Record both numbers (Systolic over Diastolic) and pulse.",
      },
    ],
    preparation: [
      "Use an upper-arm cuff monitor (wrist monitors are significantly less accurate)",
      "Verify cuff size matches your arm circumference",
    ],
    safetyWarnings: [
      "Normal target: < 120/80 mmHg. High BP: >= 140/90 mmHg",
      "Hypertensive Crisis: If BP is > 180/120 mmHg, rest 5 mins and retest. If still > 180/120 or accompanied by chest pain, shortness of breath, or headache, seek emergency care immediately.",
    ],
    troubleshooting: [
      {
        problem: "Reading appears too high",
        solution: "Check if bladder was full, arm was dangling below heart, or you spoke during reading.",
      },
    ],
  },

  insulin_pen: {
    id: "insulin_pen",
    title: "Insulin Pen Injector (Disposable & Reusable)",
    shortDescription: "Subcutaneous pen injectors for basal, rapid, or premixed insulin therapy.",
    iconName: "Shield",
    steps: [
      {
        stepNumber: 1,
        title: "Check Insulin Clarity & Roll if Cloudy",
        instruction: "Inspect insulin. Clear insulins (Glargine, Aspart) must be crystal clear. Cloudy insulins (NPH, 70/30) must be rolled between palms 10 times and inverted 10 times to mix.",
      },
      {
        stepNumber: 2,
        title: "Attach New Sterile Needle",
        instruction: "Wipe rubber seal with alcohol swab. Peel paper tab from a new needle, screw it straight onto the pen, and pull off outer and inner caps.",
      },
      {
        stepNumber: 3,
        title: "Prime the Pen (Air Shot: 2 Units)",
        instruction: "Dial 2 units. Point pen upward, tap barrel to move air bubbles to top, and press injection button until a stream of insulin appears at the needle tip.",
        keyNote: "Priming ensures needle is not blocked and purges air bubbles.",
      },
      {
        stepNumber: 4,
        title: "Dial Prescribed Dose",
        instruction: "Turn dosage selector to dial your exact prescribed dose (e.g. 14 units).",
      },
      {
        stepNumber: 5,
        title: "Inject at 90 Degrees & Count to 10",
        instruction: "Select clean injection site (abdomen 5cm away from navel, outer thighs, upper buttocks). Insert needle straight at 90 degrees. Push plunger button down completely, then HOLD IN PLACE AND COUNT SLOWLY TO 10 before withdrawing.",
        keyNote: "Counting to 10 prevents insulin leakage from the injection channel.",
      },
      {
        stepNumber: 6,
        title: "Safely Remove and Discard Needle",
        instruction: "Recap outer needle cap, unscrew needle, and dispose in sharps bin. Never leave needle attached to pen.",
      },
    ],
    preparation: [
      "In-use pen: Store at room temperature (below 30°C) for up to 28 days",
      "Unopened pens: Store in refrigerator (2–8°C); do not freeze",
    ],
    safetyWarnings: [
      "Rotate injection sites in a systematic grid to prevent lipohypertrophy (fatty lumps that stop insulin absorption)",
      "Always carry fast-acting glucose (candy, juice) for emergency hypoglycemia treatment",
      "Never share insulin pens with another person under any circumstances",
    ],
    troubleshooting: [
      {
        problem: "Plunger is hard to push",
        solution: "Needle may be clogged. Replace with a new needle and re-prime with 2 units.",
      },
      {
        problem: "Drop of insulin on skin after withdrawing",
        solution: "Hold needle in skin for a full 10 seconds before pulling out on future injections.",
      },
    ],
  },

  nebulizer: {
    id: "nebulizer",
    title: "Compressor Nebulizer Machine",
    shortDescription: "Compressor-driven device turning liquid medication into a breathable mist for lungs.",
    iconName: "Cloud",
    steps: [
      {
        stepNumber: 1,
        title: "Assemble Nebulizer Cup",
        instruction: "Wash hands. Place compressor on flat, sturdy surface near electrical outlet. Connect plastic tubing to machine and nebulizer cup.",
      },
      {
        stepNumber: 2,
        title: "Add Prescribed Liquid Medication",
        instruction: "Open medication cup, pour unit-dose vial into cup, and screw top on securely. Attach mouthpiece or mask.",
      },
      {
        stepNumber: 3,
        title: "Sit Upright and Turn On",
        instruction: "Sit upright in a chair. Put mouthpiece between teeth with lips sealed around it, or place mask snugly over nose and mouth. Switch on compressor.",
      },
      {
        stepNumber: 4,
        title: "Breathe In Slowly and Deeply",
        instruction: "Breathe in slowly and deeply through mouth, holding each breath for 2-3 seconds before exhaling. Continue until mist stops and cup begins sputtering (typically 10–15 minutes).",
      },
      {
        stepNumber: 5,
        title: "Clean and Disinfect",
        instruction: "Disconnect cup and mouthpiece. Wash with warm soapy water, rinse, and air dry on a clean paper towel. Disinfect weekly.",
      },
    ],
    preparation: [
      "Sit upright so medicine can reach the bottom lobes of the lungs",
    ],
    safetyWarnings: [
      "Never wash the plastic tubing — keep it dry. If moisture forms in tube, run compressor with only tubing attached for 2 minutes to dry it.",
    ],
    troubleshooting: [
      {
        problem: "No mist coming out",
        solution: "Check if air filter is clogged, tubing is kinked, or medication baffle inside cup is missing.",
      },
    ],
  },

  autoinjector: {
    id: "autoinjector",
    title: "Epinephrine Auto-Injector (EpiPen / Adrenaline)",
    shortDescription: "Emergency auto-injector for severe life-threatening allergic reactions (anaphylaxis).",
    iconName: "AlertTriangle",
    steps: [
      {
        stepNumber: 1,
        title: "Grip in Fist & Pull Safety Cap",
        instruction: "Form a fist around the injector with the orange/colored tip pointing downward. Pull the blue safety release cap straight off with your other hand. Do not touch the needle tip.",
      },
      {
        stepNumber: 2,
        title: "Position Against Outer Mid-Thigh",
        instruction: "Hold injector about 10 cm (4 inches) away from the outer mid-thigh. Injector works directly through clothing (avoid seams, zippers, or thick pockets).",
      },
      {
        stepNumber: 3,
        title: "Swing and Push Firmly at 90°",
        instruction: "Swing and jab firmly into outer thigh at a 90-degree angle until you hear a sharp 'CLICK'.",
      },
      {
        stepNumber: 4,
        title: "Hold Firmly for 3 Full Seconds",
        instruction: "Hold firmly against thigh while counting slowly: '1, 2, 3'. Remove injector.",
      },
      {
        stepNumber: 5,
        title: "Massage Site & Call Emergency 911 / 999",
        instruction: "Massage injection site for 10 seconds. Call emergency services immediately or go to nearest emergency room — effects wear off after 15–20 minutes and secondary reactions can occur.",
      },
    ],
    preparation: [
      "Carry 2 auto-injectors at all times",
      "Check inspection window regularly: liquid must be crystal clear (if discolored or cloudy, replace immediately)",
    ],
    safetyWarnings: [
      "Never place thumb or fingers over the orange tip (risk of accidental finger injection)",
      "Always call emergency services immediately after using an auto-injector",
    ],
    troubleshooting: [
      {
        problem: "Symptoms not improving after 5–10 minutes",
        solution: "Administer the second auto-injector in the OPPOSITE thigh while waiting for ambulance.",
      },
    ],
  },

  pill_box: {
    id: "pill_box",
    title: "Weekly Multi-Dose Pill Organizer (Dosette Box)",
    shortDescription: "7-day segmented organizer to prevent missed doses and accidental double-dosing.",
    iconName: "Calendar",
    steps: [
      {
        stepNumber: 1,
        title: "Fill in a Quiet, Well-Lit Area",
        instruction: "Set aside uninterrupted time once a week (e.g. Sunday evening). Gather all prescription bottles and adherence charts.",
      },
      {
        stepNumber: 2,
        title: "Sort One Medication at a Time",
        instruction: "Open one medicine bottle at a time. Place the tablets into the corresponding Morning, Midday, Evening, and Bedtime slots for Monday through Sunday. Double-check before moving to the next bottle.",
      },
      {
        stepNumber: 3,
        title: "Check for Moisture-Sensitive Medications",
        instruction: "Do NOT remove effervescent tablets, sublingual nitroglycerin, or dispersible tablets from their original foil blisters. Cut the blister square and place the sealed blister in the compartment.",
      },
      {
        stepNumber: 4,
        title: "Store Securely Away From Children",
        instruction: "Snap all lids shut tightly. Keep the organizer in a high, locked cabinet or out of reach of children and visitors.",
      },
    ],
    preparation: [
      "Keep an updated printed medication list taped to or stored with the box",
    ],
    safetyWarnings: [
      "Pill organizers are NOT child-resistant — keep strictly out of reach of children",
    ],
    troubleshooting: [
      {
        problem: "Forgot whether a dose was taken today",
        solution: "Look at today's day/time compartment: if empty, you took it; if full, follow your missed dose guidelines.",
      },
    ],
  },
};

// ── Curated Clinical Digital Counselling Profiles ──────────────────
export const CURATED_COUNSELLING_PROFILES: Record<string, MedicationCounsellingProfile> = {
  amoxicillin: {
    medicineKey: "amoxicillin",
    genericName: "Amoxicillin",
    brandNames: ["Amoxil", "Augmentin", "Curam", "Clavamox"],
    categorySlug: "antibiotics",
    categoryName: "Antibiotics",
    standardDosageSummary: "500 mg capsules or 250mg/5ml suspension every 8 hours for 5 to 7 days.",

    howToTake: {
      administrationRoute: "Oral (swallowed with water or oral liquid suspension)",
      technique: "Swallow capsules whole with a full glass of water. For suspensions, shake bottle vigorously before every dose and measure with an oral syringe.",
      instructions: [
        "Take at evenly spaced intervals around the clock (e.g., 07:00, 15:00, 23:00 for three times daily).",
        "Can be taken with or without food, but taking at the start of a meal reduces stomach upset.",
        "Space doses evenly to maintain continuous bactericidal drug concentrations in bloodstream.",
      ],
      swallowWholeWarning: true,
      postureAdvice: "Stay upright for a few minutes after swallowing capsules.",
    },

    whenToTake: {
      bestTimeOfDay: "Morning, afternoon, and night at consistent 8-hour intervals.",
      circadianRationale: "Antibiotics require steady blood levels 24 hours a day to prevent bacterial regrowth.",
      routineIntegrationTip: "Pair doses with breakfast (08:00), mid-afternoon snack (16:00), and bedtime (00:00).",
    },

    howOftenToTake: {
      frequencySchedule: "Three times daily (TID) or twice daily (BID) depending on prescription formulation.",
      intervalHours: "Every 8 hours (or every 12 hours for sustained formulations).",
      maxDailyDose: "Adult max 3,000 mg/day (4,000 mg/day for severe infections).",
    },

    foodAndDrink: {
      rule: "with_or_without_food",
      summary: "Best taken at the start of a light meal or snack to minimize stomach discomfort.",
      detailedGuidance: "Food does not impair amoxicillin absorption. Taking with food or milk protects your stomach lining. Stay well hydrated by drinking 6–8 glasses of water daily.",
      grapefruitInteraction: false,
      dairyCalciumInteraction: false,
      alcoholWarning: "Alcohol does not directly interact with amoxicillin, but avoiding alcohol supports your immune system and prevents increased dehydration or dizziness.",
    },

    storage: {
      temperatureRange: "Capsules: Store below 25°C in a dry place. Reconstituted Liquid: Keep in refrigerator (2°C–8°C).",
      refrigerationRequired: true,
      moistureSensitive: true,
      lightSensitive: false,
      inUseExpirationDays: 10,
      childSafetyGuidance: "Keep reconstituted fruit-flavored syrup strictly locked in refrigerator out of reach of children.",
      homeLocationAdvice: "Keep capsules in a cool bedroom cupboard (never bathroom cabinet due to steam/humidity).",
    },

    specialDosageForm: {
      guideId: "oral_suspension",
      formName: "Oral Reconstituted Antibiotic Suspension",
      highlightedInstruction: "Shake vigorously for 10-15 seconds before every single dose. Discard unused liquid after 7–10 days.",
    },

    sideEffects: {
      expected: [
        { effect: "Mild diarrhea or loose stools", frequency: "common", homeManagement: "Stay hydrated with clear fluids or oral rehydration salts (ORS). Take probiotics 2 hours apart from antibiotic." },
        { effect: "Nausea or mild stomach ache", frequency: "common", homeManagement: "Take dose with food or a small meal." },
        { effect: "Oral or vaginal thrush (yeast infection)", frequency: "uncommon", homeManagement: "Consult pharmacist for anti-fungal treatment if white patches in mouth or vaginal itching develop." },
      ],
      emergencyRedFlags: [
        "Severe watery or bloody diarrhea with abdominal cramps and fever (possible Clostridioides difficile colitis)",
        "Sudden allergic skin rash, hives, swelling of face, lips, tongue, or wheezing/difficulty breathing (anaphylaxis)",
        "Blistering or peeling of skin or mucous membranes",
      ],
      whenToPauseAndCall: "Stop taking medication and seek emergency medical care immediately if you notice hives, lip swelling, or difficulty breathing.",
    },

    missedDose: {
      ruleOfThumb: "Take the missed dose as soon as you remember. However, if it is almost time for your next scheduled dose (within 2-3 hours), skip the missed dose and resume your regular schedule.",
      cutoffHoursNotice: "If more than 5 hours have passed since the scheduled 8-hour dose time, take it immediately.",
      neverDoubleUpRule: "NEVER take two doses at the same time to make up for a missed dose.",
      specificScenarioGuidance: "Taking doses too close together increases gastrointestinal side effects and toxicity without improving recovery.",
    },

    courseCompletion: {
      importance: "critical",
      rationale: "You MUST finish the entire 5 to 7 day course prescribed by your doctor even if your symptoms completely disappear after 2 or 3 days.",
      antimicrobialResistanceWarning: "Stopping early allows surviving mutated bacteria to multiply and develop Antimicrobial Resistance (AMR), making future infections much harder to treat!",
      reboundOrRelapseRisk: "Premature discontinuation frequently causes the infection to rebound in a more severe form.",
      asymptomaticAdherenceAdvice: "Feeling better means the antibiotic is working, not that all bacteria are eliminated. Finish every single pill.",
    },

    safeHandling: {
      handHygiene: "Wash hands thoroughly with soap and water before handling capsules and after giving liquid to children.",
      specialPrecautions: "People with known penicillin allergies should not handle broken capsules.",
      childProofing: "Keep antibiotic bottles tightly sealed with child-resistant caps.",
      safeDisposal: "Return any leftover antibiotic suspension or capsules to the pharmacy disposal bin. Never pour down the sink or toilet.",
      neverShareMessage: "NEVER share antibiotics with family members or friends — dosing depends on exact infection type and body weight.",
    },

    whenToReturn: {
      expectedImprovementTimeline: "Fever and acute symptoms should begin to noticeably improve within 48 to 72 hours.",
      pharmacistConsultTriggers: [
        "Mild nausea or loose stools needing probiotic recommendations",
        "Developing a mild non-itchy rash",
        "Questions regarding missed doses or combining with other chronic medicines",
      ],
      doctorEmergencyTriggers: [
        "No improvement or worsening symptoms after 3 full days of treatment",
        "Inability to keep liquids down due to vomiting",
        "Signs of severe allergic reaction (hives, wheezing, facial swelling)",
        "Persistent severe watery diarrhea",
      ],
      routineLabMonitoring: ["Renal function tests if on high-dose prolonged therapy (> 14 days)"],
    },
  },

  metformin: {
    medicineKey: "metformin",
    genericName: "Metformin Hydrochloride",
    brandNames: ["Glucophage", "Glumetza", "Diaformin", "Metfor"],
    categorySlug: "diabetes",
    categoryName: "Diabetes Care",
    standardDosageSummary: "500 mg or 850 mg tablets taken with or immediately after meals, 1 to 3 times daily.",

    howToTake: {
      administrationRoute: "Oral tablet (Standard release or Extended Release XR)",
      technique: "Swallow tablets whole with a full glass of water during or immediately after meals.",
      instructions: [
        "Take with meals to prevent stomach irritation, nausea, and diarrhea.",
        "For Extended-Release (XR/SR) tablets, swallow whole — do NOT crush, chew, or break.",
        "You may occasionally notice an empty tablet shell in your stool with XR formulations; this is normal inactive matrix.",
      ],
      swallowWholeWarning: true,
      postureAdvice: "Swallow sitting or standing upright.",
    },

    whenToTake: {
      bestTimeOfDay: "With breakfast and/or dinner.",
      circadianRationale: "Taking with meals moderates post-prandial hepatic glucose release and minimizes gastrointestinal discomfort.",
      routineIntegrationTip: "Place tablet next to your meal plate so you take it with your first bite of food.",
    },

    howOftenToTake: {
      frequencySchedule: "1 to 3 times daily depending on whether you take Immediate Release (IR) or Extended Release (XR).",
      intervalHours: "Every 12 hours (BID) or once daily with dinner (XR).",
      maxDailyDose: "Maximum 2,550 mg daily (or 2,000 mg daily for XR).",
    },

    foodAndDrink: {
      rule: "with_food",
      summary: "ALWAYS take with or immediately after food.",
      detailedGuidance: "Taking Metformin on an empty stomach commonly causes stomach cramps, nausea, and loose diarrhea. Taking with main meals drastically reduces these effects.",
      grapefruitInteraction: false,
      dairyCalciumInteraction: false,
      alcoholWarning: "STRICTLY AVOID excessive or binge alcohol consumption: alcohol combined with Metformin increases the risk of severe Lactic Acidosis and hypoglycemia.",
    },

    storage: {
      temperatureRange: "Store below 25°C in a dry place away from heat and moisture.",
      refrigerationRequired: false,
      moistureSensitive: true,
      lightSensitive: false,
      childSafetyGuidance: "Keep in original blister pack in a secure, high cupboard.",
      homeLocationAdvice: "Kitchen pantry or dining cabinet away from stove heat.",
    },

    device: {
      guideId: "glucometer",
      deviceName: "Blood Glucose Monitor",
      quickInstructions: "Test fasting blood sugar before breakfast and 2 hours post-dinner to track glycemic control.",
    },

    sideEffects: {
      expected: [
        { effect: "Gastrointestinal upset (nausea, abdominal bloating, diarrhea)", frequency: "very_common", homeManagement: "Take with food; start with low doses and titrate up gradually over several weeks. Symptoms typically resolve within 2 weeks." },
        { effect: "Metallic taste in mouth", frequency: "common", homeManagement: "Chew sugar-free mints or gum; improves as your body adapts." },
        { effect: "Vitamin B12 deficiency (long-term use)", frequency: "common", homeManagement: "Request annual serum B12 blood tests and take B-complex supplements if advised." },
      ],
      emergencyRedFlags: [
        "Unexplained extreme fatigue, muscle aches, severe abdominal pain, difficulty breathing, slow heartbeat, or feeling unusually cold (Signs of rare Lactic Acidosis)",
        "Severe vomiting preventing fluid intake (risk of dehydration and acute kidney injury)",
      ],
      whenToPauseAndCall: "Temporarily pause Metformin and contact your doctor immediately if you develop severe dehydration, vomiting, or are scheduled for an iodinated CT contrast scan.",
    },

    missedDose: {
      ruleOfThumb: "Take the missed dose with your next meal or snack. If it is already time for your next scheduled dose, skip the missed dose and resume normal schedule.",
      cutoffHoursNotice: "Never take Metformin without a meal simply to catch up.",
      neverDoubleUpRule: "NEVER take a double dose to compensate.",
      specificScenarioGuidance: "Missing one dose will not trigger a crisis, but double-dosing will cause severe nausea and diarrhea.",
    },

    courseCompletion: {
      importance: "essential",
      rationale: "Metformin is a long-term chronic medication. It protects your heart, kidneys, eyes, and nerves from silent diabetic vascular damage.",
      asymptomaticAdherenceAdvice: "High blood sugar has no early warning symptoms. Never stop taking your medication just because you 'feel fine'.",
    },

    safeHandling: {
      handHygiene: "Wash hands before taking medicine or testing blood glucose.",
      childProofing: "Store locked away from children.",
      safeDisposal: "Return unused/expired tablets to pharmacy for safe disposal.",
      neverShareMessage: "Never share diabetic medications — dosing depends strictly on kidney function (eGFR).",
    },

    whenToReturn: {
      expectedImprovementTimeline: "Blood glucose numbers begin improving in 5 to 7 days, with full HbA1c reductions visible in 8 to 12 weeks.",
      pharmacistConsultTriggers: [
        "Persistent diarrhea or nausea after 2 weeks on medication",
        "Advice on transitioning to Extended-Release (XR) formulation",
        "Questions regarding blood glucose monitoring technique",
      ],
      doctorEmergencyTriggers: [
        "Symptoms of lactic acidosis (extreme fatigue, severe stomach pain, muscle cramps)",
        "Frequent low blood sugar episodes (< 4.0 mmol/L) when combined with other diabetic medicines",
        "Upcoming surgery or contrast CT scan procedures",
      ],
      routineLabMonitoring: ["Kidney function tests (Serum Creatinine / eGFR) every 6–12 months", "HbA1c test every 3–6 months", "Serum Vitamin B12 levels annually"],
    },
  },

  salbutamol_inhaler: {
    medicineKey: "salbutamol",
    genericName: "Salbutamol (Albuterol)",
    brandNames: ["Ventolin", "Asthalin", "Aerolin", "ProAir"],
    categorySlug: "respiratory",
    categoryName: "Respiratory Care",
    standardDosageSummary: "100 mcg per puff; 1 to 2 puffs inhaled as needed for sudden wheezing, shortness of breath, or asthma symptoms.",

    howToTake: {
      administrationRoute: "Oral Inhalation via Metered Dose Inhaler (MDI)",
      technique: "Shake inhaler, breathe out fully, seal lips around mouthpiece, press canister once while inhaling slowly and deeply for 5 seconds, then hold breath for 10 seconds.",
      instructions: [
        "Always use a spacer device for maximum lung delivery and less throat deposition.",
        "Wait 1 full minute between the first and second puff.",
        "Keep your rescue inhaler with you at all times in your bag or pocket.",
      ],
      swallowWholeWarning: false,
      postureAdvice: "Sit or stand straight up to allow full lung expansion.",
    },

    whenToTake: {
      bestTimeOfDay: "As needed (PRN) for acute asthma symptoms or 15 minutes before exercise.",
      circadianRationale: "Provides rapid bronchodilation within 3 to 5 minutes, lasting 4 to 6 hours.",
      routineIntegrationTip: "Keep one rescue inhaler at home and carry one in your daily bag.",
    },

    howOftenToTake: {
      frequencySchedule: "As needed for relief of symptoms. Maximum 8 puffs in 24 hours without medical review.",
      intervalHours: "Can be repeated every 4 to 6 hours if needed.",
      maxDailyDose: "Adult max 800 mcg (8 puffs) in 24 hours unless under emergency protocol.",
      prnLimits: "If you need your blue rescue inhaler more than 2 times a week, your asthma is poorly controlled and you need a daily preventer steroid inhaler.",
    },

    foodAndDrink: {
      rule: "with_or_without_food",
      summary: "Can be used at any time regardless of food or meals.",
      detailedGuidance: "Food does not interfere with inhaled bronchodilators.",
      grapefruitInteraction: false,
      dairyCalciumInteraction: false,
      alcoholWarning: "Alcohol does not directly interact but may trigger asthma in sulfite-sensitive individuals.",
      caffeineWarning: "Excess caffeine combined with Salbutamol may worsen heart palpitations and hand tremors.",
    },

    storage: {
      temperatureRange: "Store below 30°C. Protect from direct sunlight and extreme heat.",
      refrigerationRequired: false,
      moistureSensitive: false,
      lightSensitive: false,
      childSafetyGuidance: "Keep within reach of older children who know how to self-administer for asthma emergencies, but out of reach of toddlers.",
      homeLocationAdvice: "Bedside table and carry-bag. Never leave in a hot car glove compartment.",
    },

    specialDosageForm: {
      guideId: "inhaler_mdi",
      formName: "Metered Dose Inhaler (MDI)",
      highlightedInstruction: "Shake vigorously before every puff. Inhale slowly and deeply, and hold breath for 10 seconds.",
    },

    device: {
      guideId: "spacer",
      deviceName: "Inhaler Spacer Device",
      quickInstructions: "Fire 1 puff into spacer, take 5 calm tidal breaths or 1 deep breath, hold 10 seconds.",
    },

    sideEffects: {
      expected: [
        { effect: "Mild hand tremors or shakiness", frequency: "common", homeManagement: "Temporary adrenaline-like effect that subsides within 30-60 minutes." },
        { effect: "Mild palpitations or fast heartbeat", frequency: "common", homeManagement: "Rest calmly; reassure patient this is expected and wears off." },
        { effect: "Mild headache", frequency: "uncommon", homeManagement: "Stay hydrated and rest." },
      ],
      emergencyRedFlags: [
        "Inhaler provides no relief or wheezing worsens after 10 minutes (Asthma Attack Emergency)",
        "Inability to speak in full sentences without gasping for breath",
        "Chest wall pulling inward (intercostal retractions) or blue/gray lips or fingernails",
      ],
      whenToPauseAndCall: "Call emergency services immediately if you take 4-10 puffs of rescue inhaler and breathing remains difficult.",
    },

    missedDose: {
      ruleOfThumb: "Salbutamol is taken on an as-needed basis for sudden symptoms. If you have no symptoms, you do not need to take a dose.",
      neverDoubleUpRule: "Never take more than 2 puffs at a single time without clinical instruction.",
      specificScenarioGuidance: "If prescribed regularly for COPD maintenance, take as soon as remembered unless close to next scheduled dose.",
    },

    courseCompletion: {
      importance: "essential",
      rationale: "Rescue inhalers relieve symptoms immediately but do NOT cure the underlying airway inflammation.",
      asymptomaticAdherenceAdvice: "Use as needed, but always pair with your daily brown/purple preventer inhaler as prescribed.",
    },

    safeHandling: {
      handHygiene: "Wash hands before cleaning mouthpiece.",
      specialPrecautions: "Never puncture or incinerate the metal aerosol canister even when empty.",
      childProofing: "Teach school-aged children proper self-administration and emergency recognition.",
      safeDisposal: "Return empty canisters to pharmacy for safe recycling/disposal.",
      neverShareMessage: "Keep personal inhaler labeled with your name.",
    },

    whenToReturn: {
      expectedImprovementTimeline: "Breathing should noticeably ease within 3 to 5 minutes after inhalation.",
      pharmacistConsultTriggers: [
        "Using your blue inhaler more than 2 times per week (indicates need for preventer review)",
        "Needing a spacer device demonstration or technique check",
        "Empty canister tracking and refill forecasting",
      ],
      doctorEmergencyTriggers: [
        "Acute severe asthma attack unresponsive to 4–6 puffs",
        "Peak flow reading below 50% of personal best",
        "Shortness of breath walking across a room or speaking",
      ],
      routineLabMonitoring: ["Annual Asthma / COPD review and inhaler technique audit"],
    },
  },

  paracetamol: {
    medicineKey: "paracetamol",
    genericName: "Paracetamol (Acetaminophen)",
    brandNames: ["Panadol", "Calpol", "Tylenol", "Hedex", "Crocin"],
    categorySlug: "pain-relief",
    categoryName: "Pain & Fever Relief",
    standardDosageSummary: "500 mg to 1,000 mg (1-2 tablets) every 4 to 6 hours as needed. Maximum 4,000 mg (8 tablets) in 24 hours.",

    howToTake: {
      administrationRoute: "Oral (Tablets, effervescent, syrup, or suppositories)",
      technique: "Swallow tablets with a full glass of water. Effervescent tablets must be fully dissolved in a glass of water before drinking.",
      instructions: [
        "Allow at least 4 hours between doses.",
        "Do NOT take more than 4,000 mg (8 x 500mg tablets) in any 24-hour period.",
        "Check all other cold & flu remedies, cough syrups, and pain relievers to ensure they do not also contain paracetamol.",
      ],
      swallowWholeWarning: false,
    },

    whenToTake: {
      bestTimeOfDay: "At regular 4 to 6 hour intervals as needed for pain or fever.",
      circadianRationale: "Provides fever reduction within 30 minutes and pain relief for 4 to 6 hours.",
      routineIntegrationTip: "Take with breakfast, lunch, dinner, and bedtime if experiencing severe continuous pain.",
    },

    howOftenToTake: {
      frequencySchedule: "Every 4 to 6 hours as needed. Do not exceed 4 doses in 24 hours.",
      intervalHours: "Minimum 4 hours between doses.",
      maxDailyDose: "Strict 4,000 mg (4 grams) maximum in 24 hours for adults. 2,000 mg max for patients with chronic liver disease or malnutrition.",
    },

    foodAndDrink: {
      rule: "with_or_without_food",
      summary: "Can be taken on an empty stomach or with food.",
      detailedGuidance: "Unlike NSAIDs (ibuprofen), paracetamol does not irritate the stomach lining and is safe on an empty stomach.",
      grapefruitInteraction: false,
      dairyCalciumInteraction: false,
      alcoholWarning: "AVOID chronic heavy alcohol consumption: chronic alcohol intake exhausts liver glutathione and increases paracetamol liver toxicity.",
    },

    storage: {
      temperatureRange: "Store below 25°C in a dry place.",
      refrigerationRequired: false,
      moistureSensitive: true,
      lightSensitive: false,
      childSafetyGuidance: "Keep paracetamol syrups locked away — sweet taste leads to accidental pediatric overdoses.",
      homeLocationAdvice: "High medicine cabinet away from children.",
    },

    sideEffects: {
      expected: [
        { effect: "Rare when taken at recommended doses", frequency: "uncommon", homeManagement: "Well-tolerated by 99%+ of patients." },
      ],
      emergencyRedFlags: [
        "Accidental overdose exceeding 4,000 mg in 24 hours (Lethal liver toxicity risk — requires immediate N-acetylcysteine antidote)",
        "Nausea, vomiting, right upper abdominal pain, and yellowing of eyes/skin (Jaundice)",
        "Severe allergic skin reactions (Stevens-Johnson syndrome)",
      ],
      whenToPauseAndCall: "In case of suspected overdose (even without symptoms), go to the emergency room IMMEDIATELY within 8 hours for antidote treatment.",
    },

    missedDose: {
      ruleOfThumb: "Take as needed for pain or fever. If pain has resolved, skip the dose.",
      neverDoubleUpRule: "NEVER double up. Overdosing destroys liver cells rapidly.",
      specificScenarioGuidance: "Ensure at least 4 hours have passed since your previous dose.",
    },

    courseCompletion: {
      importance: "essential",
      rationale: "Paracetamol is for short-term symptom relief. If fever persists longer than 3 days or pain longer than 7 days, seek medical diagnosis.",
      asymptomaticAdherenceAdvice: "Discontinue once pain or fever has resolved.",
    },

    safeHandling: {
      handHygiene: "Standard hand hygiene.",
      childProofing: "Use weight-based dosing for pediatric syrups (15 mg/kg per dose) using measuring syringe only.",
      safeDisposal: "Discard expired tablets in pharmacy take-back bins.",
      neverShareMessage: "Ensure family members do not take multiple combination medicines containing paracetamol.",
    },

    whenToReturn: {
      expectedImprovementTimeline: "Fever and pain should reduce within 30 to 60 minutes after ingestion.",
      pharmacistConsultTriggers: [
        "Checking active ingredients across multiple cough/cold sachets",
        "Calculating weight-based pediatric dosages",
        "Safe pain relief alternatives for patients with kidney disease or stomach ulcers",
      ],
      doctorEmergencyTriggers: [
        "Fever exceeding 39.5°C or persisting beyond 3 days",
        "Pain worsening or persisting beyond 7 days",
        "Known or suspected paracetamol overdose",
      ],
    },
  },

  amlodipine: {
    medicineKey: "amlodipine",
    genericName: "Amlodipine Besylate",
    brandNames: ["Norvasc", "Amlod", "Amlovas", "Istin"],
    categorySlug: "cardiovascular",
    categoryName: "Blood Pressure & Heart",
    standardDosageSummary: "5 mg or 10 mg tablet once daily in the morning.",

    howToTake: {
      administrationRoute: "Oral tablet",
      technique: "Swallow whole with a glass of water. Can be taken with or without food.",
      instructions: [
        "Take at the same time every single day (morning is most common).",
        "Can be taken with or without meals.",
        "Do not drink large amounts of grapefruit juice while taking amlodipine.",
      ],
      swallowWholeWarning: false,
    },

    whenToTake: {
      bestTimeOfDay: "Once daily in the morning (or evening if instructed by doctor).",
      circadianRationale: "Provides smooth 24-hour blood pressure control with a long half-life (30-50 hours).",
      routineIntegrationTip: "Take right after brushing your teeth in the morning.",
    },

    howOftenToTake: {
      frequencySchedule: "Once daily (QD).",
      intervalHours: "Every 24 hours.",
      maxDailyDose: "Maximum 10 mg once daily.",
    },

    foodAndDrink: {
      rule: "with_or_without_food",
      summary: "Can be taken with or without food.",
      detailedGuidance: "Food does not affect amlodipine absorption.",
      grapefruitInteraction: true,
      dairyCalciumInteraction: false,
      alcoholWarning: "Limit alcohol: alcohol combined with blood pressure medicines can cause sudden drops in blood pressure and dizziness.",
    },

    storage: {
      temperatureRange: "Store below 25°C in a dry place away from light.",
      refrigerationRequired: false,
      moistureSensitive: true,
      lightSensitive: true,
      childSafetyGuidance: "Keep out of reach of children.",
      homeLocationAdvice: "Bedroom bedside drawer or nightstand.",
    },

    device: {
      guideId: "bp_monitor",
      deviceName: "Home Blood Pressure Monitor",
      quickInstructions: "Check blood pressure once in morning before taking tablet and once in evening. Record readings in logbook.",
    },

    sideEffects: {
      expected: [
        { effect: "Ankle and lower leg swelling (peripheral edema)", frequency: "common", homeManagement: "Elevate legs when sitting or resting. Consult doctor if swelling worsens." },
        { effect: "Mild dizziness when standing up", frequency: "common", homeManagement: "Rise slowly from lying or sitting positions to prevent orthostatic lightheadedness." },
        { effect: "Flushing or warm sensation in face", frequency: "common", homeManagement: "Harmless vasodilator effect that diminishes over time." },
      ],
      emergencyRedFlags: [
        "Sudden chest pain, tightness, or irregular heart palpitations",
        "Severe dizziness causing fainting or loss of consciousness",
        "Severe allergic facial swelling or rash",
      ],
      whenToPauseAndCall: "Contact your doctor if ankle swelling is severe or accompanied by shortness of breath.",
    },

    missedDose: {
      ruleOfThumb: "Take as soon as you remember that day. If more than 12 hours have passed, skip the missed dose and resume your regular schedule next morning.",
      neverDoubleUpRule: "NEVER take two tablets at once — causes dangerous hypotension (low blood pressure).",
      specificScenarioGuidance: "Because amlodipine has a very long duration of action, missing one dose will not cause a sudden rebound spike, but consistency is key.",
    },

    courseCompletion: {
      importance: "essential",
      rationale: "High blood pressure is a silent condition with no outward symptoms. Amlodipine prevents strokes, heart attacks, and kidney failure.",
      asymptomaticAdherenceAdvice: "Never stop taking your medication just because your blood pressure readings have normalized — the medicine is the reason they are normal!",
    },

    safeHandling: {
      handHygiene: "Standard hygiene.",
      childProofing: "Store in original child-resistant blister pack.",
      safeDisposal: "Return unused tablets to pharmacy.",
      neverShareMessage: "Never share cardiovascular medications.",
    },

    whenToReturn: {
      expectedImprovementTimeline: "Blood pressure begins to decrease in 24 hours, with full therapeutic reduction seen in 1 to 2 weeks.",
      pharmacistConsultTriggers: [
        "Managing mild ankle swelling or dizziness",
        "Checking blood pressure monitor accuracy and cuff sizing",
        "Checking drug interactions with OTC decongestants or NSAIDs (which raise blood pressure)",
      ],
      doctorEmergencyTriggers: [
        "Systolic BP > 180 or Diastolic BP > 120 with headache or blurred vision",
        "Severe swelling in legs accompanied by shortness of breath when lying flat",
        "Chest pain or rapid irregular heartbeat",
      ],
      routineLabMonitoring: ["Blood pressure monitoring weekly", "Periodic kidney and liver function tests"],
    },
  },
};

// ── Generic Generator for Any Medication (100% Dynamic Fallback) ────
export function generateDynamicCounsellingProfile(
  name: string,
  genericName?: string | null,
  categorySlug: string = "general",
  dosageFormName?: string | null,
  dosageText?: string | null,
  storageText?: string | null,
  sideEffectsText?: string | null
): MedicationCounsellingProfile {
  const normKey = (genericName || name).toLowerCase().trim().replace(/[^a-z0-9]/g, "");

  // Check curated matches first
  for (const [key, profile] of Object.entries(CURATED_COUNSELLING_PROFILES)) {
    if (normKey.includes(key) || key.includes(normKey)) {
      return profile;
    }
  }

  const gName = genericName || name;
  const formLower = (dosageFormName || "").toLowerCase();
  const catLower = (categorySlug || "").toLowerCase();

  // Determine special dosage form
  let specialForm: { guideId: DosageFormGuideType; formName: string; highlightedInstruction: string } | undefined;
  if (formLower.includes("inhaler") || formLower.includes("puffer")) {
    specialForm = {
      guideId: "inhaler_mdi",
      formName: "Inhalation Aerosol",
      highlightedInstruction: "Shake vigorously before use, exhale fully, inhale deeply and slowly, and hold breath for 10 seconds.",
    };
  } else if (formLower.includes("eye") || formLower.includes("ophthalmic")) {
    specialForm = {
      guideId: "eye_drops",
      formName: "Ophthalmic Eye Drops",
      highlightedInstruction: "Wash hands, pull lower eyelid down, instill 1 drop into pocket, and press inner corner of eye for 2 minutes.",
    };
  } else if (formLower.includes("ear") || formLower.includes("otic")) {
    specialForm = {
      guideId: "ear_drops",
      formName: "Otic Ear Drops",
      highlightedInstruction: "Warm bottle between hands, tilt head, pull earlobe up and back (adults), instill drops, and stay on side for 3–5 minutes.",
    };
  } else if (formLower.includes("nasal") || formLower.includes("spray")) {
    specialForm = {
      guideId: "nasal_spray",
      formName: "Nasal Spray",
      highlightedInstruction: "Tilt head slightly forward, aim nozzle outward toward ear away from septum, and spray with a gentle breath.",
    };
  } else if (formLower.includes("patch") || formLower.includes("transdermal")) {
    specialForm = {
      guideId: "transdermal_patch",
      formName: "Transdermal Patch",
      highlightedInstruction: "Apply to clean dry hairless skin, press for 30s, rotate sites, and avoid heating pads.",
    };
  } else if (formLower.includes("suppository") || formLower.includes("pessary")) {
    specialForm = {
      guideId: "suppository",
      formName: "Suppository / Pessary",
      highlightedInstruction: "Moisten tip with water, insert gently past sphincter, and remain lying down for 15 minutes.",
    };
  } else if (formLower.includes("suspension") || formLower.includes("syrup") || formLower.includes("liquid")) {
    specialForm = {
      guideId: "oral_suspension",
      formName: "Oral Suspension",
      highlightedInstruction: "Shake vigorously before every single dose. Measure with an oral syringe, never a kitchen spoon.",
    };
  } else if (formLower.includes("cream") || formLower.includes("ointment") || formLower.includes("gel")) {
    specialForm = {
      guideId: "topical_cream",
      formName: "Topical Cream / Ointment",
      highlightedInstruction: "Apply a thin layer using Fingertip Units (FTU) and gently smooth onto skin. Wash hands after use.",
    };
  }

  // Determine food rule
  let foodRule: FoodRuleType = "with_or_without_food";
  let foodSummary = "Can be taken with or without food as prescribed.";
  if (catLower.includes("antibiotic") || catLower.includes("pain") || catLower.includes("anti-inflamm")) {
    foodRule = "with_food";
    foodSummary = "Best taken with food or milk to prevent stomach irritation.";
  } else if (catLower.includes("stomach") || catLower.includes("digestive") || catLower.includes("ulcer") || gName.toLowerCase().includes("prazole")) {
    foodRule = "empty_stomach";
    foodSummary = "Best taken on an empty stomach 30 to 60 minutes before your first meal.";
  }

  // Determine device
  let device: { guideId: DeviceGuideType; deviceName: string; quickInstructions: string } | undefined;
  if (catLower.includes("respiratory") || formLower.includes("inhaler")) {
    device = {
      guideId: "spacer",
      deviceName: "Inhaler Spacer Holding Chamber",
      quickInstructions: "Use a spacer chamber to deliver 50%+ more medicine directly into your lungs with less throat irritation.",
    };
  } else if (catLower.includes("diabetes") || gName.toLowerCase().includes("insulin")) {
    device = {
      guideId: "glucometer",
      deviceName: "Blood Glucose Monitor",
      quickInstructions: "Check blood sugar regularly and rotate lancet sites.",
    };
  } else if (catLower.includes("cardiovascular") || catLower.includes("hypertension")) {
    device = {
      guideId: "bp_monitor",
      deviceName: "Home Blood Pressure Monitor",
      quickInstructions: "Monitor and log morning and evening blood pressure resting quietly for 5 minutes.",
    };
  }

  const isAntibiotic = catLower.includes("antibiotic");
  const isChronic = catLower.includes("cardio") || catLower.includes("diabetes") || catLower.includes("mental") || catLower.includes("thyroid");

  return {
    medicineKey: normKey || "generic",
    genericName: gName,
    brandNames: [name],
    categorySlug,
    categoryName: categorySlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    standardDosageSummary: dosageText || "Take as instructed on the prescription label by your pharmacist.",

    howToTake: {
      administrationRoute: dosageFormName || "Oral",
      technique: "Take according to the labeled directions with a full glass of water.",
      instructions: [
        "Take doses at consistent, evenly spaced times every day.",
        dosageText || "Follow the exact frequency and quantity specified on the label.",
        "Swallow tablets or capsules whole unless instructed otherwise.",
      ],
      swallowWholeWarning: !formLower.includes("chew") && !formLower.includes("liquid"),
      postureAdvice: "Swallow sitting or standing upright.",
    },

    whenToTake: {
      bestTimeOfDay: isChronic ? "At the same time every day (e.g. morning with breakfast)." : "Evenly spaced throughout the day.",
      circadianRationale: "Consistent timing maintains optimal steady-state therapeutic drug levels in your body.",
      routineIntegrationTip: "Tie taking your medication to a daily habit like brushing teeth or breakfast.",
    },

    howOftenToTake: {
      frequencySchedule: dosageText ? dosageText.split(",")[0] : "As prescribed by your clinician.",
      intervalHours: "Evenly spaced throughout the day.",
      maxDailyDose: "Do not exceed the maximum daily dosage printed on the prescription label.",
    },

    foodAndDrink: {
      rule: foodRule,
      summary: foodSummary,
      detailedGuidance: "Drink adequate water (6–8 glasses daily) to aid kidney excretion and drug absorption.",
      grapefruitInteraction: catLower.includes("cardio") || catLower.includes("cholesterol"),
      dairyCalciumInteraction: isAntibiotic,
      alcoholWarning: "Limit or avoid alcohol while taking medications, as alcohol can alter drug metabolism and increase side effects.",
    },

    storage: {
      temperatureRange: storageText || "Store below 25°C in a dry place away from direct heat and moisture.",
      refrigerationRequired: (storageText || "").toLowerCase().includes("refrigerat") || formLower.includes("suspension"),
      moistureSensitive: true,
      lightSensitive: false,
      inUseExpirationDays: formLower.includes("eye") ? 28 : formLower.includes("suspension") ? 10 : undefined,
      childSafetyGuidance: "Store in original child-resistant packaging out of sight and reach of children and pets.",
      homeLocationAdvice: "Store in a cool bedroom cabinet or high shelf (avoid humid bathrooms).",
    },

    specialDosageForm: specialForm,

    sideEffects: {
      expected: sideEffectsText
        ? sideEffectsText.split(/[,;\n]+/).filter(Boolean).slice(0, 3).map((effect) => ({
            effect: effect.trim(),
            frequency: "common" as const,
            homeManagement: "Rest, stay hydrated, and take with meals if stomach upset occurs.",
          }))
        : [
            { effect: "Mild gastrointestinal upset or nausea", frequency: "common", homeManagement: "Take dose with food or a small snack." },
            { effect: "Mild headache or fatigue", frequency: "common", homeManagement: "Rest and maintain good hydration." },
          ],
      emergencyRedFlags: [
        "Sudden allergic skin rash, hives, or swelling of lips, tongue, or throat",
        "Severe dizziness, chest tightness, or difficulty breathing",
        "Persistent severe vomiting preventing fluid intake",
      ],
      whenToPauseAndCall: "Stop taking medicine and seek emergency medical care immediately if you experience signs of an allergic reaction.",
    },

    missedDose: {
      ruleOfThumb: "Take the missed dose as soon as you remember. If it is almost time for your next dose, skip the missed dose and resume your regular schedule.",
      cutoffHoursNotice: "Do not take a dose if it is within 2-3 hours of your next scheduled dose.",
      neverDoubleUpRule: "NEVER take two doses at once to make up for a missed dose.",
      specificScenarioGuidance: "Resume regular schedule at next normal time.",
    },

    courseCompletion: {
      importance: isAntibiotic ? "critical" : isChronic ? "essential" : "high",
      rationale: isAntibiotic
        ? "Complete the full antibiotic course to eliminate all bacteria and prevent Antimicrobial Resistance (AMR)."
        : isChronic
        ? "Maintain daily consistency to protect against long-term vascular and organ complications."
        : "Complete prescribed duration for optimal therapeutic recovery.",
      antimicrobialResistanceWarning: isAntibiotic ? "Stopping early causes resistant superbug bacteria to survive and multiply." : undefined,
      asymptomaticAdherenceAdvice: "Do not stop taking medication early simply because symptoms improve.",
    },

    device,

    safeHandling: {
      handHygiene: "Wash hands with soap and water before handling medicines.",
      specialPrecautions: "Keep in original labeled container so instructions are always readable.",
      childProofing: "Keep securely locked away from children.",
      safeDisposal: "Return unused or expired medications to the pharmacy take-back bin. Never flush down toilet.",
      neverShareMessage: "Never share prescription medicines with others.",
    },

    whenToReturn: {
      expectedImprovementTimeline: isAntibiotic ? "Noticeable improvement within 48 to 72 hours." : "3 to 7 days for acute symptoms.",
      pharmacistConsultTriggers: [
        "Questions regarding side effect management or missed doses",
        "Checking drug interactions with concurrent OTC medicines",
        "Reviewing dosage form technique or device instructions",
      ],
      doctorEmergencyTriggers: [
        "Symptoms worsen or fail to improve within the expected timeframe",
        "Signs of allergic reaction (rash, wheezing, swelling)",
        "Severe unexpected side effects",
      ],
    },
  };
}
