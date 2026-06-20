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
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-7xl mx-auto",
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
  footer,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  footer?: React.ReactNode;
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group/card relative row-span-1 rounded-2xl p-5 bg-[#0d0d10] border border-[#1e1e24] transition-all duration-300 ease-out cursor-pointer overflow-hidden flex flex-col justify-between gap-4 select-none",
        "hover:border-brand/40 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] active:scale-[0.985]",
        className
      )}
    >
      {/* Top accent line — lights up on hover */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand/50 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />

      {header}
      <div className="flex flex-col relative z-10">
        <div className="flex items-center gap-2 mb-1.5">
          {icon}
          <div className="font-bold text-[15px] text-neutral-100 tracking-tight">
            {title}
          </div>
        </div>
        <div className="font-normal text-xs text-neutral-500 line-clamp-3 leading-relaxed">
          {description}
        </div>
      </div>
      {footer && (
        <div className="relative z-10 pt-3 border-t border-[#1e1e24] mt-auto" onClick={(e) => e.stopPropagation()}>
          {footer}
        </div>
      )}
    </div>
  );
};
