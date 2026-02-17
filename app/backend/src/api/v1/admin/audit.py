"""
管理员审计日志路由

路由前缀: /api/v1/admin/audit-logs
"""

from datetime import datetime
from typing import Optional

from falib.utils.handlers import PaginationInfo, create_success_response
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from src.common.dependencies import get_audit_service
from src.schemas.enums import AuditAction, AuditCategory, AuditStatus
from src.security import require_admin
from src.services import AuditService

router = APIRouter()


# ============ Endpoints ============


@router.get(
    "",
    summary="Query Audit Logs",
    description="Query audit logs with pagination and multi-condition filtering",
)
async def query_audit_logs(
    category: Optional[AuditCategory] = Query(None, description="审计类别"),
    action: Optional[AuditAction] = Query(None, description="操作类型"),
    operator_id: Optional[int] = Query(None, description="操作者ID"),
    operator_type: Optional[str] = Query(None, description="操作者类型"),
    target_type: Optional[str] = Query(None, description="目标类型"),
    target_id: Optional[int] = Query(None, description="目标ID"),
    status: Optional[AuditStatus] = Query(None, description="操作状态"),
    start_time: Optional[datetime] = Query(None, description="开始时间"),
    end_time: Optional[datetime] = Query(None, description="结束时间"),
    tx_hash: Optional[str] = Query(None, description="交易哈希"),
    ip_address: Optional[str] = Query(None, description="IP地址"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    service: AuditService = Depends(get_audit_service),
    _admin=Depends(require_admin),
):
    """查询审计日志 — 支持按 category/action/operator/target/status/时间范围等多条件过滤"""
    logs, total, total_pages = await service.query(
        category=category,
        action=action,
        operator_id=operator_id,
        operator_type=operator_type,
        target_type=target_type,
        target_id=target_id,
        status=status,
        start_time=start_time,
        end_time=end_time,
        tx_hash=tx_hash,
        ip_address=ip_address,
        page=page,
        page_size=page_size,
    )

    return create_success_response(
        list_data=logs,
        pagination=PaginationInfo(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        ),
    )


@router.get(
    "/stats",
    summary="Get Audit Statistics",
    description="Get audit log statistics",
)
async def get_audit_stats(
    start_time: Optional[datetime] = Query(None, description="开始时间"),
    end_time: Optional[datetime] = Query(None, description="结束时间"),
    service: AuditService = Depends(get_audit_service),
    _admin=Depends(require_admin),
):
    """
    获取审计统计数据

    返回：
    - total_operations: 总操作数
    - success_count: 成功数
    - failed_count: 失败数
    - pending_count: 待处理数
    - by_category: 按类别统计
    - by_action: 按操作统计
    """
    stats = await service.get_stats(
        start_time=start_time,
        end_time=end_time,
    )
    return create_success_response(object_data=stats)


@router.get(
    "/export",
    summary="Export Audit Logs",
    description="Export audit logs in CSV format",
)
async def export_audit_logs(
    category: Optional[AuditCategory] = Query(None, description="审计类别"),
    action: Optional[AuditAction] = Query(None, description="操作类型"),
    operator_id: Optional[int] = Query(None, description="操作者ID"),
    status: Optional[AuditStatus] = Query(None, description="操作状态"),
    start_time: Optional[datetime] = Query(None, description="开始时间"),
    end_time: Optional[datetime] = Query(None, description="结束时间"),
    service: AuditService = Depends(get_audit_service),
    _admin=Depends(require_admin),
):
    """
    导出审计日志为 CSV 格式

    最多导出 10000 条记录
    """
    csv_content = await service.export_to_csv(
        category=category,
        action=action,
        operator_id=operator_id,
        status=status,
        start_time=start_time,
        end_time=end_time,
    )

    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=audit_logs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        },
    )


@router.get(
    "/operator/{operator_id}",
    summary="Get Operator History",
    description="Get audit history for a specific operator",
)
async def get_operator_history(
    operator_id: int,
    limit: int = Query(50, ge=1, le=200, description="返回数量"),
    service: AuditService = Depends(get_audit_service),
    _admin=Depends(require_admin),
):
    """
    获取操作者的审计历史
    """
    logs = await service.get_operator_history(
        operator_id=operator_id,
        limit=limit,
    )
    return create_success_response(list_data=logs)


@router.get(
    "/target/{target_type}/{target_id}",
    summary="Get Target History",
    description="Get audit history for a specific target object",
)
async def get_target_history(
    target_type: str,
    target_id: int,
    limit: int = Query(50, ge=1, le=200, description="返回数量"),
    service: AuditService = Depends(get_audit_service),
    _admin=Depends(require_admin),
):
    """
    获取目标对象的审计历史
    """
    logs = await service.get_target_history(
        target_type=target_type,
        target_id=target_id,
        limit=limit,
    )
    return create_success_response(list_data=logs)


@router.get(
    "/{log_id}",
    summary="Get Audit Log Detail",
    description="Get a single audit log entry detail",
)
async def get_audit_log(
    log_id: int,
    service: AuditService = Depends(get_audit_service),
    _admin=Depends(require_admin),
):
    """
    获取单条审计日志详情
    """
    log = await service.get_by_id(log_id)
    return create_success_response(object_data=log)
