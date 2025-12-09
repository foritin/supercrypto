"""测试大小写兼容性"""
import sys
from pathlib import Path

backend_dir = Path(__file__).parent.parent
src_dir = backend_dir / "src"
sys.path.insert(0, str(src_dir))

from src.cores.config import get_settings

def test_compatibility():
    """测试所有大小写兼容性"""
    print("=" * 60)
    print("测试大小写兼容性")
    print("=" * 60)
    
    settings = get_settings()
    
    # 测试主配置
    assert settings.debug == settings.DEBUG
    assert settings.app_name == settings.APP_NAME
    assert settings.jwt_secret == settings.JWT_SECRET
    print("\n✓ 主配置大小写兼容性正常")
    
    # 测试数据库配置
    assert settings.db.host == settings.DB.HOST
    assert settings.db.port == settings.DB.PORT
    assert settings.db.database == settings.DB.DATABASE
    assert settings.db.user == settings.DB.USER
    assert settings.db.sync_dsn == settings.DB.SYNC_DSN
    print("✓ 数据库配置大小写兼容性正常")
    
    # 测试 Redis 配置
    assert settings.redis.host == settings.REDIS.HOST
    assert settings.redis.port == settings.REDIS.PORT
    assert settings.redis.db == settings.REDIS.DB
    print("✓ Redis 配置大小写兼容性正常")
    
    # 测试 AI 配置
    assert settings.ai_providers.openai.api_key == settings.AI_PROVIDERS.OPENAI.APIKEY
    assert settings.ai_providers.openai.base_url == settings.AI_PROVIDERS.OPENAI.BASEURL
    assert settings.ai_providers.openai.model == settings.AI_PROVIDERS.OPENAI.MODEL
    assert settings.ai_providers.deepseek.model == settings.AI_PROVIDERS.DEEPSEEK.MODEL
    print("✓ AI 配置大小写兼容性正常")
    
    # 测试 RustFS 配置
    assert settings.rustfs.access == settings.RUSTFS.ACCESS
    assert settings.rustfs.bucket == settings.RUSTFS.BUCKET
    print("✓ RustFS 配置大小写兼容性正常")
    
    print("\n" + "=" * 60)
    print("✓ 所有大小写兼容性测试通过！")
    print("=" * 60)
    
    return True

if __name__ == "__main__":
    success = test_compatibility()
    sys.exit(0 if success else 1)

