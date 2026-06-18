"use client";
import React from "react";
import { cn } from "@/lib/utils";

export const BackgroundBeams = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "absolute inset-0 h-full w-full pointer-events-none overflow-hidden [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] -z-10",
        className
      )}
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2e_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />
      
      {/* Animated Beams */}
      <div className="absolute top-[-20%] left-[-10%] w-[150%] h-[150%] overflow-hidden">
        <div 
          className="absolute top-0 left-1/4 w-[2px] h-[300px] bg-gradient-to-b from-transparent via-violet-500 to-transparent rotate-[35deg] opacity-40 animate-beam-1" 
          style={{ animationDuration: '8s', animationIterationCount: 'infinite' }}
        />
        <div 
          className="absolute top-[20%] left-2/3 w-[2px] h-[200px] bg-gradient-to-b from-transparent via-fuchsia-500 to-transparent rotate-[35deg] opacity-30 animate-beam-2" 
          style={{ animationDuration: '12s', animationIterationCount: 'infinite', animationDelay: '2s' }}
        />
        <div 
          className="absolute top-[-10%] left-1/2 w-[2px] h-[400px] bg-gradient-to-b from-transparent via-violet-400 to-transparent rotate-[35deg] opacity-20 animate-beam-3" 
          style={{ animationDuration: '10s', animationIterationCount: 'infinite', animationDelay: '4s' }}
        />
      </div>

      <style jsx global>{`
        @keyframes beam {
          0% {
            transform: translate(-100px, -100px) rotate(35deg);
            opacity: 0;
          }
          10% {
            opacity: 0.4;
          }
          90% {
            opacity: 0.4;
          }
          100% {
            transform: translate(800px, 800px) rotate(35deg);
            opacity: 0;
          }
        }
        .animate-beam-1 {
          animation: beam 9s infinite linear;
        }
        .animate-beam-2 {
          animation: beam 14s infinite linear 2s;
        }
        .animate-beam-3 {
          animation: beam 11s infinite linear 4s;
        }
      `}</style>
    </div>
  );
};
