"use client";

import React from "react";
import { Building2, Link2, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import {
  Partner,
  INSTITUTION_PARTNERS,
  BLOCKCHAIN_PARTNERS,
} from "@/components/partners/partners-data";
import { PartnerDisclaimer } from "@/components/partners";
import Image from "next/image";

/**
 * ════════════════════════════════════════════════════════════════
 * PARTNERS PAGE CONTENT - 合作伙伴展示页面 (Client Component)
 *
 * 功能: 展示所有合作伙伴（金融机构 + 区块链生态）
 * 合规: 包含完整免责声明，明确 Logo 使用目的
 * ════════════════════════════════════════════════════════════════
 */

interface PartnerCardProps {
  partner: Partner;
}

const PartnerCard: React.FC<PartnerCardProps> = ({ partner }) => {
  return (
    <a
      href={partner.website || `#${partner.id}`}
      target={partner.website ? "_blank" : undefined}
      rel={partner.website ? "noopener noreferrer" : undefined}
      className="group relative flex flex-col items-center p-6 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-[#00D4AA]/30 transition-all duration-300 hover:bg-white/[0.05]"
    >
      {/* Logo Container */}
      <div className="relative w-full h-16 flex items-center justify-center mb-4">
        <Image
          src={partner.logo}
          alt={partner.name}
          width={140}
          height={50}
          className="max-w-[140px] max-h-[50px] object-contain opacity-70 group-hover:opacity-100 transition-opacity duration-300 filter brightness-0 invert"
        />
      </div>

      {/* Partner Name */}
      <h3 className="text-white/80 text-sm font-medium group-hover:text-white transition-colors">
        {partner.name}
      </h3>

      {/* External Link Indicator */}
      {partner.website && (
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink className="w-4 h-4 text-[#00D4AA]" />
        </div>
      )}

      {/* Hover Glow Effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-[#00D4AA]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </a>
  );
};

export function PartnersPageContent() {
  const { t } = useTranslation();
  const headerRef = useScrollReveal();
  const institutionsRef = useScrollReveal();
  const blockchainRef = useScrollReveal();
  const disclaimerRef = useScrollReveal();

  return (
    <div className="min-h-screen bg-[#0A0F0D]">
      {/* Background Gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#00D4AA]/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#FFD700]/3 rounded-full blur-[120px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 pt-24 pb-20">
        {/* Header Section */}
        <section
          ref={headerRef.ref as React.RefObject<HTMLElement>}
          className="max-w-[1200px] mx-auto px-6 mb-16 scroll-reveal is-visible"
        >
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00D4AA]/10 border border-[#00D4AA]/20 mb-6">
              <Building2 className="w-4 h-4 text-[#00D4AA]" />
              <span className="text-sm text-[#00D4AA] font-medium">
                {t("partners.badge", "Industry Infrastructure")}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              {t("partners.title", "Built on Proven Technologies")}
            </h1>

            {/* Subtitle */}
            <p className="text-lg text-white/60 max-w-2xl mx-auto">
              {t(
                "partners.subtitle",
                "We collaborate with leading financial institutions and blockchain networks to deliver institutional-grade RWA investment solutions."
              )}
            </p>
          </div>
        </section>

        {/* Financial Institutions Section */}
        <section
          ref={institutionsRef.ref as React.RefObject<HTMLElement>}
          className="max-w-[1200px] mx-auto px-6 mb-20 scroll-reveal"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-[#FFD700]/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[#FFD700]" />
            </div>
            <h2 className="text-2xl font-semibold text-white">
              {t("partners.institutions.title", "Financial Institutions")}
            </h2>
          </div>

          <p className="text-white/50 mb-8 max-w-3xl">
            {t(
              "partners.institutions.description",
              "Leading asset managers and financial institutions that shape the RWA ecosystem. Logo usage is for identification and informational purposes only."
            )}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {INSTITUTION_PARTNERS.map((partner) => (
              <PartnerCard key={partner.id} partner={partner} />
            ))}
          </div>
        </section>

        {/* Blockchain Ecosystem Section */}
        <section
          ref={blockchainRef.ref as React.RefObject<HTMLElement>}
          className="max-w-[1200px] mx-auto px-6 mb-20 scroll-reveal"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-[#00D4AA]/10 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-[#00D4AA]" />
            </div>
            <h2 className="text-2xl font-semibold text-white">
              {t("partners.blockchain.title", "Blockchain Ecosystem")}
            </h2>
          </div>

          <p className="text-white/50 mb-8 max-w-3xl">
            {t(
              "partners.blockchain.description",
              "Layer-1 and Layer-2 blockchain networks that enable secure, scalable RWA tokenization and settlement."
            )}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {BLOCKCHAIN_PARTNERS.map((partner) => (
              <PartnerCard key={partner.id} partner={partner} />
            ))}
          </div>
        </section>

        {/* Full Disclaimer Section */}
        <section
          ref={disclaimerRef.ref as React.RefObject<HTMLElement>}
          className="max-w-[1200px] mx-auto px-6 scroll-reveal"
        >
          <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
            <PartnerDisclaimer variant="full" className="text-center" />
          </div>
        </section>
      </div>
    </div>
  );
}
