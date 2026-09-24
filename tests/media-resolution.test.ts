import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveMedicineImage,
  resolveServiceImage,
  resolvePharmacyCover,
  getCategoryAesthetic,
  MEDICINE_CATEGORY_IMAGES,
  SERVICE_DEFAULT_IMAGES,
  PHARMACY_COVERS,
} from "../app/lib/media-fallbacks";

test("Database medication categories resolve to valid HTTPS cloud URLs", () => {
  const dbCategories = [
    "anti-infectives",
    "antimalarials-anthelmintics-tb",
    "pain-relief-anesthesia",
    "cardiovascular",
    "endocrine-metabolic",
    "gastrointestinal",
    "respiratory-allergy",
    "cns-psychiatric",
    "dermatology-ophthalmic-otic",
    "antibiotics",
    "analgesics",
    "general",
  ];

  for (const cat of dbCategories) {
    const url = resolveMedicineImage(null, cat, "Sample medicine");
    assert.ok(url.startsWith("https://pub-"), `Category ${cat} should resolve to an R2 URL, got: ${url}`);
    assert.ok(url.endsWith(".webp") || url.endsWith(".png"), `Category ${cat} should end with .webp or .png, got: ${url}`);
  }
});

test("OTC categories resolve to valid HTTPS cloud URLs", () => {
  const otcCategories = [
    "pain-relief",
    "cold-flu",
    "allergy",
    "allergy-treatments",
    "vitamins-supplements",
    "vitamins",
    "baby-care",
    "first-aid",
    "skin-care",
    "diabetes-care",
    "diabetes",
    "womens-health",
    "digestive",
    "respiratory",
  ];

  for (const cat of otcCategories) {
    const url = resolveMedicineImage(null, cat, null);
    assert.ok(url.startsWith("https://pub-"), `OTC category ${cat} should resolve to an R2 URL, got: ${url}`);
  }
});

test("Explicit imageUrl is preserved when valid and non-empty", () => {
  const custom = "https://images.example.com/custom-med.jpg";
  const result = resolveMedicineImage(custom, "pain-relief", "Paracetamol");
  assert.equal(result, custom);

  const trimmed = resolveMedicineImage("  https://images.example.com/custom-med.jpg  ", null, null);
  assert.equal(trimmed, custom);
});

test("Keyword recognition correctly matches clinical categories from medicine names", () => {
  // Malaria & Tropical
  assert.equal(
    resolveMedicineImage(null, null, "Coartem 80/480mg"),
    MEDICINE_CATEGORY_IMAGES["antimalarials-anthelmintics-tb"],
  );
  assert.equal(
    resolveMedicineImage(null, null, "Artemether Lumefantrine"),
    MEDICINE_CATEGORY_IMAGES["antimalarials-anthelmintics-tb"],
  );

  // Pain / Analgesics
  assert.equal(
    resolveMedicineImage(null, null, "Panadol Extra 500mg"),
    MEDICINE_CATEGORY_IMAGES["pain-relief"],
  );
  assert.equal(
    resolveMedicineImage(null, null, "Brufen 400mg Ibuprofen"),
    MEDICINE_CATEGORY_IMAGES["pain-relief"],
  );

  // Diabetes
  assert.equal(
    resolveMedicineImage(null, null, "Metformin 500mg"),
    MEDICINE_CATEGORY_IMAGES["diabetes-care"],
  );
  assert.equal(
    resolveMedicineImage(null, null, "Blood Glucose Test Strips"),
    MEDICINE_CATEGORY_IMAGES["diabetes-care"],
  );

  // Cardiovascular
  assert.equal(
    resolveMedicineImage(null, null, "Amlodipine 5mg"),
    MEDICINE_CATEGORY_IMAGES["cardiovascular"],
  );
  assert.equal(
    resolveMedicineImage(null, null, "Losartan Potassium 50mg"),
    MEDICINE_CATEGORY_IMAGES["cardiovascular"],
  );

  // Antibiotics
  assert.equal(
    resolveMedicineImage(null, null, "Amoxicillin 500mg Capsules"),
    MEDICINE_CATEGORY_IMAGES["antibiotics"],
  );
  assert.equal(
    resolveMedicineImage(null, null, "Augmentin 625mg"),
    MEDICINE_CATEGORY_IMAGES["antibiotics"],
  );

  // Respiratory & Asthma
  assert.equal(
    resolveMedicineImage(null, null, "Ventolin Inhaler 100mcg"),
    MEDICINE_CATEGORY_IMAGES["cold-flu"],
  );

  // Dermatology
  assert.equal(
    resolveMedicineImage(null, null, "Clotrimazole Anti-Fungal Cream"),
    MEDICINE_CATEGORY_IMAGES["skin-care"],
  );

  // Pediatric
  assert.equal(
    resolveMedicineImage(null, null, "Calpol Infant Suspension"),
    MEDICINE_CATEGORY_IMAGES["baby-care"],
  );

  // Vitamins
  assert.equal(
    resolveMedicineImage(null, null, "Centrum Multivitamin"),
    MEDICINE_CATEGORY_IMAGES["vitamins-supplements"],
  );
});

