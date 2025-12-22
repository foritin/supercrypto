"use client";

import { useState, useEffect, useCallback } from "react";
import { use } from "react";
import { Typography, Button, Progress, Spin, Empty, Tooltip, Skeleton, Tabs, Card, Row, Col, Divider } from "antd";
import {
  ArrowLeftOutlined,
  BankOutlined,
  SafetyOutlined,
  FireOutlined,
  RiseOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PauseCircleOutlined,
  CopyOutlined,
  CheckOutlined,
  FileTextOutlined,
  EnvironmentOutlined,
  WalletOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { assetService, type AssetDetail, ASSET_TYPE_NAMES, type AssetType, type AssetStatus } from "@/services/asset";
import { SubscriptionModal } from "@/components/subscription/subscription-modal";
import { MediaGallery } from "@/components/asset/media-gallery";
import { PropertyHighlights } from "@/components/asset/property-highlights";

const { Title, Text, Paragraph } = Typography;

// 资产类型图标
const ASSET_TYPE_ICONS: Record<AssetType, React.ReactNode> = {
  real_estate: <BankOutlined />,
  bond: <SafetyOutlined />,
  commodity: <FireOutlined />,
  equity: <RiseOutlined />,
  other: <BankOutlined />,
};

// 状态配置
const STATUS_CONFIG: Record<AssetStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  active: { label: "Available", color: "#00D4AA", bg: "rgba(0,212,170,0.1)", icon: <CheckCircleOutlined /> },
  paused: { label: "Paused", color: "#FAAD14", bg: "rgba(250,173,20,0.1)", icon: <PauseCircleOutlined /> },
  sold_out: { label: "Sold Out", color: "#FF4D4F", bg: "rgba(255,77,79,0.1)", icon: <ClockCircleOutlined /> },
  closed: { label: "Closed", color: "#8C8C8C", bg: "rgba(140,140,140,0.1)", icon: <ClockCircleOutlined /> },
};

