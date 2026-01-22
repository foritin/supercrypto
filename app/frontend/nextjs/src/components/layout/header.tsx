"use client";

import { useMemo, useState, useEffect } from "react";
import { Settings, Wrench, Menu as MenuIcon, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletConnect } from "@/components/wallet-connect";
import { LanguageSwitcher } from "@/components/web3/language-switcher";
import { useCurrentUser } from "@/hooks";
import { useGodMode } from "@/hooks/use-god-mode";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// Environment check - only show dev tools in local/test environment
const ENV = process.env.NEXT_PUBLIC_ENV || "local";
const IS_DEV_ENV = ENV === "local" || ENV === "test";

/**
 * 导航菜单项类型定义
 */
interface NavItem {
  key: string;
  label: string;
  href: string;
  children?: NavItem[];
  icon?: React.ReactNode;
}

/**
 * Header 组件 - 使用 Tailwind CSS 布局 + shadcn/ui 组件
 * 
 * 迁移说明：
 * - 替换 Ant Design Layout.Header 为 Tailwind header 元素
 * - 替换 Ant Design Menu 为自定义导航 + shadcn/ui DropdownMenu
 * - 替换 Ant Design Drawer 为 shadcn/ui Sheet
 * - 替换 Ant Design Skeleton 为 shadcn/ui Skeleton
 * - 保留响应式设计和滚动效果
 */
