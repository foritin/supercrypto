"""
审计装饰器 - audit_log

用于在服务方法上声明式添加审计
"""
import asyncio
import time
from functools import wraps
from typing import Any, Callable, List, Optional

from falib.utils.log import get_logger

from src.shared.schemas.enums import AuditAction, AuditCategory, AuditStatus

logger = get_logger("system.decorator.audit")


def audit_log(
    category: AuditCategory,
    action: AuditAction,
    target_type: Optional[str] = None,
    capture_args: Optional[List[str]] = None,
    capture_result: bool = False,
    async_log: bool = True,
):
    """
    审计日志装饰器

    用于在服务方法上声明式添加审计日志记录

    Args:
        category: 审计类别
        action: 审计操作
        target_type: 目标类型
        capture_args: 要捕获的参数名列表
        capture_result: 是否捕获返回值
        async_log: 是否异步记录（不阻塞主业务）

    Example:
        @audit_log(
            category=AuditCategory.KYC,
            action=AuditAction.KYC_APPROVE,
            target_type="kyc_application",
            capture_args=["application_id", "reason"],
            capture_result=True
        )
        async def approve_kyc(self, application_id: int, reason: str):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs) -> Any:
            start_time = time.time()
            old_value = None
            result = None
            status = AuditStatus.SUCCESS
            error_message = None

            # 捕获参数
            if capture_args:
                old_value = {}
                for arg_name in capture_args:
                    if arg_name in kwargs:
                        old_value[arg_name] = _serialize_value(kwargs[arg_name])

            try:
                result = await func(*args, **kwargs)
                return result

            except Exception as e:
                status = AuditStatus.FAILED
                error_message = str(e)
                raise

            finally:
                duration_ms = int((time.time() - start_time) * 1000)

                # 准备新值
                new_value = None
                if capture_result and result is not None:
                    new_value = _serialize_value(result)

                # 尝试从参数中提取 target_id
                target_id = None
                if capture_args:
                    # 常见的 ID 参数名
                    for id_name in ["id", "target_id", "application_id", "account_id", "contract_id"]:
                        if id_name in kwargs:
                            target_id = kwargs[id_name]
                            break

                # 尝试从 self 获取 operator 信息
                operator_id = None
                operator_address = None
                request_id = None
                ip_address = None

                # 如果第一个参数是 self，尝试获取 request 信息
                if args and hasattr(args[0], "request"):
                    request = args[0].request
                    if hasattr(request, "state"):
                        operator_address = getattr(request.state, "wallet_address", None)
                        operator_id = getattr(request.state, "account_id", None)
                        request_id = getattr(request.state, "request_id", None)
                    if hasattr(request, "client") and request.client:
                        ip_address = request.client.host

                # 记录审计日志
                await _log_audit(
                    category=category,
                    action=action,
                    status=status,
                    target_type=target_type,
                    target_id=target_id,
                    operator_id=operator_id,
                    operator_address=operator_address,
                    old_value=old_value,
                    new_value=new_value,
                    duration_ms=duration_ms,
                    error_message=error_message,
                    request_id=request_id,
                    ip_address=ip_address,
                    async_log=async_log,
                )

        @wraps(func)
        def sync_wrapper(*args, **kwargs) -> Any:
            # 同步函数不支持审计装饰器
            logger.warning(
                f"audit_log decorator on sync function {func.__name__} is not supported"
            )
            return func(*args, **kwargs)

        # 根据函数类型返回对应的 wrapper
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper

    return decorator


async def _log_audit(
    category: AuditCategory,
    action: AuditAction,
    status: AuditStatus,
    target_type: Optional[str],
    target_id: Optional[int],
    operator_id: Optional[int],
    operator_address: Optional[str],
    old_value: Optional[dict],
    new_value: Optional[dict],
    duration_ms: int,
    error_message: Optional[str],
    request_id: Optional[str],
    ip_address: Optional[str],
    async_log: bool,
) -> None:
    """记录审计日志"""
    try:
        # 延迟导入避免循环依赖
        from src.services.audit.service import audit_service

        if async_log:
            await audit_service.log_async(
                category=category,
                action=action,
                status=status,
                target_type=target_type,
                target_id=target_id,
                operator_id=operator_id,
                operator_address=operator_address,
                old_value=old_value,
                new_value=new_value,
                duration_ms=duration_ms,
                error_message=error_message,
                request_id=request_id,
                ip_address=ip_address,
            )
        else:
            await audit_service.log(
                category=category,
                action=action,
                status=status,
                target_type=target_type,
                target_id=target_id,
                operator_id=operator_id,
                operator_address=operator_address,
                old_value=old_value,
                new_value=new_value,
                duration_ms=duration_ms,
                error_message=error_message,
                request_id=request_id,
                ip_address=ip_address,
            )
    except Exception as e:
        logger.error(f"Failed to log audit in decorator: {e}")


def _serialize_value(value: Any) -> Any:
    """序列化值为可 JSON 化的格式"""
    if value is None:
        return None

    # 基本类型直接返回
    if isinstance(value, (str, int, float, bool)):
        return value

    # 列表
    if isinstance(value, list):
        return [_serialize_value(v) for v in value]

    # 字典
    if isinstance(value, dict):
        return {k: _serialize_value(v) for k, v in value.items()}

    # Pydantic 模型
    if hasattr(value, "model_dump"):
        return value.model_dump()

    # 有 dict 方法的对象
    if hasattr(value, "dict"):
        return value.dict()

    # 其他对象转字符串
    return str(value)
