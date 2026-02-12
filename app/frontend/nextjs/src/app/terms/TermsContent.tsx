"use client";

import React from "react";
import { FileText, Scale, Users, Shield, AlertCircle, Globe, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { PageBadge } from "@/components/ui/page-badge";

/**
 * ════════════════════════════════════════════════════════════════
 * TERMS OF SERVICE PAGE - 服务条款页面
 *
 * 功能: 详细列出用户使用平台的条款和条件
 * 内容: 用户责任、平台服务、免责声明、争议解决等
 * ════════════════════════════════════════════════════════════════
 */

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  content: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ icon, title, content }) => {
  return (
    <section className="mb-10 scroll-reveal">
      <div className="flex items-start gap-4 mb-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
        <h2 className="text-xl font-semibold text-white mt-2">{title}</h2>
      </div>
      <div className="pl-14 text-white/70 text-sm leading-relaxed space-y-4">
        {content}
      </div>
    </section>
  );
};

export function TermsContent() {
  const { t } = useTranslation();
  const headerRef = useScrollReveal();

  return (
    <div className="min-h-screen bg-bg-dark">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary/3 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-gold/3 rounded-full blur-[120px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 pt-24 pb-20">
        <div className="max-w-[800px] mx-auto px-6">
          {/* Header */}
          <section
            ref={headerRef.ref as React.RefObject<HTMLElement>}
            className="text-center mb-16 scroll-reveal is-visible"
          >
            <PageBadge
              icon={<Scale />}
              text={t("terms.badge", "Legal Document")}
              className="mb-6"
            />

            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              {t("terms.title", "Terms of Service")}
            </h1>

            <p className="text-lg text-white/60 max-w-2xl mx-auto">
              {t(
                "terms.subtitle",
                "These terms govern your use of the SuperCrypto platform. By accessing or using our services, you agree to be bound by these terms."
              )}
            </p>

            <p className="text-sm text-white/40 mt-6">
              {t("terms.lastUpdated", "Last Updated")}: 2026-01-30
            </p>
          </section>

          {/* Acceptance Notice */}
          <div className="mb-12 p-6 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-4">
              <FileText className="flex-shrink-0 w-6 h-6 text-primary mt-1" />
              <div>
                <h3 className="text-white font-medium mb-2">
                  {t("terms.acceptance.title", "Acceptance of Terms")}
                </h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  {t(
                    "terms.acceptance.content",
                    "By accessing or using the SuperCrypto platform, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, you must not use our services."
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-6">
            {/* 1. Definitions */}
            <Section
              icon={<FileText className="w-5 h-5 text-primary" />}
              title={t("terms.definitions.title", "1. Definitions")}
              content={
                <>
                  <p>{t("terms.definitions.p1", "In these Terms:")}</p>
                  <ul className="space-y-2 mt-3">
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>
                        <strong className="text-white/90">"Platform"</strong>{" "}
                        {t("terms.definitions.platform", "refers to the SuperCrypto website, applications, and all related services.")}
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>
                        <strong className="text-white/90">"User"</strong>{" "}
                        {t("terms.definitions.user", "refers to any individual or entity accessing or using the Platform.")}
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>
                        <strong className="text-white/90">"Assets"</strong>{" "}
                        {t("terms.definitions.assets", "refers to tokenized real-world assets available on the Platform.")}
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>
                        <strong className="text-white/90">"Wallet"</strong>{" "}
                        {t("terms.definitions.wallet", "refers to your digital wallet used to interact with the Platform.")}
                      </span>
                    </li>
                  </ul>
                </>
              }
            />

            {/* 2. Eligibility */}
            <Section
              icon={<Users className="w-5 h-5 text-primary" />}
              title={t("terms.eligibility.title", "2. Eligibility")}
              content={
                <>
                  <p>{t("terms.eligibility.p1", "To use our Platform, you must:")}</p>
                  <ul className="space-y-2 mt-3">
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("terms.eligibility.item1", "Be at least 18 years of age or the legal age of majority in your jurisdiction")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("terms.eligibility.item2", "Have the legal capacity to enter into binding contracts")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("terms.eligibility.item3", "Not be prohibited from using our services under applicable laws")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("terms.eligibility.item4", "Complete identity verification (KYC) as required")}</span>
                    </li>
                  </ul>
                  <p className="mt-4 p-4 rounded-lg bg-gold/5 border border-gold/20 text-gold/90">
                    {t("terms.eligibility.notice", "We reserve the right to suspend or terminate accounts that do not meet these eligibility requirements.")}
                  </p>
                </>
              }
            />

            {/* 3. Services */}
            <Section
              icon={<Wallet className="w-5 h-5 text-primary" />}
              title={t("terms.services.title", "3. Our Services")}
              content={
                <>
                  <p>{t("terms.services.p1", "SuperCrypto provides a platform for:")}</p>
                  <ul className="space-y-2 mt-3">
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("terms.services.item1", "Accessing information about tokenized real-world assets")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("terms.services.item2", "Investing in RWA tokens through blockchain transactions")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("terms.services.item3", "Managing your investment portfolio")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("terms.services.item4", "Receiving yield distributions from investments")}</span>
                    </li>
                  </ul>
                  <p className="mt-4">
                    {t("terms.services.p2", "We do not provide investment advice, and nothing on the Platform should be construed as a recommendation to buy, sell, or hold any asset.")}
                  </p>
                </>
              }
            />

            {/* 4. User Responsibilities */}
            <Section
              icon={<Shield className="w-5 h-5 text-primary" />}
              title={t("terms.responsibilities.title", "4. User Responsibilities")}
              content={
                <>
                  <p>{t("terms.responsibilities.p1", "As a user, you agree to:")}</p>
                  <ul className="space-y-2 mt-3">
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("terms.responsibilities.item1", "Maintain the security of your wallet and private keys")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("terms.responsibilities.item2", "Provide accurate and complete information during registration")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("terms.responsibilities.item3", "Comply with all applicable laws and regulations")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("terms.responsibilities.item4", "Not use the Platform for illegal activities")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("terms.responsibilities.item5", "Not attempt to gain unauthorized access to our systems")}</span>
                    </li>
                  </ul>
                </>
              }
            />

            {/* 5. Risks */}
            <Section
              icon={<AlertCircle className="w-5 h-5 text-primary" />}
              title={t("terms.risks.title", "5. Investment Risks")}
              content={
                <>
                  <p>{t("terms.risks.p1", "You acknowledge and understand that:")}</p>
                  <ul className="space-y-2 mt-3">
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("terms.risks.item1", "All investments carry risk, and you may lose some or all of your invested capital")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("terms.risks.item2", "Past performance does not guarantee future results")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("terms.risks.item3", "Cryptocurrency and tokenized assets are highly volatile")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("terms.risks.item4", "You should only invest what you can afford to lose")}</span>
                    </li>
                  </ul>
                  <p className="mt-4">
                    {t("terms.risks.p2", "For a complete description of risks, please refer to our")}{" "}
                    <a href="/risk-disclosure" className="text-primary hover:underline">
                      {t("terms.risks.link", "Risk Disclosure")}
                    </a>{" "}
                    {t("terms.risks.p3", "document.")}
                  </p>
                </>
              }
            />

            {/* 6. Limitation of Liability */}
            <Section
              icon={<Scale className="w-5 h-5 text-primary" />}
              title={t("terms.liability.title", "6. Limitation of Liability")}
              content={
                <>
                  <p>{t("terms.liability.p1", "To the maximum extent permitted by law:")}</p>
                  <ul className="space-y-2 mt-3">
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("terms.liability.item1", "We are not liable for any loss of profits, revenue, or data")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("terms.liability.item2", "We are not responsible for losses due to market volatility or smart contract failures")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("terms.liability.item3", "Our total liability is limited to the amount you paid to use our services in the 12 months preceding the claim")}</span>
                    </li>
                  </ul>
                </>
              }
            />

            {/* 7. Governing Law */}
            <Section
              icon={<Globe className="w-5 h-5 text-primary" />}
              title={t("terms.governing.title", "7. Governing Law")}
              content={
                <>
                  <p>{t("terms.governing.p1", "These Terms are governed by and construed in accordance with the laws of [Jurisdiction], without regard to its conflict of law provisions.")}</p>
                  <p className="mt-4">
                    {t("terms.governing.p2", "Any disputes arising from these Terms or your use of the Platform shall be resolved through arbitration in [Jurisdiction] in accordance with the rules of [Arbitration Body].")}
                  </p>
                </>
              }
            />

            {/* 8. Changes */}
            <Section
              icon={<FileText className="w-5 h-5 text-primary" />}
              title={t("terms.changes.title", "8. Changes to Terms")}
              content={
                <>
                  <p>{t("terms.changes.p1", "We may update these Terms from time to time. We will notify you of any material changes by:")}</p>
                  <ul className="space-y-2 mt-3">
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("terms.changes.item1", "Posting the updated Terms on the Platform")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("terms.changes.item2", "Sending an email to your registered address")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("terms.changes.item3", "Displaying a notice when you access the Platform")}</span>
                    </li>
                  </ul>
                  <p className="mt-4">
                    {t("terms.changes.p2", "Your continued use of the Platform after changes constitutes acceptance of the updated Terms.")}
                  </p>
                </>
              }
            />

            {/* Contact */}
            <div className="mt-12 p-6 rounded-xl bg-primary/5 border border-primary/20">
              <h3 className="text-white font-medium mb-3">
                {t("terms.contact.title", "Contact Us")}
              </h3>
              <p className="text-white/60 text-sm">
                {t("terms.contact.content", "If you have any questions about these Terms, please contact us at")}{" "}
                <a href="mailto:legal@supercrypto.com" className="text-primary hover:underline">
                  legal@supercrypto.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
