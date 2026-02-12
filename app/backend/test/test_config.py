"""测试配置加载

验证 falib 配置管理模块能正确加载 YAML 配置文件，
并确保属性访问和大小写兼容性正常工作。
"""

import pytest
from falib.utils.config import get_settings


class TestConfigLoading:
    """配置加载测试"""

    def test_settings_object_is_not_none(self):
        """验证配置对象能成功创建"""
        # Arrange & Act
        settings = get_settings()

        # Assert
        assert settings is not None, "配置加载失败"

    def test_settings_has_required_attributes(self):
        """验证配置对象包含所有必需属性"""
        # Arrange
        settings = get_settings()
        required_attrs = ["app_name", "debug", "db", "redis", "ai_providers"]

        # Act & Assert
        for attr in required_attrs:
            assert hasattr(settings, attr), f"缺少 {attr} 属性"


class TestConfigCaseCompatibility:
    """配置大小写兼容性测试"""

    @pytest.fixture
    def settings(self):
        """获取配置实例"""
        return get_settings()

    def test_db_config_case_compatibility(self, settings):
        """验证数据库配置支持大小写访问"""
        # Assert
        assert settings.DB.DATABASE == settings.db.database
        assert settings.DB.HOST == settings.db.host

    def test_app_name_case_compatibility(self, settings):
        """验证应用名称支持大小写访问"""
        # Assert
        assert settings.APP_NAME == settings.app_name
