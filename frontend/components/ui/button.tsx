import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jaffa focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-jaffa text-white hover:bg-jaffa-dark active:scale-[0.98] shadow-sm",
        outline: "border-2 border-black text-black bg-transparent hover:bg-black/5 active:scale-[0.98]",
        ghost: "text-black bg-transparent hover:bg-black/5 active:scale-[0.98]",
        danger: "bg-danger text-white hover:bg-danger/90 active:scale-[0.98] shadow-sm",
        jaffa: "bg-jaffa text-white hover:bg-jaffa-dark active:scale-[0.98] shadow-sm",
        secondary: "bg-black/8 text-black border border-black/10 hover:bg-black/12 active:scale-[0.98]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
