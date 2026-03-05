"use client";

import { Shield, Eye, Database, Share2, Lock, UserX, Cookie, Mail } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";

import { PageBadge } from "@/components/ui/page-badge";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

/**
 * ════════════════════════════════════════════════════════════════
 * PRIVACY POLICY PAGE - 隐私政策页面
 *
 * 功能: 详细说明平台如何收集、使用和保护用户数据
 * 内容: 数据收集、使用目的、数据共享、用户权利等
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

export function PrivacyContent() {
  const { t } = useTranslation();
  const headerRef = useScrollReveal();

  return (
    <div className="min-h-screen bg-bg-dark">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-primary/3 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-gold/3 rounded-full blur-[120px]" />
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
              icon={<Shield />}
              text={t("privacy.badge", "Your Privacy Matters")}
              className="mb-6"
            />

            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              {t("privacy.title", "Privacy Policy")}
            </h1>

            <p className="text-lg text-white/60 max-w-2xl mx-auto">
              {t(
                "privacy.subtitle",
                "This Privacy Policy explains how SuperCrypto collects, uses, and protects your personal information when you use our platform."
              )}
            </p>

            <p className="text-sm text-white/40 mt-6">
              {t("privacy.lastUpdated", "Last Updated")}: 2026-01-30
            </p>
          </section>

          {/* Introduction */}
          <div className="mb-12 p-6 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-4">
              <Lock className="flex-shrink-0 w-6 h-6 text-primary mt-1" />
              <div>
                <h3 className="text-white font-medium mb-2">
                  {t("privacy.intro.title", "Our Commitment")}
                </h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  {t(
                    "privacy.intro.content",
                    "At SuperCrypto, we take your privacy seriously. We are committed to protecting your personal information and being transparent about how we collect and use data. This policy applies to all information collected through our platform."
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-6">
            {/* 1. Information We Collect */}
            <Section
              icon={<Database className="w-5 h-5 text-primary" />}
              title={t("privacy.collect.title", "1. Information We Collect")}
              content={
                <>
                  <p className="font-medium text-white/90 mb-2">
                    {t("privacy.collect.p1", "We collect the following types of information:")}
                  </p>
                  
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <h4 className="text-white font-medium mb-2">
                        {t("privacy.collect.personal", "Personal Information")}
                      </h4>
                      <ul className="space-y-1 text-white/60">
                        <li>• {t("privacy.collect.personal1", "Name and contact details (email, phone)")}</li>
                        <li>• {t("privacy.collect.personal2", "Date of birth and nationality")}</li>
                        <li>• {t("privacy.collect.personal3", "Government-issued ID documents")}</li>
                        <li>• {t("privacy.collect.personal4", "Proof of address")}</li>
                      </ul>
                    </div>

                    <div className="p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <h4 className="text-white font-medium mb-2">
                        {t("privacy.collect.technical", "Technical Information")}
                      </h4>
                      <ul className="space-y-1 text-white/60">
                        <li>• {t("privacy.collect.technical1", "Wallet addresses and transaction data")}</li>
                        <li>• {t("privacy.collect.technical2", "IP address and device information")}</li>
                        <li>• {t("privacy.collect.technical3", "Browser type and operating system")}</li>
                        <li>• {t("privacy.collect.technical4", "Usage data and interaction logs")}</li>
                      </ul>
                    </div>
                  </div>
                </>
              }
            />

            {/* 2. How We Use Information */}
            <Section
              icon={<Eye className="w-5 h-5 text-primary" />}
              title={t("privacy.use.title", "2. How We Use Your Information")}
              content={
                <>
                  <p>{t("privacy.use.p1", "We use your information for the following purposes:")}</p>
                  <ul className="space-y-2 mt-3">
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("privacy.use.item1", "To provide and maintain our services")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("privacy.use.item2", "To verify your identity and comply with KYC/AML regulations")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("privacy.use.item3", "To process transactions and send notifications")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("privacy.use.item4", "To improve our platform and user experience")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("privacy.use.item5", "To detect and prevent fraud and security breaches")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("privacy.use.item6", "To comply with legal obligations")}</span>
                    </li>
                  </ul>
                </>
              }
            />

            {/* 3. Information Sharing */}
            <Section
              icon={<Share2 className="w-5 h-5 text-primary" />}
              title={t("privacy.sharing.title", "3. Information Sharing")}
              content={
                <>
                  <p>{t("privacy.sharing.p1", "We do not sell your personal information. We may share your data with:")}</p>
                  <ul className="space-y-2 mt-3">
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("privacy.sharing.item1", "Service providers who assist in platform operations")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("privacy.sharing.item2", "Regulatory authorities when required by law")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("privacy.sharing.item3", "Law enforcement in response to valid legal requests")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("privacy.sharing.item4", "Business partners with your explicit consent")}</span>
                    </li>
                  </ul>
                  <p className="mt-4 p-4 rounded-lg bg-gold/5 border border-gold/20 text-gold/90">
                    {t("privacy.sharing.notice", "All third parties are contractually bound to protect your data and use it only for specified purposes.")}
                  </p>
                </>
              }
            />

            {/* 4. Data Security */}
            <Section
              icon={<Lock className="w-5 h-5 text-primary" />}
              title={t("privacy.security.title", "4. Data Security")}
              content={
                <>
                  <p>{t("privacy.security.p1", "We implement industry-standard security measures to protect your information:")}</p>
                  <ul className="space-y-2 mt-3">
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("privacy.security.item1", "Encryption of data in transit and at rest")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("privacy.security.item2", "Multi-factor authentication for account access")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("privacy.security.item3", "Regular security audits and penetration testing")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("privacy.security.item4", "Strict access controls and employee training")}</span>
                    </li>
                  </ul>
                  <p className="mt-4">
                    {t("privacy.security.p2", "However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security of your data.")}
                  </p>
                </>
              }
            />

            {/* 5. Cookies */}
            <Section
              icon={<Cookie className="w-5 h-5 text-primary" />}
              title={t("privacy.cookies.title", "5. Cookies and Tracking")}
              content={
                <>
                  <p>{t("privacy.cookies.p1", "We use cookies and similar technologies to:")}</p>
                  <ul className="space-y-2 mt-3">
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("privacy.cookies.item1", "Remember your preferences and settings")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("privacy.cookies.item2", "Understand how you use our platform")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("privacy.cookies.item3", "Improve our services and user experience")}</span>
                    </li>
                  </ul>
                  <p className="mt-4">
                    {t("privacy.cookies.p2", "You can control cookies through your browser settings. Disabling cookies may affect the functionality of our platform.")}
                  </p>
                </>
              }
            />

            {/* 6. Your Rights */}
            <Section
              icon={<UserX className="w-5 h-5 text-primary" />}
              title={t("privacy.rights.title", "6. Your Rights")}
              content={
                <>
                  <p>{t("privacy.rights.p1", "Depending on your jurisdiction, you may have the following rights:")}</p>
                  <ul className="space-y-2 mt-3">
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span><strong className="text-white/90">{t("privacy.rights.access", "Access")}:</strong> {t("privacy.rights.accessDesc", "Request a copy of your personal data")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span><strong className="text-white/90">{t("privacy.rights.rectification", "Rectification")}:</strong> {t("privacy.rights.rectificationDesc", "Correct inaccurate information")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span><strong className="text-white/90">{t("privacy.rights.deletion", "Deletion")}:</strong> {t("privacy.rights.deletionDesc", "Request deletion of your data")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span><strong className="text-white/90">{t("privacy.rights.restriction", "Restriction")}:</strong> {t("privacy.rights.restrictionDesc", "Limit how we use your data")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span><strong className="text-white/90">{t("privacy.rights.portability", "Portability")}:</strong> {t("privacy.rights.portabilityDesc", "Transfer your data to another service")}</span>
                    </li>
                  </ul>
                  <p className="mt-4">
                    {t("privacy.rights.p2", "To exercise these rights, please contact us at")}{" "}
                    <a href="mailto:privacy@supercrypto.com" className="text-primary hover:underline">
                      privacy@supercrypto.com
                    </a>
                  </p>
                </>
              }
            />

            {/* 7. Data Retention */}
            <Section
              icon={<Database className="w-5 h-5 text-primary" />}
              title={t("privacy.retention.title", "7. Data Retention")}
              content={
                <>
                  <p>{t("privacy.retention.p1", "We retain your personal information for as long as necessary to:")}</p>
                  <ul className="space-y-2 mt-3">
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("privacy.retention.item1", "Provide our services to you")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("privacy.retention.item2", "Comply with legal and regulatory requirements")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{t("privacy.retention.item3", "Resolve disputes and enforce our agreements")}</span>
                    </li>
                  </ul>
                  <p className="mt-4">
                    {t("privacy.retention.p2", "When no longer needed, we securely delete or anonymize your data in accordance with our data retention policies.")}
                  </p>
                </>
              }
            />

            {/* 8. International Transfers */}
            <Section
              icon={<Share2 className="w-5 h-5 text-primary" />}
              title={t("privacy.international.title", "8. International Data Transfers")}
              content={
                <>
                  <p>{t("privacy.international.p1", "Your data may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws.")}</p>
                  <p className="mt-4">
                    {t("privacy.international.p2", "When we transfer data internationally, we ensure appropriate safeguards are in place, such as standard contractual clauses approved by relevant authorities.")}
                  </p>
                </>
              }
            />

            {/* Contact */}
            <div className="mt-12 p-6 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex items-start gap-4">
                <Mail className="flex-shrink-0 w-6 h-6 text-primary mt-1" />
                <div>
                  <h3 className="text-white font-medium mb-2">
                    {t("privacy.contact.title", "Contact Us")}
                  </h3>
                  <p className="text-white/60 text-sm mb-3">
                    {t("privacy.contact.content", "If you have any questions about this Privacy Policy or our data practices, please contact our Data Protection Officer at:")}
                  </p>
                  <a 
                    href="mailto:privacy@supercrypto.com" 
                    className="text-primary hover:underline text-sm"
                  >
                    privacy@supercrypto.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
