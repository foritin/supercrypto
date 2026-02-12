"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import {
  Shield,
  Lock,
  FileCheck,
  Wallet,
  Server,
  AlertTriangle,
  ExternalLink,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { PageBadge } from "@/components/ui/page-badge";

interface SecurityCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
}

const SecurityCard: React.FC<SecurityCardProps> = ({
  icon,
  title,
  description,
  features,
}) => {
  return (
    <div
      className={cn(
        "p-6 rounded-2xl",
        "bg-white/[0.02] border border-white/[0.06]",
        "hover:bg-white/[0.04] hover:border-white/[0.1]",
        "transition-all duration-300"
      )}
    >
      <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-white/60 text-sm mb-4">{description}</p>
      <ul className="space-y-2">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2 text-sm text-white/70">
            <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export function SecurityContent() {
  const { t } = useTranslation();
  const headerRef = useScrollReveal();

  const securityFeatures = [
    {
      icon: <Shield className="w-6 h-6 text-primary" />,
      title: t("security.features.audits.title", "Smart Contract Audits"),
      description: t("security.features.audits.desc", "All contracts audited by top firms"),
      features: [
        t("security.features.audits.f1", "CertiK Security Audit"),
        t("security.features.audits.f2", "OpenZeppelin Review"),
        t("security.features.audits.f3", "Continuous Monitoring"),
      ],
    },
    {
      icon: <Wallet className="w-6 h-6 text-primary" />,
      title: t("security.features.wallets.title", "Multi-Sig Wallets"),
      description: t("security.features.wallets.desc", "Require multiple approvals"),
      features: [
        t("security.features.wallets.f1", "Gnosis Safe Integration"),
        t("security.features.wallets.f2", "3-of-5 Signature Required"),
        t("security.features.wallets.f3", "Hardware Key Storage"),
      ],
    },
    {
      icon: <Server className="w-6 h-6 text-primary" />,
      title: t("security.features.infrastructure.title", "Secure Infrastructure"),
      description: t("security.features.infrastructure.desc", "Enterprise-grade security"),
      features: [
        t("security.features.infrastructure.f1", "AWS Cloud Security"),
        t("security.features.infrastructure.f2", "DDoS Protection"),
        t("security.features.infrastructure.f3", "24/7 Monitoring"),
      ],
    },
    {
      icon: <Lock className="w-6 h-6 text-primary" />,
      title: t("security.features.data.title", "Data Protection"),
      description: t("security.features.data.desc", "Your data is encrypted"),
      features: [
        t("security.features.data.f1", "AES-256 Encryption"),
        t("security.features.data.f2", "TLS 1.3 Protocol"),
        t("security.features.data.f3", "GDPR Compliant"),
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-bg-dark">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-primary/3 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 pt-24 pb-20">
        <div className="max-w-[1200px] mx-auto px-6">
          {/* Header */}
          <section
            ref={headerRef.ref as React.RefObject<HTMLElement>}
            className="text-center mb-16 scroll-reveal is-visible"
          >
            <PageBadge
              icon={<Shield />}
              text={t("security.badge", "Security First")}
              className="mb-6"
            />

            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              {t("security.title", "Your Security is Our Priority")}
            </h1>

            <p className="text-lg text-white/60 max-w-2xl mx-auto">
              {t(
                "security.subtitle",
                "We implement industry-leading security measures to protect your assets and data."
              )}
            </p>
          </section>

          {/* Security Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            {securityFeatures.map((feature, index) => (
              <SecurityCard key={index} {...feature} />
            ))}
          </div>

          {/* Audit Reports */}
          <div className="p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 rounded-xl bg-primary/10">
                <FileCheck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  {t("security.audits.title", "Audit Reports")}
                </h2>
                <p className="text-white/60">
                  {t("security.audits.desc", "View our comprehensive security audit reports")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { name: "CertiK", date: "2026-01-15", status: "Completed" },
                { name: "OpenZeppelin", date: "2026-01-10", status: "Completed" },
                { name: "Trail of Bits", date: "2026-02-01", status: "Scheduled" },
              ].map((audit, index) => (
                <div
                  key={index}
                  className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white">{audit.name}</span>
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        audit.status === "Completed"
                          ? "bg-primary/20 text-primary"
                          : "bg-gold/20 text-gold"
                      )}
                    >
                      {audit.status}
                    </span>
                  </div>
                  <p className="text-sm text-white/50">{audit.date}</p>
                  {audit.status === "Completed" && (
                    <button className="mt-3 text-sm text-primary hover:underline flex items-center gap-1">
                      {t("security.audits.view", "View Report")}
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bug Bounty */}
          <div className="mt-8 p-6 rounded-xl bg-gold/5 border border-gold/20">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-gold flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gold mb-2">
                  {t("security.bugBounty.title", "Bug Bounty Program")}
                </h3>
                <p className="text-white/60 text-sm mb-3">
                  {t(
                    "security.bugBounty.desc",
                    "We reward security researchers who help us identify vulnerabilities. Rewards up to $50,000."
                  )}
                </p>
                <a
                  href="mailto:security@supercrypto.com"
                  className="text-sm text-primary hover:underline"
                >
                  {t("security.bugBounty.link", "Learn More")} →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
