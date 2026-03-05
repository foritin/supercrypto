"use client";

import { Shield, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

export type RiskLevel = "low" | "medium" | "high";

interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
}

export function RiskBadge({ level, className = "" }: RiskBadgeProps) {
  const { t } = useTranslation();

  const config = {
    low: {
      icon: <Shield className="h-3.5 w-3.5" />,
      label: t("assets.risk.low"),
      className: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    },
    medium: {
      icon: <Info className="h-3.5 w-3.5" />,
      label: t("assets.risk.medium"),
      className: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
    },
    high: {
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: t("assets.risk.high"),
      className: "bg-red-500/10 border-red-500/30 text-red-400",
    },
  };

  const c = config[level];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-medium",
        c.className,
        className
      )}
    >
      {c.icon}
      <span className="whitespace-nowrap">{t("assets.risk.prefix")}: {c.label}</span>
    </div>
  );
}

// 合规标识类型
type ComplianceType = "audited" | "legal" | "verified" | "insured";

// 单个可展开徽章 - 向右展开
interface ExpandableBadgeProps {
  type: ComplianceType;
  isExpanded: boolean;
  onHover: () => void;
  onLeave: () => void;
}

function ExpandableBadge({ type, isExpanded, onHover, onLeave }: ExpandableBadgeProps) {
  const { t } = useTranslation();

  const config = {
    audited: {
      icon: <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 cursor-pointer" />,
      label: t("assets.compliance.audited"),
      className: "bg-blue-500/10 border-blue-500/30 text-blue-400",
    },
    legal: {
      icon: <Shield className="h-3.5 w-3.5 flex-shrink-0 cursor-pointer" />,
      label: t("assets.compliance.legal"),
      className: "bg-purple-500/10 border-purple-500/30 text-purple-400",
    },
    verified: {
      icon: <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 cursor-pointer" />,
      label: t("assets.compliance.verified"),
      className: "bg-primary/10 border-primary/30 text-primary",
    },
    insured: {
      icon: <Shield className="h-3.5 w-3.5 flex-shrink-0 cursor-pointer" />,
      label: t("assets.compliance.insured"),
      className: "bg-orange-500/10 border-orange-500/30 text-orange-400",
    },
  };

  const c = config[type];

  return (
    <div
      className={cn(
        "relative flex items-center h-7 rounded-md border overflow-hidden",
        "transition-all duration-200 ease-out",
        c.className,
        isExpanded ? "w-auto pl-1.5 pr-2 shadow-sm" : "w-7 justify-center"
      )}
    >
      {/* 图标 - hover 仅触发在图标本身 */}
      <span
        className="flex-shrink-0 flex items-center justify-center"
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
      >
        {c.icon}
      </span>

      {/* 展开的文字 - 向右展开 */}
      <span
        className={cn(
          "text-[11px] font-medium whitespace-nowrap overflow-hidden",
          "transition-all duration-200 ease-out",
          isExpanded ? "w-auto max-w-[60px] opacity-100 ml-1" : "w-0 max-w-0 opacity-0"
        )}
      >
        {c.label}
      </span>
    </div>
  );
}

// 合规徽章组 - 整体热区管理防止抖动
interface ComplianceBadgeGroupProps {
  items: ComplianceType[];
}

function ComplianceBadgeGroup({ items }: ComplianceBadgeGroupProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 清除离开延迟
  const clearLeaveTimeout = useCallback(() => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
  }, []);

  // 处理 hover - 立即响应
  const handleBadgeHover = useCallback((index: number) => {
    clearLeaveTimeout();
    setExpandedIndex(index);
  }, [clearLeaveTimeout]);

  // 处理 leave - 小延迟防止抖动
  const handleBadgeLeave = useCallback(() => {
    leaveTimeoutRef.current = setTimeout(() => {
      setExpandedIndex(null);
    }, 80);
  }, []);

  return (
    <div className="flex items-center gap-1.5">
      {items.map((item, index) => (
        <ExpandableBadge
          key={item}
          type={item}
          isExpanded={expandedIndex === index}
          onHover={() => handleBadgeHover(index)}
          onLeave={handleBadgeLeave}
        />
      ))}
    </div>
  );
}

// 风险与合规信息区域
interface RiskAndComplianceSectionProps {
  riskLevel: RiskLevel;
  complianceItems?: ComplianceType[];
  className?: string;
}

export function RiskAndComplianceSection({
  riskLevel,
  complianceItems = ["audited", "legal", "verified"],
  className = "",
}: RiskAndComplianceSectionProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* 风险评级 */}
      <RiskBadge level={riskLevel} />

      {/* 分隔线 */}
      <div className="w-px h-4 bg-white/10" />

      {/* 合规标识组 */}
      <ComplianceBadgeGroup items={complianceItems} />
    </div>
  );
}
