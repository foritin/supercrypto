"""
SuperCrypto API - FastAPI应用主入口
"""

from contextlib import asynccontextmanager

from falib.utils.config import SETTINGS
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from tortoise import Tortoise

from src.api.v1.router import api_router
from src.shared.aerich_redirect import TORTOISE_ORM
from src.shared.exceptions import BusinessException

settings = SETTINGS


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

    # 生成数据库表（开发环境）
    if settings.debug:
        await Tortoise.generate_schemas()
        print("✅ Database schemas generated")

    yield

    # 关闭时执行
    print("🛑 Shutting down SuperCrypto API...")
    await Tortoise.close_connections()
    print("✅ Database connections closed")


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


# 全局异常处理
@app.exception_handler(BusinessException)
async def business_exception_handler(request: Request, exc: BusinessException):
    """
    业务异常处理器

    捕获所有业务异常并返回统一格式
    """
    return JSONResponse(
        status_code=exc.code,
        content={
            "code": exc.code,
            "message": exc.message,
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
    print(f"❌ Unhandled exception: {exc}")
    import traceback

    traceback.print_exc()

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
        from src.models import Account

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
