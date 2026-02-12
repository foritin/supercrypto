import type { Metadata } from "next";
import { SecurityContent } from "./SecurityContent";

export const metadata: Metadata = {
  title: "Security | SuperCrypto",
  description:
    "Learn about SuperCrypto's comprehensive security measures including smart contract audits, multi-sig wallets, and insurance coverage.",
};

export default function SecurityPage() {
  return <SecurityContent />;
}
