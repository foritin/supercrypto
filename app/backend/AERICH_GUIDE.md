# Aerich 数据库迁移使用指南

## 📋 概述

Aerich 已成功配置！这是 Tortoise ORM 的数据库迁移工具，用于管理数据库 schema 的版本控制。

## ⚙️ 配置文件

### 1. Tortoise ORM 配置
- 位置: `src/db.py`
- 包含数据库连接配置和模型注册
- **支持多种数据库**: PostgreSQL, MySQL, SQLite

### 2. Aerich 配置
- 位置: `pyproject.toml`
- 配置项:
  ```toml
  [tool.aerich]
  tortoise_orm = "src.db.TORTOISE_ORM"
  location = "./migrations"
  src_folder = "./."
  ```

### 3. 数据库配置
- MySQL 配置: `config.dev.yaml`
- PostgreSQL 配置: `config.dev.postgresql.yaml`
- 详细说明: 参见 `DATABASE_SETUP.md`

### 4. 示例模型
- 位置: `src/models/user.py`
- 基础模型: `src/models/base.py` (包含 UTC 时区支持)

## 🚀 使用流程

### 前提条件
确保 MySQL 数据库正在运行并且配置正确（在 `config.dev.yaml` 中）：
```yaml
db:
  host: "localhost"
  port: 3307
  user: "root"
  password: "your-password"
  database: "supercrypto_dev"
```

### 1. 初始化数据库 (首次)
```bash
cd app/backend
source ../../.venv/bin/activate  # 激活虚拟环境
aerich init-db
```

这将:
- 创建 `migrations` 目录
- 生成初始迁移文件 (如 `0_20251112_init.py`)
- 在数据库中创建 `aerich` 表来跟踪迁移历史
- 执行初始迁移，创建所有表

### 2. 修改模型后生成迁移
当你修改了模型（添加/删除字段、修改字段类型等）：
```bash
aerich migrate --name "describe_your_changes"
```

例如:
```bash
aerich migrate --name "add_user_avatar_field"
```

这将:
- 检测模型变化
- 在 `migrations/models/` 目录生成新的迁移文件
- 包含 `upgrade()` 和 `downgrade()` 函数

### 3. 应用迁移到数据库
```bash
aerich upgrade
```

这将执行所有未应用的迁移。

### 4. 回滚迁移 (如需要)
```bash
aerich downgrade
```

回滚最后一次迁移。

### 5. 查看迁移历史
```bash
aerich history
```

显示所有迁移记录及其状态。

## 📝 常用命令速查

| 命令 | 说明 |
|------|------|
| `aerich init -t src.db.TORTOISE_ORM` | 初始化 Aerich (已完成) |
| `aerich init-db` | 首次初始化数据库 |
| `aerich migrate [--name xxx]` | 生成迁移文件 |
| `aerich upgrade` | 应用迁移 |
| `aerich downgrade` | 回滚迁移 |
| `aerich history` | 查看迁移历史 |
| `aerich heads` | 查看当前迁移版本 |

## 🎯 工作流程示例

### 创建新模型
1. 在 `src/models/` 创建新的模型文件，例如 `product.py`:
```python
from tortoise import fields
from src.models.base import AbstractModel, TimestampMixin

class Product(AbstractModel, TimestampMixin):
    name = fields.CharField(max_length=100)
    price = fields.DecimalField(max_digits=10, decimal_places=2)
    
    class Meta:
        table = "products"
```

2. 在 `src/models/__init__.py` 中导出:
```python
from src.models.product import Product
__all__ = [..., "Product"]
```

3. 生成迁移:
```bash
aerich migrate --name "add_product_model"
```

4. 应用迁移:
```bash
aerich upgrade
```

### 修改现有模型
1. 修改模型文件（如添加字段）
2. 生成迁移: `aerich migrate --name "add_xxx_field"`
3. 应用迁移: `aerich upgrade`

## 🔧 故障排除

### 问题: 数据库连接失败
**错误**: `Can't connect to MySQL server`

**解决方案**:
1. 确保 MySQL 服务正在运行
2. 检查 `config.dev.yaml` 中的数据库配置
3. 确保数据库已创建: `CREATE DATABASE supercrypto_dev;`

### 问题: 找不到 aerich 命令
**解决方案**:
```bash
# 激活虚拟环境
source .venv/bin/activate
# 或者使用 python -m
python -m aerich --help
```

### 问题: 模型没有被检测到
**解决方案**:
1. 确保模型文件在 `src/models/` 目录下
2. 确保在 `src/models/__init__.py` 中导出
3. 检查 `src/db.py` 中的 models 配置

## 📚 更多资源

- [Aerich 官方文档](https://github.com/tortoise/aerich)
- [Tortoise ORM 文档](https://tortoise.github.io/)

## ✅ 当前状态

- ✅ Aerich 已安装
- ✅ 配置文件已创建
- ✅ 示例模型已创建 (User)
- ⏳ 等待数据库连接以完成初始化

下一步: 启动 MySQL 数据库后运行 `aerich init-db`

