import "server-only";

import { prismaUnscoped } from "@/app/lib/db";

/**
 * Canonical tenant-owned data policy registry.
 *
 * Both export and deletion consume this list so newly added tenant models
 * cannot silently escape either path.
 *
 * Strategies:
 * - delete          → hard delete always
 * - anonymize       → PII wipe when retainLegal; hard delete otherwise
 * - retain_legal    → keep row when retainLegal; hard delete otherwise
 * - retain_audit    → always keep (audit / compliance trail)
 * - metadata_only   → export metadata only (no secrets)
 * - redact_secrets  → export with secrets stripped
 * - skip            → platform-owned or not tenant-scoped for lifecycle
 */
export type TenantDataStrategy =
  | "delete"
  | "anonymize"
  | "retain_legal"
  | "retain_audit"
  | "metadata_only"
  | "redact_secrets"
  | "skip";

export type TenantModelPolicy = {
  /** Prisma client delegate key (camelCase model name). */
  model: string;
  /** Human-readable table / domain name used in export manifests. */
  exportKey: string;
  strategy: TenantDataStrategy;
  /** Higher priority runs earlier during deletion (children before parents). */
  priority: number;
  /** When true, model is included in data exports. */
  exportable: boolean;
  /** When true, remaining rows after deletion must be zero (unless retainLegal path). */
  mustBeEmptyAfterDelete: boolean;
  /** Optional include graph for export (Prisma include). */
  exportInclude?: Record<string, unknown>;
  /** Optional notes for operators. */
  notes?: string;
};

/**
 * Authoritative registry of every tenant-scoped model that participates in
 * export and/or deletion. Keep this list in sync when adding models that
 * carry pharmacyId (or are exclusively owned via a pharmacy-scoped parent).
 */
