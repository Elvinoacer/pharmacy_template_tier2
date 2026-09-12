import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { peekTenant, withPharmacy } from "../app/lib/tenant-context";

// Exercise the actual HTTP handler with an isolated store. No real customer
// records are written and no pharmacy staff receive test notifications.
const received: Array<Record<string, unknown>> = [];
const pharmacies = [
  {
    id: "11111111-1111-4111-a111-111111111111",
    slug: "pharmacy-a",
    status: "active",
    listed: true,
  },
  {
    id: "22222222-2222-4222-a222-222222222222",
    slug: "pharmacy-b",
    status: "active",
    listed: true,
  },
  {
    id: "33333333-3333-4333-a333-333333333333",
    slug: "hidden",
    status: "active",
    listed: false,
  },
];
function stub(path: string, exports: object) {
  const id = require.resolve(path);
  require.cache[id] = {
    id,
    filename: id,
    loaded: true,
    exports,
  } as NodeJS.Module;
}
stub("../app/lib/auth", { getSessionUser: async () => null });
stub("../app/lib/tenant", {
  findPharmacyBySlug: async (slug: string) =>
    pharmacies.find((p) => p.slug === slug) || null,
  isActiveListed: (p: (typeof pharmacies)[number]) =>
    p.status === "active" && p.listed,
  withPharmacy,
  getTenant: async () => peekTenant() || { pharmacyId: null, bypass: false },
});
stub("../app/lib/rate-limit", {
  checkRateLimitAsync: async () => ({ allowed: true }),
});
stub("../app/lib/services/daraja", { formatMpesaPhone: () => "254700000000" });
stub("../app/lib/refill-tracking", {
  createRefillTrackingToken: (id: string, pharmacyId: string) =>
    `track:${pharmacyId}:${id}`,
});
stub("../app/lib/db", {
  prisma: {
    refillRequest: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) =>
        received.find(
          (row) =>
            row.pharmacyId === where.pharmacyId &&
            row.medicineName ===
              (where.medicineName as { equals: string }).equals,
        ) || null,
    },
  },
});
stub("../app/lib/services/crm", {
  createRefillRequest: async (data: Record<string, unknown>) => {
    const row = {
      ...data,
      id: `request-${received.length}`,
      pharmacyId: peekTenant()?.pharmacyId,
    };
    received.push(row);
    return row;
  },
});
const stockA = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const stockB = "bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb";
stub("../app/lib/services/available-inventory", {
  findAvailableInventory: async (ids: string[]) =>
    ids.flatMap((id) => {
      if (id === stockA)
        return [
          {
            id,
            pharmacy: pharmacies[0],
            medicationMaster: { name: "Verified medicine 10mg" },
          },
        ];
      if (id === stockB)
        return [
          {
            id,
            pharmacy: pharmacies[1],
            medicationMaster: { name: "Other medicine 20mg" },
          },
        ];
      return [];
    }),
});
// The handler must load after the isolated dependencies above.
const { POST } =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("../app/api/refill/route") as typeof import("../app/api/refill/route");
const payload = {
  fullName: "Test Customer",
  phone: "0700000000",
  medicine: "Medicine A 10mg\nMedicine B 20mg",
  pickupDate: "2099-01-01",
  pharmacySlug: "pharmacy-a",
};
function request(body: object) {
  return new Request("http://localhost/api/refill", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("discovery to pharmacy request handoff", () => {
  it("routes the request to the explicit pharmacy despite another active context", async () => {
    const response = await withPharmacy(pharmacies[1].id, () =>
      POST(request(payload)),
    );
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(received[0].pharmacyId, pharmacies[0].id);
    assert.equal(received[0].medicineName, payload.medicine);
    assert.equal(received[0].source, "website");
    assert.match(result.trackingToken, new RegExp(pharmacies[0].id));
  });
  it("returns the same reference on retry without adding another staff task", async () => {
    const response = await POST(request(payload));
    assert.equal((await response.json()).duplicate, true);
    assert.equal(received.length, 1);
  });
  it("keeps identical requests at different pharmacies separate", async () => {
    const response = await POST(
      request({ ...payload, pharmacySlug: "pharmacy-b" }),
    );
    assert.equal(response.status, 200);
    assert.equal(received.length, 2);
    assert.equal(received[1].pharmacyId, pharmacies[1].id);
  });
  it("rejects unavailable pharmacies and invalid details before creating a task", async () => {
    assert.equal(
      (await POST(request({ ...payload, pharmacySlug: "hidden" }))).status,
      409,
    );
    assert.equal(
      (await POST(request({ ...payload, pharmacySlug: "missing" }))).status,
      409,
    );
    assert.equal(
      (await POST(request({ ...payload, fullName: "" }))).status,
      400,
    );
    assert.equal(received.length, 2);
  });
});

describe("availability determines request context", () => {
  it("derives pharmacy and medicine from inventory, ignoring a conflicting pharmacy hint", async () => {
    const response = await POST(
      request({
        ...payload,
        medicine: "Edited text must not replace the listing",
        pharmacySlug: "pharmacy-b",
        inventoryIds: [stockA],
      }),
    );
    assert.equal(response.status, 200);
    const last = received.at(-1)!;
    assert.equal(last.pharmacyId, pharmacies[0].id);
    assert.equal(last.medicineName, "Verified medicine 10mg");
  });
  it("rejects disappeared stock and mixed-supplier requests without creating records", async () => {
    const before = received.length;
    assert.equal(
      (
        await POST(
          request({
            ...payload,
            inventoryIds: ["cccccccc-cccc-4ccc-accc-cccccccccccc"],
          }),
        )
      ).status,
      409,
    );
    assert.equal(
      (await POST(request({ ...payload, inventoryIds: [stockA, stockB] })))
        .status,
      409,
    );
    assert.equal(received.length, before);
  });
  it("rejects malformed inventory identities instead of falling back to a remembered pharmacy", async () => {
    assert.equal(
      (await POST(request({ ...payload, inventoryIds: ["not-an-id"] }))).status,
      400,
    );
  });
});
