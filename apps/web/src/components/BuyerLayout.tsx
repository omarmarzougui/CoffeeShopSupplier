import { Outlet } from "react-router-dom";
import { DashboardLayout } from "./DashboardLayout";

const buyerNav = [
  { label: "Dashboard", to: "/buyer" },
  { label: "Browse Products", to: "/buyer/products" },
  { label: "My Orders", to: "/buyer/orders" },
  { label: "Cart", to: "/buyer/cart" },
];

export function BuyerLayout() {
  return (
    <DashboardLayout roleLabel="Buyer workspace" navLinks={buyerNav}>
      <Outlet />
    </DashboardLayout>
  );
}
