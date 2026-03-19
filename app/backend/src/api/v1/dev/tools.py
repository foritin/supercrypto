"""
开发者工具路由 - 通用开发工具
用于运维与测试辅助能力（部分接口受网络环境限制）

路由前缀: /api/v1/dev
"""

from falib.utils.handlers import create_success_response
from fastapi import APIRouter, Depends, HTTPException, status

from src.common.dependencies import get_treasury_service
from src.schemas.dev import FaucetRequest
from src.schemas.redemption import (
    TreasuryInitConfirmRequest,
    TreasuryInitPrepareResponse,
    TreasuryInitRequest,
    TreasuryInitResponse,
    UpdateSignersRequest,
)
from src.security import require_admin, require_contract_owner
from src.services import DevToolsService, TreasuryService

router = APIRouter()


def get_service() -> DevToolsService:
    """获取开发者工具服务实例"""
    return DevToolsService()


@router.get("/environment")
async def get_environment():
    """
    获取当前环境信息

    Returns:
        环境信息
    """
    service = get_service()

    return create_success_response(
        object_data={
            "environment": service.get_environment(),
            "reset_allowed": service.is_reset_allowed(),
        }
    )


@router.get("/token-recipients")
async def get_token_recipients(
    admin_address: str = Depends(require_admin),
):
    """
    获取可接收测试代币的用户列表

    仅管理员可调用，返回所有已通过 KYC 的用户（排除 admin 自己）

    Returns:
        可接收代币的用户列表
    """
    service = get_service()

    # 检查环境
    if not service.is_reset_allowed():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This feature is only available in hardhat environment",
        )

    recipients = await service.get_token_recipients()
    return create_success_response(list_data=[r.model_dump() for r in recipients])


@router.post("/faucet")
async def faucet_eth(
    request: FaucetRequest,
    admin_address: str = Depends(require_admin),
):
    """
    ETH 水龙头 - 给指定地址充值 ETH

    仅在 hardhat 网络可用，通过 hardhat_setBalance 直接设置余额
    """
    service = get_service()

    if not service.is_reset_allowed():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This feature is only available in hardhat environment",
        )

    result = await service.faucet_eth(request.address, request.amount_eth)
    return create_success_response(object_data=result)


# ============ Treasury Multisig Dev Tools ============


@router.post("/treasury/init")
async def init_treasury_multisig(
    data: TreasuryInitRequest,
    wallet_address: str = Depends(require_contract_owner),
    service: TreasuryService = Depends(get_treasury_service),
):
    """
    初始化 TreasuryMultisig 合约

    - **signer_addresses**: 多签成员地址列表 (至少3个)
    - **required_signatures**: 签名阈值 (默认2)

    仅部署者可调用
    """
    result = await service.init_treasury(
        signer_addresses=data.signer_addresses,
        required_signatures=data.required_signatures,
    )

    return create_success_response(
        object_data=result,
        msg="Treasury multisig initialized successfully",
    )


@router.post("/treasury/init/prepare")
async def prepare_init_treasury_multisig(
    data: TreasuryInitRequest,
    wallet_address: str = Depends(require_contract_owner),
    service: TreasuryService = Depends(get_treasury_service),
):
    """准备 TreasuryMultisig signer 配置交易参数（前端钱包签名模式）。"""
    _ = wallet_address
    result = await service.prepare_init_treasury(
        signer_addresses=data.signer_addresses,
        required_signatures=data.required_signatures,
    )
    return create_success_response(
        object_data=TreasuryInitPrepareResponse(**result).model_dump(mode="json"),
        msg="Treasury multisig init transaction prepared",
    )


@router.post("/treasury/init/confirm")
async def confirm_init_treasury_multisig(
    data: TreasuryInitConfirmRequest,
    wallet_address: str = Depends(require_contract_owner),
    service: TreasuryService = Depends(get_treasury_service),
):
    """确认 TreasuryMultisig signer 配置交易完成并校验链上状态。"""
    _ = wallet_address
    result = await service.confirm_init_treasury(
        signer_addresses=data.signer_addresses,
        required_signatures=data.required_signatures,
        tx_hash=data.tx_hash,
    )
    return create_success_response(
        object_data=TreasuryInitResponse(**result).model_dump(mode="json"),
        msg="Treasury multisig initialized successfully",
    )


@router.get("/treasury/config")
async def get_treasury_config(
    admin_address: str = Depends(require_admin),
    service: TreasuryService = Depends(get_treasury_service),
):
    """
    获取当前国库多签配置

    返回:
    - 合约地址
    - 多签成员列表
    - 签名阈值
    """
    config = await service.get_treasury_config()
    return create_success_response(object_data=config.model_dump(mode="json"))


@router.post("/treasury/signers")
async def update_treasury_signers(
    data: UpdateSignersRequest,
    wallet_address: str = Depends(require_contract_owner),
    service: TreasuryService = Depends(get_treasury_service),
):
    """
    更新多签成员

    - **signer_addresses**: 新的多签成员地址列表
    - **required_signatures**: 新的签名阈值

    仅部署者可调用
    """
    result = await service.update_signers(
        signer_addresses=data.signer_addresses,
        required_signatures=data.required_signatures,
    )

    return create_success_response(
        object_data=result,
        msg="Treasury signers updated successfully",
    )
