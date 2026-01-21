import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers";
import { MainLayout } from "@/components/layout/main-layout";
import { ThemeProvider } from "@/contexts/theme-context";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SlimCrypto - RWA Investment Platform",
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
      lang="en"
      className={inter.variable}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <body suppressHydrationWarning>
        <ThemeProvider>
          <Providers>
            <MainLayout>{children}</MainLayout>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
