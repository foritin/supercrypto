"""
Subscription 链上对账任务

目标：
- 扫描 VankeSubscription 的 Subscribe 事件
- 检测链上存在但本地 subscription 表缺失的交易
- 记录异常，便于运维处理与后续自动补录
"""

from falib.utils.log import get_logger
from web3 import AsyncHTTPProvider, AsyncWeb3

from src.common.adapters import get_async_redis_adapter
from src.common.utils import is_db_available
from src.infra.lock_service import DistributedLockService, LockAcquireError
from src.models.contracts.contract_deployment import ContractDeployment
from src.models.subscription import Subscription
from src.models.transaction_audit import TransactionAudit
from src.schemas.enums import ChainID, ContractStatus
from src.schemas.enums.audit import TransactionAuditStatus, TransactionAuditType

schedule_logger = get_logger("scheduler.subscription_reconcile")

RECONCILE_BATCH_BLOCKS = 1000
CURSOR_KEY_PREFIX = "subscription:reconcile:last_block"
SUBSCRIBE_EVENT_SIG = "Subscribe(address,uint256,uint256,uint256,uint256,address)"


async def reconcile_subscription_events() -> None:
    """入口：扫描链上认购事件并与本地台账对账"""
    if not is_db_available():
        schedule_logger.debug(
            "DB pool not available, skipping reconcile_subscription_events"
        )
        return

    try:
        lock_service = await DistributedLockService.get_instance()
    except Exception as e:
        schedule_logger.warning(
            f"Failed to get lock service, executing without lock: {e}"
        )
        return await _do_reconcile_subscription_events()

    try:
        async with lock_service.lock("task:subscription_reconcile", timeout=240):
            return await _do_reconcile_subscription_events()
    except LockAcquireError:
        schedule_logger.info("Another subscription reconcile task is running, skipping")
        return


async def _do_reconcile_subscription_events() -> None:
    """实际执行链上认购事件对账"""
    from falib.utils.config import SETTINGS

    web3 = AsyncWeb3(AsyncHTTPProvider(SETTINGS.CRYPTO.MAINNET_URL))
    chain_id = await web3.eth.chain_id

    try:
        network = ChainID.from_value_to_name(int(chain_id))
    except ValueError:
        schedule_logger.warning(
            f"Unknown chain id {chain_id}, skip subscription reconcile"
        )
        return

    deployment = await ContractDeployment.filter(
        name="VankeSubscription",
        network=network,
        chain_id=int(chain_id),
        status=ContractStatus.ACTIVE,
    ).first()

    if not deployment:
        schedule_logger.debug("No active VankeSubscription contract found, skipping")
        return

    latest_block = await web3.eth.block_number
    cursor_key = f"{CURSOR_KEY_PREFIX}:{network}:{chain_id}"

    async with get_async_redis_adapter() as redis:
        cursor_value = await redis.get(cursor_key)

    if cursor_value:
        from_block = int(cursor_value) + 1
    else:
        from_block = max(0, int(latest_block) - RECONCILE_BATCH_BLOCKS)

    if from_block > int(latest_block):
        return

    to_block = min(int(latest_block), from_block + RECONCILE_BATCH_BLOCKS)
    topic0 = web3.keccak(text=SUBSCRIBE_EVENT_SIG).hex()

    logs = await web3.eth.get_logs(
        {
            "fromBlock": from_block,
            "toBlock": to_block,
            "address": deployment.address,
            "topics": [topic0],
        }
    )

    missing_count = 0
    checked_count = 0

    for entry in logs:
        tx_hash = entry["transactionHash"].hex().lower()
        checked_count += 1

        exists = await Subscription.filter(
            tx_hash=tx_hash,
            environment=network,
        ).exists()
        if exists:
            continue

        missing_count += 1
        await _record_missing_subscription_event(
            tx_hash=tx_hash,
            chain_id=int(chain_id),
            network=network,
            contract_address=deployment.address.lower(),
            block_number=int(entry["blockNumber"]),
            log_index=int(entry["logIndex"]),
        )

    async with get_async_redis_adapter() as redis:
        await redis.set(cursor_key, str(to_block))

    schedule_logger.info(
        "subscription_reconcile complete: "
        f"contract={deployment.address[:10]}..., "
        f"range={from_block}-{to_block}, "
        f"checked={checked_count}, missing={missing_count}"
    )


async def _record_missing_subscription_event(
    tx_hash: str,
    chain_id: int,
    network: str,
    contract_address: str,
    block_number: int,
    log_index: int,
) -> None:
    """记录链上有事件但本地无认购记录的异常"""
    existing_audit = await TransactionAudit.filter(tx_hash=tx_hash).first()
    if existing_audit:
        return

    await TransactionAudit.create(
        tx_hash=tx_hash,
        chain_id=chain_id,
        network=network,
        from_address="0x0000000000000000000000000000000000000000",
        to_address=contract_address,
        value="0",
        tx_type=TransactionAuditType.CONTRACT_CALL,
        status=TransactionAuditStatus.CONFIRMED,
        contract_name="VankeSubscription",
        function_name="subscribe (reconcile-missing)",
        block_number=block_number,
        description="On-chain Subscribe event exists but local subscription record missing",
        extra_data={
            "source": "subscription_reconcile_task",
            "log_index": log_index,
            "action": "manual_review_required",
        },
        environment=network,
    )

    schedule_logger.warning(
        "[ALERT] Missing subscription ledger record detected: "
        f"tx_hash={tx_hash[:16]}..., block={block_number}, log_index={log_index}"
    )
