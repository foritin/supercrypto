"use client";

/**
 * StepBasicInfo - 步骤 1: 基本信息确认
 * 
 * 展示申请人基本信息:
 * - 姓名、证件类型、出生日期、国家/地区
 * - 钱包地址 (含复制和 Etherscan 跳转)
 * - OCR 识别信息 (条件渲染)
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  User,
  DeviceMobile,
  FileText,
  ArrowSquareOut,
  Check,
  Copy,
} from "@phosphor-icons/react";
import { SectionCard, InfoRow } from "@/components/ui";
import type { KycDetail } from "@/services/admin-kyc";

export interface StepBasicInfoProps {
  kycDetail: KycDetail;
}

export function StepBasicInfo({ kycDetail }: StepBasicInfoProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const { kyc, ocr_data } = kycDetail;

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(kyc.wallet_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* 基本信息卡片 */}
      <SectionCard
        title={t("admin.kyc.stepper.basicInfo")}
        icon={<User weight="fill" className="w-4 h-4" />}
        className="border-white/[0.08]"
      >
        <InfoRow label={t("admin.kyc.stepper.fullName")}>
          <span className="text-white font-medium">{kyc.full_name || "-"}</span>
        </InfoRow>
        <InfoRow label={t("admin.kyc.stepper.idType")}>
          <span className="text-white">
            {kyc.id_type === "id_card"
              ? t("admin.kyc.stepper.idCard")
              : kyc.id_type === "passport"
                ? t("admin.kyc.stepper.passport")
                : kyc.id_type === "driver_license"
                  ? t("admin.kyc.stepper.driverLicense")
                  : "-"}
          </span>
        </InfoRow>
        <InfoRow label={t("admin.kyc.stepper.dateOfBirth")}>
          <span className="text-white">{kyc.date_of_birth || "-"}</span>
        </InfoRow>
        <InfoRow label={t("admin.kyc.stepper.countryRegion")} showBorder={false}>
          <span className="text-white font-medium">{kyc.country_code || "-"}</span>
        </InfoRow>
      </SectionCard>

      {/* 钱包地址卡片 */}
      <SectionCard
        title={t("admin.kyc.stepper.walletAddress")}
        icon={<DeviceMobile weight="fill" className="w-4 h-4" />}
        className="border-white/[0.08]"
      >
        <div className="flex items-center justify-between gap-2">
          <code className="text-[13px] font-mono text-white/85 break-all leading-relaxed flex-1">
            {kyc.wallet_address}
          </code>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopyAddress}
              className="flex items-center gap-1 text-xs bg-transparent border-none cursor-pointer p-1.5 rounded transition-colors hover:bg-white/5"
              style={{ color: copied ? "#52c41a" : "rgba(255, 255, 255, 0.45)" }}
            >
              {copied ? (
                <Check weight="bold" className="h-4 w-4" />
              ) : (
                <Copy weight="bold" className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() =>
                window.open(
                  `https://etherscan.io/address/${kyc.wallet_address}`,
                  "_blank"
                )
              }
              className="flex items-center gap-1 text-xs bg-transparent border-none cursor-pointer p-1.5 rounded transition-colors hover:bg-white/5 text-white/45"
            >
              <ArrowSquareOut weight="bold" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </SectionCard>

      {/* OCR 识别信息 - 条件渲染 */}
      {ocr_data && (
        <SectionCard
          title={t("admin.kyc.stepper.ocrInfo")}
          icon={<FileText weight="fill" className="w-4 h-4" />}
          className="border-white/[0.08]"
        >
          <InfoRow label={t("admin.kyc.stepper.confidence")}>
            <span className="text-teal-400">{ocr_data.confidence_score}%</span>
          </InfoRow>
          {ocr_data.full_name && (
            <InfoRow label={t("admin.kyc.stepper.ocrName")}>
              <span className="text-white">{ocr_data.full_name}</span>
            </InfoRow>
          )}
          {ocr_data.id_number && (
            <InfoRow label={t("admin.kyc.stepper.idNumber")}>
              <span className="text-white font-mono">{ocr_data.id_number}</span>
            </InfoRow>
          )}
          {ocr_data.date_of_birth && (
            <InfoRow label={t("admin.kyc.stepper.dateOfBirth")} showBorder={false}>
              <span className="text-white">{ocr_data.date_of_birth}</span>
            </InfoRow>
          )}
        </SectionCard>
      )}
    </div>
  );
}

export default StepBasicInfo;
