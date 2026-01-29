"""
管理员审计日志路由

路由前缀: /api/v1/admin/audit-logs
"""
from datetime import datetime
from typing import Optional

from falib.utils.handlers import PaginationInfo, create_success_response
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from src.services.audit.service import AuditService, audit_service
from src.shared.schemas.enums import AuditAction, AuditCategory, AuditStatus
from src.shared.security import require_admin

router = APIRouter()


# ============ 依赖注入 ============

def get_audit_service() -> AuditService:
    """获取审计服务实例"""
    return audit_service


# ============ Endpoints ============

@router.get(
    "",
    summary="查询审计日志",
    description="分页查询审计日志，支持多条件过滤",
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
    """
    查询审计日志

    支持的过滤条件：
    - category: 审计类别 (account/permission/contract/asset/auth/system/kyc/staking)
    - action: 操作类型
    - operator_id: 操作者ID
    - operator_type: 操作者类型 (user/admin/system)
    - target_type: 目标类型
    - target_id: 目标ID
    - status: 操作状态 (success/failed/pending/reverted)
    - start_time/end_time: 时间范围
    - tx_hash: 交易哈希
    - ip_address: IP地址
    """
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

    pagination = PaginationInfo(
        total=total, page=page, page_size=page_size, total_pages=total_pages
    )

    return create_success_response(
        list_data=logs,
        pagination=pagination,
    )


@router.get(
    "/stats",
    summary="获取审计统计",
    description="获取审计日志统计数据",
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
    summary="导出审计日志",
    description="导出审计日志为 CSV 格式",
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
    import csv
    import io

    # 限制导出数量
    MAX_EXPORT = 10000

    logs, total, _ = await service.query(
        category=category,
        action=action,
        operator_id=operator_id,
        status=status,
        start_time=start_time,
        end_time=end_time,
        page=1,
        page_size=MAX_EXPORT,
    )

    # 生成 CSV
    output = io.StringIO()
    writer = csv.writer(output)

    # 写入表头
    writer.writerow([
        "ID", "时间", "类别", "操作", "状态",
        "操作者ID", "操作者地址", "操作者类型",
        "目标类型", "目标ID", "目标地址",
        "描述", "原因", "IP地址", "交易哈希",
        "耗时(ms)", "错误码", "错误信息"
    ])

    # 写入数据
    for log in logs:
        writer.writerow([
            log.id,
            log.operated_at.isoformat() if log.operated_at else "",
            log.category.value if log.category else "",
            log.action.value if log.action else "",
            log.status.value if log.status else "",
            log.operator_id or "",
            log.operator_address or "",
            log.operator_type or "",
            log.target_type or "",
            log.target_id or "",
            log.target_address or "",
            log.description or "",
            log.reason or "",
            log.ip_address or "",
            log.tx_hash or "",
            log.duration_ms or "",
            log.error_code or "",
            log.error_message or "",
        ])

    output.seek(0)

    # 返回 CSV 文件
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=audit_logs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        }
    )


@router.get(
    "/operator/{operator_id}",
    summary="获取操作者历史",
    description="获取指定操作者的审计历史",
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
    summary="获取目标对象历史",
    description="获取指定目标对象的审计历史",
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
    summary="获取审计日志详情",
    description="获取单条审计日志详情",
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
