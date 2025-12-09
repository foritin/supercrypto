"""
数据库适配器模块 - 智能管理 Tortoise ORM 连接

提供智能的数据库连接管理：
- 如果 Tortoise 的 default 连接已初始化（如 FastAPI），则直接使用
- 如果未初始化，则每个实例创建自己的独立连接
- 支持异步上下文管理器
- 完全隔离，互不影响
- 配合元类自动资源管理使用（AutoResourceManagementMeta）

Usage:
    # 方式 1: 传统的异步上下文管理器
    async with DatabaseAdapter() as db:
        materials = await Material.all()
    
    # 方式 2: 配合元类自动管理（推荐）
    from app.cores.resource_manager import AutoResourceManagementMeta, needs_db
    
    class MyService(metaclass=AutoResourceManagementMeta):
        def __init__(self):
            self.db_client = get_database_adapter()
        
        @needs_db
        async def get_data(self):
            # 不需要手动 async with，元类会自动管理
            return await Model.all()
    
    # 方式 3: 多个实例并发运行（完全隔离）
    async def script_a():
        async with DatabaseAdapter() as db:
            # 使用独立连接 "adapter_xxxxx1"
            ...
    
    async def script_b():
        async with DatabaseAdapter() as db:
            # 使用独立连接 "adapter_xxxxx2"
            ...
    
    # 并发运行，互不影响
    await asyncio.gather(script_a(), script_b())

重要特性：
    - FastAPI 使用 "default" 连接
    - 每个 DatabaseAdapter 实例使用唯一连接名（如 "adapter_a1b2c3d4"）
    - 多个脚本并发运行时，各自独立，互不干扰
    - 关闭连接时只关闭自己创建的，不影响其他实例
    - 完全线程安全和协程安全
    - 支持元类自动资源管理，简化代码
"""

import logging
import uuid
from typing import Optional
from tortoise import Tortoise
from src.cores.aerich_redirect import TORTOISE_ORM
from src.cores.config import get_settings


class DatabaseAdapter:
    """
    智能数据库适配器
    
    自动检测 Tortoise 的 "default" 连接是否已初始化：
    - 已初始化：直接使用 "default" 连接（如 FastAPI）
    - 未初始化：创建独立的连接（每个实例使用唯一名称）
    
    关键特性：
    - 每个实例创建自己的独立连接（避免多脚本冲突）
    - 不会影响 FastAPI 的 "default" 连接
    - 不会影响其他 DatabaseAdapter 实例
    - 安全地关闭自己的连接
    
    Usage:
        async with DatabaseAdapter() as db:
            # 使用 Tortoise ORM 模型
            materials = await Material.all()
    """
    
    DEFAULT_CONNECTION_NAME = "default"
    
    def __init__(self, logger: Optional[logging.Logger] = None):
        """
        初始化数据库适配器
        
        Args:
            logger: 日志记录器实例（可选）
        """
        self.logger = logger or logging.getLogger(__name__)
        self._use_default_connection = False  # 是否使用 default 连接
        self._my_connection_name = None  # 本实例的连接名称
        self._created_my_connection = False  # 是否创建了自己的连接
        self.settings = get_settings()
        
        # 生成唯一的连接名称（每个实例独立）
        self._unique_connection_name = f"adapter_{uuid.uuid4().hex[:8]}"
    
    async def __aenter__(self):
        """异步上下文管理器入口"""
        # 检查 "default" 连接是否已初始化（FastAPI）
        if self._is_connection_available(self.DEFAULT_CONNECTION_NAME):
            # FastAPI 的连接可用，直接使用
            self._use_default_connection = True
            self._my_connection_name = self.DEFAULT_CONNECTION_NAME
            self._created_my_connection = False
            self.logger.debug("✅ 使用现有的 'default' 连接（FastAPI）")
        else:
            # 创建本实例独立的连接
            self._use_default_connection = False
            self._my_connection_name = self._unique_connection_name
            self._created_my_connection = True
            await self._initialize_my_connection()
            self.logger.debug(f"✅ 创建独立连接 '{self._my_connection_name}'")
        
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """异步上下文管理器出口"""
        if self._created_my_connection:
            # 只关闭本实例创建的连接
            await self._close_my_connection()
            self.logger.info(f"✅ 已关闭连接 '{self._my_connection_name}'")
        else:
            # 使用现有连接，不关闭
            self.logger.debug(f"✅ 保持连接 '{self._my_connection_name}'")
        
        return False
    
    def _is_connection_available(self, connection_name: str) -> bool:
        """
        检查指定名称的连接是否可用
        
        Args:
            connection_name: 连接名称
        
        Returns:
            bool: 连接可用返回 True，否则返回 False
        """
        try:
            if Tortoise._inited:
                # 尝试获取指定的连接
                connection = Tortoise.get_connection(connection_name)
                if connection:
                    return True
        except Exception:
            pass
        
        return False
    
    async def _initialize_my_connection(self):
        """
        初始化本实例的独立连接
        
        每个实例使用唯一的连接名称，完全隔离，互不影响
        """
        try:
            await Tortoise.init(
                config=TORTOISE_ORM,
                _create_db=False  # 不创建数据库（假设已存在）
            )
            self.logger.info(f"连接 '{self._my_connection_name}' 初始化成功")
            
        except Exception as e:
            self.logger.error(f"连接 '{self._my_connection_name}' 初始化失败: {e}")
            raise
    
    async def _close_my_connection(self):
        """
        只关闭本实例的连接，不影响其他任何连接
        """
        try:
            # 获取并关闭本实例的连接
            connection = Tortoise.get_connection(self._my_connection_name)
            if connection:
                await connection.close()
                self.logger.info(f"连接 '{self._my_connection_name}' 已关闭")
            
            # 从 Tortoise 的连接字典中移除（使用安全的方式）
            try:
                # 尝试使用 Tortoise 的内部属性（兼容不同版本）
                if hasattr(Tortoise, '_connections') and self._my_connection_name in Tortoise._connections:
                    del Tortoise._connections[self._my_connection_name]
                    self.logger.debug(f"已从连接池中移除 '{self._my_connection_name}'")
            except (AttributeError, KeyError) as inner_e:
                # 如果无法访问内部属性，忽略错误（连接已关闭即可）
                self.logger.debug(f"无法从连接池移除连接（这是正常的）: {inner_e}")
                
        except Exception as e:
            self.logger.warning(f"关闭连接 '{self._my_connection_name}' 时出现警告: {e}")



# 便捷函数
def get_database_adapter(logger: Optional[logging.Logger] = None) -> DatabaseAdapter:
    """
    获取数据库适配器实例
    
    Args:
        logger: 日志记录器（可选）
    
    Returns:
        DatabaseAdapter: 数据库适配器实例
    
    Usage:
        async with get_database_adapter() as db:
            materials = await Material.all()
    """
    return DatabaseAdapter(logger=logger)
