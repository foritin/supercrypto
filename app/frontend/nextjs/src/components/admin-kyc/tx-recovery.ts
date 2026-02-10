/**
 * tx-recovery — 链上交易恢复工具
 *
 * 解决场景: MetaMask 交易成功后，recordAdmission / recordRevocation 后端调用失败
 * 会丢失 tx_hash，导致链上状态与后端不一致。
 *
 * 策略: 交易确认后立即存入 localStorage，后端记录成功后清除。
 * 组件挂载时检查 pending recovery，提示用户重试。
 */

const STORAGE_KEY_PREFIX = 'kyc_tx_recovery_'

export type TxRecoveryType = 'admission' | 'revocation'

export interface TxRecoveryEntry {
  type: TxRecoveryType
  kycId: number
  txHash: string
  timestamp: number
  /** 仅 revocation 时需要 */
  reason?: string
}

function getKey(kycId: number, type: TxRecoveryType): string {
  return `${STORAGE_KEY_PREFIX}${type}_${kycId}`
}

/**
 * 保存待恢复交易
 */
export function savePendingTx(entry: TxRecoveryEntry): void {
  try {
    localStorage.setItem(getKey(entry.kycId, entry.type), JSON.stringify(entry))
  } catch {
    // localStorage 不可用时静默失败
  }
}

/**
 * 清除已完成的交易
 */
export function clearPendingTx(kycId: number, type: TxRecoveryType): void {
  try {
    localStorage.removeItem(getKey(kycId, type))
  } catch {
    // 静默
  }
}

/**
 * 获取待恢复交易 (如果存在)
 */
export function getPendingTx(
  kycId: number,
  type: TxRecoveryType
): TxRecoveryEntry | null {
  try {
    const raw = localStorage.getItem(getKey(kycId, type))
    if (!raw) return null

    const entry: TxRecoveryEntry = JSON.parse(raw)

    // 超过 24 小时的记录自动清理
    const MAX_AGE_MS = 24 * 60 * 60 * 1000
    if (Date.now() - entry.timestamp > MAX_AGE_MS) {
      clearPendingTx(kycId, type)
      return null
    }

    return entry
  } catch {
    return null
  }
}

/**
 * 获取所有待恢复交易 (用于全局提示)
 */
export function getAllPendingTxs(): TxRecoveryEntry[] {
  const results: TxRecoveryEntry[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(STORAGE_KEY_PREFIX)) {
        const raw = localStorage.getItem(key)
        if (raw) {
          try {
            results.push(JSON.parse(raw))
          } catch {
            // skip corrupted entry
          }
        }
      }
    }
  } catch {
    // localStorage not available
  }
  return results
}
