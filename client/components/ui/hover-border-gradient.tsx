"use client";
import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Direction = "TOP" | "LEFT" | "BOTTOM" | "RIGHT";

export function HoverBorderGradient({
  children,
  containerClassName,
  className,
  as: Tag = "button",
  duration = 1,
  clockwise = true,
  ...props
}: React.ComponentPropsWithoutRef<"button"> & {
  containerClassName?: string;
  className?: string;
  as?: React.ElementType;
  duration?: number;
  clockwise?: boolean;
}) {
  const [hovered, setHovered] = useState<boolean>(false);
  const [direction, setDirection] = useState<Direction>("TOP");

  const rotateDirection = useCallback((currentDirection: Direction): Direction => {
    const directions: Direction[] = ["TOP", "RIGHT", "BOTTOM", "LEFT"];
    const idx = directions.indexOf(currentDirection);
    const nextIdx = clockwise
      ? (idx + 1) % directions.length
      : (idx - 1 + directions.length) % directions.length;
    return directions[nextIdx];
  }, [clockwise]);

  useEffect(() => {
    if (!hovered) return;

    const interval = setInterval(() => {
      setDirection((prevState) => rotateDirection(prevState));
    }, duration * 1000 * 0.2);

    return () => clearInterval(interval);
  }, [hovered, duration, rotateDirection]);

  const mapDirectionToGradient: Record<Direction, string> = {
    TOP: "radial-gradient(20.7% 50% at 50% 0%, hsl(var(--primary)) 0%, rgba(139, 92, 246, 0) 100%)",
    LEFT: "radial-gradient(16.6% 43.1% at 0% 50%, hsl(var(--primary)) 0%, rgba(139, 92, 246, 0) 100%)",
    BOTTOM: "radial-gradient(20.7% 50% at 50% 100%, hsl(var(--primary)) 0%, rgba(139, 92, 246, 0) 100%)",
    RIGHT: "radial-gradient(16.6% 43.1% at 100% 50%, hsl(var(--primary)) 0%, rgba(139, 92, 246, 0) 100%)",
  };

  const highlight =
    "radial-gradient(75% 75% at 50% 50%, #8b5cf6 0%, rgba(0, 0, 0, 0) 100%)";

  return (
    <Tag
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "relative flex content-center bg-black/40 hover:bg-black/60 transition-colors duration-300 items-center justify-center rounded-xl border border-neutral-800 text-white/90 gap-2 px-6 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-black cursor-pointer overflow-visible group",
        containerClassName
      )}
      {...props}
    >
      <div
        className={cn(
          "w-auto text-white z-10 flex items-center justify-center gap-2",
          className
        )}
      >
        {children}
      </div>
      <motion.div
        className="absolute inset-0 z-0 rounded-xl overflow-hidden pointer-events-none"
        style={{
          filter: "blur(2px)",
          position: "absolute",
          width: "100%",
          height: "100%",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <div
          className="absolute inset-[-20%] transition-transform duration-500"
          style={{
            background: hovered ? mapDirectionToGradient[direction] : undefined,
          }}
        />
      </motion.div>
      <div className="absolute inset-0 bg-neutral-950 rounded-xl -z-10" />
    </Tag>
  );
}
