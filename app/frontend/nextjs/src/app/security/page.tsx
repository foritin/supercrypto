import type { Metadata } from "next";
import { SecurityContent } from "./SecurityContent";

export const metadata: Metadata = {
  title: "Security | SlimCrypto",
  description:
    "Learn about SlimCrypto's comprehensive security measures including smart contract audits, multi-sig wallets, and insurance coverage.",
};

export default function SecurityPage() {
  return <SecurityContent />;
}
