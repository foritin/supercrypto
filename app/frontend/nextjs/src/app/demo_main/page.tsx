"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, ChevronDown, Check } from "lucide-react";
import { Hero3D } from "./components/hero-3d";
import { HeroMatrix } from "./components/hero-matrix";
import { HeroNexus } from "./components/hero-nexus";
import { HeroVortex } from "./components/hero-vortex";
import { HeroNeonGrid } from "./components/hero-neon-grid";
import { WaveTransition } from "./components/wave-transition";
import { StatsBand } from "./components/stats-band";
import { AssetCardsV3 } from "./components/asset-cards-v3";
import { FeaturesSpotlight } from "./components/features-spotlight";
import { MarqueeLight } from "./components/marquee-light";
import { CTAV3 } from "./components/cta-v3";

type HeroStyle = "metal" | "matrix" | "nexus" | "vortex" | "neon";

const STYLES: { key: HeroStyle; label: string; desc: string }[] = [
  { key: "metal", label: "Metal Sphere", desc: "3D flowing metal" },
  { key: "matrix", label: "Matrix Rain", desc: "Code rain cascade" },
  { key: "nexus", label: "Particle Nexus", desc: "Interactive network" },
  { key: "vortex", label: "Cosmic Vortex", desc: "Spiral galaxy arms" },
  { key: "neon", label: "Neon Grid", desc: "Cyberpunk pulse" },
];

export default function DemoMainPage() {
  const [style, setStyle] = useState<HeroStyle>("metal");
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Check URL query param for style override (e.g. ?style=matrix)
    const params = new URLSearchParams(window.location.search);
    const queryStyle = params.get("style");

    if (queryStyle && STYLES.some((s) => s.key === queryStyle)) {
      setStyle(queryStyle as HeroStyle);
    } else {
      const saved = localStorage.getItem("demo_main_hero_style") as HeroStyle | null;
      if (saved && STYLES.some((s) => s.key === saved)) {
        setStyle(saved);
      }
    }
    setMounted(true);
  }, []);

  const selectStyle = useCallback((s: HeroStyle) => {
    setStyle(s);
    localStorage.setItem("demo_main_hero_style", s);
    setMenuOpen(false);
  }, []);

  const HeroComponent =
    style === "metal"
      ? Hero3D
      : style === "matrix"
        ? HeroMatrix
        : style === "nexus"
          ? HeroNexus
          : style === "vortex"
            ? HeroVortex
            : HeroNeonGrid;

  return (
    <main className="relative min-h-screen bg-[#0A0F1A] text-white overflow-x-hidden">
      {/* ─── Style Switcher (top-left) ─── */}
      {mounted && (
        <div className="fixed top-20 left-4 z-[100]">
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 h-9 px-3 rounded-lg bg-white/[0.06] backdrop-blur-md border border-white/[0.08] text-[11px] font-medium tracking-wide text-white/70 hover:bg-white/[0.1] hover:text-white transition-all"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Style</span>
              <ChevronDown
                className={`w-3 h-3 transition-transform ${menuOpen ? "rotate-180" : ""}`}
              />
            </button>

            <AnimatePresence>
              {menuOpen && (
                <>
                  {/* Backdrop click */}
                  <div
                    className="fixed inset-0 z-[-1]"
                    onClick={() => setMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-2 w-44 rounded-xl bg-[#0E1420]/95 backdrop-blur-xl border border-white/[0.08] overflow-hidden shadow-2xl"
                  >
                    {STYLES.map((s) => (
                      <button
                        key={s.key}
                        onClick={() => selectStyle(s.key)}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-white/[0.06] transition-colors group"
                      >
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                            style === s.key
                              ? "border-[#00F5FF] bg-[#00F5FF]/20"
                              : "border-white/20 group-hover:border-white/40"
                          }`}
                        >
                          {style === s.key && (
                            <Check className="w-2.5 h-2.5 text-[#00F5FF]" />
                          )}
                        </div>
                        <div>
                          <div className="text-[12px] font-medium text-white/90">
                            {s.label}
                          </div>
                          <div className="text-[10px] text-white/30">
                            {s.desc}
                          </div>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Subtle noise texture overlay */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10">
        {/* ─── Hero with style switch ─── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={style}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <HeroComponent />
          </motion.div>
        </AnimatePresence>

        {/* ─── Transition: Dark → Light ─── */}
        <WaveTransition direction="dark-to-light" />

        {/* ─── Stats Band ─── */}
        <StatsBand />

        {/* ─── Live Opportunities ─── */}
        <AssetCardsV3 />

        {/* ─── Transition: Light → Dark ─── */}
        <WaveTransition direction="light-to-dark" />

        {/* ─── Features Spotlight ─── */}
        <FeaturesSpotlight />

        {/* ─── Partners Marquee ─── */}
        <MarqueeLight />

        {/* ─── CTA ─── */}
        <CTAV3 />
      </div>
    </main>
  );
}
