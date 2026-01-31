import type { Metadata } from "next";
import { FaqContent } from "./FaqContent";

export const metadata: Metadata = {
  title: "FAQ | SlimCrypto",
  description:
    "Find answers to frequently asked questions about SlimCrypto platform, RWA investments, KYC verification, and more.",
};

export default function FaqPage() {
  return <FaqContent />;
}
