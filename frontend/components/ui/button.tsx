import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const variants = {
      primary: "bg-indigo-600 text-white hover:bg-indigo-500 border border-indigo-600",
      secondary:
        "bg-[var(--editor-btn-secondary-bg)] text-[var(--editor-btn-secondary-text)] hover:bg-[var(--editor-surface-hover)] border border-[var(--editor-btn-secondary-border)]",
      ghost: "bg-transparent text-[var(--editor-text)] hover:bg-[var(--editor-surface-hover)]",
      danger: "bg-red-600 text-white hover:bg-red-500 border border-red-600",
    };
    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-sm",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
