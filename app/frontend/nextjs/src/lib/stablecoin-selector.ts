import type { ContractAddressItem } from "@/services/contract";
import type { AddressInfo } from "@/services/platform-info";

function isExactStablecoinName(name: string, token: "USDT" | "USDC"): boolean {
  const upperName = name.toUpperCase();
  return upperName === token || upperName === `MOCK${token}`;
}

export function pickPreferredAddressInfoStablecoin(
  contracts: AddressInfo[],
  names: string[]
): AddressInfo | undefined {
  const matched = contracts.filter((contract) => names.includes(contract.name));
  if (matched.length === 0) return undefined;

  const score = (contract: AddressInfo): number => {
    const isActive = contract.status === "active";
    const isGlobal = contract.scope === "global";

    if (isActive && isGlobal) return 0;
    if (isActive) return 1;
    if (isGlobal) return 2;
    return 3;
  };

  return matched
    .slice()
    .sort((a, b) => {
      const scoreDiff = score(a) - score(b);
      if (scoreDiff !== 0) return scoreDiff;
      return b.id - a.id;
    })[0];
}

export function pickPreferredContractAddressStablecoin(
  contracts: ContractAddressItem[],
  token: "USDT" | "USDC"
): ContractAddressItem | undefined {
  const matched = contracts.filter(
    (item) => item.symbol === token || item.name.toUpperCase().includes(token)
  );

  if (matched.length === 0) return undefined;

  const score = (item: ContractAddressItem): number => {
    const exactBySymbol = item.symbol === token;
    const exactByName = isExactStablecoinName(item.name, token);
    const isGlobal = item.scope === "global";

    if ((exactBySymbol || exactByName) && isGlobal) return 0;
    if (exactBySymbol || exactByName) return 1;
    if (isGlobal) return 2;
    return 3;
  };

  return matched
    .slice()
    .sort((a, b) => {
      const scoreDiff = score(a) - score(b);
      if (scoreDiff !== 0) return scoreDiff;
      return 0;
    })[0];
}