export default function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { t } = useTranslation();
  const router = useRouter();
  const { isConnected } = useAccount();
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("highlights");

  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAsset = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await assetService.getAsset(Number(resolvedParams.id));
      setAsset(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    fetchAsset();
  }, [fetchAsset]);

  const formatAmount = (amount: number) => {
    if (amount >= 1000000) return "$" + (amount / 1000000).toFixed(2) + "M";
    if (amount >= 1000) return "$" + (amount / 1000).toFixed(0) + "K";
    return "$" + amount.toFixed(0);
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px" }}>
        <Skeleton.Button active style={{ width: 100, marginBottom: 24 }} />
        <Skeleton.Image active style={{ width: "100%", height: 400 }} />
        <Skeleton active paragraph={{ rows: 6 }} style={{ marginTop: 24 }} />
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "60px 24px", textAlign: "center" }}>
        <Empty description={t("assets.notFound")} />
        <Button onClick={() => router.push("/assets")} style={{ marginTop: 24 }}>
          <ArrowLeftOutlined /> {t("common.back")}
        </Button>
      </div>
    );
  }

  const statusInfo = STATUS_CONFIG[asset.status as AssetStatus];
  const progress = (asset.subscribed_amount / asset.total_supply) * 100;

  return (
    <div className="asset-detail-page">
      <div className="detail-container">
        {/* 面包屑导航 */}
        <div className="breadcrumb">
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => router.push("/assets")}>
            Back to Assets
          </Button>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">{asset.name}</span>
        </div>

        {/* 标题栏 */}
        <div className="title-bar">
          <div className="title-left">
            <Title level={2} style={{ margin: 0 }}>{asset.location || asset.name}</Title>
            <div className="title-meta">
              <span className="asset-type-badge">
                {ASSET_TYPE_ICONS[asset.asset_type as AssetType]}
                {ASSET_TYPE_NAMES[asset.asset_type as AssetType]}
              </span>
              {asset.contract_address && (
                <span className="contract-link">
                  VIEW SMART CONTRACTS
                  <LinkOutlined />
                </span>
              )}
            </div>
          </div>
          <div className="status-badge" style={{ background: statusInfo.bg, color: statusInfo.color }}>
            {statusInfo.icon}
            <span>{statusInfo.label}</span>
          </div>
        </div>

        {/* 主内容区 */}
        <Row gutter={32}>
          {/* 左侧：图片和详情 */}
          <Col xs={24} lg={16}>
            {/* 图片画廊 */}
            <MediaGallery coverImage={asset.image_url} assetType={asset.asset_type} media={asset.media} />

            {/* 标签页导航 */}
            <div className="tabs-container">
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={[
                  { key: "highlights", label: "HIGHLIGHTS" },
                  { key: "financials", label: "FINANCIALS" },
                  { key: "details", label: "DETAILS" },
                  { key: "blockchain", label: "BLOCKCHAIN" },
                ]}
              />
            </div>

            {/* 标签内容 */}
            {activeTab === "highlights" && (
              <div className="tab-content">
                <div className="section-title">PROPERTY HIGHLIGHTS</div>
                <PropertyHighlights asset={asset} />
              </div>
            )}

            {activeTab === "financials" && (
              <div className="tab-content">
                <div className="section-title">FINANCIAL DETAILS</div>
                <Card className="dark-card">
                  <Row gutter={[16, 24]}>
                    <Col span={12}>
                      <div className="metric-item">
                        <Text className="metric-label">Token Price</Text>
                        <Text className="metric-value">${asset.current_price.toFixed(2)}</Text>
                      </div>
                    </Col>
                    <Col span={12}>
                      <div className="metric-item">
                        <Text className="metric-label">Total Investment</Text>
                        <Text className="metric-value">{formatAmount(asset.total_supply)}</Text>
                      </div>
                    </Col>
                    <Col span={12}>
                      <div className="metric-item">
                        <Text className="metric-label">3M APY</Text>
                        <Text className="metric-value">{asset.apy_3m.toFixed(1)}%</Text>
                      </div>
                    </Col>
                    <Col span={12}>
                      <div className="metric-item">
                        <Text className="metric-label">6M APY</Text>
                        <Text className="metric-value">{asset.apy_6m.toFixed(1)}%</Text>
                      </div>
                    </Col>
                    <Col span={12}>
                      <div className="metric-item">
                        <Text className="metric-label">12M APY</Text>
                        <Text className="metric-value highlight">{asset.apy_12m.toFixed(1)}%</Text>
                      </div>
                    </Col>
                    <Col span={12}>
                      <div className="metric-item">
                        <Text className="metric-label">Min. Investment</Text>
                        <Text className="metric-value">{formatAmount(asset.min_subscription)}</Text>
                      </div>
                    </Col>
                  </Row>
                </Card>
              </div>
            )}

            {activeTab === "details" && (
              <div className="tab-content">
                <div className="section-title">ABOUT THE OFFERING</div>
                <Card className="dark-card">
                  <Paragraph style={{ color: "rgba(255,255,255,0.75)", lineHeight: 1.8, marginBottom: 0 }}>
                    {asset.description || "This tokenized real-world asset offers investors an opportunity to participate in property ownership through blockchain technology. Each token represents a fractional ownership stake, providing exposure to rental income and potential property appreciation."}
                  </Paragraph>
                </Card>
                
                {asset.location && (
                  <>
                    <div className="section-title" style={{ marginTop: 24 }}>LOCATION</div>
                    <Card className="dark-card">
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <EnvironmentOutlined style={{ color: "#00D4AA" }} />
                        <Text style={{ color: "#fff" }}>{asset.location}</Text>
                      </div>
                    </Card>
                  </>
                )}
              </div>
            )}

            {activeTab === "blockchain" && (
              <div className="tab-content">
                <div className="section-title">BLOCKCHAIN INFORMATION</div>
                <Card className="dark-card">
                  {asset.contract_address ? (
                    <div className="contract-info">
                      <Text className="info-label">Contract Address</Text>
                      <div className="address-row">
                        <code>{asset.contract_address}</code>
                        <Tooltip title={copied ? "Copied!" : "Copy"}>
                          <Button
                            type="text"
                            size="small"
                            icon={copied ? <CheckOutlined /> : <CopyOutlined />}
                            onClick={() => copyAddress(asset.contract_address!)}
                          />
                        </Tooltip>
                      </div>
                    </div>
                  ) : (
                    <Text style={{ color: "rgba(255,255,255,0.5)" }}>Contract not deployed yet</Text>
                  )}
                  
                  {asset.document_url && (
                    <div className="contract-info" style={{ marginTop: 16 }}>
                      <Text className="info-label">Documents</Text>
                      <a href={asset.document_url} target="_blank" rel="noopener noreferrer" style={{ color: "#00D4AA" }}>
                        <FileTextOutlined /> View Legal Documents
                      </a>
                    </div>
                  )}
                </Card>
              </div>
            )}
          </Col>

          {/* 右侧：投资面板 */}
          <Col xs={24} lg={8}>
            <div className="investment-panel">
              <div className="investment-header">
                <Text className="panel-label">TOTAL INVESTMENT</Text>
                <Title level={2} style={{ margin: "8px 0", color: "#fff" }}>
                  {formatAmount(asset.total_supply)}
                </Title>
              </div>

              {/* 状态标签 */}
              <div className="release-badge">
                {asset.status === "active" ? "AVAILABLE NOW" : statusInfo.label.toUpperCase()}
              </div>

              {/* 购买信息 */}
              <div className="purchase-stats">
                <div className="stat-item">
                  <Text className="stat-label">SUBSCRIBED</Text>
                  <Text className="stat-value">{formatAmount(asset.subscribed_amount)}</Text>
                </div>
                <div className="stat-item">
                  <Text className="stat-label">REMAINING</Text>
                  <Text className="stat-value highlight">{formatAmount(asset.remaining_amount)}</Text>
                </div>
              </div>

              {/* 进度条 */}
              <div className="progress-section">
                <Progress
                  percent={progress}
                  showInfo={false}
                  strokeColor="#00D4AA"
                  railColor="rgba(255,255,255,0.1)"
                  size={["100%", 8]}
                />
                <div className="progress-labels">
                  <span>{progress.toFixed(1)}% Funded</span>
                  <span>{(100 - progress).toFixed(1)}% Available</span>
                </div>
              </div>

              <Divider style={{ borderColor: "rgba(255,255,255,0.1)", margin: "24px 0" }} />

              {/* APY 信息 */}
              <div className="apy-preview">
                <div className="apy-row">
                  <Text>Expected Annual Return</Text>
                  <Text className="apy-value">{asset.apy_12m.toFixed(1)}%</Text>
                </div>
                <div className="apy-row">
                  <Text>Token Price</Text>
                  <Text className="apy-value">${asset.current_price.toFixed(2)}</Text>
                </div>
              </div>

              {/* 认购按钮 */}
              <Button
                type="primary"
                size="large"
                block
                disabled={!isConnected || asset.status !== "active"}
                onClick={() => setShowSubscribeModal(true)}
                className="subscribe-btn"
              >
                <WalletOutlined />
                {isConnected ? "Subscribe Now" : "Connect Wallet to Subscribe"}
              </Button>

              {!isConnected && (
                <Text className="subscribe-hint">Please connect your wallet to invest</Text>
              )}
            </div>
          </Col>
        </Row>
      </div>

      <SubscriptionModal
        open={showSubscribeModal}
        onClose={() => setShowSubscribeModal(false)}
        onSuccess={() => setShowSubscribeModal(false)}
        asset={asset}
      />

      <style jsx global>{`
        .asset-detail-page {
          min-height: 100vh;
          padding-bottom: 80px;
        }
        .detail-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }
        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          color: rgba(255,255,255,0.5);
          font-size: 14px;
        }
        .breadcrumb-sep { color: rgba(255,255,255,0.3); }
        .breadcrumb-current { color: rgba(255,255,255,0.8); }
        .title-bar {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }
        .title-meta {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-top: 8px;
        }
        .asset-type-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          background: rgba(0,212,170,0.1);
          border: 1px solid rgba(0,212,170,0.2);
          border-radius: 6px;
          color: #00D4AA;
          font-size: 12px;
        }
        .contract-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: rgba(255,255,255,0.5);
          font-size: 12px;
          cursor: pointer;
        }
        .contract-link:hover { color: #00D4AA; }
        .status-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 13px;
        }
        .tabs-container {
          margin: 24px 0 16px;
        }
        .tabs-container .ant-tabs-nav::before {
          border-bottom: 1px solid rgba(255,255,255,0.1) !important;
        }
        .tabs-container .ant-tabs-tab {
          color: rgba(255,255,255,0.5) !important;
          font-weight: 600;
          font-size: 12px;
          letter-spacing: 0.5px;
        }
        .tabs-container .ant-tabs-tab-active .ant-tabs-tab-btn {
          color: #00D4AA !important;
        }
        .tabs-container .ant-tabs-ink-bar {
          background: #00D4AA !important;
        }
        .section-title {
          font-size: 12px;
          font-weight: 600;
          color: rgba(255,255,255,0.5);
          letter-spacing: 1px;
          margin-bottom: 16px;
        }
        .dark-card {
          background: rgba(255,255,255,0.02) !important;
          border: 1px solid rgba(255,255,255,0.06) !important;
          border-radius: 12px !important;
        }
        .metric-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .metric-label { color: rgba(255,255,255,0.5) !important; font-size: 12px; }
        .metric-value { color: #fff !important; font-size: 20px; font-weight: 600; }
        .metric-value.highlight { color: #00D4AA !important; }
        .contract-info { margin-bottom: 8px; }
        .info-label { display: block; color: rgba(255,255,255,0.5) !important; font-size: 12px; margin-bottom: 8px; }
        .address-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .address-row code {
          flex: 1;
          background: rgba(255,255,255,0.05);
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 13px;
          color: #fff;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        /* Investment Panel */
        .investment-panel {
          position: sticky;
          top: 88px;
          background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 24px;
        }
        .investment-header { text-align: center; margin-bottom: 16px; }
        .panel-label { color: rgba(255,255,255,0.5) !important; font-size: 12px; letter-spacing: 1px; }
        .release-badge {
          display: block;
          text-align: center;
          padding: 8px 16px;
          background: linear-gradient(90deg, #00D4AA 0%, #00B894 100%);
          border-radius: 20px;
          color: #000;
          font-weight: 700;
          font-size: 12px;
          letter-spacing: 1px;
          margin-bottom: 20px;
        }
        .purchase-stats {
          display: flex;
          justify-content: space-around;
          margin-bottom: 16px;
        }
        .stat-item { text-align: center; }
        .stat-label { display: block; color: rgba(255,255,255,0.5) !important; font-size: 11px; margin-bottom: 4px; }
        .stat-value { display: block; color: #fff !important; font-size: 18px; font-weight: 600; }
        .stat-value.highlight { color: #00D4AA !important; }
        .progress-section { margin-bottom: 8px; }
        .progress-labels {
          display: flex;
          justify-content: space-between;
          margin-top: 8px;
          font-size: 12px;
          color: rgba(255,255,255,0.5);
        }
        .apy-preview { margin-bottom: 20px; }
        .apy-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .apy-row:last-child { border-bottom: none; }
        .apy-row span:first-child { color: rgba(255,255,255,0.6); }
        .apy-value { color: #00D4AA !important; font-weight: 600; }
        .subscribe-btn {
          height: 52px !important;
          font-size: 16px !important;
          font-weight: 600 !important;
          border-radius: 12px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
        }
        .subscribe-hint {
          display: block;
          text-align: center;
          margin-top: 12px;
          font-size: 13px;
          color: rgba(255,255,255,0.4) !important;
        }
      `}</style>
    </div>
  );
}
