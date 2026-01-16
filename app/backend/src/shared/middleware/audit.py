"""
审计中间件 - AuditMiddleware

自动记录 API 请求的审计日志
"""
import re
import time
import uuid
from typing import Callable, Dict, Optional, Tuple

from falib.utils.log import get_logger
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from src.shared.schemas.enums import AuditAction, AuditCategory, AuditStatus

logger = get_logger("audit.middleware")


class AuditMiddleware(BaseHTTPMiddleware):
    """
    审计中间件
    
    自动记录需要审计的 API 请求
    """
    
    # 需要审计的路由配置
    # 格式: (method, path_pattern) -> (category, action)
    AUDIT_ROUTES: Dict[Tuple[str, str], Tuple[AuditCategory, AuditAction]] = {
        # 认证相关
        ("POST", r"/api/v1/public/auth/token"): (AuditCategory.AUTH, AuditAction.AUTH_LOGIN),
        ("POST", r"/api/v1/public/auth/logout"): (AuditCategory.AUTH, AuditAction.AUTH_LOGOUT),
        ("POST", r"/api/v1/public/auth/refresh"): (AuditCategory.AUTH, AuditAction.AUTH_REFRESH),
        
        # KYC 管理 - 使用 /review 端点
        ("POST", r"/api/v1/admin/kyc/\d+/review"): (AuditCategory.KYC, AuditAction.KYC_REVIEW),
        ("POST", r"/api/v1/admin/kyc/\d+/retry-sync"): (AuditCategory.KYC, AuditAction.KYC_SYNC_RETRY),
        
        # 账户管理
        ("POST", r"/api/v1/admin/accounts/\d+/block"): (AuditCategory.ACCOUNT, AuditAction.ACCOUNT_BLOCK),
        ("POST", r"/api/v1/admin/accounts/\d+/unblock"): (AuditCategory.ACCOUNT, AuditAction.ACCOUNT_UNBLOCK),
        
        # 会话管理
        ("POST", r"/api/v1/admin/auth/sessions/[^/]+/revoke"): (AuditCategory.AUTH, AuditAction.USER_SESSION_REVOKE),
        ("DELETE", r"/api/v1/admin/auth/blacklist/[^/]+"): (AuditCategory.AUTH, AuditAction.USER_BLACKLIST_REMOVE),
        
        # 合约管理
        ("POST", r"/api/v1/admin/contracts/register/prepare"): (AuditCategory.CONTRACT, AuditAction.CONTRACT_REGISTER),
        ("POST", r"/api/v1/admin/contracts/register/confirm"): (AuditCategory.CONTRACT, AuditAction.CONTRACT_REGISTER),
        ("POST", r"/api/v1/admin/contracts/unregister/prepare"): (AuditCategory.CONTRACT, AuditAction.CONTRACT_UNREGISTER),
        ("POST", r"/api/v1/admin/contracts/unregister/confirm"): (AuditCategory.CONTRACT, AuditAction.CONTRACT_UNREGISTER),
        ("POST", r"/api/v1/admin/contracts/provider/sync"): (AuditCategory.CONTRACT, AuditAction.CONTRACT_SYNC),
        
        # 资产管理
        ("POST", r"/api/v1/admin/assets"): (AuditCategory.ASSET, AuditAction.ASSET_CREATE),
        ("PUT", r"/api/v1/admin/assets/\d+"): (AuditCategory.ASSET, AuditAction.ASSET_UPDATE),
        ("PATCH", r"/api/v1/admin/assets/\d+/status"): (AuditCategory.ASSET, AuditAction.ASSET_STATUS_CHANGE),
        ("POST", r"/api/v1/admin/assets/\d+/price"): (AuditCategory.ASSET, AuditAction.ASSET_PRICE_UPDATE),
        ("POST", r"/api/v1/admin/assets/\d+/bind-project"): (AuditCategory.ASSET, AuditAction.ASSET_BIND_CONTRACT),
        ("DELETE", r"/api/v1/admin/assets/\d+/unbind"): (AuditCategory.ASSET, AuditAction.ASSET_UNBIND_CONTRACT),
        
        # 权限管理
        ("POST", r"/api/v1/admin/permissions/grant"): (AuditCategory.PERMISSION, AuditAction.PERMISSION_GRANT),
        ("POST", r"/api/v1/admin/permissions/revoke"): (AuditCategory.PERMISSION, AuditAction.PERMISSION_REVOKE),
    }
    
    # 编译正则表达式
    _compiled_routes = None
    
    @classmethod
    def _get_compiled_routes(cls):
        """获取编译后的路由正则"""
        if cls._compiled_routes is None:
            cls._compiled_routes = [
                ((method, re.compile(f"^{pattern}$")), config)
                for (method, pattern), config in cls.AUDIT_ROUTES.items()
            ]
        return cls._compiled_routes

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """中间件处理"""
        start_time = time.time()
        request_id = str(uuid.uuid4())
        
        # 注入 request_id 到 request.state
        request.state.request_id = request_id
        
        # 检查是否需要审计，如果是登录请求则缓存请求体
        audit_config = self._match_route(request.method, request.url.path)
        if audit_config:
            category, action = audit_config
            # 对于登录操作，缓存请求体以便后续获取地址
            if action == AuditAction.AUTH_LOGIN:
                try:
                    body = await request.body()
                    request.state._cached_body = body
                    # 重新设置 _body 以便后续处理可以再次读取
                    request._body = body
                except Exception:
                    pass
        
        # 执行请求
        response = await call_next(request)
        
        # 记录审计日志
        if audit_config:
            duration_ms = int((time.time() - start_time) * 1000)
            await self._log_audit(
                request, response, audit_config, request_id, duration_ms
            )
        
        return response

    def _match_route(
        self, method: str, path: str
    ) -> Optional[Tuple[AuditCategory, AuditAction]]:
        """匹配路由，返回审计配置"""
        for (route_method, pattern), config in self._get_compiled_routes():
            if method == route_method and pattern.match(path):
                return config
        return None

    async def _log_audit(
        self,
        request: Request,
        response: Response,
        audit_config: Tuple[AuditCategory, AuditAction],
        request_id: str,
        duration_ms: int
    ) -> None:
        """记录审计日志"""
        category, action = audit_config
        
        # 确定状态
        if response.status_code >= 500:
            status = AuditStatus.FAILED
        elif response.status_code >= 400:
            status = AuditStatus.FAILED
        else:
            status = AuditStatus.SUCCESS
        
        # 获取操作者信息
        operator_id = None
        operator_address = None
        operator_type = None
        
        if hasattr(request.state, "is_authenticated") and request.state.is_authenticated:
            operator_address = getattr(request.state, "wallet_address", None)
            # 尝试获取 operator_id (如果有的话)
            operator_id = getattr(request.state, "account_id", None)
            operator_type = "user"
        
        # 对于登录操作，尝试从缓存的请求体中获取地址
        if not operator_address and action == AuditAction.AUTH_LOGIN:
            cached_body = getattr(request.state, "_cached_body", None)
            if cached_body:
                try:
                    import json
                    body_data = json.loads(cached_body)
                    operator_address = body_data.get("address", "").lower() if body_data.get("address") else None
                except Exception:
                    pass
        
        # 从路径中提取 target_id
        target_id = self._extract_target_id(request.url.path)
        target_type = self._get_target_type(category)
        target_address = self._extract_target_address(request.url.path)
        
        # 获取 IP 地址
        ip_address = self._get_client_ip(request)
        
        # 获取 User-Agent
        user_agent = request.headers.get("User-Agent", "")[:500]
        
        # 生成描述
        description = self._generate_description(action, target_id, target_address)
        
        # 异步记录审计日志
        try:
            # 延迟导入避免循环依赖
            from src.services.audit.service import audit_service
            
            await audit_service.log_async(
                category=category,
                action=action,
                status=status,
                operator_id=operator_id,
                operator_address=operator_address,
                operator_type=operator_type,
                target_type=target_type,
                target_id=target_id,
                target_address=target_address,
                description=description,
                ip_address=ip_address,
                user_agent=user_agent,
                request_id=request_id,
                duration_ms=duration_ms,
                error_code=str(response.status_code) if status == AuditStatus.FAILED else None,
            )
        except Exception as e:
            # 审计日志记录失败不应影响主业务
            logger.error(f"Failed to log audit: {e}")

    def _get_client_ip(self, request: Request) -> str:
        """获取客户端 IP 地址"""
        # 优先从 X-Forwarded-For 获取
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # 取第一个 IP
            return forwarded_for.split(",")[0].strip()
        
        # 其次从 X-Real-IP 获取
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # 最后从 client.host 获取
        if request.client:
            return request.client.host
        
        return "unknown"

    def _extract_target_id(self, path: str) -> Optional[int]:
        """从路径中提取数字 ID"""
        # 匹配路径中的数字 ID，如 /kyc/123/review
        match = re.search(r'/(\d+)(?:/|$)', path)
        if match:
            return int(match.group(1))
        return None

    def _extract_target_address(self, path: str) -> Optional[str]:
        """从路径中提取钱包地址"""
        # 匹配路径中的以太坊地址或普通地址字符串
        # 如 /sessions/0x1234.../revoke 或 /blacklist/0x1234...
        match = re.search(r'/([0-9a-fA-Fx]{40,42})(?:/|$)', path)
        if match:
            return match.group(1).lower()
        return None

    def _get_target_type(self, category: AuditCategory) -> Optional[str]:
        """根据类别获取目标类型"""
        category_to_target = {
            AuditCategory.KYC: "kyc",
            AuditCategory.ACCOUNT: "account",
            AuditCategory.CONTRACT: "contract",
            AuditCategory.ASSET: "asset",
            AuditCategory.AUTH: "session",
            AuditCategory.PERMISSION: "permission",
        }
        return category_to_target.get(category)

    def _generate_description(
        self, 
        action: AuditAction, 
        target_id: Optional[int],
        target_address: Optional[str]
    ) -> str:
        """生成操作描述"""
        action_descriptions = {
            AuditAction.AUTH_LOGIN: "User logged in",
            AuditAction.AUTH_LOGOUT: "User logged out",
            AuditAction.AUTH_REFRESH: "Token refreshed",
            AuditAction.USER_SESSION_REVOKE: f"Session revoked for {target_address}" if target_address else "Session revoked",
            AuditAction.USER_BLACKLIST_REMOVE: f"Removed {target_address} from blacklist" if target_address else "Removed from blacklist",
            AuditAction.KYC_REVIEW: f"KYC #{target_id} reviewed" if target_id else "KYC reviewed",
            AuditAction.KYC_SYNC_RETRY: f"KYC #{target_id} sync retried" if target_id else "KYC sync retried",
            AuditAction.CONTRACT_REGISTER: "Contract registered to provider",
            AuditAction.CONTRACT_UNREGISTER: "Contract unregistered from provider",
            AuditAction.CONTRACT_SYNC: "Provider status synced from chain",
            AuditAction.ASSET_CREATE: "Asset created",
            AuditAction.ASSET_UPDATE: f"Asset #{target_id} updated" if target_id else "Asset updated",
            AuditAction.ASSET_STATUS_CHANGE: f"Asset #{target_id} status changed" if target_id else "Asset status changed",
            AuditAction.ASSET_PRICE_UPDATE: f"Asset #{target_id} price updated" if target_id else "Asset price updated",
            AuditAction.ASSET_BIND_CONTRACT: f"Contracts bound to asset #{target_id}" if target_id else "Contracts bound to asset",
            AuditAction.ASSET_UNBIND_CONTRACT: f"Contracts unbound from asset #{target_id}" if target_id else "Contracts unbound from asset",
        }
        return action_descriptions.get(action, f"Action: {action.value}")


def add_audit_route(
    method: str,
    path_pattern: str,
    category: AuditCategory,
    action: AuditAction
) -> None:
    """
    动态添加审计路由
    
    Args:
        method: HTTP 方法
        path_pattern: 路径正则模式
        category: 审计类别
        action: 审计操作
    """
    AuditMiddleware.AUDIT_ROUTES[(method, path_pattern)] = (category, action)
    # 清除编译缓存
    AuditMiddleware._compiled_routes = None
