"use client";

import { Rocket } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";
import { useTranslation } from "react-i18next";

import { BentoFeatures, CalculatorSection, InfiniteMarquee, HowItWorks } from "@/components/home";
import { PartnersMarquee, INSTITUTION_PARTNERS, ROW1_PROVIDERS, ROW2_PROVIDERS } from "@/components/partners";
import { RippleButton } from "@/components/ui/ripple-button";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { cn } from "@/lib/utils";
import { Hero3D } from "./demo_main/components/hero-3d";
import { WaveTransition } from "./demo_main/components/wave-transition";
import { StatsBand } from "./demo_main/components/stats-band";
import { AssetCardsV3 } from "./demo_main/components/asset-cards-v3";

export default function HomePage() {
  const { t } = useTranslation();
  const router = useRouter();

  // 滚动动画 hooks
  const featuresSection = useScrollReveal();
  const howItWorksSection = useScrollReveal();
  const ctaSection = useScrollReveal();

  // Phase 11: 新增 Section 的滚动动画
  const calculatorSection = useScrollReveal();
  const ecosystemSection = useScrollReveal();

  return (
    <main className="relative min-h-screen bg-[#0A0F1A] text-white overflow-x-hidden">
      {/* Subtle noise texture overlay */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10">
        {/* ─── Hero: Metal Sphere 3D ─── */}
        <Hero3D />

        {/* ─── Transition: Dark → Light ─── */}
        <WaveTransition direction="dark-to-light" />

        {/* ─── Stats Band ─── */}
        <StatsBand />

        {/* ─── Live Opportunities ─── */}
        <AssetCardsV3 />

        {/* ─── Transition: Light → Dark ─── */}
        <WaveTransition direction="light-to-dark" />

        {/* Partners Marquee - 金融机构 */}
        <PartnersMarquee
          title={t("home.partners.institutions.title")}
          subtitle={t("home.partners.institutions.subtitle")}
          partners={INSTITUTION_PARTNERS}
          speed={35}
          grayscale={true}
          pauseOnHover={true}
        />

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
              variant="primary"
              onClick={() => router.push("/assets")}
              className="h-[60px] px-14 text-lg font-semibold rounded-[14px] shadow-[0_0_40px_rgba(0,102,255,0.35)]"
            >
              <Rocket className="w-5 h-5 mr-2" />
              {t("home.finalCta.button")}
            </RippleButton>
          </div>
        </section>
      </div>
    </main>
  );
}
