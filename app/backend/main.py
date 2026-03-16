"""
SuperCrypto API - FastAPI应用主入口
"""

# 抑制第三方库的弃用警告（uvicorn/websockets）
# 注意：tortoise ORM 的 pk/index 警告已在模型中修复
import warnings
warnings.filterwarnings(
    "ignore",
    message=".*WebSocketServerProtocol is deprecated.*",
    category=DeprecationWarning,
)

import asyncio
from contextlib import asynccontextmanager

from falib.adapter.scheduler import SchedulerService
from falib.utils.config import SETTINGS
from falib.utils.log import get_logger
from fastapi import Depends, FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from tortoise import Tortoise

from src.aerich_redirect import TORTOISE_ORM
from src.api.v1.router import api_router
from src.common.adapters import close_async_redis_adapter
from src.common.exceptions import BusinessException
from src.common.metrics import chain_metrics
from src.middleware import (
    AuditMiddleware,
    AuthStateMiddleware,
    RequestLoggingMiddleware,
)
from src.models import Account
from src.security import require_admin
from src.tasks.contract_task import async_sync_provider_registry
from src.tasks.kyc_sync_task import reconcile_chain_events, retry_failed_kyc_syncs
from src.tasks.subscription_reconcile_task import reconcile_subscription_events

settings = SETTINGS
logger = get_logger("api.main")

APP_VERSION = "1.0.0"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    应用生命周期管理

    启动时初始化数据库连接
    关闭时清理资源
    """
    # 启动时执行
    print("🚀 Starting SuperCrypto API...")

    # 初始化Tortoise ORM
    await Tortoise.init(config=TORTOISE_ORM)
    print("✅ Database connected")
    await SchedulerService.start()
    print("✅ Scheduler started")

    print("🔄 Scheduling tasks...")
    # 每 2 分钟同步 Provider 注册状态
    await SchedulerService.schedule_task(
        async_sync_provider_registry, "cyclic", interval=120
    )
    print("✅ Provider sync task scheduled (interval=120s)")

    # B-06: 每 5 分钟重试失败的 KYC 链上同步
    await SchedulerService.schedule_task(retry_failed_kyc_syncs, "cyclic", interval=300)
    print("✅ KYC failed sync retry task scheduled (interval=300s)")

    # C-04: 每 5 分钟扫描合约事件对账
    await SchedulerService.schedule_task(reconcile_chain_events, "cyclic", interval=300)
    print("✅ KYC chain event reconciliation task scheduled (interval=300s)")

    # Subscription: 每 5 分钟扫描认购事件台账一致性
    await SchedulerService.schedule_task(
        reconcile_subscription_events, "cyclic", interval=300
    )
    print("✅ Subscription reconciliation task scheduled (interval=300s)")

    # 生成数据库表（开发环境）
    if settings.debug:
        await Tortoise.generate_schemas()
        print("✅ Database schemas generated")

    yield

    # 关闭时执行 (顺序: 先停调度器 → 等待执行中任务完成 → 再关连接池)
    print("🛑 Shutting down SuperCrypto API...")
    await SchedulerService.stop()
    print("✅ Scheduler stopped")
    # 等待正在执行的定时任务完成，避免 "pool is closing"
    await asyncio.sleep(2)
    await Tortoise.close_connections()
    print("✅ Database connections closed")
    await close_async_redis_adapter()
    print("✅ Redis connection closed")


# 创建FastAPI应用
app = FastAPI(
    title="SuperCrypto API",
    description="Web3加密货币管理API - 支持账户、钱包、交易管理",
    version=APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)


# Production 环境允许的域名列表
_PRODUCTION_ORIGINS = [
    "https://supercrypto.io",
    "https://www.supercrypto.io",
    "https://app.supercrypto.io",
]

# 根据环境动态配置 CORS allow_origins
_cors_origins = _PRODUCTION_ORIGINS if settings.environment == "production" else ["*"]

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 认证状态中间件 - 解析 JWT 并注入到 request.state


app.add_middleware(AuthStateMiddleware)

# 审计中间件 - 自动记录需要审计的 API 请求
app.add_middleware(AuditMiddleware)

# 请求日志中间件 - 最后添加 = 最先执行，确保 request_id 对所有内层中间件可用
app.add_middleware(RequestLoggingMiddleware)


def _get_request_id(request: Request) -> str:
    """从 request.state 获取 request_id，不可用时返回 '-'"""
    return getattr(request.state, "request_id", "-")


# 全局异常处理
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    请求验证异常处理器 (422)

    记录详细日志便于调试
    """
    # 处理 errors() 中可能包含不可序列化对象的情况
    errors = []
    for err in exc.errors():
        # 复制错误信息，将 ctx 中的不可序列化对象转为字符串
        safe_err = {
            "type": err.get("type"),
            "loc": err.get("loc"),
            "msg": err.get("msg"),
        }
        # ctx 可能包含 ValueError 等不可序列化对象
        if "ctx" in err:
            ctx = err["ctx"]
            safe_err["ctx"] = (
                {k: str(v) for k, v in ctx.items()}
                if isinstance(ctx, dict)
                else str(ctx)
            )
        errors.append(safe_err)

    request_id = _get_request_id(request)
    logger.warning(
        f"[{request_id}] Validation error: {request.method} {request.url.path} - {errors}"
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={
            "code": 422,
            "message": "Validation error",
            "detail": errors,
            "path": str(request.url),
        },
    )


@app.exception_handler(BusinessException)
async def business_exception_handler(request: Request, exc: BusinessException):
    """
    业务异常处理器

    捕获所有业务异常并返回统一格式
    返回 error_code 用于前端国际化翻译
    """
    # 记录业务异常日志（包含错误码）
    # 转义花括号避免 loguru 解析为格式化占位符
    error_code_str = f"E{exc.error_code}" if exc.error_code else "N/A"
    detail_str = ""
    if exc.detail:
        # 将 {} 转义为 {{}} 避免 loguru 格式化
        detail_escaped = str(exc.detail).replace("{", "{{").replace("}", "}}")
        detail_str = f" | detail: {detail_escaped}"
    request_id = _get_request_id(request)
    logger.warning(
        f"[{request_id}] Business exception: {request.method} {request.url.path} - "
        f"[HTTP {exc.code}] [{error_code_str}] {exc.message}{detail_str}"
    )
    return JSONResponse(
        status_code=exc.code,
        content={
            "code": exc.code,
            "message": exc.message,
            "error_code": exc.error_code,
            "detail": exc.detail,
            "path": str(request.url),
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    全局异常处理器

    捕获未处理的异常
    """
    request_id = _get_request_id(request)
    logger.exception(
        f"[{request_id}] Unhandled exception: {request.method} {request.url.path} - {exc}"
    )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "code": 500,
            "message": "Internal server error",
            "detail": str(exc) if settings.debug else "An unexpected error occurred",
            "path": str(request.url),
        },
    )


# 注册路由
app.include_router(api_router, prefix="/api/v1")


# 健康检查（全局）
@app.get("/health", tags=["系统"])
async def health():
    """
    全局健康检查

    检查API和数据库连接状态
    """
    db_status = "ok"
    try:
        # 简单的数据库连接检查

        await Account.all().limit(1)
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "ok",
        "version": APP_VERSION,
        "database": db_status,
        "environment": settings.environment,
    }


@app.get("/metrics/chain", tags=["系统"], dependencies=[Depends(require_admin)])
async def chain_operation_metrics():
    """
    链上操作指标

    返回 chain operation 计数、耗时、错误信息。
    """
    return chain_metrics.snapshot()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level="info",
        access_log=False,
    )
