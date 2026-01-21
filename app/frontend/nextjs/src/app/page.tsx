"use client";

import React from "react";
import {
  Shield,
  Zap,
  Globe,
  Rocket,
  DollarSign,
  Trophy,
  Building2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { useScrollReveal, useScrollRevealDelay } from "@/hooks/useScrollReveal";
import { useMouseParallax } from "@/hooks/useMouseParallax";
import { useCountUp } from "@/hooks/useCountUp";
import { useMagneticButton } from "@/hooks/useMagneticButton";
import { useTypewriter } from "@/hooks/useTypewriter";
import { RippleButton } from "@/components/ui/RippleButton";
import { YieldCalculator } from "@/components/calculator/YieldCalculator";
import { Card, CardContent } from "@/components/ui/card";
import { PartnersMarquee, INSTITUTION_PARTNERS, ServiceProviders } from "@/components/partners";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const { t } = useTranslation();
  const router = useRouter();

  // 滚动动画 hooks
  const featuresSection = useScrollReveal();
  const howItWorksSection = useScrollReveal();
  const ctaSection = useScrollReveal();

  const feature1 = useScrollRevealDelay(100);
  const feature2 = useScrollRevealDelay(200);
  const feature3 = useScrollRevealDelay(300);

  const step1 = useScrollRevealDelay(100);
  const step2 = useScrollRevealDelay(200);
  const step3 = useScrollRevealDelay(300);

  // Phoenix Prototype: 视差效果
  const { offset: parallaxOffset } = useMouseParallax({ intensity: 0.02 });

  // Phoenix Prototype: 数字滚动动画
  const tvlCount = useCountUp(2500000, { prefix: '$', suffix: '+', decimals: 0, threshold: 0.1 });
  const usersCount = useCountUp(1200, { suffix: '+', decimals: 0, threshold: 0.1 });
  const assetsCount = useCountUp(15, { suffix: '+', decimals: 0, threshold: 0.1 });

  // Phoenix Prototype: 磁性按钮
  const primaryCtaRef = useMagneticButton({ threshold: 100, strength: 0.3 });
  const secondaryCtaRef = useMagneticButton({ threshold: 100, strength: 0.3 });

  // Phase 11: 打字机效果 - 纯 CSS 动画
  // 优化：使用长度接近的词，减少视觉位移
  const dynamicWords = t('home.dynamicWords', { returnObjects: true }) as string[];
  const { text: dynamicText, animationKey } = useTypewriter(
    Array.isArray(dynamicWords) ? dynamicWords : [],
    { wordDuration: 3000, loop: true }
  );

  // Phase 11: 新增 Section 的滚动动画
  const calculatorSection = useScrollReveal();
  const ecosystemSection = useScrollReveal();

  return (
    <>
      {/* Phoenix Prototype: 全局噪点纹理 */}
      <div className="noise-overlay" />

      {/* Hero Section with Video Background */}
      <section className="hero-section">
        {/* 视频背景 */}
        <div className="hero-video-container">
          <video
            className="hero-video"
            autoPlay
            muted
            loop
            playsInline
            poster="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070"
          >
            <source src="/1826904-hd_1920_1080_24fps.mp4" type="video/mp4" />
          </video>
        </div>

        {/* 视频遮罩层 */}
        <div className="hero-video-overlay" />

        {/* Hero Content */}
        <div
          className="hero-content fade-in-stagger relative z-[2]"
        >
          <div className="max-w-[1200px] mx-auto text-center py-[60px] px-6">
            {/* Upper section - fixed height container to prevent layout shift */}
            <div className="flex flex-col items-center gap-8">
              {/* Badge - Minimal Tag Style */}
              <div>
                <span
                  className="inline-flex items-center gap-2 py-2 px-5 bg-white/[0.06] backdrop-blur-sm rounded-lg text-[13px] font-medium tracking-[1.5px] uppercase text-white/70"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00D4AA] animate-pulse" />
                  {t("home.badge")}
                </span>
              </div>

              {/* Main Title - Two Lines */}
              <div>
                <h1
                  className="text-[clamp(48px,8vw,96px)] font-extrabold mb-0 leading-[1.1] tracking-[-0.02em] text-white text-center"
                >
                  {/* Line 1: Bridge + Dynamic Word */}
                  <span className="block whitespace-nowrap">
                    {t('home.heroTitle.unlock')}{' '}
                    <span
                      key={animationKey}
                      className="inline-block min-w-[280px] bg-gradient-to-r from-[#C9A962] via-[#E8D5A3] to-[#C9A962] bg-clip-text text-transparent typewriter-text"
                    >
                      {dynamicText}
                    </span>
                  </span>
                  {/* Line 2: to DeFi Yields */}
                  <span className="block">
                    {t('home.heroTitle.onWeb3')}
                  </span>
                </h1>
              </div>

              {/* Subtitle with highlighted keywords */}
              <p
                className="text-[20px] text-white/60 max-w-[700px] mx-auto leading-[1.7]"
              >
                <span className="text-white/80 font-medium">Institutional-grade security</span>
                {" · "}
                <span className="text-white/80 font-medium">Liquid</span>
                {" · "}
                <span className="text-white/80 font-medium">Transparent</span>
                <br />
                <span className="mt-2 inline-block">
                  Earn up to{" "}
                  <span className="bg-gradient-to-r from-[#C9A962] to-[#E8D5A3] bg-clip-text text-transparent font-semibold">
                    15% APY
                  </span>
                  {" "}backed by tokenized real-world assets.
                </span>
              </p>

              {/* CTA Buttons - Premium Web3 Design */}
              <div className="flex flex-wrap gap-4 justify-center mt-2">
                {/* Primary CTA - Premium gradient button */}
                <button
                  ref={primaryCtaRef}
                  onClick={() => router.push("/assets")}
                  className="group relative min-w-[180px] h-[56px] px-10 rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #00D4AA 0%, #00B896 100%)',
                    boxShadow: '0 4px 24px rgba(0, 212, 170, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                  }}
                >
                  {/* Shine overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  <span className="relative z-10 flex items-center justify-center gap-3 text-[16px] font-semibold text-[#0a0f0d]">
                    <Rocket className="w-5 h-5" />
                    {t("home.cta.primary")}
                  </span>
                </button>

                {/* Secondary CTA - Subtle outline button */}
                <button
                  ref={secondaryCtaRef}
                  onClick={() => router.push("/portfolio")}
                  className="group min-w-[180px] h-[56px] px-10 rounded-xl text-[16px] font-semibold text-white/85 bg-white/[0.04] border border-white/[0.15] backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.08] hover:border-white/25 hover:text-white active:scale-[0.98]"
                >
                  {t("home.cta.secondary")}
                </button>
              </div>
            </div>

            {/* Stats Section - Separate container, won't be affected by title changes */}
            <div
              className="flex justify-center items-center flex-wrap gap-20 w-full max-w-[1100px] mx-auto"
              style={{ marginTop: '120px' }}
            >
              {/* TVL Stat */}
              <div className="flex items-baseline gap-4">
                <span className="text-white/70 text-lg uppercase tracking-[1px]">
                  {t("home.stats.tvl")}
                </span>
                <span
                  ref={tvlCount.ref}
                  className="text-[#00D4AA] text-[38px] font-bold"
                >
                  {tvlCount.count}
                </span>
              </div>

              {/* Separator */}
              <div className="w-px h-12 bg-white/10" />

              {/* Users Stat */}
              <div className="flex items-baseline gap-4">
                <span className="text-white/70 text-lg uppercase tracking-[1px]">
                  {t("home.stats.users")}
                </span>
                <span
                  ref={usersCount.ref}
                  className="text-[#00D4AA] text-[38px] font-bold"
                >
                  {usersCount.count}
                </span>
              </div>

              {/* Separator */}
              <div className="w-px h-12 bg-white/10" />

              {/* Assets Stat */}
              <div className="flex items-baseline gap-4">
                <span className="text-white/70 text-lg uppercase tracking-[1px]">
                  {t("home.stats.assets")}
                </span>
                <span
                  ref={assetsCount.ref}
                  className="text-[#00D4AA] text-[38px] font-bold"
                >
                  {assetsCount.count}
                </span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Partners Marquee - 金融机构 */}
      <PartnersMarquee
        title={t("home.partners.institutions.title")}
        subtitle={t("home.partners.institutions.subtitle")}
        partners={INSTITUTION_PARTNERS}
        speed={35}
        grayscale={true}
        pauseOnHover={true}
      />

      {/* Features Section */}
      <section
        ref={featuresSection.ref as React.RefObject<HTMLDivElement>}
        className={cn(
          "w-full dot-pattern-bg scroll-reveal py-[100px] px-6 flex justify-center",
          featuresSection.isVisible && 'is-visible'
        )}
      >
        <div className="w-full max-w-[1200px] relative">
          <div
            className="text-center mb-[72px] fade-in-stagger"
          >
            <span
              className="text-[#00D4AA] text-sm font-semibold uppercase tracking-[2px]"
            >
              Features
            </span>
            <h2 className="mt-4 mb-4 text-3xl md:text-4xl font-bold text-white">
              {t("home.features.title")}
            </h2>
            <p
              className="text-lg text-white/65 max-w-[600px] mx-auto"
            >
              {t("home.features.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div
              ref={feature1.ref as React.RefObject<HTMLDivElement>}
              className={cn(
                "scroll-reveal",
                feature1.isVisible && 'is-visible'
              )}
            >
              <Card
                className="glass-card-enhanced h-full cursor-pointer"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col gap-5">
                    <div className="icon-box icon-box-primary">
                      <Shield
                        className="w-7 h-7 text-[#00D4AA]"
                      />
                    </div>
                    <h4 className="text-xl font-semibold text-white m-0">
                      {t("home.features.security.title")}
                    </h4>
                    <span
                      className="text-white/65 leading-[1.7]"
                    >
                      {t("home.features.security.description")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div
              ref={feature2.ref as React.RefObject<HTMLDivElement>}
              className={cn(
                "scroll-reveal",
                feature2.isVisible && 'is-visible'
              )}
            >
              <Card
                className="glass-card-enhanced h-full cursor-pointer"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col gap-5">
                    <div className="icon-box icon-box-gold">
                      <DollarSign
                        className="w-7 h-7 text-[#FFD700]"
                      />
                    </div>
                    <h4 className="text-xl font-semibold text-white m-0">
                      {t("home.features.returns.title")}
                    </h4>
                    <span
                      className="text-white/65 leading-[1.7]"
                    >
                      {t("home.features.returns.description")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div
              ref={feature3.ref as React.RefObject<HTMLDivElement>}
              className={cn(
                "scroll-reveal",
                feature3.isVisible && 'is-visible'
              )}
            >
              <Card
                className="glass-card-enhanced h-full cursor-pointer"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col gap-5">
                    <div className="icon-box icon-box-blue">
                      <Globe
                        className="w-7 h-7 text-[#1890ff]"
                      />
                    </div>
                    <h4 className="text-xl font-semibold text-white m-0">
                      {t("home.features.global.title")}
                    </h4>
                    <span
                      className="text-white/65 leading-[1.7]"
                    >
                      {t("home.features.global.description")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        ref={howItWorksSection.ref as React.RefObject<HTMLDivElement>}
        className={cn(
          "w-full hex-pattern-bg scroll-reveal py-[100px] px-6 flex justify-center",
          howItWorksSection.isVisible && 'is-visible'
        )}
      >
        <div className="w-full max-w-[1200px]">
          <div
            className="text-center mb-[72px] fade-in-stagger"
          >
            <span
              className="text-[#FFD700] text-sm font-semibold uppercase tracking-[2px]"
            >
              How It Works
            </span>
            <h2 className="mt-4 mb-4 text-3xl md:text-4xl font-bold text-white">
              {t("home.howItWorks.title")}
            </h2>
            <p
              className="text-lg text-white/65 max-w-[600px] mx-auto"
            >
              {t("home.howItWorks.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-start">
            {[
              {
                icon: <Building2 className="w-10 h-10" />,
                step: 1,
                titleKey: "home.howItWorks.step1.title",
                descKey: "home.howItWorks.step1.description",
                color: "#00D4AA",
              },
              {
                icon: <Zap className="w-10 h-10" />,
                step: 2,
                titleKey: "home.howItWorks.step2.title",
                descKey: "home.howItWorks.step2.description",
                color: "#FFD700",
              },
              {
                icon: <Trophy className="w-10 h-10" />,
                step: 3,
                titleKey: "home.howItWorks.step3.title",
                descKey: "home.howItWorks.step3.description",
                color: "#1890ff",
              },
            ].map((item, index) => {
              const stepRef = index === 0 ? step1 : index === 1 ? step2 : step3;
              return (
                <div
                  key={item.step}
                  ref={stepRef.ref as React.RefObject<HTMLDivElement>}
                  className={cn(
                    "scroll-reveal",
                    stepRef.isVisible && 'is-visible'
                  )}
                >
                  <div className="text-center relative">
                    {/* Connecting Line */}
                    {index < 2 && (
                      <div
                        className="hidden absolute top-11 left-[calc(50%+50px)] w-[calc(100%-100px)] h-0.5"
                        style={{
                          background: `linear-gradient(90deg, ${item.color}40 0%, rgba(255,255,255,0.1) 100%)`,
                        }}
                      />
                    )}
                    <div
                      className="w-[88px] h-[88px] bg-gradient-to-br from-[rgba(17,25,22,0.9)] to-[rgba(26,36,30,0.9)] rounded-3xl flex items-center justify-center mx-auto mb-7 relative transition-all duration-300"
                      style={{
                        border: `2px solid ${item.color}40`,
                        boxShadow: `0 0 40px ${item.color}15`,
                      }}
                    >
                      <span
                        className="absolute -top-3.5 -right-3.5 w-9 h-9 rounded-full flex items-center justify-center text-base font-bold text-[var(--bg-dark)]"
                        style={{
                          background: `linear-gradient(135deg, ${item.color} 0%, ${item.color}CC 100%)`,
                          boxShadow: `0 0 20px ${item.color}50`,
                        }}
                      >
                        {item.step}
                      </span>
                      {React.cloneElement(
                        item.icon as React.ReactElement<{
                          style?: React.CSSProperties;
                          className?: string;
                        }>,
                        {
                          style: { color: item.color },
                        }
                      )}
                    </div>
                    <h4 className="text-xl font-semibold text-white mb-3">
                      {t(item.titleKey)}
                    </h4>
                    <span
                      className="text-white/65 leading-[1.7]"
                    >
                      {t(item.descKey)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Phase 11: Yield Calculator Section */}
      <section
        ref={calculatorSection.ref as React.RefObject<HTMLDivElement>}
        className={cn(
          "w-full hex-pattern-bg scroll-reveal py-[100px] px-6 flex justify-center",
          calculatorSection.isVisible && 'is-visible'
        )}
      >
        <div className="w-full max-w-[1200px]">
          <div className="text-center mb-12 fade-in-stagger">
            <span
              className="text-[#FFD700] text-sm font-semibold tracking-[2px] uppercase"
            >
              Calculate Your Earnings
            </span>
            <h2 className="mt-4 mb-4 text-3xl md:text-4xl font-bold text-white">
              Yield Calculator
            </h2>
            <p
              className="text-lg text-white/65 max-w-[600px] mx-auto"
            >
              See your potential returns with our interactive yield calculator
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 justify-center">
            <div className="lg:col-span-8 lg:col-start-3">
              <YieldCalculator />
            </div>
          </div>
        </div>
      </section>

      {/* Phase 11: Ecosystem / Logo Wall Section - 区块链生态 */}
      <section
        ref={ecosystemSection.ref as React.RefObject<HTMLDivElement>}
        className={cn(
          "hex-pattern-bg scroll-reveal",
          ecosystemSection.isVisible && 'is-visible'
        )}
      >
        <ServiceProviders
          title={t("home.partners.blockchains.title")}
          subtitle={t("home.partners.blockchains.subtitle")}
        />
      </section>

      {/* Final CTA Section */}
      <section
        ref={ctaSection.ref as React.RefObject<HTMLDivElement>}
        className={cn(
          "cta-section scroll-reveal",
          ctaSection.isVisible && 'is-visible'
        )}
      >
        <div
          className="max-w-[800px] mx-auto text-center relative z-[1]"
        >
          <h2
            className="mb-5 text-[clamp(28px,4vw,42px)] font-bold text-white"
          >
            {t("home.finalCta.title")}
          </h2>
          <p
            className="text-lg text-white/70 mb-10 leading-[1.7]"
          >
            {t("home.finalCta.description")}
          </p>
          <RippleButton
            variant="default"
            onClick={() => router.push("/assets")}
            className="h-[60px] px-14 text-lg font-semibold rounded-[14px] shadow-[0_0_40px_rgba(0,212,170,0.35)]"
          >
            <Rocket className="w-5 h-5 mr-2" />
            {t("home.finalCta.button")}
          </RippleButton>
        </div>
      </section>
    </>
  );
}
