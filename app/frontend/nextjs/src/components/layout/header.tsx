"use client";

import {
  Settings,
  Wrench,
  Menu as MenuIcon,
  ChevronRight,
  Wallet,
  BookOpen,
  Shield,
  FileText,
  Users,
  Scale,
  Home,
  TrendingUp,
  PieChart,
  Building2,
  Briefcase,
  Globe,
  GraduationCap,
  Lock,
  BarChart3,
  Landmark,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { RemoveScroll } from "react-remove-scroll";

import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { WalletConnect } from "@/components/wallet-connect";
import { LanguageSwitcher } from "@/components/web3/language-switcher";
import { useCurrentUser } from "@/hooks";
import { useGodMode } from "@/hooks/use-god-mode";
import { cn } from "@/lib/utils";

// Environment check - only show dev tools in development environment
const ENV = process.env.NEXT_PUBLIC_ENV || "development";
const IS_DEV_ENV = ENV === "development";

/**
 * 导航菜单项类型定义 - 支持多级嵌套
 */
interface NavItem {
  key: string;
  label: string;
  href: string;
  icon?: LucideIcon;
  description?: string;
  children?: NavItem[];
}

/**
 * Header 组件 - 5级导航菜单重构版
 *
 * 新导航结构：
 * - Invest: Assets, Portfolio, Staking
 * - Learn: How It Works, FAQ, Security
 * - Transparency: Partners, Contracts
 * - About: Company, Team
 * - Legal: Terms, Privacy, Risk Disclosure
 */
export function Header() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { isAdmin, isConnected } = useCurrentUser();
  const { enabled: isGodMode } = useGodMode();

  const [isHydrated, setIsHydrated] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [expandedMobileItems, setExpandedMobileItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    setIsHydrated(true);

    const handleScroll = () => {
      const offset = window.scrollY;
      setScrolled(offset > 50);
    };

    window.addEventListener("scroll", handleScroll, { passive: true } as AddEventListenerOptions);
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // 新的5级导航数据结构
  const navItems: NavItem[] = useMemo(() => {
    if (!isHydrated) return [];

    const items: NavItem[] = [
      {
        key: "invest",
        label: t("header.nav.invest", "Invest"),
        href: "#",
        icon: Wallet,
        children: [
          {
            key: "assets",
            label: t("header.nav.assets", "Assets"),
            href: "/assets",
            icon: TrendingUp,
            description: t("header.nav.assetsDesc", "Browse RWA investment opportunities"),
          },
          {
            key: "portfolio",
            label: t("header.nav.portfolio", "Portfolio"),
            href: "/portfolio",
            icon: PieChart,
            description: t("header.nav.portfolioDesc", "Manage your investments"),
          },
          {
            key: "staking",
            label: t("header.nav.staking", "Staking"),
            href: "/staking",
            icon: Landmark,
            description: t("header.nav.stakingDesc", "Earn rewards by staking"),
          },
        ],
      },
      {
        key: "learn",
        label: t("header.nav.learn", "Learn"),
        href: "#",
        icon: BookOpen,
        children: [
          {
            key: "how-it-works",
            label: t("header.nav.howItWorks", "How It Works"),
            href: "/#how-it-works",
            icon: GraduationCap,
            description: t("header.nav.howItWorksDesc", "Learn about our platform"),
          },
          {
            key: "faq",
            label: t("header.nav.faq", "FAQ"),
            href: "/faq",
            icon: FileText,
            description: t("header.nav.faqDesc", "Frequently asked questions"),
          },
          {
            key: "security",
            label: t("header.nav.security", "Security"),
            href: "/security",
            icon: Shield,
            description: t("header.nav.securityDesc", "Our security measures"),
          },
        ],
      },
      {
        key: "transparency",
        label: t("header.nav.transparency", "Transparency"),
        href: "#",
        icon: Globe,
        children: [
          {
            key: "partners",
            label: t("header.nav.partners", "Partners"),
            href: "/partners",
            icon: Building2,
            description: t("header.nav.partnersDesc", "Our ecosystem partners"),
          },
          {
            key: "contracts",
            label: t("header.nav.contracts", "Contracts"),
            href: "/contracts",
            icon: Lock,
            description: t("header.nav.contractsDesc", "Smart contract addresses"),
          },
        ],
      },
      {
        key: "about",
        label: t("header.nav.about", "About"),
        href: "#",
        icon: Users,
        children: [
          {
            key: "company",
            label: t("header.nav.company", "Company"),
            href: "/about",
            icon: Building2,
            description: t("header.nav.companyDesc", "About our company"),
          },
          {
            key: "team",
            label: t("header.nav.team", "Team"),
            href: "/team",
            icon: Briefcase,
            description: t("header.nav.teamDesc", "Meet our team"),
          },
        ],
      },
      {
        key: "legal",
        label: t("header.nav.legal", "Legal"),
        href: "#",
        icon: Scale,
        children: [
          {
            key: "terms",
            label: t("header.nav.terms", "Terms of Service"),
            href: "/terms",
            icon: FileText,
            description: t("header.nav.termsDesc", "Terms and conditions"),
          },
          {
            key: "privacy",
            label: t("header.nav.privacy", "Privacy Policy"),
            href: "/privacy",
            icon: Shield,
            description: t("header.nav.privacyDesc", "Privacy policy"),
          },
          {
            key: "risk-disclosure",
            label: t("header.nav.riskDisclosure", "Risk Disclosure"),
            href: "/risk-disclosure",
            icon: BarChart3,
            description: t("header.nav.riskDisclosureDesc", "Investment risk disclosure"),
          },
        ],
      },
    ];

    // Admin 菜单（条件显示）
    if ((isConnected && isAdmin) || isGodMode) {
      const adminChildren: NavItem[] = [
        {
          key: "admin-dashboard",
          label: t("admin.dashboard.title", "Dashboard"),
          href: "/admin/dashboard",
          icon: TrendingUp,
        },
        {
          key: "admin-audit-logs",
          label: t("admin.auditLogs.title", "Audit Logs"),
          href: "/admin/audit-logs",
          icon: FileText,
        },
        {
          key: "admin-assets",
          label: t("admin.assets.title", "Assets"),
          href: "/admin/assets",
          icon: Lock,
        },
        {
          key: "admin-kyc",
          label: t("admin.kyc.title", "KYC Management"),
          href: "/admin/kyc",
          icon: Shield,
          description: t("admin.kyc.description", "Identity verification & risk assessment"),
        },
        {
          key: "admin-contracts",
          label: t("admin.contracts.title", "Contracts"),
          href: "/admin/contracts",
          icon: Lock,
        },
      ];

      if (IS_DEV_ENV) {
        adminChildren.push({
          key: "dev-tools",
          label: t("dev.title", "Dev Tools"),
          href: "/dev-tools",
          icon: Wrench,
        });
      }

      items.push({
        key: "admin",
        label: t("header.nav.admin", "Admin"),
        href: "#",
        icon: Settings,
        children: adminChildren,
      });
    }

    return items;
  }, [t, isConnected, isAdmin, isHydrated, isGodMode]);

  // 检查当前路径是否匹配
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    // 锚点链接不触发高亮
    if (href.startsWith("/#")) return false;
    if (href === "#") return false;
    return pathname.startsWith(href);
  };

  // 移动端展开/收起
  const toggleMobileItem = (key: string) => {
    setExpandedMobileItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // 渲染桌面端导航菜单
  const renderDesktopNav = () => {
    if (!isHydrated) {
      return <Skeleton className="w-[500px] h-10" />;
    }

    return (
      <NavigationMenu className="hidden md:flex">
        <NavigationMenuList className="gap-1">
          {/* Logo */}
          <NavigationMenuItem>
            <Link href="/" className={navigationMenuTriggerStyle()}>
              <Home className="w-4 h-4 mr-1" />
              {t("header.nav.home", "Home")}
            </Link>
          </NavigationMenuItem>

          {/* 5级导航 */}
          {navItems.map((item) => (
            <NavigationMenuItem key={item.key}>
              {item.children ? (
                <>
                  <NavigationMenuTrigger
                    className={cn(
                      "flex items-center gap-1",
                      item.children.some((child) => 
                        child.href !== "#" && isActive(child.href)
                      ) && "text-primary"
                    )}
                  >
                    {item.icon && <item.icon className="w-4 h-4" />}
                    {item.label}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                      {item.children.map((child) => (
                        <li key={child.key}>
                          <NavigationMenuLink asChild>
                            <Link
                              href={child.href}
                              className={cn(
                                "flex items-start gap-3 select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-white/5",
                                isActive(child.href) && "bg-white/5 text-primary"
                              )}
                            >
                              {child.icon && (
                                <child.icon className="w-5 h-5 mt-0.5 text-white/60" />
                              )}
                              <div className="flex flex-col gap-1">
                                <span className="text-sm font-medium text-white">
                                  {child.label}
                                </span>
                                {child.description && (
                                  <span className="text-xs text-white/50 leading-tight">
                                    {child.description}
                                  </span>
                                )}
                              </div>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    navigationMenuTriggerStyle(),
                    isActive(item.href) && "text-primary"
                  )}
                >
                  {item.icon && <item.icon className="w-4 h-4 mr-1" />}
                  {item.label}
                </Link>
              )}
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>
    );
  };

  // 渲染移动端导航菜单
  const renderMobileNav = () => {
    if (!isHydrated) return null;

    return (
      <nav className="mt-6" aria-label="移动端导航菜单">
        <ul className="flex flex-col gap-1 list-none m-0 p-0">
          {/* Home */}
          <li>
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                pathname === "/"
                  ? "text-primary bg-primary/10"
                  : "text-white/70 hover:text-white hover:bg-white/5"
              )}
            >
              <Home className="w-4 h-4" />
              {t("header.nav.home", "Home")}
            </Link>
          </li>

          {/* 5级导航 */}
          {navItems.map((item) => (
            <li key={item.key}>
              {item.children ? (
                <div className="py-1">
                  <button
                    onClick={() => toggleMobileItem(item.key)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 rounded-md transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {item.icon && <item.icon className="w-4 h-4" />}
                      {item.label}
                    </div>
                    <ChevronRight
                      className={cn(
                        "w-4 h-4 transition-transform",
                        expandedMobileItems.has(item.key) && "rotate-90"
                      )}
                    />
                  </button>
                  {expandedMobileItems.has(item.key) && (
                    <ul className="ml-4 mt-1 flex flex-col gap-1 list-none p-0 animate-in slide-in-from-top-1">
                      {item.children.map((child) => (
                        <li key={child.key}>
                          <Link
                            href={child.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                              isActive(child.href)
                                ? "text-primary bg-primary/10"
                                : "text-white/50 hover:text-white/70 hover:bg-white/5"
                            )}
                          >
                            {child.icon && <child.icon className="w-4 h-4" />}
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <Link
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive(item.href)
                      ? "text-primary bg-primary/10"
                      : "text-white/70 hover:text-white hover:bg-white/5"
                  )}
                >
                  {item.icon && <item.icon className="w-4 h-4" />}
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>
    );
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-[1000] transition-all duration-300",
        scrolled && "border-b backdrop-blur-[12px]"
      )}
      style={{
        background: scrolled ? "rgba(10, 15, 13, 0.85)" : "transparent",
        height: "var(--header-height)",
        borderColor: scrolled ? "rgba(255, 255, 255, 0.1)" : "transparent",
        boxShadow: scrolled ? "0 4px 30px rgba(0, 0, 0, 0.3)" : "none",
      }}
    >
      <div
        className={cn(
          "flex items-center justify-between h-full",
          RemoveScroll.classNames.fullWidth
        )}
        style={{
          padding: "var(--header-padding-y) var(--header-padding-x)",
        }}
      >
        {/* 左侧：Logo */}
        <div className="flex items-center">
          <Link
            href="/"
            aria-label={`${isHydrated ? t("header.title") : "SuperCrypto"} - 首页`}
            className="no-underline flex items-center gap-3"
          >
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
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4.5 16.5C3 15 2 13 2 10C2 5.5 5.5 2 10 2C13.5 2 16.5 3.5 18.5 6L13 10L15 12L19.5 8C20.5 10 21 12.5 21 15C21 19 18 22 14 22L11.5 19L13 17.5L4.5 16.5Z"
                  stroke="#0A0F0D"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h1
              className="m-0 font-bold bg-clip-text text-transparent hidden sm:block"
              style={{
                background: "linear-gradient(135deg, #00D4AA 0%, #33FFCC 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                fontSize: "var(--logo-title-size)",
              }}
            >
              {isHydrated ? t("header.title") : "SuperCrypto"}
            </h1>
          </Link>
        </div>

        {/* 中间：桌面端导航 */}
        {renderDesktopNav()}

        {/* 右侧：语言切换 + 钱包连接 + 移动端菜单 */}
        <div
          className="flex items-center"
          style={{ gap: "var(--header-space)" }}
        >
          <LanguageSwitcher aria-label="切换语言" />
          <WalletConnect />

          {/* Mobile Menu Button */}
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
            <SheetContent side="right" className="w-[300px] bg-bg-dark border-white/10">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 text-white">
                  <div
                    className="flex items-center justify-center rounded-lg"
                    style={{
                      width: 28,
                      height: 28,
                      background: "linear-gradient(135deg, #00D4AA 0%, #00A080 100%)",
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M4.5 16.5C3 15 2 13 2 10C2 5.5 5.5 2 10 2C13.5 2 16.5 3.5 18.5 6L13 10L15 12L19.5 8C20.5 10 21 12.5 21 15C21 19 18 22 14 22L11.5 19L13 17.5L4.5 16.5Z"
                        stroke="#0A0F0D"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <span>{isHydrated ? t("header.title") : "SuperCrypto"}</span>
                </SheetTitle>
              </SheetHeader>
              {renderMobileNav()}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
