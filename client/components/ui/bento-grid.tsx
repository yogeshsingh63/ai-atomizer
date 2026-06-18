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
        "row-span-1 rounded-3xl group/bento hover:shadow-2xl transition-all duration-300 shadow-sm p-6 bg-neutral-900/40 border border-neutral-800/80 justify-between flex flex-col space-y-4 hover:border-violet-500/50 hover:bg-neutral-900/60 cursor-pointer overflow-hidden relative radial-gradient",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-violet-600/5 to-transparent opacity-0 group-hover/bento:opacity-100 transition-opacity duration-300" />
      {header}
      <div className="group-hover/bento:translate-x-2 transition duration-200 flex flex-col relative z-10">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <div className="font-semibold text-neutral-200 group-hover/bento:text-violet-400 transition-colors duration-200">
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
