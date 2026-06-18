"use client";
import React from "react";
import { cn } from "@/lib/utils";

export function Button({
  borderRadius,
  children,
  as: Component = "button",
  containerClassName,
  borderClassName,
  duration,
  className,
  ...otherProps
}: {
  borderRadius?: string;
  children: React.ReactNode;
  as?: any;
  containerClassName?: string;
  borderClassName?: string;
  duration?: number;
  className?: string;
  [key: string]: any;
}) {
  return (
    <Component
      className={cn(
        "relative flex items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-100 font-semibold px-6 py-2.5 text-xs hover:bg-neutral-800 hover:border-neutral-700 transition-all duration-200 cursor-pointer shadow-sm select-none sm:w-auto w-full",
        containerClassName,
        className
      )}
      {...otherProps}
    >
      <div className="flex items-center justify-center gap-2 w-full">
        {children}
      </div>
    </Component>
  );
}

// Simple export matching signature if needed elsewhere
export const MovingBorder = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};
