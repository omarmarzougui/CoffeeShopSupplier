import type { ReactNode } from "react";
import { Button } from "./button";

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: { label: string; onClick?: () => void; to?: string };
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
      {icon && (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-400">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-stone-500">{description}</p>}
      {action && (
        <div className="mt-4">
          {action.to ? (
            <a
              href={action.to}
              className="inline-flex h-9 items-center justify-center rounded-md bg-stone-900 px-4 text-sm font-medium text-white hover:bg-stone-800"
            >
              {action.label}
            </a>
          ) : (
            <Button onClick={action.onClick}>{action.label}</Button>
          )}
        </div>
      )}
    </div>
  );
}

export function InlineEmpty({ children }: { children: ReactNode }) {
  return (
    <p className="py-8 text-center text-sm text-stone-500">{children}</p>
  );
}