export function Header() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { isAdmin, isConnected } = useCurrentUser();
  const { enabled: isGodMode } = useGodMode();

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
    if (pathname.startsWith("/about")) return "about";
    return "home";
  };

  // Build menu items based on admin status
  const navItems: NavItem[] = useMemo(() => {
    if (!isHydrated) return [];

    const items: NavItem[] = [
      { key: "home", label: t("header.nav.home"), href: "/" },
      { key: "assets", label: t("header.nav.assets"), href: "/assets" },
      { key: "portfolio", label: t("header.nav.portfolio"), href: "/portfolio" },
      { key: "staking", label: t("header.nav.staking"), href: "/staking" },
      { key: "about", label: t("header.nav.about"), href: "/about" },
    ];

    // Show admin menu if user is admin OR GOD_MODE is enabled
    // GOD_MODE 下无需登录钱包也显示 admin 菜单
    if ((isConnected && isAdmin) || isGodMode) {
      const adminChildren: NavItem[] = [
        {
          key: "admin-dashboard",
          label: t("admin.dashboard.title", "数据仪表盘"),
          href: "/admin/dashboard",
        },
        {
          key: "admin-audit-logs",
          label: t("admin.auditLogs.title", "审计日志"),
          href: "/admin/audit-logs",
        },
        {
          key: "admin-assets",
          label: t("admin.assets.title"),
          href: "/admin/assets",
        },
        {
          key: "admin-contracts",
          label: t("admin.contracts.title"),
          href: "/admin/contracts",
        },
      ];

      // Add dev tools in local/test environment
      if (IS_DEV_ENV) {
        adminChildren.push({
          key: "dev-tools",
          label: t("dev.title"),
          href: "/dev-tools",
          icon: <Wrench className="w-4 h-4" />,
        });
      }

      items.push({
        key: "admin",
        label: t("header.nav.admin"),
        href: "#",
        icon: <Settings className="w-4 h-4" />,
        children: adminChildren,
      });
    }

    return items;
  }, [t, isConnected, isAdmin, isHydrated, isGodMode]);

  const selectedKey = getSelectedKey();

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-[1000] grid grid-cols-[1fr_auto_1fr] items-center transition-all duration-300",
        // Requirements: 13.1, 13.2, 13.3 - 透明/磨砂切换
        scrolled && "border-b backdrop-blur-[12px]"
      )}
      style={{
        padding: "var(--header-padding-y) var(--header-padding-x)",
        // 首屏透明，滚动后磨砂玻璃
        background: scrolled ? "rgba(10, 15, 13, 0.85)" : "transparent",
        height: "var(--header-height)",
        borderColor: scrolled ? "rgba(255, 255, 255, 0.1)" : "transparent",
        boxShadow: scrolled ? "0 4px 30px rgba(0, 0, 0, 0.3)" : "none",
      }}
    >
      {/* 左侧：Logo - 左对齐 */}
      <div className="flex items-center justify-self-start">
        <Link
          href="/"
          aria-label={`${isHydrated ? t("header.title") : "SlimCrypto"} - 首页`}
          className="no-underline flex items-center gap-3"
        >
          {/* Logo Icon */}
          <div
            className="flex items-center justify-center rounded-lg"
            style={{
              width: "var(--logo-size)",
              height: "var(--logo-size)",
              background: "linear-gradient(135deg, #00D4AA 0%, #00A080 100%)",
              borderRadius: "var(--logo-border-radius)",
            }}
            aria-hidden="true"
          >
            {/* Rocket Icon SVG */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4.5 16.5C3 15 2 13 2 10C2 5.5 5.5 2 10 2C13.5 2 16.5 3.5 18.5 6L13 10L15 12L19.5 8C20.5 10 21 12.5 21 15C21 19 18 22 14 22L11.5 19L13 17.5L4.5 16.5Z" stroke="#0A0F0D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          {/* Logo Title */}
          <h1
            className="m-0 font-bold bg-clip-text text-transparent"
            style={{
              background: "linear-gradient(135deg, #00D4AA 0%, #33FFCC 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              fontSize: "var(--logo-title-size)",
            }}
          >
            {isHydrated ? t("header.title") : "SlimCrypto"}
          </h1>
        </Link>
      </div>

      {/* 中间：Desktop Menu - 天然居中 */}
      <nav className="hidden md:flex justify-center" aria-label="主导航菜单">
        {isHydrated ? (
          <ul className="flex items-center gap-6 list-none m-0 p-0">
            {navItems.map((item) => (
              <li key={item.key}>
                {item.children ? (
                  // 带子菜单的项目 - 使用 DropdownMenu
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          "flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors hover:bg-transparent",
                          selectedKey === item.key
                            ? "text-white"
                            : "text-white/70 hover:text-white"
                        )}
                      >
                        {item.icon}
                        {item.label}
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="center"
                      className="min-w-[180px]"
                    >
                      {item.children.map((child, index) => (
                        <div key={child.key}>
                          {/* 在 admin-audit-logs 后添加分隔线 */}
                          {index === 2 && <DropdownMenuSeparator />}
                          {/* 在 dev-tools 前添加分隔线 */}
                          {child.key === "dev-tools" && <DropdownMenuSeparator />}
                          <DropdownMenuItem asChild>
                            <Link
                              href={child.href}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              {child.icon}
                              {child.label}
                            </Link>
                          </DropdownMenuItem>
                        </div>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  // 普通导航项
                  <Link
                    href={item.href}
                    className={cn(
                      "px-3 py-2 text-sm font-medium transition-colors",
                      selectedKey === item.key
                        ? "text-white"
                        : "text-white/70 hover:text-white"
                    )}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Skeleton className="w-[400px] h-10" />
        )}
      </nav>

      {/* 右侧：语言切换 + 钱包连接 + 移动端菜单按钮 - 右对齐 */}
      <div
        className="flex items-center justify-self-end"
        style={{ gap: "var(--header-space)" }}
      >
        <LanguageSwitcher aria-label="切换语言" />
        <WalletConnect />

        {/* Mobile Menu Button - 使用 Sheet */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-white hover:text-primary"
              aria-label="打开菜单"
            >
              <MenuIcon className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px]">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <div
                  className="flex items-center justify-center rounded-lg"
                  style={{
                    width: 28,
                    height: 28,
                    background: "linear-gradient(135deg, #00D4AA 0%, #00A080 100%)",
                    borderRadius: 8,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4.5 16.5C3 15 2 13 2 10C2 5.5 5.5 2 10 2C13.5 2 16.5 3.5 18.5 6L13 10L15 12L19.5 8C20.5 10 21 12.5 21 15C21 19 18 22 14 22L11.5 19L13 17.5L4.5 16.5Z" stroke="#0A0F0D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span>{isHydrated ? t("header.title") : "SlimCrypto"}</span>
              </SheetTitle>
            </SheetHeader>
            
            {/* Mobile Navigation */}
            <nav className="mt-6" aria-label="移动端导航菜单">
              <ul className="flex flex-col gap-1 list-none m-0 p-0">
                {navItems.map((item) => (
                  <li key={item.key}>
                    {item.children ? (
                      // 带子菜单的项目 - 展开显示
                      <div className="py-2">
                        <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground">
                          {item.icon}
                          {item.label}
                        </div>
                        <ul className="ml-4 mt-1 flex flex-col gap-1 list-none p-0">
                          {item.children.map((child) => (
                            <li key={child.key}>
                              <Link
                                href={child.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className={cn(
                                  "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                                  pathname === child.href
                                    ? "text-primary bg-primary/10"
                                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                                )}
                              >
                                {child.icon}
                                {child.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      // 普通导航项
                      <Link
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                          selectedKey === item.key
                            ? "text-primary bg-primary/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                        )}
                      >
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
