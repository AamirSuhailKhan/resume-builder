"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "secondary" | "outline" | "ghost" | "link" | "danger";
  size?: "default" | "sm" | "lg" | "icon";
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", isLoading, children, ...props }, ref) => {
    const variants = {
      default: "bg-foreground text-background shadow-[0_10px_28px_rgba(0,0,0,0.24)] hover:bg-foreground/90",
      primary: "bg-foreground text-background shadow-[0_10px_28px_rgba(0,0,0,0.24)] hover:bg-foreground/90",
      secondary: "border border-border bg-surface-muted text-foreground hover:bg-muted",
      outline: "border border-border-strong bg-surface/70 text-foreground shadow-sm hover:bg-surface-elevated",
      ghost: "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
      link: "h-auto rounded-none p-0 text-primary underline-offset-4 hover:underline",
      danger: "bg-danger text-white shadow-[0_10px_28px_rgba(225,29,72,0.22)] hover:brightness-105",
    };

    const sizes = {
      default: "h-10 px-4",
      sm: "h-8 px-3 text-xs",
      lg: "h-12 px-6 text-sm",
      icon: "h-9 w-9 p-0",
    };

    return (
      <button
        ref={ref}
        disabled={isLoading || props.disabled}
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-premium hover:-translate-y-px active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