test("Handles edge cases: null, undefined, empty strings, whitespace", () => {
  assert.ok(resolveMedicineImage(null, null, null).length > 0);
  assert.ok(resolveMedicineImage("", "", "").length > 0);
  assert.ok(resolveMedicineImage("   ", "   ", "   ").length > 0);
  assert.ok(resolveMedicineImage(undefined, undefined, undefined).length > 0);
});

test("Service image resolution properly matches clinical service types", () => {
  // Blood sugar / Diabetes
  assert.equal(
    resolveServiceImage(null, "Blood sugar test", "Check blood glucose"),
    SERVICE_DEFAULT_IMAGES.diabetes,
  );

  // Vaccines
  assert.equal(
    resolveServiceImage(null, "Flu Vaccine", "Annual seasonal influenza immunization"),
    SERVICE_DEFAULT_IMAGES.vaccination,
  );
  assert.equal(
    resolveServiceImage(null, "Travel Immunization", "Yellow fever jab"),
    SERVICE_DEFAULT_IMAGES.vaccination,
  );

  // Vitals & Screenings
  assert.equal(
    resolveServiceImage(null, "Blood Pressure Check", "Cardiovascular screening and vitals"),
    SERVICE_DEFAULT_IMAGES.screening,
  );

  // Consultations
  assert.equal(
    resolveServiceImage(null, "Pharmacist Consultation", "Medication therapy review and advice"),
    SERVICE_DEFAULT_IMAGES.counselling,
  );

  // Refills
  assert.equal(
    resolveServiceImage(null, "Prescription Refill Sync", "Sync repeat medications"),
    SERVICE_DEFAULT_IMAGES.refill,
  );

  // Delivery
  assert.equal(
    resolveServiceImage(null, "Express Doorstep Delivery", "Dispatched to your home"),
    SERVICE_DEFAULT_IMAGES.delivery,
  );

  // Home Care
  assert.equal(
    resolveServiceImage(null, "Home Care Support", "Domiciliary visits for elderly patients"),
    SERVICE_DEFAULT_IMAGES.homeCare,
  );

  // Explicit image preserved
  const explicit = "https://example.com/custom-service.jpg";
  assert.equal(resolveServiceImage(explicit, "Any title", "Any desc"), explicit);

  // Fallback for null/empty
  assert.ok(resolveServiceImage(null, null, null).startsWith("https://pub-"));
});

test("Pharmacy cover resolution provides deterministic high-definition images", () => {
  const explicit = "https://example.com/pharmacy-front.jpg";
  assert.equal(resolvePharmacyCover(explicit, "pharma-1"), explicit);

  // Deterministic: same slug produces same cover
  const cover1 = resolvePharmacyCover(null, "westlands-care");
  const cover2 = resolvePharmacyCover(null, "westlands-care");
  assert.equal(cover1, cover2);
  assert.ok(PHARMACY_COVERS.includes(cover1));

  // Handles null / undefined seed
  const defaultCover = resolvePharmacyCover(null, null);
  assert.ok(PHARMACY_COVERS.includes(defaultCover));

  const undefinedCover = resolvePharmacyCover(null, undefined);
  assert.ok(PHARMACY_COVERS.includes(undefinedCover));

  // Number index
  const indexCover = resolvePharmacyCover(null, 2);
  assert.equal(indexCover, PHARMACY_COVERS[2]);
});

test("Category aesthetic helper provides accessible, vibrant color tokens", () => {
  const painAesthetic = getCategoryAesthetic("pain-relief");
  assert.ok(painAesthetic.accent.startsWith("#"));
  assert.ok(painAesthetic.glow.startsWith("rgba("));
  assert.ok(painAesthetic.pillBg.startsWith("rgba("));

  const cardioAesthetic = getCategoryAesthetic("cardiovascular");
  assert.ok(cardioAesthetic.accent.startsWith("#"));

  const defaultAesthetic = getCategoryAesthetic(null);
  assert.ok(defaultAesthetic.accent.startsWith("#"));
});
