import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { pickPreferredContractAddressStablecoin } from "@/lib/stablecoin-selector";
import type { ContractAddressItem } from "@/services/contract";

function item(overrides: Partial<ContractAddressItem>): ContractAddressItem {
  return {
    name: "USDT",
    address: "0x0000000000000000000000000000000000000001",
    symbol: "USDT",
    scope: "project",
    project_name: "default",
    ...overrides,
  };
}

const ethAddressArb = fc
  .stringMatching(/^[0-9a-f]{40}$/)
  .map((hex) => `0x${hex}`);

describe("pickPreferredStablecoin", () => {
  it("优先选择 exact + global", () => {
    fc.assert(
      fc.property(ethAddressArb, ethAddressArb, ethAddressArb, (best, exactProject, fuzzyGlobal) => {
        const contracts: ContractAddressItem[] = [
          item({ address: exactProject, name: "USDT", symbol: "USDT", scope: "project" }),
          item({ address: fuzzyGlobal, name: "USDTVault", symbol: null, scope: "global" }),
          item({ address: best, name: "MockUSDT", symbol: "USDT", scope: "global" }),
        ];

        const picked = pickPreferredContractAddressStablecoin(contracts, "USDT");
        expect(picked?.address).toBe(best);
      }),
      { numRuns: 100 }
    );
  });

  it("没有 exact 时优先 global", () => {
    fc.assert(
      fc.property(ethAddressArb, ethAddressArb, (globalAddr, projectAddr) => {
        const contracts: ContractAddressItem[] = [
          item({ address: projectAddr, name: "SuperUSDTPool", symbol: null, scope: "project" }),
          item({ address: globalAddr, name: "USDTAdapter", symbol: null, scope: "global" }),
        ];

        const picked = pickPreferredContractAddressStablecoin(contracts, "USDT");
        expect(picked?.address).toBe(globalAddr);
      }),
      { numRuns: 100 }
    );
  });

  it("无匹配时返回 undefined", () => {
    const contracts: ContractAddressItem[] = [
      item({ name: "DAI", symbol: "DAI", scope: "global" }),
      item({ name: "USDC", symbol: "USDC", scope: "global" }),
    ];

    const picked = pickPreferredContractAddressStablecoin(contracts, "USDT");
    expect(picked).toBeUndefined();
  });
});
