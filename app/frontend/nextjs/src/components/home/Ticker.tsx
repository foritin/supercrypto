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
    <div className="w-full bg-white py-20 border-b border-gray-100 overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-6 mb-12 text-center">
        <p className="text-[#1890ff] font-medium text-sm tracking-wide">
          Backed By Leading Institutions And Individuals
        </p>
      </div>
      
      {/* 滚动容器 */}
      <div className="relative w-full flex overflow-hidden group max-w-6xl mx-auto">
        {/* 渐变遮罩 - 增强融合感 */}
        <div className="absolute left-0 top-0 bottom-0 w-32 z-10 bg-gradient-to-r from-white to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 z-10 bg-gradient-to-l from-white to-transparent pointer-events-none" />

        {/* 滚动轨道 - 需要两份来实现无缝衔接 */}
        <div className="flex animate-scroll whitespace-nowrap hover:[animation-play-state:paused] items-center">
          {PARTNERS.map((partner, index) => (
            <div
              key={`p1-${index}`}
              className="mx-10 md:mx-16 flex items-center justify-center opacity-100 transition-all duration-300 cursor-pointer grayscale hover:grayscale-0"
            >
              {partner.icon ? (
                <div className="text-black hover:text-[#1890ff] transition-colors duration-300">
                  {partner.icon}
                </div>
              ) : null}
              <span className={`text-2xl font-bold text-black ${partner.icon ? 'ml-3' : ''}`}>
                {partner.text || partner.name}
              </span>
            </div>
          ))}
        </div>

        {/* 第二份副本 */}
        <div className="flex animate-scroll whitespace-nowrap hover:[animation-play-state:paused] items-center" aria-hidden="true">
          {PARTNERS.map((partner, index) => (
            <div
              key={`p2-${index}`}
              className="mx-10 md:mx-16 flex items-center justify-center opacity-100 transition-all duration-300 cursor-pointer grayscale hover:grayscale-0"
            >
              {partner.icon ? (
                <div className="text-black hover:text-[#1890ff] transition-colors duration-300">
                  {partner.icon}
                </div>
              ) : null}
              <span className={`text-2xl font-bold text-black ${partner.icon ? 'ml-3' : ''}`}>
                {partner.text || partner.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
