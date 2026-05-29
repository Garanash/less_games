import { cn } from "@/lib/utils";
import { TextareaHTMLAttributes, forwardRef } from "react";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-[var(--editor-border)] bg-[var(--editor-input-bg)] px-3 py-2 text-sm text-[var(--editor-text)] shadow-[var(--editor-shadow)] placeholder:text-[var(--editor-muted)] focus:border-indigo-500 focus:outline-none",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
