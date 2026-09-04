import cron from "node-cron";
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

// Cron expression is configurable via env (default: daily at 02:00 server time).
// Enables switching the schedule without a code change and pairs with an external
// scheduler (e.g. Kubernetes CronJob calling the same routine).
const DEFAULT_SCHEDULE = "0 2 * * *";

export function startOverdueInvoicesJob(
  _maxWaitMs = DAY_MS,
  schedule = process.env.OVERDUE_JOB_CRON ?? DEFAULT_SCHEDULE,
): { stop: () => void } {
  // Run once on startup to catch any invoices that crossed their due date while down.
  const initial = async () => {
    try {
      const count = await runOverdueInvoicesJob();
      if (count > 0) {
        console.log(`[overdue-invoices] marked ${count} invoice(s) overdue`);
      }
    } catch (err) {
      console.error("[overdue-invoices] job failed", err);
    }
  };
  void initial();

  if (!cron.validate(schedule)) {
    console.error(`[overdue-invoices] invalid cron schedule "${schedule}", falling back to daily`);
    schedule = DEFAULT_SCHEDULE;
  }

  const task = cron.schedule(schedule, async () => {
    try {
      const count = await runOverdueInvoicesJob();
      if (count > 0) {
        console.log(`[overdue-invoices] marked ${count} invoice(s) overdue`);
      }
    } catch (err) {
      console.error("[overdue-invoices] job failed", err);
    }
  });

  return { stop: () => task.stop() };
}
