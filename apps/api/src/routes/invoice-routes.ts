import type { FastifyInstance } from "fastify";
import { requireAuth } from "../middleware/auth.js";
import { getInvoice, getInvoicePdf } from "../services/invoice-service.js";

export async function invoiceRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/invoices/:id", {
    preHandler: [requireAuth],
  }, async (req) => {
    const { id } = req.params as { id: string };
    const { invoice, order } = await getInvoice(id, req.user!.sub, req.user!.role);
    return {
      ...invoice,
      order: {
        id: order.id,
        status: order.status,
        totalAmount: order.totalAmount,
        currency: order.currency,
        buyer: order.buyer.businessName,
        supplier: order.supplier.businessName,
        items: order.items.map((i) => ({
          name: i.product.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          subtotal: i.subtotal,
        })),
      },
    };
  });

  app.get("/api/v1/invoices/:id/pdf", {
    preHandler: [requireAuth],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const pdf = await getInvoicePdf(id, req.user!.sub, req.user!.role);
    reply
      .header("Content-Type", "application/pdf")
      .header("Content-Disposition", `attachment; filename="invoice-${id}.pdf"`);
    return reply.send(Buffer.from(pdf));
  });
}
