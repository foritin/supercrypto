"""测试配置加载"""
import sys
from pathlib import Path

# 添加 backend 到 Python 路径
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from falib.utils.config import get_settings

def test_config():
    print("=" * 60)
    print("测试配置加载")
    print("=" * 60)
    
    try:
        settings = get_settings()
        
        print(f"\n✓ 配置加载成功!")
        print(f"\n应用配置:")
        print(f"  - app_name: {settings.app_name}")
        print(f"  - debug: {settings.debug}")
        print(f"  - jwt_secret: {settings.jwt_secret[:20]}...")
        
        print(f"\n数据库配置:")
        print(f"  - host: {settings.db.host}")
        print(f"  - port: {settings.db.port}")
        print(f"  - user: {settings.db.user}")
        print(f"  - database: {settings.db.database}")
        print(f"  - pool_size: {settings.db.pool_size}")
        print(f"  - async_dsn: {settings.db.async_dsn}")
        
        print(f"\n测试大写兼容性:")
        print(f"  - settings.DB.DATABASE: {settings.DB.DATABASE}")
        print(f"  - settings.DB.HOST: {settings.DB.HOST}")
        print(f"  - settings.APP_NAME: {settings.APP_NAME}")
        
        print(f"\nRedis 配置:")
        print(f"  - host: {settings.redis.host}")
        print(f"  - port: {settings.redis.port}")
        print(f"  - db: {settings.redis.db}")
        
        print(f"\nAI 服务商配置:")
        print(f"  - OpenAI base_url: {settings.ai_providers.openai.base_url}")
        print(f"  - OpenAI model: {settings.ai_providers.openai.model}")
        print(f"  - DeepSeek base_url: {settings.ai_providers.deepseek.base_url}")
        print(f"  - DeepSeek model: {settings.ai_providers.deepseek.model}")
        
        print("\n" + "=" * 60)
        print("✓ 所有配置测试通过!")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print(f"\n✗ 配置加载失败:")
        print(f"  错误类型: {type(e).__name__}")
        print(f"  错误信息: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_config()
    sys.exit(0 if success else 1)

