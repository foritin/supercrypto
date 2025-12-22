"""
共享服务模块
"""

from src.shared.services.lock_service import DistributedLockService, LockAcquireError

__all__ = ["DistributedLockService", "LockAcquireError"]
