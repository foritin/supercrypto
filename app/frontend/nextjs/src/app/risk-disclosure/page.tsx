import type { Metadata } from "next";
import { RiskDisclosureContent } from "./RiskDisclosureContent";

export const metadata: Metadata = {
  title: "Risk Disclosure | SuperCrypto",
  description:
    "Important information about the risks associated with cryptocurrency investments and RWA tokenization. Please read carefully before investing.",
};

export default function RiskDisclosurePage() {
  return <RiskDisclosureContent />;
}
