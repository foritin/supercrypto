"""
SuperCrypto API - FastAPI应用主入口
"""

from contextlib import asynccontextmanager

from falib.adapter.scheduler import SchedulerService
from falib.utils.config import SETTINGS
from falib.utils.log import get_logger
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from tortoise import Tortoise

from src.api.v1.router import api_router
from src.models import Account
from src.shared.aerich_redirect import TORTOISE_ORM
from src.shared.common.adapters import close_async_redis_adapter
from src.shared.common.exceptions import BusinessException
from src.shared.middleware import AuditMiddleware, AuthStateMiddleware
from src.tasks.contract_task import async_sync_provider_registry

settings = SETTINGS
logger = get_logger("api.main")


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

    # 生成数据库表（开发环境）
    if settings.debug:
        await Tortoise.generate_schemas()
        print("✅ Database schemas generated")

    yield

    # 关闭时执行
    print("🛑 Shutting down SuperCrypto API...")
    await Tortoise.close_connections()
    print("✅ Database connections closed")
    await close_async_redis_adapter()
    print("✅ Redis connection closed")
    print("🛑 Scheduler stopped")
    await SchedulerService.stop()
    print("✅ Scheduler stopped")


# 创建FastAPI应用
app = FastAPI(
    title="SuperCrypto API",
    description="Web3加密货币管理API - 支持账户、钱包、交易管理",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)


# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应该限制具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 认证状态中间件 - 解析 JWT 并注入到 request.state


app.add_middleware(AuthStateMiddleware)

# 审计中间件 - 自动记录需要审计的 API 请求
app.add_middleware(AuditMiddleware)


# 全局异常处理
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    请求验证异常处理器 (422)

    记录详细日志便于调试
    """
    logger.warning(
        f"Validation error: {request.method} {request.url.path} - {exc.errors()}"
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "code": 422,
            "message": "Validation error",
            "detail": exc.errors(),
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
    logger.warning(
        f"Business exception: {request.method} {request.url.path} - "
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
    logger.exception(
        f"Unhandled exception: {request.method} {request.url.path} - {exc}"
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
        "version": "1.0.0",
        "database": db_status,
        "environment": settings.environment,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app", host="0.0.0.0", port=8000, reload=settings.debug, log_level="info"
    )
