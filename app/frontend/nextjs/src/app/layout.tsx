import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers";
import { MainLayout } from "@/components/layout/main-layout";
import { ThemeProvider } from "@/contexts/theme-context";
import { GlobalRiskDisclaimer } from "@/components/compliance";
import { CookieConsent } from "@/components/cookie-consent";
import { HtmlLangSync } from "@/components/html-lang-sync";

/**
 * Display Font - Playfair Display
 * 用于标题、Hero 文字，传达优雅、信任、金融专业感
 */
const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  weight: ["600", "700"],
  fallback: ["Georgia", "serif"],
});

/**
 * Body Font - Plus Jakarta Sans
 * 用于正文、UI 文字，现代清晰，保证可读性
 */
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  fallback: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
});

/**
 * Mono Font - JetBrains Mono
 * 用于代码、地址、数值，清晰区分相似字符
 */
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  weight: ["400", "500"],
  fallback: ["SF Mono", "Monaco", "Consolas", "monospace"],
});

export const metadata: Metadata = {
  title: "SuperCrypto - RWA Investment Platform",
  description:
    "Tokenized Real World Asset investment platform with transparent returns",
  keywords: ["RWA", "DeFi", "Crypto", "Investment", "Tokenization"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${playfairDisplay.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <body suppressHydrationWarning className="font-body">
        <ThemeProvider>
          <Providers>
            <HtmlLangSync />
            <MainLayout>{children}</MainLayout>
            <GlobalRiskDisclaimer />
            <CookieConsent />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
