"""
Session Service - Redis-based session management

用于管理用户登录会话，支持：
- 会话创建和追踪
- Token 版本号管理
- 黑名单管理（强制下线）
- 活跃会话查询
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from falib.adapter.redis import RedisAdapter
from falib.utils.config import SETTINGS
from falib.utils.log import get_logger

logger = get_logger("shared.session")


class SessionService:
    """Session 管理服务"""

    def __init__(self):
        self.session_ttl = SETTINGS.REFRESH_TOKEN_EXPIRE_MINUTES * 60  # 转换为秒

    async def create_session(
        self,
        wallet_address: str,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
        chain_id: Optional[int] = None,
        chain_name: Optional[str] = None,
        network_type: Optional[str] = None,
    ) -> str:
        """
        创建新会话

        Args:
            wallet_address: 钱包地址
            user_agent: 用户代理
            ip_address: IP 地址
            chain_id: 钱包网络链ID (1=主网, 11155111=Sepolia, 31337=本地)
            chain_name: 链名称 (用户在 MetaMask 中看到的名称)
            network_type: 网络类型 (mainnet/testnet/local/l2/custom)

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
            "chain_id": chain_id,
            "chain_name": chain_name or "",
            "network_type": network_type or "unknown",
            # Token 版本号管理
            "token_version": 1,
            "token_version_updated_at": now.isoformat(),
        }

        async with RedisAdapter() as redis:
            # 存储会话数据
            session_key = f"session:{wallet_address}:{session_id}"
            await redis.set_json(session_key, session_data)
            await redis.expire(session_key, self.session_ttl)

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
        session_key = f"session:{wallet_address}:{session_id}"

        async with RedisAdapter() as redis:
            deleted = await redis.delete(session_key)
            return deleted > 0

    async def _scan_user_sessions(
        self, redis, wallet_address: str
    ) -> List[Tuple[str, dict]]:
        """
        扫描用户的所有会话

        Returns:
            List of (key, data) tuples
        """
        sessions = []
        cursor = 0
        pattern = f"session:{wallet_address}:*"

        while True:
            cursor, keys = await redis.scan(cursor, match=pattern, count=100)
            for key in keys:
                key_str = key.decode() if isinstance(key, bytes) else key
                data = await redis.get_json(key_str)
                if data:
                    sessions.append((key_str, data))
            if cursor == 0:
                break

        return sessions

    async def add_to_blacklist(self, wallet_address: str) -> int:
        """
        加入黑名单（强制下线，禁止访问）

        Args:
            wallet_address: 钱包地址

        Returns:
            清除的会话数量
        """
        wallet_address = wallet_address.lower()
        cleared_count = 0

        async with RedisAdapter() as redis:
            # 加入黑名单
            blacklist_key = f"blacklist:{wallet_address}"
            await redis.set(blacklist_key, datetime.now(timezone.utc).isoformat())
            await redis.expire(blacklist_key, self.session_ttl)

            # 扫描并删除用户所有会话
            sessions = await self._scan_user_sessions(redis, wallet_address)
            for key_str, _ in sessions:
                deleted = await redis.delete(key_str)
                if deleted:
                    cleared_count += 1

        logger.info(
            f"Added {wallet_address[:8]}... to blacklist, cleared {cleared_count} sessions"
        )
        return cleared_count

    async def is_blacklisted(self, wallet_address: str) -> bool:
        """检查用户是否在黑名单中"""
        wallet_address = wallet_address.lower()
        blacklist_key = f"blacklist:{wallet_address}"

        async with RedisAdapter() as redis:
            exists = await redis.exists(blacklist_key)
            return exists > 0

    async def remove_from_blacklist(self, wallet_address: str) -> bool:
        """从黑名单移除（允许用户重新登录）"""
        wallet_address = wallet_address.lower()
        blacklist_key = f"blacklist:{wallet_address}"

        async with RedisAdapter() as redis:
            deleted = await redis.delete(blacklist_key)
            if deleted:
                logger.info(f"Removed {wallet_address[:8]}... from blacklist")
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

        async with RedisAdapter() as redis:
            sessions = await self._scan_user_sessions(redis, wallet_address)
            return [data for _, data in sessions]

    async def clear_user_sessions(self, wallet_address: str) -> int:
        """
        清理用户所有会话（用于登出）

        Args:
            wallet_address: 钱包地址

        Returns:
            清除的会话数量
        """
        wallet_address = wallet_address.lower()
        cleared_count = 0

        async with RedisAdapter() as redis:
            # 扫描并删除用户所有会话
            sessions = await self._scan_user_sessions(redis, wallet_address)
            for key_str, _ in sessions:
                deleted = await redis.delete(key_str)
                if deleted:
                    cleared_count += 1

        logger.info(f"Cleared {cleared_count} sessions for {wallet_address[:8]}...")
        return cleared_count

    async def increment_token_version(self, wallet_address: str) -> Tuple[int, int]:
        """
        递增用户全局版本号（全设备登出，使所有 token 失效）

        Args:
            wallet_address: 钱包地址

        Returns:
            (新版本号, 受影响的 session 数量)
        """
        wallet_address = wallet_address.lower()
        now = datetime.now(timezone.utc)

        async with RedisAdapter() as redis:
            # 1. 获取当前最大版本号（从任意 session）
            sessions = await self._scan_user_sessions(redis, wallet_address)

            if not sessions:
                # 没有活跃 session，版本号从 1 开始
                new_version = 1
                affected_count = 0
            else:
                # 获取当前最大版本号
                current_version = 0
                for _, data in sessions:
                    version = data.get("token_version", 1)
                    if version > current_version:
                        current_version = version

                new_version = current_version + 1
                affected_count = len(sessions)

                # 2. 更新所有 sessions 的版本号
                for session_key, data in sessions:
                    data["token_version"] = new_version
                    data["token_version_updated_at"] = now.isoformat()
                    await redis.set_json(session_key, data)

        logger.info(
            f"Token version incremented to {new_version} for {wallet_address[:8]}..., "
            f"affected {affected_count} sessions"
        )
        return new_version, affected_count

    async def get_token_version(self, wallet_address: str, session_id: str) -> Optional[int]:
        """
        获取 session 的 token 版本号

        Args:
            wallet_address: 钱包地址
            session_id: 会话ID

        Returns:
            版本号，如果 session 不存在返回 None
        """
        session = await self.get_session(wallet_address, session_id)
        if session:
            return session.get("token_version", 1)
        return None


# 全局服务实例
session_service = SessionService()
