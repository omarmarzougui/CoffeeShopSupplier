import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-stone-900 text-white hover:bg-stone-800 focus-visible:ring-stone-900 disabled:bg-stone-300",
  secondary:
    "bg-white text-stone-700 border border-stone-300 hover:bg-stone-50 hover:text-stone-900 focus-visible:ring-stone-400 disabled:bg-stone-50 disabled:text-stone-400",
  ghost:
    "bg-transparent text-stone-600 hover:bg-stone-100 hover:text-stone-900 focus-visible:ring-stone-400",
  danger:
    "bg-white text-red-700 border border-red-200 hover:bg-red-50 focus-visible:ring-red-500",
};

const sizeStyles: Record<Size, string> = {
  sm: "h-8 px-3 text-xs font-medium",
  md: "h-9 px-4 text-sm font-medium",
  lg: "h-10 px-6 text-sm font-medium",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  ...props
}: {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:border-stone-200 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
