"use client";

/**
 * StepRiskAssessment - 步骤 3: 风险评估
 *
 * 展示完整的风险评估信息:
 * - 风险评分 (0-100) 和风险等级 (低/中/高/极高)
 * - 风险因素列表及各因素分值
 * - PEP 匹配警告 (醒目警告样式)
 * - 制裁名单匹配 (醒目错误样式)
 */

import { useTranslation } from "react-i18next";
import {
  Shield,
  Warning,
  ShieldWarning,
} from "@phosphor-icons/react";
import { SectionCard } from "@/components/ui";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { KycDetail, RiskLevel } from "@/services/admin-kyc";

export interface StepRiskAssessmentProps {
  kycDetail: KycDetail;
}

/** 风险等级配置 (labelKey 为 i18n key) */
const RISK_CONFIG: Record<
  RiskLevel,
  {
    color: string;
    bgColor: string;
    borderColor: string;
    labelKey: string;
    icon: React.ElementType;
  }
> = {
  low: {
    color: "text-emerald-400",
    bgColor: "rgba(82, 196, 26, 0.1)",
    borderColor: "rgba(82, 196, 26, 0.3)",
    labelKey: "admin.kyc.stepper.riskLow",
    icon: Shield,
  },
  medium: {
    color: "text-yellow-400",
    bgColor: "rgba(250, 173, 20, 0.1)",
    borderColor: "rgba(250, 173, 20, 0.3)",
    labelKey: "admin.kyc.stepper.riskMedium",
    icon: Warning,
  },
  high: {
    color: "text-orange-400",
    bgColor: "rgba(255, 140, 0, 0.1)",
    borderColor: "rgba(255, 140, 0, 0.3)",
    labelKey: "admin.kyc.stepper.riskHigh",
    icon: ShieldWarning,
  },
  critical: {
    color: "text-red-400",
    bgColor: "rgba(255, 77, 79, 0.1)",
    borderColor: "rgba(255, 77, 79, 0.3)",
    labelKey: "admin.kyc.stepper.riskCritical",
    icon: ShieldWarning,
  },
};

export function StepRiskAssessment({ kycDetail }: StepRiskAssessmentProps) {
  const { t } = useTranslation();
  const { kyc, risk_details } = kycDetail;
  const riskLevel = kyc.risk_level ?? "low";
  const riskScore = kyc.risk_score ?? 0;
  const config = RISK_CONFIG[riskLevel];
  const Icon = config.icon;

  return (
    <div className="space-y-4">
      {/* 风险评分 */}
      <div
        className="flex items-center gap-4 p-4 rounded-xl"
        style={{
          background: config.bgColor,
          border: `1px solid ${config.borderColor}`,
        }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: config.bgColor }}
        >
          <Icon
            weight="fill"
            className="w-8 h-8"
            style={{ color: config.color.replace("text-", "") }}
          />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-white">{riskScore}</span>
            <span className="text-white/50">/ 100</span>
          </div>
          <span
            className="text-sm"
            style={{ color: config.color.replace("text-", "") }}
          >
            {t(config.labelKey)}
          </span>
        </div>
      </div>

      {/* 风险因素列表 */}
      {risk_details?.factors && risk_details.factors.length > 0 && (
        <SectionCard
          title={t("admin.kyc.stepper.riskFactors")}
          icon={<Warning weight="fill" className="w-4 h-4" />}
          className="border-white/[0.08]"
        >
          <div className="space-y-2">
            {risk_details.factors.map((factor, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-white/5 rounded"
              >
                <span className="text-sm text-white/70">
                  {factor.description}
                </span>
                <span
                  className={`text-sm font-medium ${
                    factor.score > 50
                      ? "text-red-400"
                      : factor.score > 25
                        ? "text-yellow-400"
                        : "text-emerald-400"
                  }`}
                >
                  +{factor.score}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* PEP 匹配警告 */}
      {risk_details?.pep_matches && risk_details.pep_matches.length > 0 && (
        <Alert className="bg-amber-500/10 border-amber-500/30 rounded-xl">
          <Warning weight="fill" className="w-4 h-4 text-amber-400" />
          <AlertDescription className="text-amber-200">
            <div className="font-medium mb-1">{t("admin.kyc.stepper.pepWarning")}</div>
            <div className="space-y-1">
              {risk_details.pep_matches.map((match, index) => (
                <div key={index} className="text-sm">
                  {match.name} - {match.position} ({match.country})
                  <span className="text-amber-400 ml-2">
                    {t("admin.kyc.stepper.matchScore")}: {match.match_score}%
                  </span>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 制裁名单匹配 */}
      {risk_details?.sanction_matches &&
        risk_details.sanction_matches.length > 0 && (
          <Alert className="bg-red-500/10 border-red-500/30 rounded-xl">
            <ShieldWarning weight="fill" className="w-4 h-4 text-red-400" />
            <AlertDescription className="text-red-200">
              <div className="font-medium mb-1">{t("admin.kyc.stepper.sanctionMatch")}</div>
              <div className="space-y-1">
                {risk_details.sanction_matches.map((match, index) => (
                  <div key={index} className="text-sm">
                    {match.name} - {match.list}
                    <span className="text-red-400 ml-2">
                      {t("admin.kyc.stepper.matchScore")}: {match.match_score}%
                    </span>
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}
    </div>
  );
}

export default StepRiskAssessment;
