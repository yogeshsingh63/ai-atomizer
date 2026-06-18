"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Tab = {
  title: string;
  value: string;
  icon?: React.ReactNode;
  content?: React.ReactNode;
};

export const Tabs = ({
  tabs: propTabs,
  containerClassName,
  activeTabClassName,
  tabClassName,
  contentClassName,
}: {
  tabs: Tab[];
  containerClassName?: string;
  activeTabClassName?: string;
  tabClassName?: string;
  contentClassName?: string;
}) => {
  const [active, setActive] = useState<Tab>(propTabs[0]);
  const [hovering, setHovering] = useState(false);

  const moveSelectedTab = (index: number) => {
    setActive(propTabs[index]);
  };

  return (
    <div className="flex flex-col w-full">
      <div
        className={cn(
          "flex flex-row items-center justify-start [perspective:1000px] relative overflow-auto sm:overflow-visible no-scrollbar max-w-full w-full bg-neutral-900/50 border border-neutral-800 p-1 rounded-2xl gap-2",
          containerClassName
        )}
      >
        {propTabs.map((tab, idx) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => moveSelectedTab(idx)}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            className={cn(
              "relative px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2 flex-1 cursor-pointer",
              tabClassName
            )}
            style={{
              transformStyle: "preserve-3d",
            }}
          >
            {active.value === tab.value && (
              <motion.div
                layoutId="clickedbutton"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                className={cn(
                  "absolute inset-0 bg-neutral-800 rounded-xl",
                  activeTabClassName
                )}
              />
            )}

            <span className={cn(
              "relative z-20 flex items-center gap-2",
              active.value === tab.value ? "text-neutral-100 font-semibold" : "text-neutral-400 hover:text-neutral-200"
            )}>
              {tab.icon}
              {tab.title}
            </span>
          </button>
        ))}
      </div>
      <div className={cn("mt-6", contentClassName)}>
        {propTabs.map((tab) => (
          <div
            key={tab.value}
            style={{
              display: tab.value === active.value ? "block" : "none",
            }}
          >
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
};
