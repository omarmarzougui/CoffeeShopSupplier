import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RoleProtectedRoute } from "./components/RoleProtectedRoute";
import { PublicLayout } from "./components/PublicLayout";
import { BuyerLayout } from "./components/BuyerLayout";
import { SupplierLayout } from "./components/SupplierLayout";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { BuyerDashboardPage } from "./pages/BuyerDashboardPage";
import { SupplierDashboardPage } from "./pages/SupplierDashboardPage";
import { CatalogPage } from "./pages/CatalogPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { SupplierProfilePage } from "./pages/SupplierProfilePage";
import { CartPage } from "./pages/CartPage";

export const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  {
    element: <PublicLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <RoleProtectedRoute roles={["buyer"]} />,
        children: [
          {
            path: "/buyer",
            element: <BuyerLayout />,
            children: [
              { index: true, element: <BuyerDashboardPage /> },
              { path: "products", element: <CatalogPage /> },
              { path: "products/:id", element: <ProductDetailPage /> },
              { path: "suppliers/:id", element: <SupplierProfilePage /> },
              { path: "cart", element: <CartPage /> },
            ],
          },
        ],
      },
      {
        element: <RoleProtectedRoute roles={["supplier"]} />,
        children: [
          {
            path: "/supplier",
            element: <SupplierLayout />,
            children: [{ index: true, element: <SupplierDashboardPage /> }],
          },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
