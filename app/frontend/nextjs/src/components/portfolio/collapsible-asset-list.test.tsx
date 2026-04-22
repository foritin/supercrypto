import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { render, screen } from "@/test/utils";

import { CollapsibleAssetList } from "./collapsible-asset-list";

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
  motion: {
    div: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => {
      const {
        initial: _initial,
        animate: _animate,
        exit: _exit,
        transition: _transition,
        layout: _layout,
        ...htmlProps
      } = props;
      return <div {...htmlProps}>{children}</div>;
    },
  },
}));

vi.mock("./investment-detail-modal", () => ({
  InvestmentDetailModal: () => null,
}));

describe("CollapsibleAssetList", () => {
  it("shows group percentage based on real total portfolio value", () => {
    render(
      <CollapsibleAssetList
        groups={[
          {
            title: "Active Investments",
            type: "investment",
            totalValue: 50,
            icon: () => <span />,
            color: "#10b981",
            assets: [
              {
                id: "1",
                name: "Asset A",
                symbol: "AAA",
                invested: 40,
                currentValue: 50,
                expectedReturn: 10,
                apy: 8,
                status: "active",
                daysLeft: 10,
                progress: 50,
                lockPeriod: 3,
              },
            ],
          },
          {
            title: "Matured Positions",
            type: "investment",
            totalValue: 150,
            icon: () => <span />,
            color: "#3b82f6",
            assets: [
              {
                id: "2",
                name: "Asset B",
                symbol: "BBB",
                invested: 120,
                currentValue: 150,
                expectedReturn: 30,
                apy: 12,
                status: "matured",
              },
            ],
          },
        ]}
      />
    );

    expect(screen.getByText("25.0% of portfolio")).toBeInTheDocument();
  });
});
