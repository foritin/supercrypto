"use client";

import { Shield, Flame, TrendingUp, Building2, ArrowRight, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useRef } from "react";

import { GlassCard } from "@/components/ui";
import { Button } from "@/components/ui/button";


// Mock data
const FEATURED_ASSETS = [
  {
    id: "1",
    name: "US Treasury Bill Strategy",
    type: "bond",
    apy: "5.2%",
    term: "3 Months",
    minInvest: "$500",
    risk: "Low",
  },
  {
    id: "2",
    name: "Real Estate Income Fund",
    type: "real_estate",
    apy: "8.5%",
    term: "12 Months",
    minInvest: "$1,000",
    risk: "Medium",
  },
  {
    id: "3",
    name: "DeFi High Yield Pool",
    type: "equity",
    apy: "12.4%",
    term: "Flexible",
    minInvest: "$100",
    risk: "High",
  },
  {
    id: "4",
    name: "Green Energy Bond",
    type: "bond",
    apy: "6.8%",
    term: "6 Months",
    minInvest: "$500",
    risk: "Low-Medium",
  },
  {
    id: "5",
    name: "Gold Paxos Vault",
    type: "commodity",
    apy: "4.2%",
    term: "Flexible",
    minInvest: "$50",
    risk: "Low",
  },
];

const ASSET_ICONS: Record<string, React.ReactNode> = {
  bond: <Shield className="w-5 h-5 text-primary" />,
  real_estate: <Building2 className="w-5 h-5 text-gold" />,
  equity: <TrendingUp className="w-5 h-5 text-[#1890ff]" />,
  commodity: <Flame className="w-5 h-5 text-[#ff4d4f]" />,
};

export function FeaturedAssets() {
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="w-full max-w-[1400px] mx-auto px-6">
       <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-bold text-white">Featured Assets</h3>
        <Button 
          variant="ghost" 
          className="text-white/70 hover:text-white"
          onClick={() => router.push("/assets")}
        >
          View All <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      <div 
        ref={scrollContainerRef}
        className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {FEATURED_ASSETS.map((asset) => (
          <div key={asset.id} className="min-w-[280px] md:min-w-[320px] snap-center">
            <GlassCard 
              className="h-full p-6 flex flex-col justify-between group hover:-translate-y-2 transition-transform duration-300"
              glow
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                    {ASSET_ICONS[asset.type]}
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/5 text-white/60 border border-white/5">
                    {asset.risk} Risk
                  </span>
                </div>
                
                <h4 className="text-lg font-semibold text-white mb-1 line-clamp-1">{asset.name}</h4>
                <p className="text-sm text-white/50 mb-6">Backed by Real World Assets</p>
                
                <div className="mb-6">
                  <span className="block text-sm text-white/60 mb-1">Annual Yield</span>
                  <span className="text-[40px] font-bold text-primary tracking-tight leading-none">{asset.apy}</span>
                </div>

                <div className="flex items-center gap-4 mb-6 text-sm text-white/70">
                   <div className="flex items-center gap-1.5">
                     <Lock className="w-3.5 h-3.5" />
                     {asset.term}
                   </div>
                   <div className="w-px h-3 bg-white/20" />
                   <div>Min {asset.minInvest}</div>
                </div>
              </div>

              <Button 
                className="w-full bg-white/10 hover:bg-primary hover:text-black text-white border border-white/10 hover:border-primary transition-all duration-300"
                onClick={() => router.push(`/assets/${asset.id}`)}
              >
                Invest Now
              </Button>
            </GlassCard>
          </div>
        ))}
      </div>
    </div>
  );
}
