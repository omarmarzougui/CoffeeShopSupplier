import { Link, useLocation, type To } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuthStore } from "../stores/auth-store";
import { useAuth } from "../lib/auth-context";

interface NavLink {
  label: string;
  to: To;
}

interface DashboardLayoutProps {
  roleLabel: string;
  navLinks: NavLink[];
  children?: ReactNode;
}

export function DashboardLayout({ roleLabel, navLinks, children }: DashboardLayoutProps) {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  return (
    <div className="flex min-h-screen bg-stone-50">
      <aside className="flex w-64 flex-col border-r border-stone-200 bg-stone-800 text-stone-100">
        <div className="border-b border-stone-700 px-6 py-5">
          <h2 className="text-lg font-bold">CoffeeShopSupplier</h2>
          <p className="mt-0.5 text-xs text-stone-400">{roleLabel}</p>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navLinks.map((link) => {
            const active = location.pathname === link.to;
            return (
              <Link
                key={String(link.to)}
                to={link.to}
                className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-amber-600 text-white"
                    : "text-stone-300 hover:bg-stone-700 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-stone-700 px-6 py-4">
          <p className="truncate text-xs text-stone-400">{user?.email}</p>
          <button
            onClick={handleLogout}
            className="mt-2 w-full rounded-lg bg-stone-700 px-3 py-1.5 text-xs font-medium text-stone-200 transition-colors hover:bg-stone-600"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">{children ?? <p className="text-stone-500">Dashboard coming soon.</p>}</main>
    </div>
  );
}
