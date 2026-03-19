export function normalizeNetworkName(network: string | null | undefined): string {
  return (network || '').trim().toLowerCase()
}

export function getExpectedBackendNetwork(): string {
  return normalizeNetworkName(process.env.NEXT_PUBLIC_BACKEND_NETWORK)
}

export function validateBackendNetworkOrThrow(actualNetwork: string): void {
  const expected = getExpectedBackendNetwork()
  const actual = normalizeNetworkName(actualNetwork)

  if (!expected || !actual) return

  if (expected !== actual) {
    throw new Error(
      `Backend network mismatch: expected '${expected}', got '${actual}'. Please align frontend NEXT_PUBLIC_BACKEND_NETWORK with backend config.`
    )
  }
}
