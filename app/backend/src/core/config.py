import os
from functools import lru_cache
from typing import Literal, Tuple, Type

from importlib import metadata

from pydantic import BaseModel, computed_field, Field
from pydantic_settings import (
    BaseSettings, 
    SettingsConfigDict,
    PydanticBaseSettingsSource,
    YamlConfigSettingsSource
)
from src.utils.log import get_logger


logger = get_logger("system.config")

# --- 动态版本获取 ---
def get_project_version() -> str:
    try:
        return metadata.version("poly")
    except metadata.PackageNotFoundError:
        return "1.0.0-dev"


# --- 大小写兼容 Mixin ---
class CaseCompatMixin:
    """提供大小写兼容的 Mixin 类"""
    
    def __getattr__(self, name: str):
        """自动将大写属性名转换为小写下划线格式"""
        if name.isupper() or (name[0].isupper() and '_' in name):
            # 将大写转换为小写下划线格式
            # 例如: HOST -> host, SYNC_DSN -> sync_dsn, APIKEY -> api_key
            lowercase_name = name.lower()
            if hasattr(self, lowercase_name):
                return getattr(self, lowercase_name)
            
            # 尝试添加下划线分隔（处理 APIKEY -> api_key 的情况）
            # 检查是否存在带下划线的版本
            for attr in dir(self):
                if attr.replace('_', '').lower() == lowercase_name:
                    return getattr(self, attr)
        
        raise AttributeError(f"'{type(self).__name__}' object has no attribute '{name}'")


# --- 基础配置模型（自动支持大小写兼容）---
class CompatBaseModel(CaseCompatMixin, BaseModel):
    """支持大小写兼容的基础模型"""
    pass


# --- 嵌套配置模型 ---
class DatabaseSettings(CompatBaseModel):
    """数据库相关配置"""

    host: str = ""
    port: int = 3307
    user: str = ""
    password: str = ""
    database: str = ""

    pool_size: int = 20
    max_overflow: int = 10
    pool_timeout: int = 30
    pool_recycle: int = 3600
    echo: bool = False

    @computed_field
    @property
    def sync_dsn(self) -> str:
        """生成数据库连接字符串（主要用于 Alembic 迁移）"""
        return f"mysql+pymysql://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}"
    
    @computed_field
    @property
    def async_dsn(self) -> str:
        """生成异步数据库连接字符串（使用 aiomysql 驱动）"""
        return f"mysql+aiomysql://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}"


class RedisSettings(CompatBaseModel):
    """Redis相关配置"""

    host: str = "localhost"
    port: int = 6379
    db: int = 0
    password: str = ""


class RustFsSettings(CompatBaseModel):
    """RustFs相关配置"""

    access: str = ""
    secret: str = ""
    endpoint: str = ""
    version: str = ""
    bucket: str = ""


class AIProviderSettings(CompatBaseModel):
    """单个 AI 服务商配置"""
    api_key: str = ""
    base_url: str = ""
    model: str = ""


class AIProvidersSettings(CompatBaseModel):
    """所有 AI 服务商配置的容器"""
    openai: AIProviderSettings = Field(default_factory=lambda: AIProviderSettings(
        base_url="https://api.openai.com/v1"
    ))
    doubao: AIProviderSettings = Field(default_factory=lambda: AIProviderSettings(
        base_url="https://ark.cn-beijing.volces.com/api/v3"
    ))
    deepseek: AIProviderSettings = Field(default_factory=lambda: AIProviderSettings(
        base_url="https://api.deepseek.com/v1"
    ))
    qwen: AIProviderSettings = Field(default_factory=lambda: AIProviderSettings(
        base_url="https://dashscope.aliyuncs.com/api/v1"
    ))
    claude: AIProviderSettings = Field(default_factory=lambda: AIProviderSettings(
        base_url="https://api.anthropic.com/v1"
    ))
    gemini: AIProviderSettings = Field(default_factory=lambda: AIProviderSettings(
        base_url="https://generativelanguage.googleapis.com/v1"
    ))


class AsposeSettings(CompatBaseModel):
    """Aspose相关配置"""
    
    license_path: str = ".aspose_license.xml"  # 默认许可证文件路径


