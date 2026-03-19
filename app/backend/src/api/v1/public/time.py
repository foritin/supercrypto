"""
时间服务 API - 提供 UTC 时间戳用于前端时间同步

确保前端与后端/合约时间一致性
"""

from datetime import datetime, timezone

from falib.utils.log import get_logger
from fastapi import APIRouter

from falib.utils.handlers import create_success_response

logger = get_logger("api.public.time")

router = APIRouter()


@router.get("/time")
async def get_current_time():
    """
    获取当前 UTC 时间戳
    
    用于前端时间同步，确保收益计算时间一致性
    
    Returns:
        {
            "timestamp": 1710662400,  # Unix 时间戳（秒）
            "iso": "2026-03-17T10:00:00+00:00",  # ISO 8601 格式
            "formatted": "2026-03-17 10:00 UTC"  # 格式化字符串
        }
    """
    now = datetime.now(timezone.utc)
    
    return create_success_response(
        object_data={
            "timestamp": int(now.timestamp()),  # Unix 时间戳（秒）
            "iso": now.isoformat(),  # ISO 8601 格式
            "formatted": now.strftime("%Y-%m-%d %H:%M UTC"),  # 格式化字符串
        },
        message="Current UTC time",
    )
