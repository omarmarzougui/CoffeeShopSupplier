import { useState } from "react";
import { Link, useLocation, useNavigate, type To } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuthStore } from "../stores/auth-store";
import { useAuth } from "../lib/auth-context";

interface NavLink {
  label: string;
  to: To;
  icon?: ReactNode;
}

interface DashboardLayoutProps {
  roleLabel: string;
  navLinks: NavLink[];
  children?: ReactNode;
}

function NavIcon({ label }: { label: string }) {
  const icons: Record<string, string> = {
    Dashboard: "◧",
    "Browse Products": "⊞",
    "My Orders": "≡",
    Cart: "⧉",
    Products: "⊞",
    "Incoming Orders": "≡",
  };
  return (
    <span
      aria-hidden
      className="flex h-5 w-5 items-center justify-center text-xs opacity-60"
    >
      {icons[label] ?? "·"}
    </span>
  );
}

export function DashboardLayout({ roleLabel, navLinks, children }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isActive = (to: To) => {
    const path = String(to);
    if (path === "/buyer" || path === "/supplier") {
      return location.pathname === path;
    }
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const sidebarContent = (
    <>
      <div className="border-b border-stone-200 px-5 py-5">
        <Link to="/" className="block">
          <h2 className="text-sm font-semibold tracking-tight text-stone-900">
            CoffeeShopSupplier
          </h2>
          <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-stone-500">
            {roleLabel}
          </p>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4" aria-label="Primary">
        <ul className="space-y-0.5">
          {navLinks.map((link) => {
            const active = isActive(link.to);
            return (
              <li key={String(link.to)}>
                <Link
                  to={link.to}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-stone-900 text-white"
                      : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                >
                  <NavIcon label={link.label} />
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-stone-200 px-4 py-4">
        <p className="truncate text-xs text-stone-500">{user?.email}</p>
        <p className="truncate text-xs font-medium text-stone-700">{user?.businessName}</p>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-900"
        >
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-stone-200 bg-white px-4 lg:hidden">
        <Link to="/" className="text-sm font-semibold text-stone-900">
          CoffeeShopSupplier
        </Link>
        <button
          type="button"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-stone-300 bg-white text-stone-700"
        >
          <span aria-hidden className="text-lg leading-none">
            {mobileOpen ? "×" : "☰"}
          </span>
        </button>
      </header>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-stone-900/20 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <div className="flex min-h-screen lg:min-h-0">
        <aside
          className={`${
            mobileOpen ? "flex" : "hidden"
          } fixed inset-y-0 left-0 z-20 w-64 flex-col border-r border-stone-200 bg-white lg:static lg:flex`}
          aria-label="Sidebar"
        >
          {sidebarContent}
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children ?? (
              <div className="rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center">
                <p className="text-sm text-stone-500">Select an item from the navigation.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
