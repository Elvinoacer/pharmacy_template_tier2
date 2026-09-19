import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyPrescriptionMatch,
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
  it("matches valid brand extensions without false negatives", () => {
    assert.equal(
      matchesPrescriptionName("Panadol", ["Panadol Extra"]),
      true,
    );
    assert.equal(
      matchesPrescriptionName("Brufen", ["Brufen Retard 800mg"]),
      true,
    );
  });
  it("distinguishes exact clinical match vs likely product match", () => {
    const exact = classifyPrescriptionMatch("Panadol 500mg", ["Panadol 500mg tablets"]);
    assert.equal(exact.match, true);
    assert.equal(exact.kind, "exact");
    assert.equal(exact.score, 100);

    const likely = classifyPrescriptionMatch("Panadol", ["Panadol Extra 500mg tablets"]);
    assert.equal(likely.match, true);
    assert.equal(likely.kind, "likely");
    assert.equal(likely.score, 80);

    const wrongStrength = classifyPrescriptionMatch("Metformin 500mg", ["Metformin 850mg"]);
    assert.equal(wrongStrength.match, false);
    assert.equal(wrongStrength.kind, "none");
  });
});
