import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TransactionStatusPanel } from "./transaction-tracker";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("TransactionStatusPanel explorer links", () => {
  it("uses passed chainId for explorer URLs instead of hardcoded mainnet", () => {
    render(
      <TransactionStatusPanel
        state="completed"
        progress={100}
        chainId={137}
        context={{
          txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
          retryCount: 0,
        }}
      />,
    );

    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThan(0);

    for (const link of links) {
      const href = link.getAttribute("href") || "";
      expect(href).toContain("polygonscan.com/tx/");
      expect(href).not.toContain("etherscan.io/tx/");
    }
  });
});
