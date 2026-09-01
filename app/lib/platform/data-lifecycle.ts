import "server-only";

import { createHash, randomBytes } from "crypto";
import { prismaUnscoped } from "@/app/lib/db";
import { recordAuditRequired } from "@/app/lib/platform/audit";
import { enqueueJob } from "@/app/lib/platform/jobs";

const EXPORT_TTL_MS = 48 * 60 * 60 * 1000;

export async function requestDataExport(pharmacyId: string, actorId?: string | null) {
  const req = await prismaUnscoped.dataExportRequest.create({
    data: { pharmacyId, actorId: actorId ?? null, status: "requested" },
  });
  await enqueueJob({
    type: "data.export",
    pharmacyId,
    payload: { requestId: req.id },
  });
  await recordAuditRequired({
    actorId,
    action: "compliance.export.requested",
    resource: "data_export_request",
    resourceId: req.id,
    tenantId: pharmacyId,
  });
  return req;
}

export async function requestDataDeletion(
  pharmacyId: string,
  opts?: { actorId?: string | null; retainLegal?: boolean; days?: number },
) {
  const scheduledFor = new Date(Date.now() + (opts?.days ?? 30) * 86400000);
  const req = await prismaUnscoped.dataDeletionRequest.create({
    data: {
      pharmacyId,
      actorId: opts?.actorId ?? null,
      retainLegal: opts?.retainLegal ?? true,
      scheduledFor,
      status: "requested",
    },
  });
  await enqueueJob({
    type: "data.delete",
    pharmacyId,
    payload: { requestId: req.id },
    runAt: scheduledFor,
  });
  await recordAuditRequired({
    actorId: opts?.actorId,
    action: "compliance.deletion.requested",
    resource: "data_deletion_request",
    resourceId: req.id,
    tenantId: pharmacyId,
  });
  return req;
}

export async function runDataExport(pharmacyId: string, requestId: string) {
  const req = await prismaUnscoped.dataExportRequest.findUnique({ where: { id: requestId } });
  if (!req || req.pharmacyId !== pharmacyId) throw new Error("export_not_found");
  await prismaUnscoped.dataExportRequest.update({
    where: { id: requestId },
    data: { status: "processing" },
  });

  const [pharmacy, orders, customers, payments, prescriptions, notifications] = await Promise.all([
    prismaUnscoped.pharmacy.findUnique({
      where: { id: pharmacyId },
      select: { id: true, name: true, slug: true, email: true, phone: true, city: true, county: true },
    }),
    prismaUnscoped.order.findMany({
      where: { pharmacyId },
      take: 5000,
      select: { id: true, status: true, total: true, createdAt: true, paidAt: true },
    }),
    prismaUnscoped.customerPharmacy.findMany({
      where: { pharmacyId },
      take: 5000,
      select: { customerId: true, firstSeenAt: true },
    }),
    prismaUnscoped.payment.findMany({
      where: { pharmacyId },
      take: 5000,
      select: { id: true, amount: true, status: true, provider: true, paidAt: true, createdAt: true },
    }),
    prismaUnscoped.prescription.findMany({
      where: { pharmacyId },
      take: 2000,
      select: { id: true, status: true, createdAt: true },
    }),
    prismaUnscoped.notification.count({ where: { pharmacyId } }),
  ]);

  const archive = JSON.stringify({
    pharmacy,
    generatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + EXPORT_TTL_MS).toISOString(),
    counts: {
      orders: orders.length,
      customers: customers.length,
      payments: payments.length,
      prescriptions: prescriptions.length,
      notifications,
    },
    orders,
    customers,
    payments,
    prescriptions,
  });
  const token = randomBytes(24).toString("base64url");
  const downloadTokenHash = createHash("sha256").update(token).digest("hex");
  await prismaUnscoped.dataExportRequest.update({
    where: { id: requestId },
    data: {
      status: "ready",
      completedAt: new Date(),
      expiresAt: new Date(Date.now() + EXPORT_TTL_MS),
      downloadTokenHash,
      archiveUrl: `data:application/json;base64,${Buffer.from(archive).toString("base64")}`,
    },
  });
  await recordAuditRequired({
    action: "compliance.export.ready",
    resource: "data_export_request",
    resourceId: requestId,
    tenantId: pharmacyId,
  });
  return { ok: true, requestId, downloadToken: token, expiresAt: new Date(Date.now() + EXPORT_TTL_MS).toISOString() };
}

export async function readExportArchive(requestId: string, token: string) {
  const hash = createHash("sha256").update(token).digest("hex");
  const req = await prismaUnscoped.dataExportRequest.findUnique({ where: { id: requestId } });
  if (!req || req.downloadTokenHash !== hash) return null;
  if (req.status !== "ready" || !req.archiveUrl) return null;
  if (req.expiresAt && req.expiresAt < new Date()) return null;
  return req;
}

export async function runDataDeletion(pharmacyId: string, requestId: string) {
  const req = await prismaUnscoped.dataDeletionRequest.findUnique({ where: { id: requestId } });
  if (!req || req.pharmacyId !== pharmacyId) throw new Error("deletion_not_found");
  if (req.scheduledFor > new Date()) return { ok: true, deferred: true };
  await prismaUnscoped.dataDeletionRequest.update({
    where: { id: requestId },
    data: { status: "processing" },
  });

  await prismaUnscoped.notification.deleteMany({ where: { pharmacyId } });
  await prismaUnscoped.aiConversation.deleteMany({ where: { pharmacyId } });
  await prismaUnscoped.customerNote.deleteMany({ where: { pharmacyId } });
  await prismaUnscoped.messageTemplate.deleteMany({ where: { pharmacyId } });
  if (!req.retainLegal) {
    await prismaUnscoped.enquiry.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.feedback.deleteMany({ where: { pharmacyId } });
  }

  await prismaUnscoped.pharmacy.update({
    where: { id: pharmacyId },
    data: { lifecycleStatus: "pending_deletion", listed: false, deletionRequestedAt: new Date() },
  });
  await prismaUnscoped.dataDeletionRequest.update({
    where: { id: requestId },
    data: { status: "completed", completedAt: new Date() },
  });
  await recordAuditRequired({
    action: "compliance.deletion.completed",
    resource: "data_deletion_request",
    resourceId: requestId,
    tenantId: pharmacyId,
  });
  return { ok: true, deferred: false };
}
