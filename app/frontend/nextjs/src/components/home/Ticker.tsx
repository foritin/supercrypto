"use client";

import React from "react";
import Image from "next/image";
import {
  GlobalOutlined,
  BlockOutlined,
  SafetyCertificateOutlined,
  BankOutlined,
  RiseOutlined,
} from "@ant-design/icons";

// 使用 Ant Design Icons 模拟合作伙伴 Logo
// 实际项目中应替换为 SVG/PNG 图片

const PARTNERS = [
  { name: "Ethereum", icon: <GlobalOutlined style={{ fontSize: 32 }} /> },
  { name: "Chainlink", icon: <BlockOutlined style={{ fontSize: 32 }} /> },
  { name: "Fireblocks", icon: <SafetyCertificateOutlined style={{ fontSize: 32 }} />, text: "Fireblocks" },
  { name: "Securitize Markets", icon: <BankOutlined style={{ fontSize: 32 }} />, text: "Securitize Markets" },
  { name: "BlackRock", icon: null, text: "BlackRock" },
  { name: "Coinbase Institutional", icon: null, text: "Coinbase Institutional" },
  { name: "Ondo Finance", icon: <RiseOutlined style={{ fontSize: 32 }} />, text: "Ondo Finance" },
  { name: "Circle", icon: null, text: "Circle" },
];

export default function Ticker() {
  return (
    <div className="w-full bg-white py-6 border-b border-gray-100 overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-6 mb-4 text-center">
        <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest">
          Trusted by Industry Leaders & Institutions
        </p>
      </div>
      
      {/* 滚动容器 */}
      <div className="relative w-full flex overflow-hidden group">
        {/* 滚动轨道 - 需要两份来实现无缝衔接 */}
        <div className="flex animate-scroll whitespace-nowrap hover:[animation-play-state:paused]">
          {PARTNERS.map((partner, index) => (
            <div
              key={`p1-${index}`}
              className="mx-8 md:mx-12 flex items-center justify-center opacity-40 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-300 cursor-pointer"
            >
              {partner.icon ? (
                <div className="text-gray-800 hover:text-[#1890ff] transition-colors">
                  {partner.icon}
                </div>
              ) : null}
              <span className={`text-xl font-bold text-gray-700 ${partner.icon ? 'ml-2' : ''}`}>
                {partner.text || partner.name}
              </span>
            </div>
          ))}
        </div>

        {/* 第二份副本 */}
        <div className="flex animate-scroll whitespace-nowrap hover:[animation-play-state:paused]" aria-hidden="true">
          {PARTNERS.map((partner, index) => (
            <div
              key={`p2-${index}`}
              className="mx-8 md:mx-12 flex items-center justify-center opacity-40 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-300 cursor-pointer"
            >
              {partner.icon ? (
                <div className="text-gray-800 hover:text-[#1890ff] transition-colors">
                  {partner.icon}
                </div>
              ) : null}
              <span className={`text-xl font-bold text-gray-700 ${partner.icon ? 'ml-2' : ''}`}>
                {partner.text || partner.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
