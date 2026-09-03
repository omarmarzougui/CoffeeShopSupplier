import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProductUnit } from "@coffee/types";

export interface CartItem {
  productId: string;
  name: string;
  sku: string;
  unit: ProductUnit;
  price: number;
  currency: string;
  minOrderQty: number;
  stockAvailable: boolean;
  quantity: number;
  supplierId: string;
  supplierName: string;
}

export interface CartSupplierGroup {
  supplierId: string;
  supplierName: string;
  items: CartItem[];
  subtotal: number;
  currency: string;
  hasBelowMoq: boolean;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, quantity: number) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],

      addItem(item, quantity = 1) {
        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId
                  ? { ...i, quantity: Math.max(item.minOrderQty, i.quantity + quantity) }
                  : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: Math.max(item.minOrderQty, quantity) }] };
        });
      },

      removeItem(productId) {
        set((state) => ({ items: state.items.filter((i) => i.productId !== productId) }));
      },

      updateQty(productId, quantity) {
        set((state) => ({
          items: state.items
            .map((i) => (i.productId === productId ? { ...i, quantity: Math.max(0, quantity) } : i))
            .filter((i) => i.quantity > 0),
        }));
      },

      clear() {
        set({ items: [] });
      },
    }),
    {
      name: "cart-storage",
    },
  ),
);

export function groupCartItems(items: CartItem[]): CartSupplierGroup[] {
  const groups = new Map<string, CartSupplierGroup>();
  for (const item of items) {
    if (!groups.has(item.supplierId)) {
      groups.set(item.supplierId, {
        supplierId: item.supplierId,
        supplierName: item.supplierName,
        items: [],
        subtotal: 0,
        currency: item.currency,
        hasBelowMoq: false,
      });
    }
    const group = groups.get(item.supplierId)!;
    group.items.push(item);
    group.subtotal += item.price * item.quantity;
    if (item.quantity < item.minOrderQty) {
      group.hasBelowMoq = true;
    }
  }
  return Array.from(groups.values());
}

export function cartTotal(items: CartItem[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const item of items) {
    totals[item.currency] = (totals[item.currency] ?? 0) + item.price * item.quantity;
  }
  return totals;
}

export function cartItemCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}
