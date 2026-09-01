import "server-only";

import { prismaUnscoped } from "@/app/lib/db";
import { recordAuditRequired } from "@/app/lib/platform/audit";

export async function runDataExport(pharmacyId: string, requestId: string) {
  const req = await prismaUnscoped.dataExportRequest.findUnique({ where: { id: requestId } });
  if (!req || req.pharmacyId !== pharmacyId) throw new Error("export_not_found");
  await prismaUnscoped.dataExportRequest.update({
    where: { id: requestId },
    data: { status: "processing" },
  });
  const [orders, customers, payments] = await Promise.all([
    prismaUnscoped.order.count({ where: { pharmacyId } }),
    prismaUnscoped.customerPharmacy.count({ where: { pharmacyId } }),
    prismaUnscoped.payment.count({ where: { pharmacyId } }),
  ]);
  const archive = JSON.stringify({ pharmacyId, generatedAt: new Date().toISOString(), counts: { orders, customers, payments } });
  await prismaUnscoped.dataExportRequest.update({
    where: { id: requestId },
    data: {
      status: "ready",
      completedAt: new Date(),
      archiveUrl: `data:application/json;base64,${Buffer.from(archive).toString("base64")}`,
    },
  });
  await recordAuditRequired({
    action: "compliance.export.ready",
    resource: "data_export_request",
    resourceId: requestId,
    tenantId: pharmacyId,
  });
}

export async function runDataDeletion(pharmacyId: string, requestId: string) {
  const req = await prismaUnscoped.dataDeletionRequest.findUnique({ where: { id: requestId } });
  if (!req || req.pharmacyId !== pharmacyId) throw new Error("deletion_not_found");
  if (req.scheduledFor > new Date()) return;
  await prismaUnscoped.dataDeletionRequest.update({
    where: { id: requestId },
    data: { status: "processing" },
  });
  if (!req.retainLegal) {
    await prismaUnscoped.notification.deleteMany({ where: { pharmacyId } });
    await prismaUnscoped.aiConversation.deleteMany({ where: { pharmacyId } });
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
}