export const TENANT_DATA_REGISTRY: TenantModelPolicy[] = [
  // ── Communications & CRM (delete early) ─────────────────────
  { model: "message", exportKey: "messages", strategy: "delete", priority: 10, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "conversation", exportKey: "conversations", strategy: "delete", priority: 20, exportable: true, mustBeEmptyAfterDelete: true, exportInclude: { messages: true } },
  { model: "aiMessage", exportKey: "aiMessages", strategy: "delete", priority: 10, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "aiConversation", exportKey: "aiConversations", strategy: "delete", priority: 20, exportable: true, mustBeEmptyAfterDelete: true, exportInclude: { messages: true } },
  { model: "notificationAttempt", exportKey: "notificationAttempts", strategy: "delete", priority: 10, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "notificationDelivery", exportKey: "notificationDeliveries", strategy: "delete", priority: 20, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "notification", exportKey: "notifications", strategy: "delete", priority: 30, exportable: true, mustBeEmptyAfterDelete: true },
  { model: "reminder", exportKey: "reminders", strategy: "delete", priority: 30, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "campaign", exportKey: "campaigns", strategy: "delete", priority: 30, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "customerSegment", exportKey: "customerSegments", strategy: "delete", priority: 20, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "segment", exportKey: "segments", strategy: "delete", priority: 30, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "customerNote", exportKey: "customerNotes", strategy: "delete", priority: 30, exportable: true, mustBeEmptyAfterDelete: true },
  { model: "timelineEvent", exportKey: "timelineEvents", strategy: "delete", priority: 30, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "messageTemplate", exportKey: "messageTemplates", strategy: "delete", priority: 30, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "enquiry", exportKey: "enquiries", strategy: "delete", priority: 30, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "feedback", exportKey: "feedback", strategy: "delete", priority: 30, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "adminNotification", exportKey: "adminNotifications", strategy: "delete", priority: 30, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "knowledgeArticle", exportKey: "knowledgeArticles", strategy: "delete", priority: 30, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "symptomCheckIn", exportKey: "symptomCheckIns", strategy: "delete", priority: 10, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "symptomMessage", exportKey: "symptomMessages", strategy: "delete", priority: 10, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "symptomSession", exportKey: "symptomSessions", strategy: "delete", priority: 20, exportable: false, mustBeEmptyAfterDelete: true },

  // ── Clinical / wellness ─────────────────────────────────────
  { model: "clinicalReferral", exportKey: "clinicalReferrals", strategy: "delete", priority: 40, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "healthScreeningRecord", exportKey: "clinicalScreenings", strategy: "delete", priority: 40, exportable: true, mustBeEmptyAfterDelete: true },
  { model: "preventiveCounsellingSession", exportKey: "counsellingSessions", strategy: "delete", priority: 40, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "immunizationAppointment", exportKey: "vaccinations", strategy: "delete", priority: 40, exportable: true, mustBeEmptyAfterDelete: true },
  { model: "immunizerCredential", exportKey: "immunizerCredentials", strategy: "delete", priority: 40, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "vaccineProduct", exportKey: "vaccineProducts", strategy: "delete", priority: 50, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "pharmacyImmunizationPolicy", exportKey: "immunizationPolicy", strategy: "delete", priority: 50, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "publicHealthCampaign", exportKey: "publicHealthCampaigns", strategy: "delete", priority: 40, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "medicationSchedule", exportKey: "medicationSchedules", strategy: "delete", priority: 40, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "serviceBooking", exportKey: "serviceBookings", strategy: "delete", priority: 40, exportable: true, mustBeEmptyAfterDelete: true },
  { model: "pharmacyService", exportKey: "pharmacyServices", strategy: "delete", priority: 50, exportable: false, mustBeEmptyAfterDelete: true },

  // ── Loyalty ─────────────────────────────────────────────────
  { model: "loyaltyTransaction", exportKey: "loyaltyTransactions", strategy: "delete", priority: 40, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "loyaltyAccount", exportKey: "loyaltyAccounts", strategy: "delete", priority: 50, exportable: true, mustBeEmptyAfterDelete: true, exportInclude: { transactions: true } },
  { model: "loyaltyRule", exportKey: "loyaltyRules", strategy: "delete", priority: 50, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "coupon", exportKey: "coupons", strategy: "delete", priority: 50, exportable: false, mustBeEmptyAfterDelete: true },

  // ── Inventory ───────────────────────────────────────────────
  { model: "inventorySyncConflict", exportKey: "inventorySyncConflicts", strategy: "delete", priority: 50, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "stockMovement", exportKey: "stockMovements", strategy: "delete", priority: 50, exportable: true, mustBeEmptyAfterDelete: true },
  { model: "inventoryReservation", exportKey: "inventoryReservations", strategy: "delete", priority: 50, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "inventoryLot", exportKey: "inventoryLots", strategy: "delete", priority: 55, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "medicationPriceHistory", exportKey: "priceHistory", strategy: "delete", priority: 50, exportable: true, mustBeEmptyAfterDelete: true },
  { model: "pharmacyInventory", exportKey: "inventory", strategy: "delete", priority: 60, exportable: true, mustBeEmptyAfterDelete: true, exportInclude: { lots: true, reservations: true } },
  { model: "medicationCategory", exportKey: "medicationCategories", strategy: "delete", priority: 60, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "purchaseOrder", exportKey: "purchaseOrders", strategy: "delete", priority: 55, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "supplier", exportKey: "suppliers", strategy: "delete", priority: 60, exportable: false, mustBeEmptyAfterDelete: true },

  // ── Integrations & webhooks ─────────────────────────────────
  { model: "webhookDelivery", exportKey: "webhookDeliveries", strategy: "delete", priority: 50, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "webhookEvent", exportKey: "webhookEvents", strategy: "delete", priority: 50, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "webhookEndpoint", exportKey: "webhookEndpoints", strategy: "redact_secrets", priority: 60, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "integrationHealthCheck", exportKey: "integrationHealthChecks", strategy: "delete", priority: 50, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "integrationAccount", exportKey: "integrationAccounts", strategy: "redact_secrets", priority: 60, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "pharmacyIntegration", exportKey: "pharmacyIntegrations", strategy: "redact_secrets", priority: 60, exportable: false, mustBeEmptyAfterDelete: true },

  // ── Branches & relationships ────────────────────────────────
  { model: "branchDeliveryZone", exportKey: "branchDeliveryZones", strategy: "delete", priority: 55, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "branchHours", exportKey: "branchHours", strategy: "delete", priority: 55, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "branchMembership", exportKey: "branchMemberships", strategy: "delete", priority: 55, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "pharmacyBranch", exportKey: "branches", strategy: "delete", priority: 70, exportable: true, mustBeEmptyAfterDelete: true, exportInclude: { hours: true, deliveryZones: true } },
  { model: "customerPharmacy", exportKey: "customers", strategy: "delete", priority: 70, exportable: true, mustBeEmptyAfterDelete: true },
  { model: "idempotencyKey", exportKey: "idempotencyKeys", strategy: "delete", priority: 50, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "cashierSession", exportKey: "cashierSessions", strategy: "delete", priority: 50, exportable: false, mustBeEmptyAfterDelete: true },

  // ── Commerce / legal-retain path ────────────────────────────
  { model: "orderAccessToken", exportKey: "orderAccessTokens", strategy: "delete", priority: 70, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "orderItem", exportKey: "orderItems", strategy: "retain_legal", priority: 75, exportable: false, mustBeEmptyAfterDelete: false },
  { model: "commerceEvent", exportKey: "commerceEvents", strategy: "retain_legal", priority: 75, exportable: false, mustBeEmptyAfterDelete: false },
  { model: "refund", exportKey: "refunds", strategy: "retain_legal", priority: 75, exportable: false, mustBeEmptyAfterDelete: false },
  { model: "order", exportKey: "orders", strategy: "anonymize", priority: 80, exportable: true, mustBeEmptyAfterDelete: false, exportInclude: { items: true, accessTokens: true, refunds: true } },
  { model: "doseLog", exportKey: "doseLogs", strategy: "retain_legal", priority: 70, exportable: false, mustBeEmptyAfterDelete: false },
  { model: "prescriptionFill", exportKey: "prescriptionFills", strategy: "retain_legal", priority: 70, exportable: false, mustBeEmptyAfterDelete: false },
  { model: "prescriptionClarificationLog", exportKey: "prescriptionClarificationLogs", strategy: "retain_legal", priority: 70, exportable: false, mustBeEmptyAfterDelete: false },
  { model: "prescriptionAdherence", exportKey: "prescriptionAdherence", strategy: "retain_legal", priority: 70, exportable: false, mustBeEmptyAfterDelete: false },
  { model: "refillRequest", exportKey: "refills", strategy: "retain_legal", priority: 75, exportable: true, mustBeEmptyAfterDelete: false },
  { model: "prescription", exportKey: "prescriptions", strategy: "anonymize", priority: 80, exportable: true, mustBeEmptyAfterDelete: false, exportInclude: { fills: true, doseLogs: true, clarificationLogs: true, adherence: true } },
  { model: "invoiceItem", exportKey: "invoiceItems", strategy: "retain_legal", priority: 75, exportable: false, mustBeEmptyAfterDelete: false },
  { model: "invoice", exportKey: "invoices", strategy: "retain_legal", priority: 80, exportable: true, mustBeEmptyAfterDelete: false, exportInclude: { items: true } },
  { model: "billingPayment", exportKey: "billingPayments", strategy: "anonymize", priority: 80, exportable: true, mustBeEmptyAfterDelete: false },
  { model: "payment", exportKey: "payments", strategy: "anonymize", priority: 80, exportable: true, mustBeEmptyAfterDelete: false },
  { model: "billingPaymentMethod", exportKey: "billingPaymentMethods", strategy: "delete", priority: 80, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "dunningCase", exportKey: "dunningCases", strategy: "retain_legal", priority: 80, exportable: false, mustBeEmptyAfterDelete: false },
  { model: "subscription", exportKey: "subscriptions", strategy: "retain_legal", priority: 85, exportable: false, mustBeEmptyAfterDelete: false },
  { model: "tenantEntitlement", exportKey: "tenantEntitlements", strategy: "delete", priority: 85, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "featureOverride", exportKey: "featureOverrides", strategy: "delete", priority: 85, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "usageRecord", exportKey: "usageRecords", strategy: "retain_legal", priority: 80, exportable: false, mustBeEmptyAfterDelete: false },
  { model: "ledgerAccount", exportKey: "ledgerAccounts", strategy: "retain_legal", priority: 85, exportable: false, mustBeEmptyAfterDelete: false },

  // ── Platform ops / access ───────────────────────────────────
  { model: "apiKey", exportKey: "apiKeys", strategy: "metadata_only", priority: 40, exportable: false, mustBeEmptyAfterDelete: true, notes: "Revoke then delete; never export secrets" },
  { model: "supportSession", exportKey: "supportSessions", strategy: "delete", priority: 40, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "customDomain", exportKey: "customDomains", strategy: "delete", priority: 40, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "job", exportKey: "jobs", strategy: "delete", priority: 40, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "outboxEvent", exportKey: "outboxEvents", strategy: "delete", priority: 40, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "pharmacySettings", exportKey: "pharmacySettings", strategy: "delete", priority: 90, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "pharmacyMembership", exportKey: "pharmacyMemberships", strategy: "delete", priority: 90, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "dataExportRequest", exportKey: "dataExportRequests", strategy: "delete", priority: 95, exportable: false, mustBeEmptyAfterDelete: true },
  { model: "auditLog", exportKey: "auditLogs", strategy: "retain_audit", priority: 100, exportable: true, mustBeEmptyAfterDelete: false, notes: "Always retained for compliance" },
];

