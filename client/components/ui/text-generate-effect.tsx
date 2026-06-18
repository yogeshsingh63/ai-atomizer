"use client";
import { useEffect } from "react";
import { motion, useAnimation, stagger } from "framer-motion";
import { cn } from "@/lib/utils";

export const TextGenerateEffect = ({
  words,
  className,
  filter = true,
  duration = 0.5,
}: {
  words: string;
  className?: string;
  filter?: boolean;
  duration?: number;
}) => {
  const wordsArray = words.split(" ");
  const controls = useAnimation();

  useEffect(() => {
    controls.start((i) => ({
      opacity: 1,
      filter: filter ? "blur(0px)" : "none",
      transition: {
        delay: i * 0.02,
        duration: duration,
      },
    }));
  }, [controls, filter, duration]);

  return (
    <div className={cn("font-normal", className)}>
      <div className="mt-2">
        <div className="text-neutral-300 text-sm leading-relaxed tracking-wide">
          {wordsArray.map((word, idx) => {
            return (
              <motion.span
                key={word + idx}
                custom={idx}
                animate={controls}
                className="opacity-0 filter"
                style={{
                  display: "inline-block",
                  marginRight: "4px",
                  filter: filter ? "blur(10px)" : "none",
                }}
              >
                {word}
              </motion.span>
            );
          })}
        </div>
      </div>
    </div>
  );
};
