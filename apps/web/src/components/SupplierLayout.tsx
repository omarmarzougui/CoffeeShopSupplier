import { Outlet } from "react-router-dom";
import { DashboardLayout } from "./DashboardLayout";

const supplierNav = [
  { label: "Dashboard", to: "/supplier" },
  { label: "Products", to: "/supplier/products" },
  { label: "Incoming Orders", to: "/supplier/orders" },
];

export function SupplierLayout() {
  return (
    <DashboardLayout roleLabel="Supplier workspace" navLinks={supplierNav}>
      <Outlet />
    </DashboardLayout>
  );
}
