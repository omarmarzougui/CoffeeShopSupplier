const APP_NAME = "CoffeeShopSupplier";

function wrap(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,sans-serif;color:#1e293b">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
<tr><td style="background:#0f172a;padding:24px 32px;color:#f8fafc;font-size:18px;font-weight:700;letter-spacing:.5px">${APP_NAME}</td></tr>
<tr><td style="padding:32px">${body}</td></tr>
<tr><td style="padding:16px 32px;background:#f1f5f9;font-size:12px;color:#64748b;text-align:center">
  This is an automated notification from ${APP_NAME}.
</td></tr>
</table>
</td></tr></table></body></html>`;
}

function amount(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

// ── supplier: new order placed ───────────────────────────────────────

export function orderPlacedSupplier(params: {
  orderId: string;
  buyerName: string;
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  notes?: string | null;
}): string {
  const rows = params.items
    .map(
      (i) =>
        `<tr>
          <td style="padding:10px 0;border-bottom:1px solid #e2e8f0">${i.name}</td>
          <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;text-align:right">${i.quantity}</td>
          <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;text-align:right">${amount(i.unitPrice, params.currency)}</td>
          <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600">${amount(i.subtotal, params.currency)}</td>
        </tr>`,
    )
    .join("");

  const notesBlock = params.notes
    ? `<p style="color:#64748b;margin:16px 0 0;font-size:14px"><strong>Notes:</strong> ${params.notes}</p>`
    : "";

  return wrap(
    `New Order #${params.orderId.slice(0, 8)}`,
    `<h2 style="margin:0 0 8px;font-size:22px;color:#0f172a">New order received</h2>
<p style="margin:0 0 20px;color:#64748b">${params.buyerName} has placed a new order.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px">
<tr style="background:#f8fafc">
  <td style="padding:8px 0;font-weight:600;font-size:12px;color:#64748b;text-transform:uppercase">Item</td>
  <td style="padding:8px 0;font-weight:600;font-size:12px;color:#64748b;text-align:right">Qty</td>
  <td style="padding:8px 0;font-weight:600;font-size:12px;color:#64748b;text-align:right">Unit Price</td>
  <td style="padding:8px 0;font-weight:600;font-size:12px;color:#64748b;text-align:right">Subtotal</td>
</tr>
${rows}
</table>
<p style="font-size:18px;font-weight:700;margin:0 0 8px">Total: ${amount(params.totalAmount, params.currency)}</p>
${notesBlock}
<p style="margin:24px 0 0;padding:12px 20px;background:#eff6ff;border-radius:8px;font-size:14px;color:#1e40af">
  Open your supplier dashboard to review and confirm this order.
</p>`,
  );
}

// ── buyer: order confirmed ───────────────────────────────────────────

export function orderConfirmed(params: {
  orderId: string;
  supplierName: string;
}): string {
  return wrap(
    `Order #${params.orderId.slice(0, 8)} confirmed`,
    `<h2 style="margin:0 0 8px;font-size:22px;color:#0f172a">Order confirmed</h2>
<p style="margin:0 0 20px;color:#64748b">
  <strong>${params.supplierName}</strong> has confirmed your order
  <strong>#${params.orderId.slice(0, 8)}</strong>.
</p>
<p style="margin:0 0 8px;color:#64748b">The next step is dispatch — you will receive an email when your order ships.</p>`,
  );
}

// ── buyer: order dispatched ──────────────────────────────────────────

export function orderDispatched(params: {
  orderId: string;
  supplierName: string;
}): string {
  return wrap(
    `Order #${params.orderId.slice(0, 8)} dispatched`,
    `<h2 style="margin:0 0 8px;font-size:22px;color:#0f172a">Order dispatched</h2>
<p style="margin:0 0 20px;color:#64748b">
  Your order <strong>#${params.orderId.slice(0, 8)}</strong> from
  <strong>${params.supplierName}</strong> has been dispatched and is on its way.
</p>`,
  );
}

// ── buyer: order delivered + invoice generated ───────────────────────

export function orderDelivered(params: {
  orderId: string;
  supplierName: string;
  invoiceId: string;
  invoiceNumber: string;
  dueDate: string;
  totalAmount: number;
  currency: string;
}): string {
  return wrap(
    `Order #${params.orderId.slice(0, 8)} delivered`,
    `<h2 style="margin:0 0 8px;font-size:22px;color:#0f172a">Order delivered</h2>
<p style="margin:0 0 20px;color:#64748b">
  Your order <strong>#${params.orderId.slice(0, 8)}</strong> from
  <strong>${params.supplierName}</strong> has been delivered.
</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;margin:0 0 20px">
<tr><td style="padding:16px 20px">
  <p style="margin:0 0 4px;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:600">Invoice</p>
  <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#0f172a">${params.invoiceNumber}</p>
  <p style="margin:0 0 4px;font-size:14px;color:#64748b">Total: <strong>${amount(params.totalAmount, params.currency)}</strong></p>
  <p style="margin:0;font-size:14px;color:#64748b">Due: <strong>${params.dueDate}</strong></p>
</td></tr>
</table>
<p style="margin:0 0 8px;color:#64748b">You can download your invoice PDF from your order history.</p>`,
  );
}

// ── buyer: invoice overdue ───────────────────────────────────────────

export function invoiceOverdue(params: {
  orderId: string;
  invoiceNumber: string;
  totalAmount: number;
  currency: string;
  dueDate: string;
  supplierName: string;
}): string {
  return wrap(
    `Invoice ${params.invoiceNumber} — payment overdue`,
    `<h2 style="margin:0 0 8px;font-size:22px;color:#0f172a">Payment overdue</h2>
<p style="margin:0 0 20px;color:#64748b">
  Invoice <strong>${params.invoiceNumber}</strong> for order
  <strong>#${params.orderId.slice(0, 8)}</strong> from
  <strong>${params.supplierName}</strong> is past due.
</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;margin:0 0 20px">
<tr><td style="padding:16px 20px">
  <p style="margin:0 0 4px;font-size:12px;color:#991b1b;text-transform:uppercase;font-weight:600">Amount due</p>
  <p style="margin:0 0 4px;font-size:20px;font-weight:700;color:#991b1b">${amount(params.totalAmount, params.currency)}</p>
  <p style="margin:0;font-size:14px;color:#991b1b">Was due: <strong>${params.dueDate}</strong></p>
</td></tr>
</table>
<p style="margin:0;padding:12px 20px;background:#eff6ff;border-radius:8px;font-size:14px;color:#1e40af">
  Please arrange payment at your earliest convenience.
</p>`,
  );
}