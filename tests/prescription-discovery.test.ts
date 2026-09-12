import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  matchesPrescriptionName,
  prescriptionNames,
} from "../app/lib/prescription-discovery";

describe("prescription discovery", () => {
  it("accepts spacing and case variations in the same strength", () => {
    assert.equal(
      matchesPrescriptionName("METFORMIN 500 mg", ["Metformin 500mg tablets"]),
      true,
    );
  });
  it("does not refer a different strength or medicine with a similar name", () => {
    assert.equal(
      matchesPrescriptionName("Metformin 500mg", ["Metformin 850mg"]),
      false,
    );
    assert.equal(
      matchesPrescriptionName("Amoxicillin", ["Amoxicillin-clavulanate"]),
      false,
    );
    assert.equal(matchesPrescriptionName("Metformin", ["Metforminide"]), false);
  });
  it("requires combination ingredients and formulation when specified", () => {
    assert.equal(
      matchesPrescriptionName("Amoxicillin clavulanate", ["Amoxicillin 500mg"]),
      false,
    );
    assert.equal(
      matchesPrescriptionName("Metformin XR 500mg", ["Metformin 500mg"]),
      false,
    );
  });
  it("does not assemble an apparent match across unrelated fields", () => {
    assert.equal(
      matchesPrescriptionName("MedicineA 10mg", [
        "MedicineA",
        "MedicineB 10mg",
      ]),
      false,
    );
  });
  it("keeps different strengths and removes duplicate lines", () => {
    assert.deepEqual(
      prescriptionNames(
        " Metformin 500mg\n\nMetformin 850mg\nMetformin 500mg ",
      ),
      ["Metformin 500mg", "Metformin 850mg"],
    );
  });
});
