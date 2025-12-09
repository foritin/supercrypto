"""
API v1 主路由
聚合所有领域的路由
"""
from fastapi import APIRouter

from src.domains.account.routes import router as account_router
from src.domains.wallet.routes import router as wallet_router
from src.domains.transaction.routes import router as transaction_router
from src.domains.account.routes import auth_router

# 创建主路由器
api_router = APIRouter()

# 注册各领域的路由
api_router.include_router(
    account_router,
    prefix="/account",
    tags=["账户管理"]
)

api_router.include_router(
    auth_router,
    prefix="/auth",
    tags=["认证管理"]
)

api_router.include_router(
    wallet_router,
    prefix="/wallets",
    tags=["钱包管理"]
)

api_router.include_router(
    transaction_router,
    prefix="/transactions",
    tags=["交易管理"]
)




