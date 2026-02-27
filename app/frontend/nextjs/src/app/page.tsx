"use client";

import React from "react";
import { Rocket } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { useMouseParallax } from "@/hooks/use-mouse-parallax";
import { useCountUp } from "@/hooks/use-count-up";
import { useMagneticButton } from "@/hooks/use-magnetic-button";
import { useTypewriter } from "@/hooks/use-typewriter";
import { RippleButton } from "@/components/ui/ripple-button";
import { PartnersMarquee, INSTITUTION_PARTNERS, ROW1_PROVIDERS, ROW2_PROVIDERS } from "@/components/partners";
import { StatsBar, FeaturedAssets, BentoFeatures, CalculatorSection, InfiniteMarquee, HowItWorks } from "@/components/home";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const { t } = useTranslation();
  const router = useRouter();

  // 滚动动画 hooks
  const featuresSection = useScrollReveal();
  const howItWorksSection = useScrollReveal();
  const ctaSection = useScrollReveal();

  // Phoenix Prototype: 视差效果
  useMouseParallax({ intensity: 0.02 });

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

      {/* Hero Section with Video/Static Background */}
      <section className="hero-section">
        {/* 背景 - 移动端使用静态图片，桌面端使用视频 */}
        <div className="hero-video-container">
          {/* 背景: 深色渐变 */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0F1A] via-[#0d1320] to-[#0A0F1A]" />
          
          {/* 装饰性网格背景 */}
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(0, 102, 255, 0.5) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(0, 102, 255, 0.5) 1px, transparent 1px)`,
              backgroundSize: '50px 50px',
            }}
          />
          
          {/* 桌面端: 视频背景 */}
          <video
            className="hero-video hidden md:block opacity-65"
            autoPlay
            muted
            loop
            playsInline
          >
            <source src="/1826904-hd_1920_1080_24fps.mp4" type="video/mp4" />
          </video>
        </div>

        {/* 背景遮罩层 */}
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
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  {t("home.badge")}
                </span>
              </div>

              {/* Main Title - Two Lines */}
              {/* Requirements: 1.1 - 渐变色标题 */}
              <div>
                <h1
                  className="font-display text-[clamp(48px,8vw,96px)] font-bold mb-0 leading-[1.1] tracking-[-0.02em] text-center"
                >
                  {/* Line 1: Bridge + Dynamic Word - 古铜金渐变 */}
                  <span className="block whitespace-nowrap">
                    {t('home.heroTitle.unlock')}{' '}
                    <span
                      key={animationKey}
                      className="inline-block min-w-[280px] bg-gradient-to-r from-[#D4AF37] via-[#E5C76B] to-[#D4AF37] bg-clip-text text-transparent typewriter-text"
                    >
                      {dynamicText}
                    </span>
                  </span>
                  {/* Line 2: to DeFi Yields - 深海蓝渐变 */}
                  <span className="block bg-gradient-to-r from-[#0066FF] via-[#3385FF] to-[#0066FF] bg-clip-text text-transparent">
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
                  <span className="bg-gradient-to-r from-[#D4AF37] to-[#E5C76B] bg-clip-text text-transparent font-semibold">
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
                    background: 'linear-gradient(135deg, #0066FF 0%, #0052CC 100%)',
                    boxShadow: '0 4px 24px rgba(0, 102, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                  }}
                >
                  {/* Shine overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  <span className="relative z-10 flex items-center justify-center gap-3 text-[16px] font-semibold text-bg-dark">
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

            {/* Stats Section - 使用 StatsBar 组件 */}
            {/* Requirements: 1.2, 1.4 */}
            <div className="mt-[180px] flex justify-center">
              <StatsBar
                stats={[
                  { label: t("home.stats.tvl"), value: tvlCount.count, ref: tvlCount.ref },
                  { label: t("home.stats.users"), value: usersCount.count, ref: usersCount.ref },
                  { label: t("home.stats.assets"), value: assetsCount.count, ref: assetsCount.ref },
                ]}
              />
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

      {/* Featured Assets Section - Requirements: 2.1, 2.6 */}
      <section className="w-full section-spacing px-6">
        <FeaturedAssets />
      </section>

      {/* Features Section - Bento Grid Layout */}
      {/* Requirements: 3.1, 3.2, 3.3, 3.4, 3.5 */}
      <section
        ref={featuresSection.ref as React.RefObject<HTMLDivElement>}
        className={cn(
          "w-full dot-pattern-bg scroll-reveal section-spacing px-6 flex justify-center",
          featuresSection.isVisible && 'is-visible'
        )}
      >
        <div className="w-full max-w-[1200px] relative">
          <div className="text-center mb-[72px] fade-in-stagger">
            <span className="text-primary text-sm font-semibold uppercase tracking-[2px]">
              Features
            </span>
            <h2 className="font-display mt-4 mb-6 text-3xl md:text-4xl font-semibold text-white">
              {t("home.features.title")}
            </h2>
            <p className="text-lg text-white/65 max-w-[600px] mx-auto text-center">
              {t("home.features.subtitle")}
            </p>
          </div>

          <BentoFeatures />
        </div>
      </section>

      {/* How It Works Section - 横向时间轴 */}
      {/* Requirements: 6.1, 6.2, 6.3 */}
      <section
        ref={howItWorksSection.ref as React.RefObject<HTMLDivElement>}
        className={cn(
          "w-full hex-pattern-bg scroll-reveal section-spacing px-6 flex justify-center",
          howItWorksSection.isVisible && 'is-visible'
        )}
      >
        <div className="w-full max-w-[1200px]">
          <div className="text-center mb-[72px] fade-in-stagger">
            <span className="text-gold text-sm font-semibold uppercase tracking-[2px]">
              How It Works
            </span>
            <h2 className="font-display mt-4 mb-4 text-3xl md:text-4xl font-semibold text-white">
              {t("home.howItWorks.title")}
            </h2>
            <p className="text-lg text-white/65 max-w-[600px] mx-auto text-center">
              {t("home.howItWorks.subtitle")}
            </p>
          </div>

          <HowItWorks />
        </div>
      </section>

      {/* Yield Calculator Section - Split Layout */}
      {/* Requirements: 4.1, 4.2, 4.3, 4.4 */}
      <section
        ref={calculatorSection.ref as React.RefObject<HTMLDivElement>}
        className={cn(
          "w-full hex-pattern-bg scroll-reveal section-spacing px-6 flex justify-center",
          calculatorSection.isVisible && 'is-visible'
        )}
      >
        <div className="w-full max-w-[1200px]">
          <CalculatorSection />
        </div>
      </section>

      {/* Ecosystem / Logo Wall Section - 区块链生态 */}
      {/* Requirements: 5.1, 5.2, 5.3, 5.4, 5.5 */}
      <section
        ref={ecosystemSection.ref as React.RefObject<HTMLDivElement>}
        className={cn(
          "hex-pattern-bg scroll-reveal",
          ecosystemSection.isVisible && 'is-visible'
        )}
      >
        <InfiniteMarquee
          row1Items={ROW1_PROVIDERS}
          row2Items={ROW2_PROVIDERS}
          title={t("home.partners.blockchains.title")}
          subtitle={t("home.partners.blockchains.subtitle")}
          speed={35}
          pauseOnHover={true}
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
            className="font-display mb-5 text-[clamp(28px,4vw,42px)] font-semibold text-white"
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
            className="h-[60px] px-14 text-lg font-semibold rounded-[14px] shadow-[0_0_40px_rgba(0,102,255,0.35)]"
          >
            <Rocket className="w-5 h-5 mr-2" />
            {t("home.finalCta.button")}
          </RippleButton>
        </div>
      </section>
    </>
  );
}
