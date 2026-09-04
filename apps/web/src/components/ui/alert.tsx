export function Alert({
  variant = "error",
  children,
}: {
  variant?: "error" | "success" | "info" | "warning";
  children: React.ReactNode;
}) {
  const styles: Record<string, string> = {
    error: "bg-red-50 text-red-700 border-red-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    info: "bg-sky-50 text-sky-700 border-sky-200",
    warning: "bg-amber-50 text-amber-800 border-amber-200",
  };
  return (
    <div role={variant === "error" ? "alert" : "status"} className={`rounded-md border px-3 py-2.5 text-sm ${styles[variant]}`}>
      {children}
    </div>
  );
}
