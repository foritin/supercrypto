import { describe, expect, it } from "vitest";

import { render, screen } from "@/test/utils";

import { NetWorthCard } from "./net-worth-card";

describe("NetWorthCard", () => {
  it("renders real net worth immediately and hides 24h badge when no real change data is provided", () => {
    render(
      <NetWorthCard
        totalValue={1000}
        totalInvested={800}
      />
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("$1000.00");
    expect(screen.queryByText(/24h/i)).not.toBeInTheDocument();
  });
});
