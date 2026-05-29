import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-[var(--editor-border)] bg-[var(--editor-input-bg)] px-3 py-2 text-sm text-[var(--editor-text)] shadow-[var(--editor-shadow)] placeholder:text-[var(--editor-muted)] focus:border-indigo-500 focus:outline-none",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
