"""测试 falib 配置大小写兼容性

验证 Settings 对象的所有子模块都支持大小写属性访问，
确保 settings.db.host 和 settings.DB.HOST 返回相同的值。
"""

import pytest
from falib.utils.config import get_settings


class TestCaseCompatibility:
    """大小写兼容性测试"""

    @pytest.fixture
    def settings(self):
        """获取配置实例"""
        return get_settings()

    def test_main_config_compatibility(self, settings):
        """验证主配置项大小写兼容"""
        # Assert
        assert settings.debug == settings.DEBUG
        assert settings.app_name == settings.APP_NAME
        assert settings.jwt_secret == settings.JWT_SECRET

    def test_db_config_compatibility(self, settings):
        """验证数据库配置大小写兼容"""
        # Assert
        assert settings.db.host == settings.DB.HOST
        assert settings.db.port == settings.DB.PORT
        assert settings.db.database == settings.DB.DATABASE
        assert settings.db.user == settings.DB.USER
        assert settings.db.sync_dsn == settings.DB.SYNC_DSN

    def test_redis_config_compatibility(self, settings):
        """验证 Redis 配置大小写兼容"""
        # Assert
        assert settings.redis.host == settings.REDIS.HOST
        assert settings.redis.port == settings.REDIS.PORT
        assert settings.redis.db == settings.REDIS.DB

    def test_ai_providers_config_compatibility(self, settings):
        """验证 AI 配置大小写兼容"""
        # Assert — 注意: 复合属性名使用下划线分隔的大写形式 (api_key → API_KEY)
        assert settings.ai_providers.openai.api_key == settings.AI_PROVIDERS.OPENAI.API_KEY
        assert settings.ai_providers.openai.base_url == settings.AI_PROVIDERS.OPENAI.BASE_URL
        assert settings.ai_providers.openai.model == settings.AI_PROVIDERS.OPENAI.MODEL
        assert settings.ai_providers.deepseek.model == settings.AI_PROVIDERS.DEEPSEEK.MODEL

    def test_rustfs_config_compatibility(self, settings):
        """验证 RustFS 配置大小写兼容"""
        # Assert
        assert settings.rustfs.access == settings.RUSTFS.ACCESS
        assert settings.rustfs.bucket == settings.RUSTFS.BUCKET
