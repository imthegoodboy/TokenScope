import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-black-border bg-black/5 text-black",
        black: "bg-black text-white border-transparent",
        success: "border-green/30 bg-green/8 text-green",
        danger: "border-danger/30 bg-danger/8 text-danger",
        warning: "border-warning/30 bg-warning/8 text-warning",
        jaffa: "bg-jaffa/8 text-jaffa-dark border-jaffa/30",
        openai: "bg-jaffa/8 text-jaffa-dark border-jaffa/30",
        anthropic: "bg-green/8 text-green border-green/30",
        gemini: "bg-navy/8 text-navy border-navy/30",
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
