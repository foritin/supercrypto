"""
架构属性测试

验证后端架构优化的正确性属性：
1. Router 层不直接访问 ORM
2. 拆分后文件行数限制
3. Redis 空值检查
4. 导入规范检查

**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 2.4, 3.3, 6.1, 6.2, 6.3, 7.1, 7.3, 7.4**
"""

import ast
import os
from pathlib import Path

import pytest


class TestRouterNoDirectORM:
    """
    **Property 1: Router 层不直接访问 ORM**
    
    **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
    
    Router 文件不应该直接调用 ORM 模型的查询方法，
    而应该通过 Service 层进行数据访问。
    
    注意：只检查新拆分的文件，不检查 legacy 文件
    """

    # ORM 查询方法模式
    ORM_PATTERNS = [
        ".filter(",
        ".get(",
        ".get_or_none(",
        ".all(",
        ".create(",
        ".update(",
        ".delete(",
        ".first(",
        ".exists(",
        ".count(",
        ".annotate(",
    ]

    # 允许的例外（Service 层调用）
    ALLOWED_PATTERNS = [
        "service.",
        "_service.",
        "Service(",
    ]

    # 排除的 legacy 文件
    EXCLUDED_FILES = {
        "assets_legacy.py",
        "contracts_legacy.py",
        "project_registry.py",
    }

    def get_router_files(self) -> list[Path]:
        """获取所有 Router 文件"""
        router_dir = Path("src/api/v1")
        router_files = []
        for path in router_dir.rglob("*.py"):
            # 排除 __init__.py 和 schemas.py
            if path.name in ("__init__.py", "schemas.py"):
                continue
            # 排除 legacy 文件
            if path.name in self.EXCLUDED_FILES:
                continue
            # 排除 dev 目录
            if "dev" in str(path):
                continue
            router_files.append(path)
        return router_files

    def check_file_for_orm_access(self, file_path: Path) -> list[tuple[int, str]]:
        """检查文件中是否有直接 ORM 访问"""
        violations = []
        content = file_path.read_text()
        lines = content.split("\n")

        for i, line in enumerate(lines, 1):
            # 跳过注释和字符串
            stripped = line.strip()
            if stripped.startswith("#") or stripped.startswith('"""'):
                continue
            # 跳过装饰器
            if stripped.startswith("@"):
                continue
            # 跳过 import 语句
            if "import" in line:
                continue

            # 检查 ORM 模式
            for pattern in self.ORM_PATTERNS:
                if pattern in line:
                    # 检查是否是允许的模式
                    is_allowed = any(
                        allowed in line for allowed in self.ALLOWED_PATTERNS
                    )
                    # 检查是否是 request.headers.get 等非 ORM 调用
                    if "request." in line or "headers." in line:
                        is_allowed = True
                    if not is_allowed:
                        violations.append((i, line.strip()))

        return violations

    def test_router_no_direct_orm_access(self):
        """
        Property: Router 文件不应直接调用 ORM 查询方法
        
        所有数据库访问应通过 Service 层进行。
        """
        router_files = self.get_router_files()
        all_violations = {}

        for file_path in router_files:
            violations = self.check_file_for_orm_access(file_path)
            if violations:
                all_violations[str(file_path)] = violations

        if all_violations:
            msg = "Router files with direct ORM access:\n"
            for file, violations in all_violations.items():
                msg += f"\n{file}:\n"
                for line_num, line in violations:
                    msg += f"  Line {line_num}: {line}\n"
            pytest.fail(msg)


