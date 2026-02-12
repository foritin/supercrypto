"use client";

import { useState } from "react";
import {
  Building2,
  Flame,
  TrendingUp,
  Shield,
  ArrowRight,
  CheckCircle,
  Clock,
  PauseCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import {
  type AssetListItem,
  type AssetType,
  type AssetStatus,
  ASSET_TYPE_NAMES,
} from "@/services/asset";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAssets } from "@/hooks/use-assets";
import "./assets.css";

// 资产类型图标映射 - 使用 lucide-react 图标
const ASSET_TYPE_ICONS: Record<AssetType, React.ReactNode> = {
  real_estate: <Building2 className="h-4 w-4" />,
  bond: <Shield className="h-4 w-4" />,
  commodity: <Flame className="h-4 w-4" />,
  equity: <TrendingUp className="h-4 w-4" />,
  other: <Building2 className="h-4 w-4" />,
};

// 高质量背景图
const ASSET_TYPE_IMAGES: Record<AssetType, string> = {
  real_estate:
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80",
  bond: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80",
  commodity:
    "https://images.unsplash.com/photo-1610375461246-83df859d849d?w=800&q=80",
  equity:
    "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&q=80",
  other:
    "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&q=80",
};

// 状态配置 - 使用 lucide-react 图标
const STATUS_CONFIG: Record<
  AssetStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  active: {
    label: "Available",
    color: "#00D4AA",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  paused: {
    label: "Paused",
    color: "#FAAD14",
    icon: <PauseCircle className="h-3 w-3" />,
  },
  sold_out: {
    label: "Sold Out",
    color: "#FF4D4F",
    icon: <Clock className="h-3 w-3" />,
  },
  closed: { label: "Closed", color: "#8C8C8C", icon: <Clock className="h-3 w-3" /> },
};

// 自定义分页组件
function CustomPagination({
  current,
  total,
  pageSize,
  onChange,
}: {
  current: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  
  if (totalPages <= 1) return null;

  // 生成页码数组
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showPages = 5;
    
    if (totalPages <= showPages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (current <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      } else if (current >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = current - 1; i <= current + 1; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(current - 1)}
        disabled={current === 1}
        className="h-8 w-8 p-0"
      >
        ‹
      </Button>
      
      {getPageNumbers().map((page, index) => (
        <Button
          key={index}
          variant={page === current ? "primary" : "outline"}
          size="sm"
          onClick={() => typeof page === "number" && onChange(page)}
          disabled={typeof page !== "number"}
          className={cn(
            "h-8 min-w-8 p-0",
            page === current && "bg-primary text-primary-foreground"
          )}
        >
          {page}
        </Button>
      ))}
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(current + 1)}
        disabled={current === totalPages}
        className="h-8 w-8 p-0"
      >
        ›
      </Button>
    </div>
  );
}

