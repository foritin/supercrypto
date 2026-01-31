import type { Metadata } from "next";
import { PrivacyContent } from "./PrivacyContent";

export const metadata: Metadata = {
  title: "Privacy Policy | SlimCrypto",
  description:
    "Learn how SlimCrypto collects, uses, and protects your personal information. Your privacy is important to us.",
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
