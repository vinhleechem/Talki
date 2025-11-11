import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground neo-border neo-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[4px] active:translate-y-[4px] active:shadow-none rounded-sm",
        destructive:
          "bg-destructive text-destructive-foreground neo-border neo-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none rounded-sm",
        outline:
          "border-2 border-foreground bg-background hover:bg-foreground hover:text-background neo-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none rounded-sm",
        secondary:
          "bg-secondary text-secondary-foreground neo-border neo-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none rounded-sm",
        accent:
          "bg-accent text-accent-foreground neo-border neo-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none rounded-sm",
        ghost: "hover:bg-accent hover:text-accent-foreground rounded-sm",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "bg-primary text-primary-foreground neo-border-thick neo-shadow-lg hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0px_0px_hsl(var(--foreground))] text-lg rounded-sm",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
