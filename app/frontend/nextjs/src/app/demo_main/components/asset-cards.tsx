"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { Shield, Building2, TrendingUp, Flame, ArrowRight } from "lucide-react";

const MOCK_ASSETS = [
  {
    id: "1",
    name: "US Treasury Bill Strategy",
    type: "bond",
    apy: "5.2%",
    term: "3 Months",
    minInvest: "$500",
    risk: "low",
    raised: 78,
    icon: <Shield className="w-5 h-5" />,
    color: "#0066FF",
    gradient: "from-[#0066FF]/20 to-[#0066FF]/5",
  },
  {
    id: "2",
    name: "Real Estate Income Fund",
    type: "real_estate",
    apy: "8.5%",
    term: "12 Months",
    minInvest: "$1,000",
    risk: "medium",
    raised: 92,
    icon: <Building2 className="w-5 h-5" />,
    color: "#D4AF37",
    gradient: "from-[#D4AF37]/20 to-[#D4AF37]/5",
  },
  {
    id: "3",
    name: "DeFi High Yield Pool",
    type: "equity",
    apy: "12.4%",
    term: "Flexible",
    minInvest: "$100",
    risk: "high",
    raised: 65,
    icon: <TrendingUp className="w-5 h-5" />,
    color: "#00C9A7",
    gradient: "from-[#00C9A7]/20 to-[#00C9A7]/5",
  },
  {
    id: "4",
    name: "Green Energy Bond",
    type: "bond",
    apy: "6.8%",
    term: "6 Months",
    minInvest: "$500",
    risk: "low-medium",
    raised: 45,
    icon: <Flame className="w-5 h-5" />,
    color: "#10B981",
    gradient: "from-[#10B981]/20 to-[#10B981]/5",
  },
];

export function AssetCards() {
  const router = useRouter();
  const prefersReduced = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    const cardWidth = el.children[0]?.clientWidth || 320;
    const gap = 24;
    const newIndex = Math.round(scrollLeft / (cardWidth + gap));
    setActiveIndex(Math.min(newIndex, MOCK_ASSETS.length - 1));
  };

  return (
    <section className="relative py-24 px-6">
      <div className="max-w-[1400px] mx-auto">
        {/* Section header */}
        <motion.div
          initial={prefersReduced ? {} : { y: 30 }}
          whileInView={{ y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="flex items-center justify-between mb-10"
        >
          <div>
            <span className="text-primary text-sm font-semibold uppercase tracking-[2px]">
              Featured
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-white mt-2">
              Trending Assets
            </h2>
          </div>
          <button
            onClick={() => router.push("/assets")}
            className="hidden md:flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm font-medium group"
          >
            View All
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </motion.div>

        {/* Cards container */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0 cursor-grab active:cursor-grabbing"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            overscrollBehaviorX: "contain",
          }}
        >
          {MOCK_ASSETS.map((asset, index) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              index={index}
              prefersReduced={prefersReduced}
              onClick={() => router.push(`/assets/${asset.id}`)}
            />
          ))}
        </div>

        {/* Scroll indicators */}
        <div className="flex justify-center gap-2 mt-2 md:hidden">
          {MOCK_ASSETS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                activeIndex === i ? "w-6 bg-primary" : "w-1.5 bg-white/20"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function AssetCard({
  asset,
  index,
  prefersReduced,
  onClick,
}: {
  asset: (typeof MOCK_ASSETS)[0];
  index: number;
  prefersReduced: boolean | null;
  onClick: () => void;
}) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (prefersReduced || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setGlowPos({ x, y });
    setTilt({
      x: (e.clientY - rect.top - rect.height / 2) / 15,
      y: (rect.width / 2 - (e.clientX - rect.left)) / 15,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setGlowPos({ x: 50, y: 50 });
  };

  return (
    <motion.div
      initial={prefersReduced ? {} : { y: 40, scale: 0.95 }}
      whileInView={{ y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{
        delay: index * 0.1,
        duration: 0.6,
        ease: "easeOut",
      }}
      className="min-w-[300px] md:min-w-[340px] snap-center"
    >
      <div
        ref={cardRef}
        onClick={onClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative h-full p-6 rounded-2xl border border-white/[0.08] bg-[rgba(17,24,39,0.6)] backdrop-blur-xl overflow-hidden cursor-pointer transition-transform duration-300"
        style={{
          transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        }}
      >
        {/* Hover glow effect */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `radial-gradient(circle at ${glowPos.x}% ${glowPos.y}%, ${asset.color}15 0%, transparent 60%)`,
          }}
        />

        {/* Content */}
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-5">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center border"
              style={{
                background: `linear-gradient(135deg, ${asset.color}20 0%, ${asset.color}05 100%)`,
                borderColor: `${asset.color}30`,
                color: asset.color,
                boxShadow: `0 0 20px ${asset.color}20`,
              }}
            >
              {asset.icon}
            </div>
            <span className="text-[11px] font-medium px-3 py-1 rounded-full bg-white/[0.05] text-white/50 border border-white/[0.06]">
              {asset.risk} risk
            </span>
          </div>

          <h3 className="text-lg font-semibold text-white mb-1 line-clamp-1">
            {asset.name}
          </h3>
          <p className="text-sm text-white/40 mb-6">Backed by real assets</p>

          <div className="mb-5">
            <span className="block text-sm text-white/50 mb-1">Annual Yield</span>
            <span
              className="text-[42px] font-bold tracking-tight leading-none"
              style={{ color: asset.color, textShadow: `0 0 30px ${asset.color}40` }}
            >
              {asset.apy}
            </span>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-white/40 mb-2">
              <span>Raised</span>
              <span>{asset.raised}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${asset.raised}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ backgroundColor: asset.color }}
              />
            </div>
          </div>

          <div className="flex justify-between text-xs text-white/40 pt-4 border-t border-white/[0.06]">
            <span>Min: {asset.minInvest}</span>
            <span>{asset.term}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
