"use client";

import { useMemo, useState, useEffect } from "react";
import { Layout, Typography, Space, Menu, Skeleton } from "antd";
import {
  ToolOutlined,
  BankOutlined,
  HomeOutlined,
  SettingOutlined,
  WalletOutlined,
  ApiOutlined,
  RocketOutlined,
  FireOutlined,
  DashboardOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletConnect } from "@/components/wallet-connect";
import { LanguageSwitcher } from "@/components/web3/language-switcher";
import { useCurrentUser } from "@/hooks";
import type { MenuProps } from "antd";

const { Header: AntHeader } = Layout;
const { Title } = Typography;

// Environment check - only show dev tools in local/test environment
const ENV = process.env.NEXT_PUBLIC_ENV || "local";
const IS_DEV_ENV = ENV === "local" || ENV === "test";

export function Header() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { isAdmin, isConnected } = useCurrentUser();
  
  // 用于避免 hydration 不匹配 - i18n 在服务端/客户端可能不同步
  const [isHydrated, setIsHydrated] = useState(false);
  
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Get current path for menu selection
  const getSelectedKey = () => {
    if (pathname.startsWith("/admin")) return "admin";
    if (pathname.startsWith("/staking")) return "staking";
    if (pathname.startsWith("/portfolio")) return "portfolio";
    if (pathname.startsWith("/assets")) return "assets";
    return "home";
  };

  // Build menu items based on admin status
  // 只有在 hydration 完成后才构建菜单，避免 i18n 不匹配
  const menuItems: MenuProps["items"] = useMemo(() => {
    // 在 hydration 前返回空数组，避免服务端/客户端文本不匹配
    if (!isHydrated) return [];
    
    const items: MenuProps["items"] = [
      {
        key: "home",
        icon: <HomeOutlined />,
        label: <Link href="/">{t("header.nav.home")}</Link>,
      },
      {
        key: "assets",
        icon: <BankOutlined />,
        label: <Link href="/assets">{t("header.nav.assets")}</Link>,
      },
      {
        key: "portfolio",
        icon: <WalletOutlined />,
        label: <Link href="/portfolio">{t("header.nav.portfolio")}</Link>,
      },
      {
        key: "staking",
        icon: <FireOutlined />,
        label: <Link href="/staking">{t("header.nav.staking")}</Link>,
      },
    ];

    // Only show admin menu if user is admin
    if (isConnected && isAdmin) {
      const adminChildren: MenuProps["items"] = [
        {
          key: "admin-dashboard",
          icon: <DashboardOutlined />,
          label: (
            <Link href="/admin/dashboard">
              {t("admin.dashboard.title", "数据仪表盘")}
            </Link>
          ),
        },
        {
          key: "admin-audit-logs",
          icon: <FileTextOutlined />,
          label: (
            <Link href="/admin/audit-logs">
              {t("admin.auditLogs.title", "审计日志")}
            </Link>
          ),
        },
        {
          type: "divider" as const,
        },
        {
          key: "admin-assets",
          icon: <BankOutlined />,
          label: <Link href="/admin/assets">{t("admin.assets.title")}</Link>,
        },
        {
          key: "admin-contracts",
          icon: <ApiOutlined />,
          label: (
            <Link href="/admin/contracts">{t("admin.contracts.title")}</Link>
          ),
        },
      ];

      // Add dev tools in local/test environment
      if (IS_DEV_ENV) {
        adminChildren.push({
          type: "divider" as const,
        });
        adminChildren.push({
          key: "dev-tools",
          icon: <ToolOutlined />,
          label: <Link href="/dev-tools">{t("dev.title")}</Link>,
        });
      }

      items.push({
        key: "admin",
        icon: <SettingOutlined />,
        label: t("header.nav.admin"),
        children: adminChildren,
      });
    }

    return items;
  }, [t, isConnected, isAdmin, isHydrated]);

  return (
    <AntHeader
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        background: "rgba(17, 25, 22, 0.9)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        position: "sticky",
        top: 0,
        zIndex: 100,
        height: 64,
      }}
    >
      <Space size="large" align="center">
        <Link
          href="/"
          style={{
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              background: "linear-gradient(135deg, #00D4AA 0%, #00A080 100%)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <RocketOutlined style={{ fontSize: 20, color: "#0A0F0D" }} />
          </div>
          <Title
            level={4}
            style={{
              margin: 0,
              background: "linear-gradient(135deg, #00D4AA 0%, #33FFCC 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              fontWeight: 700,
            }}
          >
            {isHydrated ? t("header.title") : "SuperCrypto"}
          </Title>
        </Link>

        {isHydrated ? (
          <Menu
            mode="horizontal"
            selectedKeys={[getSelectedKey()]}
            style={{
              border: "none",
              background: "transparent",
              minWidth: 400,
            }}
            items={menuItems}
          />
        ) : (
          <Skeleton.Input active style={{ width: 400, height: 40 }} />
        )}
      </Space>

      <Space size={12}>
        <LanguageSwitcher />
        <WalletConnect />
      </Space>
    </AntHeader>
  );
}
