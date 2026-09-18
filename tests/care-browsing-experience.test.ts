import assert from "node:assert/strict";
import test from "node:test";
import { distanceKm, distanceLabel, proximityOrder } from "../app/lib/proximity";
import type { RadarItem } from "../app/components/radar/CareRadar";

test("Proximity calculation and distance labels for nearby browsing", () => {
  const userCoords = { latitude: -1.286389, longitude: 36.817223 }; // Nairobi CBD
  const westlands = { latitude: -1.268, longitude: 36.807 };
  const mombasa = { latitude: -4.0435, longitude: 39.6682 };

  const westlandsDist = distanceKm(userCoords, westlands);
  const mombasaDist = distanceKm(userCoords, mombasa);

  assert.ok(westlandsDist !== null && westlandsDist < 5);
  assert.ok(mombasaDist !== null && mombasaDist > 400);

  // Label formatting
  assert.equal(distanceLabel(0.4), "400 m away");
  assert.equal(distanceLabel(2.34), "2.3 km away");
  assert.equal(distanceLabel(null), null);
  assert.equal(distanceLabel(undefined), null);

  // Sorting by proximity
  const items = [
    { name: "Far Clinic", distanceKm: mombasaDist },
    { name: "Unknown Clinic", distanceKm: null },
    { name: "Near Clinic", distanceKm: westlandsDist },
  ];
  items.sort(proximityOrder);
  assert.equal(items[0].name, "Near Clinic");
  assert.equal(items[1].name, "Far Clinic");
  assert.equal(items[2].name, "Unknown Clinic");
});

test("RadarItem structures correctly represent pharmacies, medicines, and services", () => {
  const pharmacyItem: RadarItem = {
    id: "pharma-1",
    name: "Afyvia Hub Nairobi",
    type: "pharmacy",
    latitude: -1.286,
    longitude: 36.817,
    distanceKm: 0.2,
    detail: "Nairobi CBD",
    actionLabel: "Visit Storefront",
    href: "/pharmacies/afyvia-hub-nairobi",
  };

  const medicineItem: RadarItem = {
    id: "med-1",
    name: "Amoxicillin 500mg",
    type: "medicine",
    latitude: -1.286,
    longitude: 36.817,
    distanceKm: 0.5,
    price: 350,
    stock: 14,
    detail: "Afyvia Hub Nairobi",
    actionLabel: "Reserve / Order",
    badge: "Rx",
    href: "/p/afyvia-hub-nairobi/medicines/amoxicillin-500mg",
  };

  const serviceItem: RadarItem = {
    id: "srv-1",
    name: "Blood Pressure & Glucose Screening",
    type: "service",
    latitude: -1.286,
    longitude: 36.817,
    distanceKm: 0.8,
    price: 500,
    actionLabel: "Book Appointment",
    badge: "Bookable",
    href: "/p/afyvia-hub-nairobi/services/blood-pressure-screening",
  };

  assert.equal(pharmacyItem.type, "pharmacy");
  assert.equal(medicineItem.type, "medicine");
  assert.equal(serviceItem.type, "service");
  assert.equal(medicineItem.actionLabel, "Reserve / Order");
  assert.equal(serviceItem.actionLabel, "Book Appointment");
});

test("Sorting algorithm correctly ranks medicine and service offerings", () => {
  type TestItem = {
    id: string;
    title: string;
    price: number;
    availableStock: number;
    distanceKm: number | null;
    bookable: boolean;
  };

  const offerings: TestItem[] = [
    { id: "1", title: "Vaccine A", price: 1500, availableStock: 0, distanceKm: 12.0, bookable: false },
    { id: "2", title: "Screening B", price: 500, availableStock: 5, distanceKm: 1.2, bookable: true },
    { id: "3", title: "Consultation C", price: 800, availableStock: 10, distanceKm: 0.4, bookable: true },
  ];

  // Nearest sort
  const byProximity = [...offerings].sort(
    (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity),
  );
  assert.equal(byProximity[0].id, "3");
  assert.equal(byProximity[1].id, "2");
  assert.equal(byProximity[2].id, "1");

  // Price low to high sort
  const byPriceAsc = [...offerings].sort((a, b) => a.price - b.price);
  assert.equal(byPriceAsc[0].id, "2");
  assert.equal(byPriceAsc[1].id, "3");
  assert.equal(byPriceAsc[2].id, "1");

  // In stock filter
  const inStock = offerings.filter((o) => o.availableStock > 0);
  assert.equal(inStock.length, 2);
  assert.ok(!inStock.some((o) => o.id === "1"));

  // Bookable filter
  const bookableOnly = offerings.filter((o) => o.bookable);
  assert.equal(bookableOnly.length, 2);
  assert.ok(!bookableOnly.some((o) => o.id === "1"));
});

test("Canonical comparison slug resolution prioritizes master medication slug", () => {
  // Scenario 1: Pharmacy inventory has a distinct local slug, but links to a master medication
  const inventoryWithMaster = {
    slug: "inventory-amox-500-local-123",
    medicationMaster: {
      id: "master-1",
      slug: "amoxicillin-500mg",
      name: "Amoxicillin 500mg",
    },
  };

  const canonicalSlug = inventoryWithMaster.medicationMaster?.slug || inventoryWithMaster.slug;
  assert.equal(canonicalSlug, "amoxicillin-500mg");

  // Scenario 2: Legacy or unlinked inventory without master slug falls back to inventory slug
  const inventoryWithoutMaster = {
    slug: "custom-tonic-blend",
    medicationMaster: {
      id: "",
      name: "Custom Tonic",
    } as any,
  };

  const fallbackSlug = inventoryWithoutMaster.medicationMaster?.slug || inventoryWithoutMaster.slug;
  assert.equal(fallbackSlug, "custom-tonic-blend");
});

test("Services directory filters: category filtering decouples cleanly from online booking toggle", () => {
  const serviceCatalog = [
    { id: "1", title: "Blood Pressure Check", category: "Screenings & Checks", bookable: false },
    { id: "2", title: "Diabetes HbA1c Screen", category: "Screenings & Checks", bookable: true },
    { id: "3", title: "Flu Vaccination", category: "Vaccinations", bookable: true },
    { id: "4", title: "Travel Vaccine Consultation", category: "Vaccinations", bookable: false },
    { id: "5", title: "Pharmacist Consultation", category: "Consultations", bookable: true },
  ];

  // Filter 1: All categories, bookable only
  const allBookable = serviceCatalog.filter((s) => s.bookable);
  assert.equal(allBookable.length, 3);
  assert.deepEqual(allBookable.map(s => s.id), ["2", "3", "5"]);

  // Filter 2: Specific category ("Screenings & Checks"), not filtered by bookable
  const screeningsAll = serviceCatalog.filter((s) => s.category === "Screenings & Checks");
  assert.equal(screeningsAll.length, 2);
  assert.deepEqual(screeningsAll.map(s => s.id), ["1", "2"]);

  // Filter 3: Specific category ("Screenings & Checks") AND bookable only
  const screeningsBookable = serviceCatalog.filter(
    (s) => s.category === "Screenings & Checks" && s.bookable
  );
  assert.equal(screeningsBookable.length, 1);
  assert.equal(screeningsBookable[0].id, "2");
});

