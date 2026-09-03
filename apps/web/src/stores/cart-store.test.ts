import { describe, expect, it, beforeEach } from "vitest";
import { useCartStore, groupCartItems, cartTotal, cartItemCount, type CartItem } from "./cart-store";

const base: Omit<CartItem, "quantity"> = {
  productId: "p1",
  name: "Espresso Beans",
  sku: "SKU-1",
  unit: "kg",
  price: 4300,
  currency: "TND",
  minOrderQty: 2,
  stockAvailable: true,
  supplierId: "s1",
  supplierName: "Demo Supplies Co",
};

describe("cart store", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
  });

  it("adds a new item respecting MOQ", () => {
    useCartStore.getState().addItem(base, 1);
    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0]!.quantity).toBe(2);
  });

  it("accumulates quantity when the same product is added again", () => {
    useCartStore.getState().addItem(base, 3);
    useCartStore.getState().addItem(base, 2);
    expect(useCartStore.getState().items[0]!.quantity).toBe(5);
  });

  it("updateQty to zero removes the item", () => {
    useCartStore.getState().addItem(base, 3);
    useCartStore.getState().updateQty("p1", 0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("removeItem deletes the product", () => {
    useCartStore.getState().addItem(base, 3);
    useCartStore.getState().removeItem("p1");
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("clear empties the cart", () => {
    useCartStore.getState().addItem(base, 3);
    useCartStore.getState().clear();
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});

describe("cart helpers", () => {
  const a: CartItem = { ...base, quantity: 2 };
  const b: CartItem = {
    ...base,
    productId: "p2",
    sku: "SKU-2",
    price: 1500,
    minOrderQty: 5,
    quantity: 1,
    supplierId: "s2",
    supplierName: "Other Co",
  };

  it("cartItemCount sums quantities", () => {
    expect(cartItemCount([a, b])).toBe(3);
  });

  it("cartTotal sums by currency in minor units", () => {
    expect(cartTotal([a])).toEqual({ TND: 8600 });
  });

  it("groups items per supplier and sums subtotals", () => {
    const groups = groupCartItems([a, b]);
    expect(groups).toHaveLength(2);
    const s1 = groups.find((g) => g.supplierId === "s1")!;
    const s2 = groups.find((g) => g.supplierId === "s2")!;
    expect(s1.subtotal).toBe(8600);
    expect(s2.subtotal).toBe(1500);
    expect(s1.hasBelowMoq).toBe(false);
    expect(s2.hasBelowMoq).toBe(true);
  });
});
