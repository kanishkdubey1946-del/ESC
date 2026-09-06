"use client";

import { Globe } from "lucide-react";
import { Component as LunarGravityCard } from "@/components/ui/lunar-gravity-card";

export default function Demo() {
  return (
    <div className="w-full min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 sm:p-10 font-sans">

      <div className="relative w-full max-w-[1000px]">

        <LunarGravityCard />
        <div
          className="absolute top-6 right-6 md:top-8 md:right-8 w-10 h-10 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full flex items-center justify-center z-50 text-white/50 hover:text-white backdrop-blur-md transition-all hover:scale-110"
          aria-hidden
        >
          <Globe className="w-[18px] h-[18px]" strokeWidth={1.5} />
        </div>

      </div>

    </div>
  );
}
