import { db } from "../lib/db.js";
import { notifyBuyerInvoiceOverdue } from "../services/notification-service.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function runOverdueInvoicesJob(): Promise<number> {
  const now = new Date();
  const result = await db.invoice.updateMany({
    where: { status: "unpaid", dueDate: { lt: now } },
    data: { status: "overdue" },
  });

  if (result.count > 0) {
    const overdue = await db.invoice.findMany({
      where: { status: "overdue", dueDate: { lt: now } },
    });
    for (const inv of overdue) {
      await notifyBuyerInvoiceOverdue(inv.id).catch(() => {});
    }
  }

  return result.count;
}

export function startOverdueInvoicesJob(maxWaitMs = DAY_MS): NodeJS.Timeout {
  const tick = async () => {
    try {
      const count = await runOverdueInvoicesJob();
      if (count > 0) {
        console.log(`[overdue-invoices] marked ${count} invoice(s) overdue`);
      }
    } catch (err) {
      console.error("[overdue-invoices] job failed", err);
    }
  };
  void tick();
  return setInterval(tick, maxWaitMs);
}