class Settings(CaseCompatMixin, BaseSettings):
    """主配置类 - 支持从 YAML 文件加载配置"""

    environment: str = "dev"
    debug: bool = False
    app_name: str = ""
    jwt_secret: str = ""
    access_token_expire_minutes: int = 120  # 120分钟
    refresh_token_expire_minutes: int = 20160  # 20160分钟 30天

    db: DatabaseSettings = Field(default_factory=DatabaseSettings)
    redis: RedisSettings = Field(default_factory=RedisSettings)
    rustfs: RustFsSettings = Field(default_factory=RustFsSettings)
    ai_providers: AIProvidersSettings = Field(default_factory=AIProvidersSettings)
    aspose: AsposeSettings = Field(default_factory=AsposeSettings)

    model_config = SettingsConfigDict(
        yaml_file=None,  # 将在运行时动态设置
        yaml_file_encoding="utf-8",
        case_sensitive=False,
        extra="allow"  # 允许动态配置
    )

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: Type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> Tuple[PydanticBaseSettingsSource, ...]:
        """
        自定义配置源的优先级
        优先级从高到低：初始化参数 > YAML配置文件 > 环境变量
        """
        # 获取 yaml_file 配置（可能从 model_config 或初始化参数中来）
        yaml_file = settings_cls.model_config.get('yaml_file')
        yaml_source = YamlConfigSettingsSource(settings_cls, yaml_file=yaml_file)
        return (
            init_settings,
            yaml_source,
            env_settings,
        )

    def get_ai_provider_config(self, provider: str) -> dict:
        """
        根据provider名称获取AI服务商配置
        
        Args:
            provider: AI服务商名称 (openai, doubao, deepseek, qwen, claude, gemini)
            
        Returns:
            dict: 包含api_key, base_url, model, provider, enabled的配置字典
            
        Raises:
            ValueError: 当provider不支持时
        """
        provider = provider.lower().strip()
        
        # 支持的AI服务商列表
        supported_providers = ["openai", "doubao", "deepseek", "qwen", "claude", "gemini"]
        
        if provider not in supported_providers:
            raise ValueError(f"不支持的AI服务商: {provider}。支持的服务商: {', '.join(supported_providers)}")
        
        # 从 ai_providers 获取配置
        ai_config = getattr(self.ai_providers, provider)
        
        return {
            "api_key": ai_config.api_key,
            "base_url": ai_config.base_url, 
            "model": ai_config.model,
            "provider": provider,
            "enabled": True if ai_config.api_key else False
        }


@lru_cache()
def get_settings() -> Settings:
    """
    加载配置
    支持从 YAML 文件加载配置，配置文件路径根据环境变量 ENVIRONMENT 决定
    工作目录应该是 app/backend
    """
    # env 文件和 config.*.yaml 都在 app/backend 目录下
    # 运行时工作目录应该是 app/backend
    env_file_path = "env"
    
    if os.path.exists(env_file_path):
        logger.info(f"加载环境预设文件: {os.path.abspath(env_file_path)}")
        from dotenv import load_dotenv
        load_dotenv(env_file_path)
    else:
        logger.warning(f"环境预设文件不存在: {os.path.abspath(env_file_path)}, 采用默认配置")
    
    # 从加载的 env 文件中获取 ENVIRONMENT，如果不存在则使用默认值
    env = os.getenv("ENVIRONMENT", "dev")
    yaml_file = f"config.{env}.yaml"
    yaml_file_abs = os.path.abspath(yaml_file)
    
    logger.info(f"当前运行环境: {env}")
    logger.info(f"当前工作目录: {os.getcwd()}")
    logger.info(f"配置文件路径: {yaml_file_abs}")
    
    if not os.path.exists(yaml_file):
        logger.error(f"配置文件不存在: {yaml_file_abs}")
        raise FileNotFoundError(f"配置文件不存在: {yaml_file_abs}")
    
    logger.info(f"加载配置文件: {yaml_file}")
    
    # 动态设置 yaml_file 到 model_config
    Settings.model_config['yaml_file'] = yaml_file
    
    # 创建 Settings 实例
    settings = Settings()
    
    logger.info(f"成功加载 '{env}' 环境配置 for {settings.app_name}")
    return settings


SETTINGS = settings = get_settings()

print()
