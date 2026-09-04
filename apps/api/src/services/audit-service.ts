import type { Prisma } from "@prisma/client";
import { db } from "../lib/db.js";

export type AuditAction =
  | "ORDER_CREATED"
  | "ORDER_CANCELLED"
  | "ORDER_CONFIRMED"
  | "ORDER_DISPATCHED"
  | "ORDER_DELIVERED"
  | "INVOICE_CREATED"
  | "INVOICE_OVERDUE"
  | "INVOICE_PAID";

interface AuditInput {
  actorId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    const data: Prisma.AuditLogUncheckedCreateInput = {
      actorId: input.actorId ?? null,
      action: input.action as never,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : undefined,
    };
    await db.auditLog.create({ data });
  } catch (err) {
    // Never let audit failure break the primary action.
    console.error("[audit] failed to record", err);
  }
}