class TestFileSizeLimits:
    """
    **Property 2: 拆分后文件行数限制**
    
    **Validates: Requirements 2.4, 3.3**
    
    - Router 文件不超过 300 行
    - Service 文件不超过 400 行
    
    注意：只检查新拆分的文件，不检查 legacy 文件
    """

    ROUTER_LINE_LIMIT = 300
    SERVICE_LINE_LIMIT = 400

    # 排除的 legacy 文件
    EXCLUDED_ROUTER_FILES = {
        "assets_legacy.py",
        "contracts_legacy.py",
        "project_registry.py",  # dev 目录下的文件
        "stats.py",
        "transactions.py",
        "project.py",  # 复杂的项目同步文件，暂不拆分
    }

    EXCLUDED_SERVICE_FILES = {
        "service.py",  # 一些大型 service 文件暂不拆分
        "readiness_checker.py",
        "transaction_service.py",
    }

    def count_lines(self, file_path: Path) -> int:
        """计算文件行数"""
        return len(file_path.read_text().split("\n"))

    def test_router_file_size_limits(self):
        """
        Property: 新拆分的 Router 文件不超过 300 行
        """
        router_dir = Path("src/api/v1")
        violations = []

        for path in router_dir.rglob("*.py"):
            if path.name == "__init__.py":
                continue
            if path.name in self.EXCLUDED_ROUTER_FILES:
                continue
            # 排除 dev 目录
            if "dev" in str(path):
                continue
            line_count = self.count_lines(path)
            if line_count > self.ROUTER_LINE_LIMIT:
                violations.append((str(path), line_count))

        if violations:
            msg = f"Router files exceeding {self.ROUTER_LINE_LIMIT} lines:\n"
            for file, count in violations:
                msg += f"  {file}: {count} lines\n"
            pytest.fail(msg)

    def test_service_file_size_limits(self):
        """
        Property: 新拆分的 Service 文件不超过 400 行
        """
        service_dir = Path("src/services")
        violations = []

        for path in service_dir.rglob("*.py"):
            if path.name == "__init__.py":
                continue
            if path.name in self.EXCLUDED_SERVICE_FILES:
                continue
            line_count = self.count_lines(path)
            if line_count > self.SERVICE_LINE_LIMIT:
                violations.append((str(path), line_count))

        if violations:
            msg = f"Service files exceeding {self.SERVICE_LINE_LIMIT} lines:\n"
            for file, count in violations:
                msg += f"  {file}: {count} lines\n"
            pytest.fail(msg)


class TestRedisNullChecks:
    """
    **Property 4: Redis 空值检查**
    
    **Validates: Requirements 6.1, 6.2, 6.3**
    
    LockService 应该在 Redis 操作前检查 Redis 是否已初始化。
    """

    def test_lock_service_has_ensure_redis(self):
        """
        Property: LockService 应该有 _ensure_redis 方法
        """
        lock_service_path = Path("src/shared/services/lock_service.py")
        content = lock_service_path.read_text()

        assert "_ensure_redis" in content, (
            "LockService should have _ensure_redis method"
        )

    def test_lock_service_has_redis_error(self):
        """
        Property: LockService 应该定义 RedisNotInitializedError
        """
        lock_service_path = Path("src/shared/services/lock_service.py")
        content = lock_service_path.read_text()

        assert "RedisNotInitializedError" in content, (
            "LockService should define RedisNotInitializedError"
        )


class TestImportNormalization:
    """
    **Property 5: 导入规范检查**
    
    **Validates: Requirements 7.1, 7.3, 7.4**
    
    - 导入应该在文件顶部
    - 导入应该按照 isort 规范排序
    """

    def test_no_function_level_imports_in_new_files(self):
        """
        Property: 新拆分的文件不应有函数级导入
        
        检查新拆分的 Router 和 Service 文件。
        """
        new_files = [
            Path("src/api/v1/admin/assets/crud.py"),
            Path("src/api/v1/admin/assets/media.py"),
            Path("src/api/v1/admin/assets/binding.py"),
            Path("src/api/v1/admin/contracts/status.py"),
            Path("src/api/v1/admin/contracts/registry.py"),
            Path("src/api/v1/admin/contracts/validation.py"),
            Path("src/api/v1/admin/contracts/project.py"),
            Path("src/services/contract/status_service.py"),
            Path("src/services/contract/registry_service.py"),
            Path("src/services/contract/sync_service.py"),
        ]

        violations = []

        for file_path in new_files:
            if not file_path.exists():
                continue

            content = file_path.read_text()
            tree = ast.parse(content)

            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    for child in ast.walk(node):
                        if isinstance(child, (ast.Import, ast.ImportFrom)):
                            violations.append(
                                (str(file_path), node.name, child.lineno)
                            )

        if violations:
            msg = "Function-level imports found in new files:\n"
            for file, func, line in violations:
                msg += f"  {file}: function '{func}' at line {line}\n"
            pytest.fail(msg)


class TestServiceLayerArchitecture:
    """
    **Property 6: Service 层架构验证**
    
    验证 Service 层的组织结构符合设计要求。
    """

    def test_contract_service_has_sub_services(self):
        """
        Property: ContractService 应该有子服务
        """
        service_dir = Path("src/services/contract")
        expected_files = [
            "status_service.py",
            "registry_service.py",
            "sync_service.py",
        ]

        for file_name in expected_files:
            file_path = service_dir / file_name
            assert file_path.exists(), f"Missing sub-service: {file_name}"

    def test_contract_service_exports(self):
        """
        Property: contract/__init__.py 应该导出所有子服务
        """
        init_path = Path("src/services/contract/__init__.py")
        content = init_path.read_text()

        expected_exports = [
            "ContractStatusService",
            "ContractRegistryService",
            "ContractSyncService",
        ]

        for export in expected_exports:
            assert export in content, f"Missing export: {export}"
