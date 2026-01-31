import type { Metadata } from "next";
import { TermsContent } from "./TermsContent";

export const metadata: Metadata = {
  title: "Terms of Service | SlimCrypto",
  description:
    "Terms and conditions governing your use of the SlimCrypto platform. Please read carefully before using our services.",
};

export default function TermsPage() {
  return <TermsContent />;
}
