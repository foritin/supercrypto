"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Shield, DollarSign, Globe, Lock, Clock, TrendingUp } from "lucide-react";
import { useState, useRef } from "react";

const FEATURES = [
  {
    id: "security",
    title: "Bank-Grade Security",
    description:
      "Multi-sig treasury, audited smart contracts, and institutional custody partners protect every dollar.",
    icon: <Shield className="w-7 h-7" />,
    color: "#0066FF",
    gradient: "from-[#0066FF]/15 to-transparent",
    size: "large",
  },
  {
    id: "returns",
    title: "Competitive Yields",
    description: "Earn up to 15% APY backed by tokenized real-world assets with predictable returns.",
    icon: <DollarSign className="w-6 h-6" />,
    color: "#D4AF37",
    gradient: "from-[#D4AF37]/15 to-transparent",
    size: "small",
  },
  {
    id: "global",
    title: "Global Access",
    description: "Invest from anywhere. No minimums for most assets. 24/7 liquidity.",
    icon: <Globe className="w-6 h-6" />,
    color: "#00C9A7",
    gradient: "from-[#00C9A7]/15 to-transparent",
    size: "small",
  },
  {
    id: "transparent",
    title: "On-Chain Transparency",
    description: "Every transaction and asset backing is verifiable on the blockchain in real-time.",
    icon: <Lock className="w-6 h-6" />,
    color: "#8B5CF6",
    gradient: "from-[#8B5CF6]/15 to-transparent",
    size: "small",
  },
  {
    id: "liquid",
    title: "Instant Liquidity",
    description: "Secondary markets and staking options provide flexible exit strategies.",
    icon: <Clock className="w-6 h-6" />,
    color: "#F59E0B",
    gradient: "from-[#F59E0B]/15 to-transparent",
    size: "small",
  },
  {
    id: "diversify",
    title: "Portfolio Diversification",
    description: "Access real estate, bonds, commodities and more through a single platform.",
    icon: <TrendingUp className="w-6 h-6" />,
    color: "#EC4899",
    gradient: "from-[#EC4899]/15 to-transparent",
    size: "small",
  },
];

export function FeaturesSection() {
  const prefersReduced = useReducedMotion();

  return (
    <section className="relative py-24 px-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <motion.div
          initial={prefersReduced ? {} : { y: 30 }}
          whileInView={{ y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <span className="text-primary text-sm font-semibold uppercase tracking-[2px]">
            Why Choose Us
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-white mt-3 mb-4">
            Built for the Future of Finance
          </h2>
          <p className="text-lg text-white/55 max-w-[550px] mx-auto">
            Combining traditional asset security with DeFi accessibility
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-5">
          {/* Large card - spans 2 rows */}
          <FeatureCard feature={FEATURES[0]!} index={0} prefersReduced={prefersReduced} className="md:row-span-2" />

          {/* Small cards */}
          {FEATURES.slice(1).map((feature, i) => (
            <FeatureCard key={feature.id} feature={feature} index={i + 1} prefersReduced={prefersReduced} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  feature,
  index,
  prefersReduced,
  className = "",
}: {
  feature: (typeof FEATURES)[0];
  index: number;
  prefersReduced: boolean | null;
  className?: string;
}) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (prefersReduced || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setTilt({
      x: (e.clientY - rect.top - rect.height / 2) / 25,
      y: (rect.width / 2 - (e.clientX - rect.left)) / 25,
    });
  };

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  return (
    <motion.div
      initial={prefersReduced ? {} : { y: 30 }}
      whileInView={{ y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.6, ease: "easeOut" }}
      className={className}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative h-full p-6 md:p-8 rounded-2xl border border-white/[0.08] bg-[rgba(17,24,39,0.5)] backdrop-blur-xl overflow-hidden group cursor-default"
        style={{
          transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: "transform 0.15s ease-out",
        }}
      >
        {/* Gradient background */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
        />

        {/* Border glow on hover */}
        <div
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            boxShadow: `inset 0 0 0 1px ${feature.color}30`,
          }}
        />

        <div className="relative z-10">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
            style={{
              background: `linear-gradient(135deg, ${feature.color}20 0%, ${feature.color}05 100%)`,
              border: `1px solid ${feature.color}30`,
              color: feature.color,
              boxShadow: `0 0 20px ${feature.color}15`,
            }}
          >
            {feature.icon}
          </div>

          <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
          <p className="text-sm text-white/50 leading-relaxed">{feature.description}</p>
        </div>
      </div>
    </motion.div>
  );
}
