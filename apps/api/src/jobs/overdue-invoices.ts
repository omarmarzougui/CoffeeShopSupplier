import { markOverdueInvoices } from "../services/invoice-service.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function runOverdueInvoicesJob(): Promise<number> {
  return markOverdueInvoices();
}

// Runs the overdue scan once daily until `clearInterval` is called.
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
