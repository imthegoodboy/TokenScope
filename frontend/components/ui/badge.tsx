import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-black-border bg-black/5 text-black",
        black: "bg-black text-white border-transparent",
        success: "border-green/30 bg-green-bg text-green",
        danger: "border-danger/30 bg-danger/10 text-danger",
        warning: "border-warning/30 bg-warning/10 text-warning",
        jaffa: "bg-jaffa-bg text-jaffa-dark border-jaffa/30",
        openai: "bg-jaffa-bg text-jaffa-dark border-jaffa/30",
        anthropic: "bg-green-bg text-green border-green/30",
        gemini: "bg-navy-bg text-navy border-navy/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
