"use client";

import React from "react";
import Image from "next/image";

// 合作伙伴数据 - 使用外部图片 URL
// 注意：实际生产中建议将图片下载到本地 public 目录以优化性能
const PARTNERS = [
  { 
    name: "Ethereum", 
    logo: "https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=026" 
  },
  { 
    name: "Chainlink", 
    logo: "https://cryptologos.cc/logos/chainlink-link-logo.svg?v=026" 
  },
  { 
    name: "Polygon", 
    logo: "https://cryptologos.cc/logos/polygon-matic-logo.svg?v=026" 
  },
  { 
    name: "Aave", 
    logo: "https://cryptologos.cc/logos/aave-aave-logo.svg?v=026" 
  },
  { 
    name: "Compound", 
    logo: "https://cryptologos.cc/logos/compound-comp-logo.svg?v=026" 
  },
  { 
    name: "Uniswap", 
    logo: "https://cryptologos.cc/logos/uniswap-uni-logo.svg?v=026" 
  },
  { 
    name: "MakerDAO", 
    logo: "https://cryptologos.cc/logos/maker-mkr-logo.svg?v=026" 
  },
  { 
    name: "Circle", 
    logo: "https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=026" 
  },
];

export default function Ticker() {
  return (
    <div className="w-full py-8 border-t border-white/5 relative overflow-hidden bg-[#0a0f0d]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 mb-6 text-center">
        <p className="text-[#00D4AA] font-semibold text-xs tracking-[0.2em] uppercase">
          Backed By Leading Institutions And Protocols
        </p>
      </div>
      
      {/* 滚动容器 */}
      <div className="relative w-full flex overflow-hidden group max-w-7xl mx-auto">
        {/* 渐变遮罩 - 增强融合感 (使用深色背景渐变) */}
        <div className="absolute left-0 top-0 bottom-0 w-32 z-10 bg-gradient-to-r from-[#0a0f0d] to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 z-10 bg-gradient-to-l from-[#0a0f0d] to-transparent pointer-events-none" />

        {/* 滚动轨道 - 需要两份来实现无缝衔接 */}
        <div className="flex animate-scroll whitespace-nowrap hover:[animation-play-state:paused] items-center">
          {PARTNERS.map((partner, index) => (
            <div
              key={`p1-${index}`}
              className="mx-12 flex items-center justify-center opacity-60 hover:opacity-100 transition-all duration-500 cursor-pointer grayscale hover:grayscale-0 filter"
              style={{ height: "32px" }}
            >
              <img 
                src={partner.logo} 
                alt={partner.name} 
                className="h-full w-auto object-contain max-h-[32px] max-w-[120px]"
                loading="lazy"
              />
            </div>
          ))}
        </div>

        {/* 第二份副本 */}
        <div className="flex animate-scroll whitespace-nowrap hover:[animation-play-state:paused] items-center" aria-hidden="true">
          {PARTNERS.map((partner, index) => (
            <div
              key={`p2-${index}`}
              className="mx-12 flex items-center justify-center opacity-60 hover:opacity-100 transition-all duration-500 cursor-pointer grayscale hover:grayscale-0 filter"
              style={{ height: "32px" }}
            >
              <img 
                src={partner.logo} 
                alt={partner.name} 
                className="h-full w-auto object-contain max-h-[32px] max-w-[120px]"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
