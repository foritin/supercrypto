"use client";

import {
  AlertTriangle,
  TrendingDown,
  ShieldAlert,
  Scale,
  Cpu,
  Globe,
  Clock,
  FileText,
} from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";

import { useScrollReveal } from "@/hooks/use-scroll-reveal";

/**
 * ════════════════════════════════════════════════════════════════
 * RISK DISCLOSURE PAGE - 风险披露页面
 *
 * 功能: 详细列出所有投资风险，满足合规要求
 * 内容: 市场风险、技术风险、监管风险、RWA 特定风险等
 * ════════════════════════════════════════════════════════════════
 */

interface RiskSectionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  risks: string[];
  warning?: string;
}

const RiskSection: React.FC<RiskSectionProps> = ({
  icon,
  title,
  description,
  risks,
  warning,
}) => {
  return (
    <div className="p-6 md:p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white mb-2">{title}</h2>
          <p className="text-white/50 text-sm">{description}</p>
        </div>
      </div>

      {/* Risk List */}
      <ul className="space-y-3 mb-6">
        {risks.map((risk, index) => (
          <li key={index} className="flex items-start gap-3">
            <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-gold mt-2" />
            <span className="text-white/70 text-sm leading-relaxed">{risk}</span>
          </li>
        ))}
      </ul>

      {/* Warning Box */}
      {warning && (
        <div className="p-4 rounded-lg bg-gold/5 border border-gold/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="flex-shrink-0 w-5 h-5 text-gold mt-0.5" />
            <p className="text-gold/90 text-sm">{warning}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export function RiskDisclosureContent() {
  const { t } = useTranslation();
  const headerRef = useScrollReveal();
  const generalRef = useScrollReveal();
  const cryptoRef = useScrollReveal();
  const rwaRef = useScrollReveal();
  const regulatoryRef = useScrollReveal();
  const technicalRef = useScrollReveal();
  const conclusionRef = useScrollReveal();

  return (
    <div className="min-h-screen bg-bg-dark">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-gold/3 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-primary/3 rounded-full blur-[120px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 pt-24 pb-20">
        <div className="max-w-[900px] mx-auto px-6">
          {/* Header */}
          <section
            ref={headerRef.ref as React.RefObject<HTMLElement>}
            className="text-center mb-16 scroll-reveal is-visible"
          >
            {/* Alert Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/20 mb-6">
              <AlertTriangle className="w-4 h-4 text-gold" />
              <span className="text-sm text-gold font-medium">
                {t("riskDisclosure.badge", "Important Notice")}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              {t("riskDisclosure.title", "Risk Disclosure")}
            </h1>

            {/* Subtitle */}
            <p className="text-lg text-white/60 max-w-2xl mx-auto">
              {t(
                "riskDisclosure.subtitle",
                "Please read this document carefully. Cryptocurrency and RWA investments carry significant risks. You should not invest more than you can afford to lose."
              )}
            </p>

            {/* Last Updated */}
            <p className="text-sm text-white/40 mt-6">
              {t("riskDisclosure.lastUpdated", "Last Updated")}: 2026-01-30
            </p>
          </section>

          {/* Introduction */}
          <section className="mb-12 p-6 rounded-2xl bg-gold/5 border border-gold/20">
            <div className="flex items-start gap-4">
              <FileText className="flex-shrink-0 w-6 h-6 text-gold mt-1" />
              <div>
                <h2 className="text-lg font-semibold text-white mb-3">
                  {t("riskDisclosure.intro.title", "Notice to All Investors")}
                </h2>
                <p className="text-white/70 text-sm leading-relaxed mb-4">
                  {t(
                    "riskDisclosure.intro.p1",
                    "SuperCrypto provides a platform for investing in tokenized real-world assets (RWA). While we strive to offer secure and transparent investment opportunities, all investments carry inherent risks."
                  )}
                </p>
                <p className="text-white/70 text-sm leading-relaxed">
                  {t(
                    "riskDisclosure.intro.p2",
                    "By using our platform, you acknowledge that you have read, understood, and accept the risks outlined in this disclosure. If you do not understand these risks or are not prepared to accept them, you should not use our platform."
                  )}
                </p>
              </div>
            </div>
          </section>

          {/* Risk Sections */}
          <div className="space-y-6">
            {/* General Investment Risks */}
            <section ref={generalRef.ref as React.RefObject<HTMLElement>} className="scroll-reveal">
              <RiskSection
                icon={<TrendingDown className="w-6 h-6 text-gold" />}
                title={t("riskDisclosure.general.title", "General Investment Risks")}
                description={t(
                  "riskDisclosure.general.description",
                  "Fundamental risks applicable to all types of investments"
                )}
                risks={[
                  t(
                    "riskDisclosure.general.risk1",
                    "Market Risk: The value of investments can go down as well as up. Past performance is not indicative of future results."
                  ),
                  t(
                    "riskDisclosure.general.risk2",
                    "Liquidity Risk: You may not be able to sell your investments quickly or at a fair price, especially during market stress."
                  ),
                  t(
                    "riskDisclosure.general.risk3",
                    "Concentration Risk: Investing a large portion of your portfolio in a single asset class increases potential losses."
                  ),
                  t(
                    "riskDisclosure.general.risk4",
                    "Inflation Risk: Returns may not keep pace with inflation, reducing your purchasing power over time."
                  ),
                ]}
                warning={t(
                  "riskDisclosure.general.warning",
                  "You should only invest money you can afford to lose without affecting your standard of living."
                )}
              />
            </section>

            {/* Cryptocurrency Risks */}
            <section ref={cryptoRef.ref as React.RefObject<HTMLElement>} className="scroll-reveal">
              <RiskSection
                icon={<ShieldAlert className="w-6 h-6 text-gold" />}
                title={t("riskDisclosure.crypto.title", "Cryptocurrency-Specific Risks")}
                description={t(
                  "riskDisclosure.crypto.description",
                  "Risks unique to digital assets and blockchain-based investments"
                )}
                risks={[
                  t(
                    "riskDisclosure.crypto.risk1",
                    "Volatility: Cryptocurrency prices can fluctuate dramatically within short periods, potentially resulting in significant losses."
                  ),
                  t(
                    "riskDisclosure.crypto.risk2",
                    "Regulatory Changes: Government regulations may restrict or prohibit cryptocurrency trading, affecting asset values and liquidity."
                  ),
                  t(
                    "riskDisclosure.crypto.risk3",
                    "Security Breaches: Despite security measures, exchanges and wallets remain targets for hackers and cyber attacks."
                  ),
                  t(
                    "riskDisclosure.crypto.risk4",
                    "Irreversible Transactions: Blockchain transactions cannot be reversed. Sending funds to the wrong address results in permanent loss."
                  ),
                  t(
                    "riskDisclosure.crypto.risk5",
                    "Market Manipulation: Cryptocurrency markets may be subject to manipulation due to lower liquidity compared to traditional markets."
                  ),
                ]}
                warning={t(
                  "riskDisclosure.crypto.warning",
                  "Cryptocurrency investments are highly speculative and should represent only a small portion of your overall investment portfolio."
                )}
              />
            </section>

            {/* RWA Tokenization Risks */}
            <section ref={rwaRef.ref as React.RefObject<HTMLElement>} className="scroll-reveal">
              <RiskSection
                icon={<Globe className="w-6 h-6 text-gold" />}
                title={t("riskDisclosure.rwa.title", "RWA Tokenization Risks")}
                description={t(
                  "riskDisclosure.rwa.description",
                  "Specific risks related to real-world asset tokenization"
                )}
                risks={[
                  t(
                    "riskDisclosure.rwa.risk1",
                    "Asset-Backing Risk: The value of tokens depends on the underlying real-world assets, which may depreciate or become illiquid."
                  ),
                  t(
                    "riskDisclosure.rwa.risk2",
                    "Custody Risk: Third-party custodians hold the underlying assets. Their failure or misconduct could affect token value."
                  ),
                  t(
                    "riskDisclosure.rwa.risk3",
                    "Valuation Risk: Real-world assets may be difficult to value accurately, leading to potential mispricing of tokens."
                  ),
                  t(
                    "riskDisclosure.rwa.risk4",
                    "Default Risk: Issuers of tokenized assets may default on payments or obligations, resulting in partial or total loss."
                  ),
                  t(
                    "riskDisclosure.rwa.risk5",
                    "Redemption Risk: Redemption mechanisms may be suspended or delayed during market stress or technical issues."
                  ),
                ]}
                warning={t(
                  "riskDisclosure.rwa.warning",
                  "Tokenized assets involve additional layers of risk compared to direct ownership of underlying assets."
                )}
              />
            </section>

            {/* Regulatory Risks */}
            <section ref={regulatoryRef.ref as React.RefObject<HTMLElement>} className="scroll-reveal">
              <RiskSection
                icon={<Scale className="w-6 h-6 text-gold" />}
                title={t("riskDisclosure.regulatory.title", "Regulatory & Legal Risks")}
                description={t(
                  "riskDisclosure.regulatory.description",
                  "Risks arising from changing legal and regulatory frameworks"
                )}
                risks={[
                  t(
                    "riskDisclosure.regulatory.risk1",
                    "Jurisdiction Risk: Laws vary by jurisdiction. What is legal in one country may be restricted or prohibited in another."
                  ),
                  t(
                    "riskDisclosure.regulatory.risk2",
                    "Securities Laws: Tokenized assets may be classified as securities, subjecting them to additional regulations and restrictions."
                  ),
                  t(
                    "riskDisclosure.regulatory.risk3",
                    "Tax Uncertainty: Tax treatment of cryptocurrency and tokenized assets varies by jurisdiction and may change without notice."
                  ),
                  t(
                    "riskDisclosure.regulatory.risk4",
                    "KYC/AML Requirements: Failure to comply with identity verification requirements may result in account suspension or asset freezing."
                  ),
                ]}
                warning={t(
                  "riskDisclosure.regulatory.warning",
                  "You are responsible for ensuring your use of our platform complies with all applicable laws in your jurisdiction."
                )}
              />
            </section>

            {/* Technical Risks */}
            <section ref={technicalRef.ref as React.RefObject<HTMLElement>} className="scroll-reveal">
              <RiskSection
                icon={<Cpu className="w-6 h-6 text-gold" />}
                title={t("riskDisclosure.technical.title", "Technical Risks")}
                description={t(
                  "riskDisclosure.technical.description",
                  "Risks related to technology infrastructure and smart contracts"
                )}
                risks={[
                  t(
                    "riskDisclosure.technical.risk1",
                    "Smart Contract Vulnerabilities: Despite audits, smart contracts may contain undiscovered bugs or vulnerabilities that could be exploited."
                  ),
                  t(
                    "riskDisclosure.technical.risk2",
                    "Network Congestion: Blockchain networks may become congested, causing transaction delays or increased fees."
                  ),
                  t(
                    "riskDisclosure.technical.risk3",
                    "Oracle Failure: Price feeds and external data sources may malfunction, leading to incorrect valuations or liquidations."
                  ),
                  t(
                    "riskDisclosure.technical.risk4",
                    "Protocol Upgrades: Blockchain protocol changes may affect smart contract functionality or asset accessibility."
                  ),
                  t(
                    "riskDisclosure.technical.risk5",
                    "System Outages: Platform maintenance or unexpected technical issues may temporarily prevent access to your assets."
                  ),
                ]}
                warning={t(
                  "riskDisclosure.technical.warning",
                  "While we implement industry-standard security measures, no system is completely immune to technical failures or attacks."
                )}
              />
            </section>
          </div>

          {/* Conclusion */}
          <section
            ref={conclusionRef.ref as React.RefObject<HTMLElement>}
            className="mt-12 p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 scroll-reveal"
          >
            <div className="flex items-start gap-4">
              <Clock className="flex-shrink-0 w-6 h-6 text-primary mt-1" />
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">
                  {t("riskDisclosure.conclusion.title", "Before You Invest")}
                </h2>
                <ul className="space-y-3 text-white/70 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {t(
                      "riskDisclosure.conclusion.point1",
                      "Consider your investment objectives, financial situation, and risk tolerance carefully"
                    )}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {t(
                      "riskDisclosure.conclusion.point2",
                      "Seek independent financial, legal, and tax advice if you are uncertain"
                    )}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {t(
                      "riskDisclosure.conclusion.point3",
                      "Start with small amounts until you understand the risks involved"
                    )}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {t(
                      "riskDisclosure.conclusion.point4",
                      "Never invest more than you can afford to lose entirely"
                    )}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {t(
                      "riskDisclosure.conclusion.point5",
                      "Regularly review this disclosure as risks may change over time"
                    )}
                  </li>
                </ul>

                <div className="mt-6 pt-6 border-t border-white/10">
                  <p className="text-white/50 text-xs">
                    {t(
                      "riskDisclosure.conclusion.contact",
                      "If you have questions about these risks, please contact our support team before making any investment decisions."
                    )}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
