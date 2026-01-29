"""
日志器模块 - 基于loguru实现
支持单例模式、多模块分类、异步写入
"""

import sys
import threading
from typing import Any, Dict, Optional

from loguru import logger

from src.utils.tools import PathTools


class LoggerManager:
    """日志管理器 - 单例模式"""

    _instance: Optional['LoggerManager'] = None
    _initialized: bool = False
    _lock = threading.Lock()
    _handlers: Dict[str, Any] = {}  # 存储不同模块的handler ID

    def __new__(cls) -> 'LoggerManager':
        """单例模式实现"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def _ensure_initialized(self) -> None:
        """确保日志器已初始化（线程安全）"""
        if not self._initialized:
            with self._lock:
                if not self._initialized:
                    self._initialize()
                    self._initialized = True

    def _initialize(self) -> None:
        """初始化日志器基础配置"""
        # 移除默认的handler
        logger.remove()

        # 获取日志目录路径
        log_path = PathTools.get_log_path()
        log_path.mkdir(parents=True, exist_ok=True)

        # 配置标准输出handler（全局共享）
        stdout_handler_id = logger.add(
            sys.stdout,
            format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
                   "<level>{level: <8}</level> | "
                   "<cyan>{extra[extra][module]}</cyan> | "
                   "<magenta>{file}:{line}</magenta> | "
                   "<level>{message}</level>",
            level="INFO",
            colorize=True,
            enqueue=True,  # 异步写入（通过队列）
            filter=lambda record: True  # 接受所有模块的日志
        )

        # 存储stdout handler ID
        self._handlers["stdout"] = stdout_handler_id

        logger.info("日志器初始化完成", extra={"module": "[system.log]", "traceback": ""})

    def get_logger(self, module: str = "app") -> 'LoggerWrapper':
        """获取带模块标识的日志器包装器"""
        self._ensure_initialized()

        # 为每个模块创建专用的文件handler（如果还没有）
        self._ensure_module_handlers(module)

        return LoggerWrapper(module)

    def _ensure_module_handlers(self, module: str) -> None:
        """确保模块有专用的文件handler"""
        # 提取模块的主分类（如 app.database -> app, scrapy.anvisa -> scrapy）
        main_category = module.split('.')[0] if '.' in module else module

        # 检查是否已经为这个主分类创建了handler
        handler_key = f"file_{main_category}"
        error_handler_key = f"error_{main_category}"

        if handler_key not in self._handlers:
            log_path = PathTools.get_log_path()

            # 创建主分类的普通日志文件handler
            log_file_path = log_path / f"{main_category}_{{time:YYYY-MM-DD}}.log"
            file_handler_id = logger.add(
                str(log_file_path),
                format="{time:YYYY-MM-DD HH:mm:ss} | "
                       "{level: <8} | "
                       "{extra[extra][module]} | "
                       "{file}:{line} | "
                       "{message}",
                level="DEBUG",
                rotation="3 days",  # 3天轮转
                retention="30 days",  # 保留30天
                compression="zip",  # 压缩旧日志
                enqueue=True,  # 异步写入（通过队列）
                encoding="utf-8",
                serialize=False,
                filter=lambda record, category=main_category: self._module_filter(record, category)
            )

            # 创建主分类的错误日志文件handler
            error_log_path = log_path / f"{main_category}_error_{{time:YYYY-MM-DD}}.log"
            error_handler_id = logger.add(
                str(error_log_path),
                format="{time:YYYY-MM-DD HH:mm:ss} | "
                       "{level: <8} | "
                       "{extra[extra][module]} | "
                       "{file}:{line} | "
                       "{message} | "
                       "{extra[extra][traceback]}",
                level="ERROR",
                rotation="100 MB",  # 100MB轮转
                retention="90 days",  # 保留90天
                compression="zip",
                enqueue=True,  # 异步写入（通过队列）
                encoding="utf-8",
                serialize=False,
                filter=lambda record, category=main_category: self._module_filter(record, category)
            )

            # 存储handler ID
            self._handlers[handler_key] = file_handler_id
            self._handlers[error_handler_key] = error_handler_id

            logger.info(f"为模块分类 '{main_category}' 创建专用日志文件",
                       extra={"module": "[system.log]", "traceback": ""})

    def _module_filter(self, record: Dict[str, Any], category: str) -> bool:
        """过滤器：只允许特定分类的模块日志写入对应文件"""
        try:
            # 正确的extra结构：record["extra"]["extra"]["module"]
            module_info = record.get("extra", {}).get("extra", {}).get("module", "")
            # 从模块标识中提取主分类，如 [app.database] -> app
            if module_info.startswith('[') and module_info.endswith(']'):
                module_name = module_info[1:-1]  # 去掉方括号
                main_category = module_name.split('.')[0] if '.' in module_name else module_name
                return main_category == category
            return False
        except Exception:
            return False


class LoggerWrapper:
    """日志器包装器 - 支持模块标识"""

    def __init__(self, module: str = "app"):
        self.module = module
        self._extra = {"module": f"[{module}]", "traceback": ""}

    def _log_with_extra(self, level: str, message: str, **kwargs) -> None:
        """使用额外信息记录日志"""
        extra = self._extra.copy()
        extra.update(kwargs.get('extra', {}))

        # 处理异常信息
        if 'exception' in kwargs:
            import traceback
            extra['traceback'] = traceback.format_exc()

        # 使用 opt(depth=2) 来显示实际调用日志的位置，而不是这个包装器的位置
        # depth=2: 跳过 _log_with_extra 和调用的方法（如 info、error 等）
        getattr(logger.opt(depth=2), level.lower())(message, extra=extra)

    def debug(self, message: str, **kwargs) -> None:
        """记录调试日志"""
        self._log_with_extra("DEBUG", message, **kwargs)

    def info(self, message: str, **kwargs) -> None:
        """记录信息日志"""
        self._log_with_extra("INFO", message, **kwargs)

    def warning(self, message: str, **kwargs) -> None:
        """记录警告日志"""
        self._log_with_extra("WARNING", message, **kwargs)

    def error(self, message: str, **kwargs) -> None:
        """记录错误日志"""
        self._log_with_extra("ERROR", message, **kwargs)

    def critical(self, message: str, **kwargs) -> None:
        """记录严重错误日志"""
        self._log_with_extra("CRITICAL", message, **kwargs)

    def exception(self, message: str, **kwargs) -> None:
        """记录异常日志（自动包含堆栈信息）"""
        kwargs['exception'] = True
        self._log_with_extra("ERROR", message, **kwargs)


# 全局日志管理器实例
_logger_manager = LoggerManager()


def get_logger(module: str = "app") -> LoggerWrapper:
    """获取日志器的便捷函数

    Args:
        module: 模块名称，如 "app.database" 或 "scrapy.xhs"

    Returns:
        LoggerWrapper: 日志器包装器实例

    说明:
        - 日志通过 loguru 的 enqueue=True 实现异步写入
        - 不同模块分类会自动创建独立的日志文件
        - 线程安全，可在多线程/协程环境中使用
    """
    return _logger_manager.get_logger(module)


