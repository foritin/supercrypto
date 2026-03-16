export interface WalletProvider {
  request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

/**
 * Best-effort revoke for current dApp origin.
 *
 * Notes:
 * - Only supported by some injected providers (e.g. MetaMask extension).
 * - For WalletConnect/mobile wallets this often returns unsupported.
 * - Caller should always fallback to wagmi disconnect + local auth cleanup.
 */
export async function revokeCurrentDappPermissions(): Promise<boolean> {
  if (typeof window === 'undefined') return false

  const provider = (window as Window & { ethereum?: WalletProvider }).ethereum
  if (!provider?.request) return false

  try {
    await provider.request({
      method: 'wallet_revokePermissions',
      params: [{ eth_accounts: {} }],
    })
    return true
  } catch {
    return false
  }
}