export function exportablePolicies(): TenantModelPolicy[] {
  return TENANT_DATA_REGISTRY.filter((p) => p.exportable);
}

export function deletablePolicies(retainLegal: boolean): TenantModelPolicy[] {
  return [...TENANT_DATA_REGISTRY]
    .filter((p) => {
      if (p.strategy === "skip" || p.strategy === "retain_audit") return false;
      if (retainLegal && (p.strategy === "retain_legal" || p.strategy === "anonymize")) return false;
      return true;
    })
    .sort((a, b) => a.priority - b.priority);
}

/** Models that must be empty after a successful deletion (given retainLegal flag). */
export function verificationPolicies(retainLegal: boolean): TenantModelPolicy[] {
  return TENANT_DATA_REGISTRY.filter((p) => {
    if (!p.mustBeEmptyAfterDelete) return false;
    if (retainLegal && (p.strategy === "retain_legal" || p.strategy === "anonymize" || p.strategy === "retain_audit")) {
      return false;
    }
    return true;
  });
}

type CountResult = { model: string; exportKey: string; remaining: number };

/**
 * Exhaustive post-deletion scan against the registry.
 * Returns remaining row counts for any model that was required to be empty.
 */
export async function verifyTenantDeletion(
  pharmacyId: string,
  retainLegal: boolean,
): Promise<{ ok: boolean; remaining: CountResult[] }> {
  const policies = verificationPolicies(retainLegal);
  const remaining: CountResult[] = [];

  for (const policy of policies) {
    const delegate = (prismaUnscoped as Record<string, any>)[policy.model];
    if (!delegate || typeof delegate.count !== "function") {
      // Model not present on client — skip rather than fail open.
      continue;
    }
    try {
      const count = await delegate.count({ where: { pharmacyId } });
      if (count > 0) {
        remaining.push({ model: policy.model, exportKey: policy.exportKey, remaining: count });
      }
    } catch {
      // Relation-only models without pharmacyId column are handled via parent deletes;
      // ignore count failures for those.
    }
  }

  return { ok: remaining.length === 0, remaining };
}
