export type Role = "buyer" | "supplier" | "admin";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "dispatched"
  | "delivered"
  | "cancelled";

export type InvoiceStatus = "unpaid" | "paid" | "overdue";

export type ProductUnit = "kg" | "l" | "case" | "box" | "unit";

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
