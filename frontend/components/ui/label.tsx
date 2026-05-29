import { cn } from "@/lib/utils";
import { LabelHTMLAttributes } from "react";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1 block text-sm text-[var(--editor-muted)]", className)} {...props} />;
}
