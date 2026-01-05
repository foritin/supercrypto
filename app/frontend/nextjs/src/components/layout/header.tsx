"use client";

import { useMemo, useState, useEffect } from "react";
import { Layout, Typography, Space, Menu, Skeleton, Drawer } from "antd";
import { Menu as MenuIcon, X } from "lucide-react";
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

  // 移动端菜单状态
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 滚动状态 - 用于 Header 样式变换
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setIsHydrated(true);

    // 滚动监听器
    const handleScroll = () => {
      const offset = window.scrollY;
      setScrolled(offset > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true } as AddEventListenerOptions);
    handleScroll(); // 初始检查

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
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
        label: <Link href="/">{t("header.nav.home")}</Link>,
      },
      {
        key: "assets",
        label: <Link href="/assets">{t("header.nav.assets")}</Link>,
      },
      {
        key: "portfolio",
        label: <Link href="/portfolio">{t("header.nav.portfolio")}</Link>,
      },
      {
        key: "staking",
        label: <Link href="/staking">{t("header.nav.staking")}</Link>,
      },
    ];

    // Only show admin menu if user is admin
    if (isConnected && isAdmin) {
      const adminChildren: MenuProps["items"] = [
        {
          key: "admin-dashboard",
          label: (
            <Link href="/admin/dashboard">
              {t("admin.dashboard.title", "数据仪表盘")}
            </Link>
          ),
        },
        {
          key: "admin-audit-logs",
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
          label: <Link href="/admin/assets">{t("admin.assets.title")}</Link>,
        },
        {
          key: "admin-contracts",
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
        // 滚动触发的背景变换
        background: scrolled ? "rgba(26, 26, 46, 0.95)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: 64,
        borderBottom: scrolled ? "1px solid rgba(0, 212, 170, 0.2)" : "none",
        boxShadow: scrolled ? "0 4px 20px rgba(0, 0, 0, 0.3)" : "none",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <Space size="large" align="center">
        <Link
          href="/"
          aria-label={`${isHydrated ? t("header.title") : "ApprovePlatform"} - 首页`}
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
            aria-hidden="true"
          >
            {/* Rocket Icon SVG */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4.5 16.5C3 15 2 13 2 10C2 5.5 5.5 2 10 2C13.5 2 16.5 3.5 18.5 6L13 10L15 12L19.5 8C20.5 10 21 12.5 21 15C21 19 18 22 14 22L11.5 19L13 17.5L4.5 16.5Z" stroke="#0A0F0D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
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
            {isHydrated ? t("header.title") : "ApprovePlatform"}
          </Title>
        </Link>

        {/* Desktop Menu */}
        {isHydrated ? (
          <Menu
            mode="horizontal"
            selectedKeys={[getSelectedKey()]}
            aria-label="主导航菜单"
            className="hidden md:flex"
            style={{
              border: "none",
              background: "transparent",
              minWidth: 400,
            }}
            items={menuItems}
          />
        ) : (
          <Skeleton.Input active style={{ width: 400, height: 40 }} className="hidden md:flex" />
        )}

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 text-white hover:text-[#00D4AA] transition-colors"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="打开菜单"
          aria-expanded={mobileMenuOpen}
        >
          <MenuIcon className="w-6 h-6" />
        </button>
      </Space>

      <Space size={12} align="center">
        <LanguageSwitcher aria-label="切换语言" />
        <WalletConnect />
      </Space>

      {/* Mobile Drawer Menu */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <div
              style={{
                width: 28,
                height: 28,
                background: "linear-gradient(135deg, #00D4AA 0%, #00A080 100%)",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4.5 16.5C3 15 2 13 2 10C2 5.5 5.5 2 10 2C13.5 2 16.5 3.5 18.5 6L13 10L15 12L19.5 8C20.5 10 21 12.5 21 15C21 19 18 22 14 22L11.5 19L13 17.5L4.5 16.5Z" stroke="#0A0F0D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span>{isHydrated ? t("header.title") : "ApprovePlatform"}</span>
          </div>
        }
        placement="right"
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        size="default"
        styles={{
          body: { padding: 0 },
          header: { borderBottom: '1px solid rgba(255,255,255,0.1)' },
        }}
      >
        <Menu
          mode="vertical"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          onClick={() => setMobileMenuOpen(false)}
          style={{
            border: "none",
            background: "transparent",
          }}
        />
      </Drawer>
    </AntHeader>
  );
}
