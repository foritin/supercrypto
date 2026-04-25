"use client";

import { useTranslation } from "react-i18next";

import { InfiniteMarquee } from "@/components/home";
import { FeaturesV3 } from "./components/features-v3";
import { HowItWorksV2 } from "./components/how-it-works-v2";
import { CalculatorSectionV2 } from "./components/calculator-section-v2";
import { CTASectionV2 } from "./components/cta-section-v2";
import { PartnersMarquee, INSTITUTION_PARTNERS, ROW1_PROVIDERS, ROW2_PROVIDERS } from "@/components/partners";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { cn } from "@/lib/utils";
import { Hero3D } from "./components/hero-3d";
import { WaveTransition } from "./components/wave-transition";
import { StatsBand } from "./components/stats-band";
import { AssetCardsV3 } from "./components/asset-cards-v3";

export default function DemoMainPage() {
  const { t } = useTranslation();

  const featuresSection = useScrollReveal();
  const howItWorksSection = useScrollReveal();
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

      {/* ─── All above-fold content shares one stacking context so the wave can reveal the canvas ─── */}
      <div className="relative z-10">
        <Hero3D />

        {/* ─── Transition: Dark → Light with 3D reveal ─── */}
        <WaveTransition direction="dark-to-light" reveal3D />

        {/* ─── Stats Band ─── */}
        <StatsBand />

        {/* ─── Live Opportunities ─── */}
        <AssetCardsV3 />

        {/* ─── Transition: Light → Dark ─── */}
        <WaveTransition direction="light-to-dark" />

        {/* ─── Partners Marquee ─── */}
        <PartnersMarquee
          title={t("home.partners.institutions.title")}
          subtitle={t("home.partners.institutions.subtitle")}
          partners={INSTITUTION_PARTNERS}
          speed={35}
          grayscale={true}
          pauseOnHover={true}
        />

        {/* ─── Features Section ─── */}
        <section
          ref={featuresSection.ref as React.RefObject<HTMLDivElement>}
          className={cn(
            "w-full scroll-reveal section-spacing px-6 flex justify-center",
            featuresSection.isVisible && "is-visible"
          )}
        >
          <div className="w-full max-w-[1200px] relative">
            <div className="text-center mb-[72px] fade-in-stagger">
              <span className="inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-white/40 font-medium mb-6">
                <span className="w-8 h-[1px] bg-white/20" />
                Features
                <span className="w-8 h-[1px] bg-white/20" />
              </span>
              <h2 className="font-display mt-4 mb-6 text-3xl md:text-4xl font-semibold text-white">
                {t("home.features.title")}
              </h2>
              <p className="text-lg text-white/50 max-w-[600px] mx-auto text-center">
                {t("home.features.subtitle")}
              </p>
            </div>
            <FeaturesV3 />
          </div>
        </section>

        {/* ─── How It Works Section ─── */}
        <section
          ref={howItWorksSection.ref as React.RefObject<HTMLDivElement>}
          className={cn(
            "w-full scroll-reveal section-spacing px-6 flex justify-center",
            howItWorksSection.isVisible && "is-visible"
          )}
        >
          <div className="w-full max-w-[1200px]">
            <div className="text-center mb-[72px] fade-in-stagger">
              <span className="text-[#D4AF37] text-sm font-semibold uppercase tracking-[2px]">
                How It Works
              </span>
              <h2 className="font-display mt-4 mb-4 text-3xl md:text-4xl font-semibold text-white">
                {t("home.howItWorks.title")}
              </h2>
              <p className="text-lg text-white/50 max-w-[600px] mx-auto text-center">
                {t("home.howItWorks.subtitle")}
              </p>
            </div>
            <HowItWorksV2 />
          </div>
        </section>

        {/* ─── Yield Calculator Section ─── */}
        <section
          ref={calculatorSection.ref as React.RefObject<HTMLDivElement>}
          className={cn(
            "w-full scroll-reveal section-spacing px-6 flex justify-center",
            calculatorSection.isVisible && "is-visible"
          )}
        >
          <div className="w-full max-w-[1200px]">
            <CalculatorSectionV2 />
          </div>
        </section>

        {/* ─── Ecosystem / Logo Wall Section ─── */}
        <section
          ref={ecosystemSection.ref as React.RefObject<HTMLDivElement>}
          className={cn(
            "scroll-reveal",
            ecosystemSection.isVisible && "is-visible"
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

        {/* ─── Final CTA Section ─── */}
        <CTASectionV2 />
      </div>
    </main>
  );
}
