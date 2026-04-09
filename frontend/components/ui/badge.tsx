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
        success: "border-success/30 bg-success/10 text-success",
        danger: "border-danger/30 bg-danger/10 text-danger",
        openai: "border-[#10A37F]/30 bg-[#10A37F]/10 text-[#10A37F]",
        anthropic: "border-[#D4A574]/30 bg-[#D4A574]/10 text-[#A0673A]",
        gemini: "border-[#4285F4]/30 bg-[#4285F4]/10 text-[#4285F4]",
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
