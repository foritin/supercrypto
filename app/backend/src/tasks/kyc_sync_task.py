"""
KYC 链上同步任务

定期执行以下职责:
- B-06: 重试 FAILED 状态的链上同步记录 (验证链上状态并修正)
- B-08: 记录同步失败通知到审计日志 + 应用日志
- C-04: 主动查询合约 isVerified() 与 DB 对账 (替代事件监听，更可靠)
"""

from datetime import datetime, timezone

from falib.utils.config import SETTINGS
from falib.utils.log import get_logger
from tortoise import Tortoise

from src.shared.common.chain_logger import ChainLogger

schedule_logger = get_logger("schedule.kyc_sync")
chain_log = ChainLogger("schedule.kyc_sync")

# ============ 配置 ============

MAX_RETRY_ATTEMPTS = 3
"""单条记录最大重试次数 (超过后标记为需人工介入)"""


def _is_db_available() -> bool:
    """检查 Tortoise ORM 连接池是否可用 (未关闭)"""
    try:
        conn = Tortoise.get_connection("default")
        # asyncpg pool 关闭后 _pool 会是 None 或处于 closing 状态
        pool = getattr(conn, "_pool", None)
        if pool is None:
            return False
        if getattr(pool, "_closing", False) or getattr(pool, "_closed", False):
            return False
        return True
    except Exception:
        return False


# ============ B-06: 重试失败同步 ============


async def retry_failed_kyc_syncs() -> None:
    """
    扫描 on_chain_sync_status=FAILED 的记录，
    调用 is_verified() 验证链上状态并修正 DB。

    业务逻辑:
    - 链上已验证 → 更新为 SYNCED + 记录审计日志
    - 链上仍未验证 → 递增失败计数，超过阈值记录告警

    注意: 复用应用级 Tortoise 连接池，不自行 init/close。
    """
    try:
        # 检查连接池是否可用 (热重载/关闭期间跳过)
        if not _is_db_available():
            schedule_logger.debug("DB pool not available, skipping retry_failed_kyc_syncs")
            return

        schedule_logger.info("Starting retry_failed_kyc_syncs task")

        from src.models.kyc import AccountKyc
        from src.models.kyc_audit_log import KycAuditLog
        from src.shared.schemas.enums import KycAuditAction, OnChainSyncStatus

        # 查找所有 FAILED 记录 (当前环境)
        failed_records = await AccountKyc.filter(
            on_chain_sync_status=OnChainSyncStatus.FAILED,
            network=SETTINGS.network,
        ).all()

        if not failed_records:
            schedule_logger.debug("No FAILED sync records found")
            return

        schedule_logger.info(
            f"Found {len(failed_records)} FAILED sync records to retry"
        )

        from src.services.kyc.contract_service import KycContractService

        contract_service = KycContractService()
        recovered = 0
        still_failed = 0

        for kyc in failed_records:
            try:
                is_verified = await contract_service.is_verified(kyc.address)

                if is_verified:
                    # 链上已验证 — 修正 DB 状态
                    kyc.on_chain_sync_status = OnChainSyncStatus.SYNCED
                    kyc.on_chain_synced_at = datetime.now(timezone.utc)
                    kyc.on_chain_error = None
                    await kyc.save()

                    await KycAuditLog.create(
                        kyc_id=kyc.id,
                        action=KycAuditAction.SYNC,
                        actor_address="system",
                        actor_role="system",
                        details={
                            "type": "auto_recovery",
                            "previous_status": "failed",
                            "new_status": "synced",
                            "tx_hash": kyc.on_chain_tx_hash,
                        },
                    )

                    recovered += 1
                    chain_log.chain_op(
                        "retry_sync",
                        "Auto-recovered: FAILED → SYNCED (verified on-chain)",
                        kyc_id=kyc.id,
                        investor_address=kyc.address,
                        tx_hash=kyc.on_chain_tx_hash,
                    )
                else:
                    # 链上仍未验证 — 计数失败次数
                    retry_count = _parse_retry_count(kyc.on_chain_error)
                    retry_count += 1

                    if retry_count >= MAX_RETRY_ATTEMPTS:
                        # B-08: 超过阈值 — 记录告警
                        kyc.on_chain_error = (
                            f"Auto-retry exhausted ({retry_count}/{MAX_RETRY_ATTEMPTS}): "
                            f"investor not verified on-chain. Manual intervention required."
                        )
                        await kyc.save()

                        await _notify_sync_failure(
                            kyc_id=kyc.id,
                            wallet_address=kyc.address,
                            tx_hash=kyc.on_chain_tx_hash or "unknown",
                            error=kyc.on_chain_error,
                        )
                    else:
                        kyc.on_chain_error = (
                            f"Auto-retry attempt {retry_count}/{MAX_RETRY_ATTEMPTS}: "
                            f"investor not verified on-chain"
                        )
                        await kyc.save()

                    still_failed += 1

            except Exception as e:
                schedule_logger.warning(f"Error retrying kyc_id={kyc.id}: {e}")
                still_failed += 1

        schedule_logger.info(
            f"retry_failed_kyc_syncs complete: "
            f"recovered={recovered}, still_failed={still_failed}"
        )

    except Exception as e:
        schedule_logger.error(f"retry_failed_kyc_syncs task error: {e}")


