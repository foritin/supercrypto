"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Wallet, ShieldCheck, Coins, TrendingUp } from "lucide-react";

const STEPS = [
  {
    step: 1,
    icon: <Wallet className="w-7 h-7" />,
    title: "Connect Wallet",
    description: "Link your Web3 wallet in seconds. No complex setup required.",
    color: "#00D4AA",
  },
  {
    step: 2,
    icon: <ShieldCheck className="w-7 h-7" />,
    title: "Verify Identity",
    description: "Quick KYC process to ensure compliance and security.",
    color: "#FFD700",
  },
  {
    step: 3,
    icon: <Coins className="w-7 h-7" />,
    title: "Choose Assets",
    description: "Browse curated RWA opportunities and select your investments.",
    color: "#1890ff",
  },
  {
    step: 4,
    icon: <TrendingUp className="w-7 h-7" />,
    title: "Earn Yield",
    description: "Watch your portfolio grow with transparent, on-chain returns.",
    color: "#a855f7",
  },
];

export function HowItWorksSection() {
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
          <span className="text-gold text-sm font-semibold uppercase tracking-[2px]">
            How It Works
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-white mt-3 mb-4">
            Four Steps to Start
          </h2>
          <p className="text-lg text-white/55 max-w-[500px] mx-auto">
            From wallet connection to earning yield in minutes
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          {/* Connecting line - desktop only */}
          <div className="hidden md:block absolute top-[60px] left-[12.5%] right-[12.5%] h-[2px]">
            <div className="w-full h-full bg-gradient-to-r from-[#00D4AA] via-[#1890ff] to-[#a855f7] opacity-20" />
          </div>

          {STEPS.map((item, index) => (
            <motion.div
              key={item.step}
              initial={prefersReduced ? {} : { y: 30 }}
              whileInView={{ y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15, duration: 0.6, ease: "easeOut" }}
              className="relative text-center"
            >
              {/* Step circle */}
              <motion.div
                whileInView={prefersReduced ? {} : { scale: [0.8, 1.1, 1] }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 + 0.2, duration: 0.5 }}
                className="relative z-10 w-[120px] h-[120px] mx-auto mb-6 rounded-2xl flex items-center justify-center border"
                style={{
                  background: `linear-gradient(135deg, ${item.color}15 0%, ${item.color}05 100%)`,
                  borderColor: `${item.color}25`,
                  color: item.color,
                  boxShadow: `0 0 30px ${item.color}15`,
                }}
              >
                {item.icon}
                {/* Step number badge */}
                <div
                  className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: item.color }}
                >
                  {item.step}
                </div>
              </motion.div>

              <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-sm text-white/45 leading-relaxed max-w-[240px] mx-auto">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
