import { Outlet } from "react-router-dom";
import { DashboardLayout } from "./DashboardLayout";

const supplierNav = [
  { label: "Dashboard", to: "/supplier" },
  { label: "My Products", to: "/supplier/products" },
  { label: "Incoming Orders", to: "/supplier/orders" },
];

export function SupplierLayout() {
  return (
    <DashboardLayout roleLabel="Supplier" navLinks={supplierNav}>
      <Outlet />
    </DashboardLayout>
  );
}