def _parse_retry_count(error_msg: str | None) -> int:
    """从 on_chain_error 字段解析已重试次数"""
    if not error_msg:
        return 0
    import re

    match = re.search(r"Auto-retry attempt (\d+)/", error_msg)
    if match:
        return int(match.group(1))
    if "Auto-retry exhausted" in error_msg:
        return MAX_RETRY_ATTEMPTS
    return 0


# ============ B-08: 失败通知 ============


async def _notify_sync_failure(
    kyc_id: int,
    wallet_address: str,
    tx_hash: str,
    error: str,
) -> None:
    """
    记录链上同步失败通知

    当前实现:
    - 写入 KycAuditLog (action=SYNC, details 含 alert_level)
    - 写入应用日志 (WARNING 级别)

    扩展点:
    - 可接入 webhook / 邮件 / Slack 通知
    """
    from src.models.kyc_audit_log import KycAuditLog
    from src.shared.schemas.enums import KycAuditAction

    await KycAuditLog.create(
        kyc_id=kyc_id,
        action=KycAuditAction.SYNC,
        actor_address="system",
        actor_role="system",
        details={
            "type": "sync_failure_alert",
            "alert_level": "critical",
            "wallet_address": wallet_address,
            "tx_hash": tx_hash,
            "error": error,
            "requires_manual_intervention": True,
        },
    )

    schedule_logger.warning(
        f"[ALERT] KYC sync failure requires intervention: "
        f"kyc_id={kyc_id}, address={wallet_address[:10]}..., "
        f"tx_hash={tx_hash[:16]}..., error={error[:100]}"
    )


# ============ C-04: 链上状态主动对账 ============


