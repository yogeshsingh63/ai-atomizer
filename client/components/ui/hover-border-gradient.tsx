"use client";
import React from "react";
import { cn } from "@/lib/utils";

export function HoverBorderGradient({
  children,
  containerClassName,
  className,
  as: Tag = "button",
  duration,
  clockwise,
  ...props
}: React.ComponentPropsWithoutRef<"button"> & {
  containerClassName?: string;
  className?: string;
  as?: React.ElementType;
  duration?: number;
  clockwise?: boolean;
}) {
  return (
    <Tag
      className={cn(
        "relative flex items-center justify-center rounded-lg border border-neutral-700 bg-neutral-100 text-neutral-950 font-bold px-6 py-2.5 text-xs hover:bg-white hover:border-neutral-500 transition-all duration-200 cursor-pointer shadow-sm focus:outline-none focus:ring-0 select-none",
        containerClassName
      )}
      {...props}
    >
      <div className={cn("flex items-center justify-center gap-2", className)}>
        {children}
      </div>
    </Tag>
  );
}
