import { cn } from "@/lib/utils";
import { SelectHTMLAttributes, forwardRef } from "react";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-[var(--editor-border)] bg-[var(--editor-input-bg)] px-3 py-2 text-sm text-[var(--editor-text)] shadow-[var(--editor-shadow)] focus:border-indigo-500 focus:outline-none",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";
