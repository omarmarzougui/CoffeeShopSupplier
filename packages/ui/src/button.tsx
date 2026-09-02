import type { ReactNode } from "react";

export function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  type?: "button" | "submit";
}) {
  const styles =
    variant === "primary"
      ? "bg-amber-600 text-white hover:bg-amber-700"
      : "bg-stone-200 text-stone-900 hover:bg-stone-300";
  return (
    <button
      type={type}
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${styles}`}
    >
      {children}
    </button>
  );
}
