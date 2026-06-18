import { cn } from "@/lib/utils";
import React from "react";

export const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto",
        className
      )}
    >
      {children}
    </div>
  );
};

export const BentoGridItem = ({
  className,
  title,
  description,
  header,
  icon,
  onClick,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "row-span-1 rounded-2xl p-6 bg-[#121215] border border-[#1f1f23] hover:border-neutral-500 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between space-y-4 hover:bg-[#141418] shadow-sm select-none",
        className
      )}
    >
      {header}
      <div className="flex flex-col relative z-10">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <div className="font-bold text-neutral-200">
            {title}
          </div>
        </div>
        <div className="font-normal text-xs text-neutral-400 line-clamp-3">
          {description}
        </div>
      </div>
    </div>
  );
};
