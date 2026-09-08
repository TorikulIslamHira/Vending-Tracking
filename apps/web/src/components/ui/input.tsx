import * as React from "react";
import { cn } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- untouched shadcn/ui boilerplate; kept as an interface as an intentional extension point
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // text-base (16px) below the md breakpoint: iOS Safari auto-zooms
          // the viewport on focus for any input with a computed font-size
          // under 16px — text-sm alone triggers it on every phone-width tap.
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base md:text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
