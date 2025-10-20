# 配置系统使用说明

## ✅ 配置完成！

项目已成功升级到使用 **YAML 配置文件**（基于 pydantic-settings 2.10+），不再需要繁琐的 `POLY_` 环境变量前缀。

## 📁 文件结构

```
app/backend/
├── env                    # 环境选择器（设置 ENVIRONMENT 变量）
├── config.dev.yaml        # 开发环境配置
├── config.prod.yaml       # 生产环境配置（需要自己创建）
├── config.test.yaml       # 测试环境配置（可选）
└── src/
    └── core/
        └── config.py      # 配置模型定义
```

## 🚀 快速开始

### 1. 设置运行环境

编辑 `app/backend/env` 文件：

```ini
ENVIRONMENT=dev
```

### 2. 配置 YAML 文件

编辑 `app/backend/config.dev.yaml`：

```yaml
debug: true
app_name: "SuperCrypto Dev"
jwt_secret: "your-secret-key"

db:
  host: "localhost"
  port: 3307
  user: "root"
  password: "your-password"
  database: "supercrypto_dev"

redis:
  host: "localhost"
  port: 6379
  db: 0
```

### 3. 在代码中使用

```python
from src.core.config import settings

# 使用小写下划线风格（推荐）
print(settings.app_name)          # SuperCrypto Dev
print(settings.db.host)            # localhost
print(settings.db.database)        # supercrypto_dev
print(settings.db.async_dsn)       # mysql+aiomysql://...

# 使用大写风格（向后兼容）
print(settings.APP_NAME)           # SuperCrypto Dev
print(settings.DB.HOST)            # localhost
print(settings.DB.DATABASE)        # supercrypto_dev
```

## 📋 配置项说明

### 基础配置
- `debug`: 调试模式开关
- `app_name`: 应用名称
- `jwt_secret`: JWT 密钥
- `access_token_expire_minutes`: 访问令牌过期时间（分钟）
- `refresh_token_expire_minutes`: 刷新令牌过期时间（分钟）

### 数据库配置 (db)
- `host`: 数据库主机
- `port`: 端口号
- `user`: 用户名
- `password`: 密码
- `database`: 数据库名
- `pool_size`: 连接池大小
- `max_overflow`: 最大溢出连接数
- `pool_timeout`: 连接超时
- `pool_recycle`: 连接回收时间
- `echo`: 是否显示 SQL 日志

### Redis 配置 (redis)
- `host`: Redis 主机
- `port`: 端口号
- `db`: 数据库编号
- `password`: 密码

### AI 服务配置
每个 AI 服务商都有相同的配置项：
- `api_key`: API 密钥
- `base_url`: API 基础 URL
- `model`: 模型名称

支持的服务商：
- `openai`: OpenAI
- `doubao`: 字节豆包
- `deepseek`: DeepSeek
- `qwen`: 阿里通义千问
- `claude`: Anthropic Claude
- `gemini`: Google Gemini

## 🔧 运行测试

```bash
# 确保在 app/backend 目录下
cd /home/rex/project/mix/SuperCrypto/app/backend

# 使用虚拟环境运行测试
/home/rex/project/mix/SuperCrypto/.venv/bin/python test/test_config.py
```

## 📝 VS Code 配置

项目已配置好 VS Code/Cursor 运行环境：
- 工作目录：`app/backend`
- PYTHONPATH：`app/backend`
- 所有 Python 代码在 `backend` 目录下运行

## ⚡ 优势对比

### 之前（环境变量）
```bash
POLY_DB_HOST=localhost
POLY_DB_PORT=3307
POLY_DB_USER=root
POLY_DB_PASSWORD=password
POLY_OPENAI_APIKEY=sk-xxx
POLY_OPENAI_BASEURL=https://api.openai.com/v1
```

### 现在（YAML）
```yaml
db:
  host: localhost
  port: 3307
  user: root
  password: password

openai:
  api_key: sk-xxx
  base_url: https://api.openai.com/v1
```

## 🔒 安全建议

1. **不要提交敏感配置到 Git**
   ```bash
   # 将实际配置文件添加到 .gitignore
   echo "config.*.yaml" >> .gitignore
   ```

2. **使用模板文件**
   ```bash
   # 创建模板供其他开发者参考
   cp config.dev.yaml config.dev.yaml.template
   # 清空模板中的敏感信息再提交
   ```

3. **生产环境**
   - 通过 CI/CD 注入配置文件
   - 或使用环境变量覆盖（仍然支持）

## 🌍 环境变量覆盖（可选）

虽然主要使用 YAML，但仍支持环境变量覆盖：

```bash
# 可以覆盖任何配置（不需要 POLY_ 前缀）
export DB_HOST=production-host
export DB_PORT=3306
export DEBUG=false
```

## 📚 更多信息

- Pydantic Settings 文档：https://docs.pydantic.dev/latest/concepts/pydantic_settings/
- YAML 配置源：https://docs.pydantic.dev/latest/api/pydantic_settings/#pydantic_settings.YamlConfigSettingsSource

---

**版本**: pydantic-settings 2.10+
**最后更新**: 2025-10-10

