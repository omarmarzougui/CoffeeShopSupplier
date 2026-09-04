type BadgeVariant = "neutral" | "success" | "warning" | "info" | "danger" | "brand";

const styles: Record<BadgeVariant, string> = {
  neutral: "bg-stone-100 text-stone-700 border-stone-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  info: "bg-sky-50 text-sky-700 border-sky-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  brand: "bg-stone-900 text-white border-stone-900",
};

export function Badge({
  variant = "neutral",
  children,
  className = "",
  dot,
}: {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[variant]} ${className}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    pending: "warning",
    confirmed: "info",
    dispatched: "info",
    delivered: "success",
    cancelled: "neutral",
    unpaid: "warning",
    paid: "success",
    overdue: "danger",
    active: "success",
    archived: "neutral",
  };
  const variant = map[status] ?? "neutral";
  const dot = ["pending", "confirmed", "dispatched"].includes(status);
  return (
    <Badge variant={variant} dot={dot}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