async def reconcile_chain_events() -> None:
    """
    主动查询链上 isVerified() 状态并与 DB 对账

    策略 (v2 — 主动查询，替代事件监听):
    - 查询所有需要对账的 KYC 记录 (SYNCED / FAILED / PENDING 且已审核通过)
    - 逐条调用合约 isVerified() 查询链上真实状态
    - 发现不一致时修正 DB 并记录审计日志

    优势:
    - 不依赖事件日志解析，无 web3 版本兼容问题
    - 直接读取链上最终状态，结果可靠
    - 能发现事件监听遗漏的状态变更
    """
    try:
        # 检查连接池是否可用 (热重载/关闭期间跳过)
        if not _is_db_available():
            schedule_logger.debug("DB pool not available, skipping reconcile_chain_events")
            return

        schedule_logger.info("Starting reconcile_chain_events task (active query mode)")

        from src.models.kyc import AccountKyc
        from src.models.kyc_audit_log import KycAuditLog
        from src.services.kyc.contract_service import KycContractService
        from src.shared.schemas.enums import KycAuditAction, KycStatus, OnChainSyncStatus

        # 初始化合约服务
        contract_service = KycContractService()
        try:
            await contract_service._get_contract()
        except (ValueError, FileNotFoundError) as e:
            schedule_logger.debug(f"KYC contract not available, skipping: {e}")
            return

        # 查询需要对账的记录:
        # 1. SYNCED — 确认链上仍然有效 (可能被 removeInvestor)
        # 2. FAILED — 确认链上是否实际已成功 (tx 可能延迟确认)
        # 3. PENDING + 已审核通过 — 确认是否已同步但 DB 未更新
        synced_records = await AccountKyc.filter(
            on_chain_sync_status=OnChainSyncStatus.SYNCED,
            network=SETTINGS.network,
        ).all()

        failed_or_pending_records = await AccountKyc.filter(
            on_chain_sync_status__in=[OnChainSyncStatus.FAILED, OnChainSyncStatus.PENDING],
            status=KycStatus.APPROVED,
            network=SETTINGS.network,
        ).all()

        all_records = synced_records + failed_or_pending_records

        if not all_records:
            schedule_logger.debug("No KYC records to reconcile")
            return

        schedule_logger.info(
            f"Reconciling {len(all_records)} records "
            f"(synced={len(synced_records)}, failed/pending={len(failed_or_pending_records)})"
        )

        reconciled = 0
        errors = 0

        for kyc in all_records:
            try:
                is_verified = await contract_service.is_verified(kyc.address)
                old_status = kyc.on_chain_sync_status

                if is_verified and old_status != OnChainSyncStatus.SYNCED:
                    # 链上已验证，但 DB 不是 SYNCED → 修正为 SYNCED
                    kyc.on_chain_sync_status = OnChainSyncStatus.SYNCED
                    kyc.on_chain_synced_at = datetime.now(timezone.utc)
                    kyc.on_chain_error = None
                    await kyc.save()

                    await KycAuditLog.create(
                        kyc_id=kyc.id,
                        action=KycAuditAction.SYNC,
                        actor_address="system",
                        actor_role="system",
                        details={
                            "type": "active_reconciliation",
                            "previous_status": str(old_status),
                            "new_status": "synced",
                            "reason": "isVerified() returned true",
                        },
                    )

                    chain_log.chain_op(
                        "reconcile",
                        f"Active reconcile: {old_status} → SYNCED",
                        kyc_id=kyc.id,
                        investor_address=kyc.address,
                    )
                    reconciled += 1

                elif not is_verified and old_status == OnChainSyncStatus.SYNCED:
                    # 链上未验证，但 DB 是 SYNCED → 修正为 REVOKED
                    kyc.on_chain_sync_status = OnChainSyncStatus.REVOKED
                    kyc.on_chain_synced_at = None
                    kyc.on_chain_error = None
                    await kyc.save()

                    await KycAuditLog.create(
                        kyc_id=kyc.id,
                        action=KycAuditAction.SYNC,
                        actor_address="system",
                        actor_role="system",
                        details={
                            "type": "active_reconciliation",
                            "previous_status": "synced",
                            "new_status": "revoked",
                            "reason": "isVerified() returned false",
                        },
                    )

                    chain_log.chain_op(
                        "reconcile",
                        "Active reconcile: SYNCED → REVOKED",
                        kyc_id=kyc.id,
                        investor_address=kyc.address,
                    )
                    reconciled += 1

            except Exception as e:
                schedule_logger.warning(
                    f"Error reconciling kyc_id={kyc.id}, address={kyc.address[:10]}...: {e}"
                )
                errors += 1

        schedule_logger.info(
            f"reconcile_chain_events complete: "
            f"total={len(all_records)}, reconciled={reconciled}, errors={errors}"
        )

    except Exception as e:
        schedule_logger.error(f"reconcile_chain_events task error: {e}")
