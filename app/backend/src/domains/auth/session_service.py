"""
Session Service - Redis-based session management

用于管理用户登录会话，支持：
- 会话创建和追踪
- 会话撤销（强制下线）
- 活跃会话查询
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from falib.adapter.redis import RedisAdapter
from falib.utils.config import SETTINGS
from falib.utils.log import get_logger

logger = get_logger("auth.session")


class SessionService:
    """Session 管理服务"""

    def __init__(self):
        self.session_ttl = SETTINGS.REFRESH_TOKEN_EXPIRE_MINUTES * 60  # 转换为秒

    async def create_session(
        self,
        wallet_address: str,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> str:
        """
        创建新会话

        Args:
            wallet_address: 钱包地址
            user_agent: 用户代理
            ip_address: IP 地址

        Returns:
            session_id: 会话 ID
        """
        session_id = str(uuid.uuid4())
        wallet_address = wallet_address.lower()
        now = datetime.now(timezone.utc)

        session_data = {
            "wallet_address": wallet_address,
            "session_id": session_id,
            "login_at": now.isoformat(),
            "last_active_at": now.isoformat(),
            "user_agent": user_agent or "",
            "ip_address": ip_address or "",
        }

        async with RedisAdapter() as redis:
            # 存储会话数据
            session_key = f"session:{wallet_address}:{session_id}"
            await redis.set_json(session_key, session_data)
            await redis.expire(session_key, self.session_ttl)

            # 添加到用户会话索引
            index_key = f"user_sessions:{wallet_address}"
            await redis.sadd(index_key, session_id)
            await redis.expire(index_key, self.session_ttl)

        logger.info(f"Session created for {wallet_address[:8]}...: {session_id[:8]}...")
        return session_id

    async def get_session(self, wallet_address: str, session_id: str) -> Optional[dict]:
        """获取会话信息"""
        wallet_address = wallet_address.lower()
        session_key = f"session:{wallet_address}:{session_id}"

        async with RedisAdapter() as redis:
            data = await redis.get_json(session_key)
            return data

    async def update_last_active(self, wallet_address: str, session_id: str) -> bool:
        """更新最后活跃时间"""
        wallet_address = wallet_address.lower()
        session_key = f"session:{wallet_address}:{session_id}"

        async with RedisAdapter() as redis:
            exists = await redis.exists(session_key)
            if not exists:
                return False

            data = await redis.get_json(session_key)
            if data:
                data["last_active_at"] = datetime.now(timezone.utc).isoformat()
                await redis.set_json(session_key, data)
                return True
        return False

    async def delete_session(self, wallet_address: str, session_id: str) -> bool:
        """删除单个会话"""
        wallet_address = wallet_address.lower()

        async with RedisAdapter() as redis:
            session_key = f"session:{wallet_address}:{session_id}"
            deleted = await redis.delete(session_key)

            # 从索引中移除
            index_key = f"user_sessions:{wallet_address}"
            await redis.srem(index_key, session_id)

            return deleted > 0

    async def revoke_all_sessions(self, wallet_address: str) -> int:
        """
        撤销用户所有会话（强制下线）

        Args:
            wallet_address: 钱包地址

        Returns:
            撤销的会话数量
        """
        wallet_address = wallet_address.lower()
        revoked_count = 0

        async with RedisAdapter() as redis:
            # 设置撤销标记（用于 token 验证时检查）
            revoke_key = f"session_revoked:{wallet_address}"
            await redis.set(revoke_key, datetime.now(timezone.utc).isoformat())
            await redis.expire(revoke_key, self.session_ttl)

            # 获取用户所有会话 ID
            index_key = f"user_sessions:{wallet_address}"
            session_ids = await redis.smembers(index_key)

            # 删除所有会话
            for session_id in session_ids:
                sid = (
                    session_id.decode() if isinstance(session_id, bytes) else session_id
                )
                session_key = f"session:{wallet_address}:{sid}"
                deleted = await redis.delete(session_key)
                if deleted:
                    revoked_count += 1

            # 删除索引
            await redis.delete(index_key)

        logger.info(f"Revoked {revoked_count} sessions for {wallet_address[:8]}...")
        return revoked_count

    async def is_session_revoked(self, wallet_address: str) -> bool:
        """检查用户会话是否已被撤销"""
        wallet_address = wallet_address.lower()
        revoke_key = f"session_revoked:{wallet_address}"

        async with RedisAdapter() as redis:
            exists = await redis.exists(revoke_key)
            return exists > 0

    async def clear_revoke_mark(self, wallet_address: str) -> bool:
        """清除撤销标记（允许用户重新登录）"""
        wallet_address = wallet_address.lower()
        revoke_key = f"session_revoked:{wallet_address}"

        async with RedisAdapter() as redis:
            deleted = await redis.delete(revoke_key)
            return deleted > 0

    async def get_active_sessions(
        self, page: int = 1, page_size: int = 20, search: Optional[str] = None
    ) -> Tuple[List[dict], int]:
        """
        获取活跃会话列表（管理员用）

        Args:
            page: 页码
            page_size: 每页数量
            search: 按钱包地址搜索

        Returns:
            (会话列表, 总数)
        """
        sessions = []

        async with RedisAdapter() as redis:
            # 扫描所有 session:* 键
            cursor = 0
            pattern = "session:*:*"

            while True:
                cursor, keys = await redis.scan(cursor, match=pattern, count=100)
                for key in keys:
                    key_str = key.decode() if isinstance(key, bytes) else key
                    # 跳过索引键
                    if key_str.startswith("session_revoked:") or key_str.startswith(
                        "user_sessions:"
                    ):
                        continue

                    data = await redis.get_json(key_str)
                    if data:
                        # 搜索过滤
                        if (
                            search
                            and search.lower()
                            not in data.get("wallet_address", "").lower()
                        ):
                            continue
                        sessions.append(data)

                if cursor == 0:
                    break

        # 按登录时间排序
        sessions.sort(key=lambda x: x.get("login_at", ""), reverse=True)

        # 分页
        total = len(sessions)
        start = (page - 1) * page_size
        end = start + page_size

        return sessions[start:end], total

    async def get_user_sessions(self, wallet_address: str) -> List[dict]:
        """获取用户所有会话"""
        wallet_address = wallet_address.lower()
        sessions = []

        async with RedisAdapter() as redis:
            index_key = f"user_sessions:{wallet_address}"
            session_ids = await redis.smembers(index_key)

            for session_id in session_ids:
                sid = (
                    session_id.decode() if isinstance(session_id, bytes) else session_id
                )
                session_key = f"session:{wallet_address}:{sid}"
                data = await redis.get_json(session_key)
                if data:
                    sessions.append(data)

        return sessions


# 全局服务实例
session_service = SessionService()