export default function AssetsClient() {
  const { t } = useTranslation();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [statusFilter, setStatusFilter] = useState<AssetStatus | undefined>(
    undefined
  );
  const [typeFilter, setTypeFilter] = useState<AssetType | undefined>(
    undefined
  );

  const query: import("@/services/asset").AssetListQuery = {
    page,
    page_size: pageSize,
    ...(statusFilter && { status: statusFilter }),
    ...(typeFilter && { asset_type: typeFilter }),
  };
  const { data, isLoading, error } = useAssets(query);

  // 格式化函数
  const formatApy = (apy: number) => (apy === 0 ? "-" : `${apy.toFixed(1)}%`);

  const formatAmount = (amount: number) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(2)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
    return `${amount.toFixed(0)}`;
  };

  // 计算统计
  const stats = {
    total: data?.pagination?.total || 0,
    tvl: data?.items?.reduce((acc, item) => acc + item.total_supply, 0) || 0,
    avgApy: data?.items?.length
      ? (
          data.items.reduce((acc, item) => acc + item.apy_12m, 0) /
          data.items.length
        ).toFixed(1)
      : "0",
    available:
      data?.items?.filter((item) => item.status === "active").length || 0,
  };

  // 渲染资产卡片
  const renderAssetCard = (asset: AssetListItem) => {
    const bgImage =
      asset.cover_image_url || asset.image_url || ASSET_TYPE_IMAGES[asset.asset_type as AssetType];
    const progress = (asset.subscribed_amount / asset.total_supply) * 100;
    const statusInfo = STATUS_CONFIG[asset.status as AssetStatus];

    return (
      <div
        key={asset.id}
        onClick={() => router.push(`/assets/${asset.id}`)}
        className="asset-card-wrapper"
      >
        {/* Image Section */}
        <div className="asset-card-image">
          <div
            className="asset-card-bg"
            style={{ backgroundImage: `url(${bgImage})` }}
          />
          <div className="asset-card-overlay" />

          {/* Status Badge */}
          <div
            className="status-badge"
            style={{
              background: `${statusInfo.color}15`,
              borderColor: `${statusInfo.color}40`,
              color: statusInfo.color,
            }}
          >
            {statusInfo.icon}
            <span>{statusInfo.label}</span>
          </div>

          {/* Type Badge */}
          <div className="type-badge">
            {ASSET_TYPE_ICONS[asset.asset_type as AssetType]}
          </div>
        </div>

        {/* Content Section */}
        <div className="asset-card-content">
          <div className="asset-card-header">
            <h5 className="text-base font-semibold text-white truncate flex-1 m-0">
              {asset.name}
            </h5>
            <span className="asset-symbol">{asset.symbol}</span>
          </div>

          <div className="apy-section">
            <div className="apy-item">
              <span className="apy-label">3M APY</span>
              <span className="apy-value">{formatApy(asset.apy_3m)}</span>
            </div>
            <div className="apy-divider" />
            <div className="apy-item">
              <span className="apy-label">6M APY</span>
              <span className="apy-value">{formatApy(asset.apy_6m)}</span>
            </div>
            <div className="apy-divider" />
            <div className="apy-item highlight">
              <span className="apy-label">12M APY</span>
              <span className="apy-value highlight">
                {formatApy(asset.apy_12m)}
              </span>
            </div>
          </div>

          <div className="progress-section">
            <div className="progress-header">
              <span className="progress-label">Subscription</span>
              <span className="progress-value">
                {formatAmount(asset.subscribed_amount)} /{" "}
                {formatAmount(asset.total_supply)}
              </span>
            </div>
            <Progress
              value={progress}
              indicatorColor="#00D4AA"
              className="h-1.5"
            />
          </div>

          <div className="asset-card-footer">
            <div className="price-info">
              <span className="price-label">Price</span>
              <span className="price-value">
                ${asset.current_price.toFixed(2)}
              </span>
            </div>
            <div className="view-action">
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 卡片骨架屏
  const renderCardSkeleton = () => (
    <div className="asset-card-wrapper skeleton">
      <div className="skeleton-image-placeholder" />
      <div className="p-5 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-12" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-16 flex-1" />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-1.5 w-full" />
        </div>
        <div className="flex justify-between items-center pt-4 border-t border-white/5">
          <div className="space-y-1">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </div>
    </div>
  );

  // 统计数据骨架屏
  const renderStatsSkeleton = () => (
    <div className="stats-row">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} style={{ display: "flex", alignItems: "center" }}>
          {i > 1 && <div className="stat-divider" />}
          <div className="stat-item">
            <div className="skeleton-stat-value" />
            <div className="skeleton-stat-label" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="assets-page">
      {/* Header Section */}
      <section className="page-header">
        <div className="header-content">
          <div className="header-text">
            <span className="section-label">{t("assets.explore")}</span>
            <h2 className="text-2xl font-bold text-white mt-2 mb-0">
              {t("assets.title")}
            </h2>
          </div>

          {isLoading ? (
            renderStatsSkeleton()
          ) : (
            <div className="stats-row">
              <div className="stat-item">
                <span className="stat-value">{stats.total}</span>
                <span className="stat-label">Assets</span>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <span className="stat-value">{formatAmount(stats.tvl)}</span>
                <span className="stat-label">Total Value</span>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <span className="stat-value highlight">{stats.avgApy}%</span>
                <span className="stat-label">Avg. APY</span>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <span className="stat-value">{stats.available}</span>
                <span className="stat-label">Available</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Filters Section */}
      <section className="filters-section">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${typeFilter === undefined ? "active" : ""}`}
            onClick={() => {
              setTypeFilter(undefined);
              setPage(1);
            }}
          >
            All
          </button>
          {(["real_estate", "bond", "commodity", "equity"] as AssetType[]).map(
            (type) => (
              <button
                key={type}
                className={`filter-tab ${typeFilter === type ? "active" : ""}`}
                onClick={() => {
                  setTypeFilter(type);
                  setPage(1);
                }}
              >
                {ASSET_TYPE_ICONS[type]}
                <span>{ASSET_TYPE_NAMES[type]}</span>
              </button>
            )
          )}
        </div>

        <Select
          value={statusFilter || "all"}
          onValueChange={(value) => {
            setStatusFilter(value === "all" ? undefined : (value as AssetStatus));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Available</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="sold_out">Sold Out</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </section>

      {/* Assets Grid */}
      <section className="assets-grid-section">
        {isLoading ? (
          <div className="assets-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i}>{renderCardSkeleton()}</div>
            ))}
          </div>
        ) : error ? (
          <EmptyState message={t("common.error")} />
        ) : !data?.items?.length ? (
          <div className="empty-state">
            <EmptyState message={t("assets.empty")} />
          </div>
        ) : (
          <>
            <div className="assets-grid">
              {data.items.map((asset) => renderAssetCard(asset))}
            </div>

            {data.pagination && data.pagination.total_pages > 1 && (
              <div className="pagination-wrapper">
                <CustomPagination
                  current={page}
                  pageSize={pageSize}
                  total={data.pagination.total}
                  onChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
