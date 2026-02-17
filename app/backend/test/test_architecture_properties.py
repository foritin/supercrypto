"""
架构属性测试 — service-layer-refactor

验证后端 services 层重构后的架构正确性属性。
本文件由各 Property 任务逐步添加测试。
"""

import ast
import inspect
import re
from pathlib import Path

from hypothesis import given, settings
from hypothesis import strategies as st

from src.services.asset_service import AssetService

# ---------------------------------------------------------------------------
# 辅助：收集 src/services/ 下所有 *_service.py 文件（排除 __init__.py）
# ---------------------------------------------------------------------------
SERVICES_DIR = Path("src/services")

service_files: list[Path] = sorted(
    p
    for p in SERVICES_DIR.glob("*_service.py")
    if p.is_file() and p.name != "__init__.py"
)

# 确保至少有一个服务文件，否则 sampled_from 会报错
assert len(service_files) > 0, f"未在 {SERVICES_DIR} 下找到任何 *_service.py 文件"

# 用于匹配跨服务 import 的正则：
#   from src.services.<other>_service import ...
# 其中 <other> 不能等于当前文件自身的服务名
CROSS_SERVICE_IMPORT_RE = re.compile(r"^from\s+src\.services\.(\w+_service)\s+import\b")

# storage_service 是基础设施服务，允许其他服务直接依赖
INFRA_SERVICE_MODULES = {"storage_service"}


class TestServiceNoCrossImport:
    """
    # Feature: service-layer-refactor, Property 1: 服务文件无跨服务 import
    # Validates: Requirements 1.1, 2.1, 3.1, 3.3

    对 src/services/ 下每个 *_service.py 文件，验证其不包含
    `from src.services.X_service import ...` 引用另一个服务模块的 import。

    __init__.py 被排除，因为它的职责就是 re-export 各服务。
    基础设施服务（如 storage_service）被排除，因为它们是共享依赖而非领域服务。
    """

    @given(service_file=st.sampled_from(service_files))
    @settings(max_examples=max(100, len(service_files) * 5))
    def test_property_1_no_cross_service_import(self, service_file: Path):
        """
        **Validates: Requirements 1.1, 2.1, 3.1, 3.3**

        属性: 任意服务文件不应 import 另一个服务模块（基础设施服务除外）。
        """
        own_module = service_file.stem  # e.g. "account_service"
        content = service_file.read_text(encoding="utf-8")

        violations: list[tuple[int, str]] = []
        for lineno, line in enumerate(content.splitlines(), start=1):
            m = CROSS_SERVICE_IMPORT_RE.match(line.strip())
            if m:
                imported_module = m.group(1)  # e.g. "asset_service"
                if (
                    imported_module != own_module
                    and imported_module not in INFRA_SERVICE_MODULES
                ):
                    violations.append((lineno, line.strip()))

        assert violations == [], (
            f"{service_file.name} 包含跨服务 import:\n"
            + "\n".join(f"  L{ln}: {txt}" for ln, txt in violations)
        )


# ---------------------------------------------------------------------------
# 辅助：收集项目中所有 .py 文件（src/ + test/ + scripts/）
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(".")
SRC_DIR = Path("src")
TEST_DIR = Path("test")
SCRIPTS_DIR = Path("scripts")

# 12 个扁平化服务文件名
EXPECTED_SERVICE_FILES = [
    "account_service.py",
    "admin_service.py",
    "asset_service.py",
    "audit_service.py",
    "auth_service.py",
    "contract_service.py",
    "dev_service.py",
    "kyc_service.py",
    "project_registry_service.py",
    "staking_service.py",
    "subscription_service.py",
    "transaction_service.py",
]

# 7 个从 shared/ 提升的顶层目录
EXPECTED_PROMOTED_DIRS = [
    "common",
    "constants",
    "decorators",
    "middleware",
    "schemas",
    "security",
    "infra",
]


def _collect_py_files(*dirs: Path) -> list[Path]:
    """递归收集指定目录下所有 .py 文件"""
    files: list[Path] = []
    for d in dirs:
        if d.exists():
            files.extend(sorted(d.rglob("*.py")))
    return files


all_py_files: list[Path] = _collect_py_files(SRC_DIR, TEST_DIR, SCRIPTS_DIR)
assert len(all_py_files) > 0, "未找到任何 .py 文件"

all_src_test_files: list[Path] = _collect_py_files(SRC_DIR, TEST_DIR)
assert len(all_src_test_files) > 0, "未找到任何 src/ 或 test/ 下的 .py 文件"

# 旧 import 路径模式（用于 Property 4）
OLD_IMPORT_PATTERNS = [
    # 旧的嵌套服务路径: from src.services.account.service import ...
    re.compile(
        r"^from\s+src\.services\.\w+\.(?:service|contract_service|media_service|validators|transaction_service|config_loader|registry_service|status_service|sync_service|binding_sync|readiness_checker|kyc_service)\s+import\b"
    ),
    # 旧的包 import: from src.services.account import ...
    re.compile(
        r"^from\s+src\.services\.(?:account|admin|asset|audit|auth|contract|dev|kyc|project_registry|staking|subscription|transaction)\s+import\b"
    ),
    # 旧的 shared 路径: from src.shared. ...
    re.compile(r"^from\s+src\.shared\.\s*\S"),
]

# lazy import 检测正则（用于 Property 6）
LAZY_IMPORT_RE = re.compile(r"^\s+from\s+src\.(services|shared)\b")


class TestFlattenedFilesExist:
    """
    # Feature: service-layer-refactor, Property 2: 扁平化文件存在且旧目录已删除
    # Validates: Requirements 4.1-4.13

    验证 12 个扁平化 .py 文件存在于 src/services/，
    且 src/services/ 下不存在任何子目录（__pycache__ 除外）。
    """

    @given(filename=st.sampled_from(EXPECTED_SERVICE_FILES))
    @settings(max_examples=max(100, len(EXPECTED_SERVICE_FILES) * 5))
    def test_property_2_flattened_service_file_exists(self, filename: str):
        """
        **Validates: Requirements 4.1-4.13**

        属性: 每个预期的扁平化服务文件都应存在于 src/services/ 下。
        """
        filepath = SERVICES_DIR / filename
        assert filepath.is_file(), f"扁平化服务文件不存在: {filepath}"

    def test_property_2_no_subdirectories_in_services(self):
        """
        **Validates: Requirements 4.1-4.13**

        属性: src/services/ 下不应存在任何子目录（__pycache__ 除外）。
        """
        subdirs = [
            p for p in SERVICES_DIR.iterdir() if p.is_dir() and p.name != "__pycache__"
        ]
        assert subdirs == [], (
            f"src/services/ 下存在非预期子目录: {[str(d) for d in subdirs]}"
        )


class TestSharedPromotedAndDeleted:
    """
    # Feature: service-layer-refactor, Property 3: shared 子目录已提升且旧目录已删除
    # Validates: Requirements 5.1-5.10

    验证 7 个顶层目录存在于 src/，且 src/shared/ 目录不存在。
    """

    @given(dirname=st.sampled_from(EXPECTED_PROMOTED_DIRS))
    @settings(max_examples=max(100, len(EXPECTED_PROMOTED_DIRS) * 5))
    def test_property_3_promoted_directory_exists(self, dirname: str):
        """
        **Validates: Requirements 5.1-5.10**

        属性: 每个从 shared/ 提升的顶层目录都应存在于 src/ 下。
        """
        dirpath = SRC_DIR / dirname
        assert dirpath.is_dir(), f"提升后的顶层目录不存在: {dirpath}"

    def test_property_3_shared_directory_deleted(self):
        """
        **Validates: Requirements 5.1-5.10**

        属性: src/shared/ 目录不应存在。
        """
        shared_dir = SRC_DIR / "shared"
        assert not shared_dir.exists(), "src/shared/ 目录仍然存在，应已被删除"


class TestNoStaleImportPaths:
    """
    # Feature: service-layer-refactor, Property 4: 无过时 import 路径
    # Validates: Requirements 4.14, 5.11

    扫描所有 .py 文件（src/ + test/ + scripts/），
    验证不包含旧的 import 路径模式。
    """

    @given(py_file=st.sampled_from(all_py_files))
    @settings(max_examples=max(100, len(all_py_files) * 5))
    def test_property_4_no_stale_import_paths(self, py_file: Path):
        """
        **Validates: Requirements 4.14, 5.11**

        属性: 任意 .py 文件不应包含旧的嵌套服务路径、旧包 import 或旧 shared 路径。
        """
        content = py_file.read_text(encoding="utf-8")
        violations: list[tuple[int, str]] = []

        for lineno, line in enumerate(content.splitlines(), start=1):
            stripped = line.strip()
            # 跳过注释行
            if stripped.startswith("#"):
                continue
            for pattern in OLD_IMPORT_PATTERNS:
                if pattern.match(stripped):
                    violations.append((lineno, stripped))
                    break

        assert violations == [], f"{py_file} 包含过时 import 路径:\n" + "\n".join(
            f"  L{ln}: {txt}" for ln, txt in violations
        )


class TestTransactionConsistency:
    """
    # Feature: service-layer-refactor, Property 5: 事务一致性（含 bug 修复验证）
    # Validates: Requirements 1.6, 1.7, 6.1-6.4

    静态代码分析验证:
    - AssetService.update_subscribed_amount 方法签名包含 using_db 参数
    - API 路由 subscriptions.py 使用 in_transaction() 包裹
    """

    def test_property_5_update_subscribed_amount_has_using_db(self):
        """
        **Validates: Requirements 1.7, 6.4**

        属性: AssetService.update_subscribed_amount 方法签名应包含 using_db 参数。
        """
        method = getattr(AssetService, "update_subscribed_amount", None)
        assert method is not None, "AssetService 缺少 update_subscribed_amount 方法"

        sig = inspect.signature(method)
        param_names = list(sig.parameters.keys())
        assert "using_db" in param_names, (
            f"AssetService.update_subscribed_amount 方法签名缺少 using_db 参数，"
            f"当前参数: {param_names}"
        )

    def test_property_5_subscription_api_uses_in_transaction(self):
        """
        **Validates: Requirements 1.6, 6.1-6.4**

        属性: 认购 API 路由文件应使用 in_transaction() 进行事务包裹。
        """
        api_file = Path("src/api/v1/user/subscriptions.py")
        assert api_file.is_file(), f"认购 API 路由文件不存在: {api_file}"

        content = api_file.read_text(encoding="utf-8")

        # 验证导入了 in_transaction
        assert "from tortoise.transactions import in_transaction" in content, (
            "认购 API 路由文件未导入 in_transaction"
        )

        # 验证使用了 in_transaction() 上下文管理器
        assert "in_transaction()" in content, (
            "认购 API 路由文件未使用 in_transaction() 进行事务包裹"
        )


class TestNoLazyImports:
    """
    # Feature: service-layer-refactor, Property 6: 无函数体内 lazy import
    # Validates: Requirements 3.3, 3.4, 4.15, 7.3

    扫描 src/ 和 test/ 下所有 .py 文件，
    验证不包含缩进的 from src.services. 或 from src.shared. 导入语句。
    """

    @given(py_file=st.sampled_from(all_src_test_files))
    @settings(max_examples=max(100, len(all_src_test_files) * 5))
    def test_property_6_no_lazy_imports(self, py_file: Path):
        """
        **Validates: Requirements 3.3, 3.4, 4.15, 7.3**

        属性: 任意 .py 文件不应包含函数体内的 from src.services. 或 from src.shared. 延迟导入。
        """
        content = py_file.read_text(encoding="utf-8")
        violations: list[tuple[int, str]] = []

        for lineno, line in enumerate(content.splitlines(), start=1):
            # 跳过注释行
            if line.strip().startswith("#"):
                continue
            if LAZY_IMPORT_RE.match(line):
                violations.append((lineno, line.rstrip()))

        assert violations == [], f"{py_file} 包含函数体内 lazy import:\n" + "\n".join(
            f"  L{ln}: {txt}" for ln, txt in violations
        )


# ===========================================================================
# service-layer-refactor: Property 1 — 服务文件结构规范
# ===========================================================================

# 已知例外：audit_service.py 包含 AuditService + TransactionAuditService，
# 这是设计文档 §7.2 明确的决策（两者共享审计领域，合并在同一文件）。
KNOWN_MULTI_CLASS_FILES = {"audit_service.py"}


def _is_exception_subclass(node: ast.ClassDef) -> bool:
    """判断一个 ClassDef 是否继承自 Exception/Error 类。

    检查 bases 中是否有名称包含 'Error' 或 'Exception' 的基类。
    """
    for base in node.bases:
        name = None
        if isinstance(base, ast.Name):
            name = base.id
        elif isinstance(base, ast.Attribute):
            name = base.attr
        if name and ("Error" in name or "Exception" in name):
            return True
    return False


def _has_dataclass_decorator(node: ast.ClassDef) -> bool:
    """判断一个 ClassDef 是否被 @dataclass 装饰。"""
    for dec in node.decorator_list:
        name = None
        if isinstance(dec, ast.Name):
            name = dec.id
        elif isinstance(dec, ast.Attribute):
            name = dec.attr
        elif isinstance(dec, ast.Call):
            func = dec.func
            if isinstance(func, ast.Name):
                name = func.id
            elif isinstance(func, ast.Attribute):
                name = func.attr
        if name == "dataclass":
            return True
    return False


def _is_basemodel_subclass(node: ast.ClassDef) -> bool:
    """判断一个 ClassDef 是否继承自 Pydantic BaseModel。"""
    for base in node.bases:
        name = None
        if isinstance(base, ast.Name):
            name = base.id
        elif isinstance(base, ast.Attribute):
            name = base.attr
        if name == "BaseModel":
            return True
    return False


class TestServiceFileStructure:
    """
    # Feature: service-layer-refactor, Property 1: 服务文件结构规范
    # Validates: Requirements 1.1, 2.1, 3.1, 4.1, 5.1, 7.1, 7.2, 8.1

    对 src/services/ 下每个服务文件（排除 __init__.py），验证：
    1. 只包含一个主服务类（顶层 class，排除 Exception 子类和 _ 前缀内部类）
    2. 不包含任何 Pydantic BaseModel 子类定义
    3. 不包含任何 @dataclass 装饰的类定义
    """

    @given(service_file=st.sampled_from(service_files))
    @settings(max_examples=max(100, len(service_files) * 5))
    def test_property_1_service_file_structure(self, service_file: Path):
        """
        **Validates: Requirements 1.1, 2.1, 3.1, 4.1, 5.1, 7.1, 7.2, 8.1**

        属性: 任意服务文件应只包含一个主服务类，且不包含 BaseModel/dataclass 定义。
        """
        source = service_file.read_text(encoding="utf-8")
        tree = ast.parse(source, filename=str(service_file))

        # 收集顶层 ClassDef 节点
        top_level_classes = [
            node
            for node in ast.iter_child_nodes(tree)
            if isinstance(node, ast.ClassDef)
        ]

        # --- 检查 1: 无 BaseModel 子类 ---
        basemodel_classes = [
            cls.name for cls in top_level_classes if _is_basemodel_subclass(cls)
        ]
        assert basemodel_classes == [], (
            f"{service_file.name} 包含 Pydantic BaseModel 子类: {basemodel_classes}"
        )

        # --- 检查 2: 无 @dataclass 装饰的类 ---
        dataclass_classes = [
            cls.name for cls in top_level_classes if _has_dataclass_decorator(cls)
        ]
        assert dataclass_classes == [], (
            f"{service_file.name} 包含 @dataclass 装饰的类: {dataclass_classes}"
        )

        # --- 检查 3: 只有一个主服务类 ---
        # 主服务类 = 顶层 class，排除:
        #   - Exception/Error 子类
        #   - _ 前缀的内部/兼容类
        main_classes = [
            cls.name
            for cls in top_level_classes
            if not _is_exception_subclass(cls) and not cls.name.startswith("_")
        ]

        # 已知例外文件允许多个主服务类
        if service_file.name in KNOWN_MULTI_CLASS_FILES:
            assert len(main_classes) >= 1, f"{service_file.name} 未找到主服务类"
        else:
            assert len(main_classes) == 1, (
                f"{service_file.name} 应只包含 1 个主服务类，"
                f"实际找到 {len(main_classes)} 个: {main_classes}"
            )


# ===========================================================================
# service-layer-refactor: Property 2 — 服务间无交叉导入
# ===========================================================================
# 注：Property 2 已由上方 TestServiceNoCrossImport 类完全覆盖。
# 该类验证任意服务文件不包含 from src.services.Y_service import ... 的跨服务导入。
# 无需新增测试代码。


# ===========================================================================
# service-layer-refactor: Property 3 — Schema 导入路径正确性
# ===========================================================================

# 从服务文件提取到 schemas/ 的 Schema 类名
EXTRACTED_SCHEMA_NAMES = {
    "ProviderKeyConfig",
    "ProjectConfig",
    "ContractConfigModel",
    "ContractReadinessInfo",
    "ProjectStatusReport",
    "BindingSyncResult",
    "ProjectSyncResult",
}

# 收集 src/ 下所有 .py 文件（排除 schemas/ 目录本身）
_src_files_excluding_schemas: list[Path] = sorted(
    p for p in SRC_DIR.rglob("*.py") if "schemas" not in p.relative_to(SRC_DIR).parts
)
assert len(_src_files_excluding_schemas) > 0, (
    "未找到 src/ 下的 .py 文件（排除 schemas/）"
)

# 匹配 from src.xxx import A, B, C 形式的导入
_IMPORT_FROM_RE = re.compile(r"^from\s+([\w.]+)\s+import\s+(.+)$")


class TestSchemaImportPaths:
    """
    # Feature: service-layer-refactor, Property 3: Schema 导入路径正确性
    # Validates: Requirements 1.3, 2.3

    对 src/ 下每个 .py 文件（排除 schemas/ 目录本身），如果该文件导入了
    从服务文件提取的 Schema 类名，则导入路径应指向 src.schemas.* 模块。
    """

    @given(py_file=st.sampled_from(_src_files_excluding_schemas))
    @settings(max_examples=max(100, len(_src_files_excluding_schemas) * 3))
    def test_property_3_schema_import_paths(self, py_file: Path):
        """
        **Validates: Requirements 1.3, 2.3**

        属性: 任意 src/ 文件（排除 schemas/）导入提取的 Schema 类时，
        导入路径应指向 src.schemas.* 模块。
        """
        content = py_file.read_text(encoding="utf-8")
        violations: list[tuple[int, str]] = []

        for lineno, line in enumerate(content.splitlines(), start=1):
            stripped = line.strip()
            # 跳过注释行
            if stripped.startswith("#"):
                continue
            m = _IMPORT_FROM_RE.match(stripped)
            if not m:
                continue
            module_path = m.group(1)
            imported_names_str = m.group(2)
            # 解析导入的名称列表（处理多行导入的单行部分）
            imported_names = [
                name.strip().rstrip(",").strip("()")
                for name in imported_names_str.split(",")
            ]
            # 检查是否导入了提取的 Schema 类名
            for name in imported_names:
                clean_name = name.strip()
                if clean_name in EXTRACTED_SCHEMA_NAMES:
                    # 导入路径应以 src.schemas 开头
                    if not module_path.startswith("src.schemas"):
                        violations.append((lineno, stripped))
                        break

        assert violations == [], (
            f"{py_file} 导入提取的 Schema 类但路径未指向 src.schemas.*:\n"
            + "\n".join(f"  L{ln}: {txt}" for ln, txt in violations)
        )


# ===========================================================================
# service-layer-refactor: Property 4 — Services_Init 仅导出类
# ===========================================================================

# services/__init__.__all__ 中应包含的服务类名称
# 注意: 单例/工厂函数已迁移至 src.common.dependencies，
# services/__init__.py 仅导出类定义。
SERVICES_EXPORTED_CLASSES = [
    # account
    "AccountService",
    # admin
    "AdminService",
    # asset
    "AssetService",
    # audit
    "AuditService",
    "TransactionAuditService",
    # auth
    "AuthService",
    # chain
    "ChainService",
    # contract
    "ContractService",
    # dev
    "DevToolsService",
    # kyc
    "KycService",
    # project_registry
    "ProjectRegistryService",
    # staking
    "StakingService",
    # storage
    "StorageService",
    # subscription
    "SubscriptionService",
    # transaction
    "TransactionService",
]


class TestServicesInitExportsClasses:
    """
    # Feature: service-layer-refactor, Property 4: Services_Init 仅导出类
    # Validates: Requirements 6.1, 6.2

    验证 services/__init__.__all__ 仅包含服务类定义，
    不包含单例实例或工厂函数（这些已迁至 src.common.dependencies）。
    """

    @given(name=st.sampled_from(SERVICES_EXPORTED_CLASSES))
    @settings(max_examples=max(100, len(SERVICES_EXPORTED_CLASSES) * 3))
    def test_property_4_services_init_exports_classes(self, name: str):
        """
        **Validates: Requirements 6.1, 6.2**

        属性: 每个服务类名称在 __all__ 中存在且可正常导入。
        """
        import importlib

        # 1. 检查名称在 __all__ 中
        services_mod = importlib.import_module("src.services")
        current_all = getattr(services_mod, "__all__", [])
        assert name in current_all, (
            f"'{name}' 不在 src.services.__all__ 中。"
            f"当前 __all__ 包含 {len(current_all)} 个名称。"
        )

        # 2. 检查名称可实际导入（getattr 不抛异常）
        obj = getattr(services_mod, name, None)
        assert obj is not None, (
            f"'{name}' 在 src.services.__all__ 中但 getattr 返回 None"
        )

        # 3. 验证导出的是类而非实例或函数
        assert isinstance(obj, type), (
            f"'{name}' 应为类定义而非实例或函数，实际类型: {type(obj).__name__}"
        )


# ===========================================================================
# service-layer-refactor: Property 5 — 现有导入语句可解析
# ===========================================================================

# 匹配 from src.services import X, Y, Z
_SERVICES_IMPORT_RE = re.compile(r"^from\s+src\.services\s+import\s+")
# 匹配 from src.services.xxx_service import X, Y, Z
_SERVICES_MODULE_IMPORT_RE = re.compile(
    r"^from\s+(src\.services\.\w+_service)\s+import\s+"
)

# 收集 src/api/ 和 test/ 下所有 .py 文件
_api_and_test_files: list[Path] = sorted(_collect_py_files(Path("src/api"), TEST_DIR))
assert len(_api_and_test_files) > 0, "未找到 src/api/ 或 test/ 下的 .py 文件"


def _extract_import_names(line: str) -> list[str]:
    """从 import 语句中提取导入的名称列表。

    处理单行 `from X import a, b, c` 和多行导入的起始行。
    """
    # 去掉 from ... import 部分
    _, _, names_part = line.partition("import")
    names_part = names_part.strip().rstrip("\\").strip("()")
    names = []
    for token in names_part.split(","):
        token = token.strip()
        if not token or token == "\\":
            continue
        # 处理 as 别名: `X as Y` → 取 X
        if " as " in token:
            token = token.split(" as ")[0].strip()
        # 跳过括号残留
        token = token.strip("()")
        if token and token.isidentifier():
            names.append(token)
    return names


class TestExistingImportsResolvable:
    """
    # Feature: service-layer-refactor, Property 5: 现有导入语句可解析
    # Validates: Requirements 6.2, 6.3, 7.3

    对 src/api/ 和 test/ 下每个 .py 文件，验证其中所有
    `from src.services import ...` 和 `from src.services.xxx_service import ...`
    形式的导入语句能正常解析。
    """

    @given(py_file=st.sampled_from(_api_and_test_files))
    @settings(max_examples=max(100, len(_api_and_test_files) * 3))
    def test_property_5_existing_imports_resolvable(self, py_file: Path):
        """
        **Validates: Requirements 6.2, 6.3, 7.3**

        属性: 任意 src/api/ 或 test/ 文件中的 src.services 导入语句应能正常解析。
        """
        import importlib

        content = py_file.read_text(encoding="utf-8")
        violations: list[tuple[int, str, str]] = []

        for lineno, line in enumerate(content.splitlines(), start=1):
            stripped = line.strip()
            if stripped.startswith("#"):
                continue

            # Case 1: from src.services import X, Y
            if _SERVICES_IMPORT_RE.match(stripped):
                names = _extract_import_names(stripped)
                services_mod = importlib.import_module("src.services")
                for name in names:
                    if not hasattr(services_mod, name):
                        violations.append((lineno, name, "src.services 中不存在该属性"))
                continue

            # Case 2: from src.services.xxx_service import X, Y
            m = _SERVICES_MODULE_IMPORT_RE.match(stripped)
            if m:
                module_path = m.group(1)
                try:
                    mod = importlib.import_module(module_path)
                except ImportError as e:
                    violations.append((lineno, module_path, f"模块导入失败: {e}"))
                    continue
                names = _extract_import_names(stripped)
                for name in names:
                    if not hasattr(mod, name):
                        violations.append(
                            (lineno, name, f"{module_path} 中不存在该属性")
                        )

        assert violations == [], (
            f"{py_file} 包含无法解析的 src.services 导入:\n"
            + "\n".join(
                f"  L{ln}: '{name}' — {reason}" for ln, name, reason in violations
            )
        )


# ===========================================================================
# service-layer-refactor: Property 6 — API 路由文件无内联 Schema
# ===========================================================================

# 收集 src/api/ 下所有 .py 文件（排除 __init__.py）
_api_files: list[Path] = sorted(
    p for p in Path("src/api").rglob("*.py") if p.is_file() and p.name != "__init__.py"
)
assert len(_api_files) > 0, "未找到 src/api/ 下的非 __init__.py 文件"


class TestApiNoInlineSchema:
    """
    # Feature: service-layer-refactor, Property 6: API 路由文件无内联 Schema
    # Validates: Requirements 9.1

    对 src/api/ 下每个 .py 文件（排除 __init__.py），验证其不包含
    继承自 Pydantic BaseModel 的类定义。
    """

    @given(py_file=st.sampled_from(_api_files))
    @settings(max_examples=max(100, len(_api_files) * 5))
    def test_property_6_api_no_inline_schema(self, py_file: Path):
        """
        **Validates: Requirements 9.1**

        属性: 任意 API 路由文件不应包含 Pydantic BaseModel 子类定义。
        """
        source = py_file.read_text(encoding="utf-8")
        tree = ast.parse(source, filename=str(py_file))

        # 收集顶层 ClassDef 节点
        top_level_classes = [
            node
            for node in ast.iter_child_nodes(tree)
            if isinstance(node, ast.ClassDef)
        ]

        basemodel_classes = [
            cls.name for cls in top_level_classes if _is_basemodel_subclass(cls)
        ]

        assert basemodel_classes == [], (
            f"{py_file} 包含内联 Pydantic BaseModel 子类: {basemodel_classes}"
        )


# ===========================================================================
# service-layer-refactor: Property 7 — API 层无 create_error_response 调用
# ===========================================================================


class TestApiNoCreateErrorResponse:
    """
    # Feature: service-layer-refactor, Property 7: API 层无 create_error_response 调用
    # Validates: Requirements 11.1, 11.2

    对 src/api/ 下每个 .py 文件（排除 __init__.py），验证其不包含
    `create_error_response(` 函数调用。
    """

    @given(py_file=st.sampled_from(_api_files))
    @settings(max_examples=max(100, len(_api_files) * 5))
    def test_property_7_api_no_create_error_response(self, py_file: Path):
        """
        **Validates: Requirements 11.1, 11.2**

        属性: 任意 API 路由文件不应包含 create_error_response( 调用。
        """
        content = py_file.read_text(encoding="utf-8")
        violations: list[tuple[int, str]] = []

        for lineno, line in enumerate(content.splitlines(), start=1):
            stripped = line.strip()
            # 跳过注释行
            if stripped.startswith("#"):
                continue
            if "create_error_response(" in stripped:
                violations.append((lineno, stripped))

        assert violations == [], (
            f"{py_file} 包含 create_error_response() 调用:\n"
            + "\n".join(f"  L{ln}: {txt}" for ln, txt in violations)
        )


# ===========================================================================
# service-layer-refactor: Property 8 — API 层无宽泛异常捕获
# ===========================================================================

# 匹配 except Exception 或 except Exception as xxx（但不匹配 except BusinessException 等具体异常）
_BROAD_EXCEPT_RE = re.compile(r"\bexcept\s+Exception\s*(?:as\s+\w+)?\s*:")


class TestApiNoBroadExceptionCatch:
    """
    # Feature: service-layer-refactor, Property 8: API 层无宽泛异常捕获
    # Validates: Requirements 11.3

    对 src/api/ 下每个 .py 文件（排除 __init__.py），验证其不包含
    `except Exception` 或 `except Exception as` 模式的宽泛异常捕获。
    """

    @given(py_file=st.sampled_from(_api_files))
    @settings(max_examples=max(100, len(_api_files) * 5))
    def test_property_8_api_no_broad_exception_catch(self, py_file: Path):
        """
        **Validates: Requirements 11.3**

        属性: 任意 API 路由文件不应包含 except Exception 宽泛捕获。
        """
        content = py_file.read_text(encoding="utf-8")
        violations: list[tuple[int, str]] = []

        for lineno, line in enumerate(content.splitlines(), start=1):
            stripped = line.strip()
            # 跳过注释行
            if stripped.startswith("#"):
                continue
            # 跳过字符串字面量（简单启发式：行以引号开头）
            if stripped.startswith(("'", '"', "'''", '"""')):
                continue
            if _BROAD_EXCEPT_RE.search(stripped):
                violations.append((lineno, stripped))

        assert violations == [], (
            f"{py_file} 包含宽泛异常捕获 (except Exception):\n"
            + "\n".join(f"  L{ln}: {txt}" for ln, txt in violations)
        )


# ===========================================================================
# service-layer-refactor: Property 9 — API 层导入限制
# ===========================================================================

# 匹配 from src.models 或 from src.infra 的直接导入
_API_FORBIDDEN_IMPORT_RE = re.compile(r"^from\s+src\.(models|infra)\b")


class TestApiImportRestriction:
    """
    # Feature: service-layer-refactor, Property 9: API 层导入限制
    # Validates: Requirements 12.1, 12.3

    对 src/api/ 下每个 .py 文件（排除 __init__.py），验证其不包含
    `from src.models` 或 `from src.infra` 的直接导入。
    """

    @given(py_file=st.sampled_from(_api_files))
    @settings(max_examples=max(100, len(_api_files) * 5))
    def test_property_9_api_import_restriction(self, py_file: Path):
        """
        **Validates: Requirements 12.1, 12.3**

        属性: 任意 API 路由文件不应直接从 src.models 或 src.infra 导入。
        """
        content = py_file.read_text(encoding="utf-8")
        violations: list[tuple[int, str]] = []

        for lineno, line in enumerate(content.splitlines(), start=1):
            stripped = line.strip()
            # 跳过注释行
            if stripped.startswith("#"):
                continue
            if _API_FORBIDDEN_IMPORT_RE.match(stripped):
                violations.append((lineno, stripped))

        assert violations == [], (
            f"{py_file} 包含禁止的直接导入 (src.models 或 src.infra):\n"
            + "\n".join(f"  L{ln}: {txt}" for ln, txt in violations)
        )


# ===========================================================================
# service-layer-refactor: Property 10 — 模型文件无业务辅助函数
# ===========================================================================

MODELS_DIR = Path("src/models")

# 收集 src/models/ 下所有 .py 文件（递归，排除 __init__.py 和 base.py）
_model_files: list[Path] = sorted(
    p
    for p in MODELS_DIR.rglob("*.py")
    if p.is_file() and p.name not in ("__init__.py", "base.py")
)
assert len(_model_files) > 0, f"未在 {MODELS_DIR} 下找到任何模型文件"


class TestModelNoBusinessHelpers:
    """
    # Feature: service-layer-refactor, Property 10: 模型文件无业务辅助函数
    # Validates: Requirements 14.1, 14.2

    对 src/models/ 下每个 .py 文件（排除 __init__.py 和 base.py），
    验证其不包含模块级 async def 函数定义。
    ORM 模型类内部的 async 方法和 classmethod 是允许的。
    """

    @given(model_file=st.sampled_from(_model_files))
    @settings(max_examples=max(100, len(_model_files) * 5))
    def test_property_10_model_no_business_helpers(self, model_file: Path):
        """
        **Validates: Requirements 14.1, 14.2**

        属性: 任意模型文件不应包含模块级 async def 函数定义。
        """
        source = model_file.read_text(encoding="utf-8")
        tree = ast.parse(source, filename=str(model_file))

        # 只检查模块体顶层的 AsyncFunctionDef 节点
        module_level_async_funcs = [
            node.name
            for node in ast.iter_child_nodes(tree)
            if isinstance(node, ast.AsyncFunctionDef)
        ]

        assert module_level_async_funcs == [], (
            f"{model_file} 包含模块级 async def 业务辅助函数: "
            f"{module_level_async_funcs}，应移至 services 层"
        )


# ===========================================================================
# service-layer-refactor: Property 11 — 异常定义集中化
# ===========================================================================

# 收集 src/models/ 和 src/services/ 下所有 .py 文件（排除 __init__.py）
_model_and_service_files: list[Path] = sorted(
    p
    for p in list(MODELS_DIR.rglob("*.py")) + list(SERVICES_DIR.rglob("*.py"))
    if p.is_file() and p.name != "__init__.py"
)
assert len(_model_and_service_files) > 0, "未找到 models/ 或 services/ 下的 .py 文件"


def _is_exception_or_business_exception_subclass(node: ast.ClassDef) -> bool:
    """判断一个 ClassDef 是否继承自 Exception/Error/BusinessException。

    扩展 _is_exception_subclass，额外检查 BusinessException 基类。
    """
    for base in node.bases:
        name = None
        if isinstance(base, ast.Name):
            name = base.id
        elif isinstance(base, ast.Attribute):
            name = base.attr
        if name and ("Error" in name or "Exception" in name):
            return True
    return False


class TestExceptionCentralization:
    """
    # Feature: service-layer-refactor, Property 11: 异常定义集中化
    # Validates: Requirements 15.2

    对 src/models/ 和 src/services/ 下每个 .py 文件（排除 __init__.py），
    验证其不包含继承自 Exception/Error/BusinessException 的类定义。
    异常类应集中定义在 src/common/exceptions.py 中。
    """

    @given(py_file=st.sampled_from(_model_and_service_files))
    @settings(max_examples=max(100, len(_model_and_service_files) * 5))
    def test_property_11_exception_centralization(self, py_file: Path):
        """
        **Validates: Requirements 15.2**

        属性: 任意 models/ 或 services/ 文件不应包含异常类定义。
        """
        source = py_file.read_text(encoding="utf-8")
        tree = ast.parse(source, filename=str(py_file))

        exception_classes = [
            node.name
            for node in ast.iter_child_nodes(tree)
            if isinstance(node, ast.ClassDef)
            and _is_exception_or_business_exception_subclass(node)
        ]

        assert exception_classes == [], (
            f"{py_file} 包含异常类定义: {exception_classes}，"
            f"应集中定义在 src/common/exceptions.py"
        )


# ===========================================================================
# service-layer-refactor: Property 12 — 业务常量集中化
# ===========================================================================

BUSINESS_CONSTANTS = [
    "PLT_TOTAL_SUPPLY",
    "PLT_STAKING_POOL",
    "STAKING_MULTIPLIERS",
    "BASE_DAILY_RATE",
    "ZERO_ADDRESS",
]

# 收集 src/ 下所有 .py 文件
_all_src_files: list[Path] = sorted(SRC_DIR.rglob("*.py"))
assert len(_all_src_files) > 0, "未找到 src/ 下的 .py 文件"

# 匹配赋值语句的正则：CONSTANT_NAME = ... (行首，可有缩进)
# 排除注释行和字符串中的出现
_ASSIGNMENT_RE_TEMPLATE = r"^\s*{}\s*="


class TestBusinessConstantCentralization:
    """
    # Feature: service-layer-refactor, Property 12: 业务常量集中化
    # Validates: Requirements 15.3

    对每个业务常量名称，扫描 src/ 下所有 .py 文件，
    验证赋值语句只出现一次（在 constants/ 或 config 文件中）。
    """

    @given(constant_name=st.sampled_from(BUSINESS_CONSTANTS))
    @settings(max_examples=max(100, len(BUSINESS_CONSTANTS) * 10))
    def test_property_12_business_constant_centralization(self, constant_name: str):
        """
        **Validates: Requirements 15.3**

        属性: 每个业务常量的赋值语句在 src/ 下只应出现一次。
        """
        pattern = re.compile(_ASSIGNMENT_RE_TEMPLATE.format(re.escape(constant_name)))
        occurrences: list[tuple[Path, int, str]] = []

        for py_file in _all_src_files:
            content = py_file.read_text(encoding="utf-8")
            for lineno, line in enumerate(content.splitlines(), start=1):
                stripped = line.strip()
                # 跳过注释行
                if stripped.startswith("#"):
                    continue
                # 跳过字符串字面量行（简单启发式）
                if stripped.startswith(("'", '"', "'''", '"""')):
                    continue
                if pattern.match(line):
                    occurrences.append((py_file, lineno, stripped))

        assert len(occurrences) == 1, (
            f"业务常量 {constant_name} 在 src/ 下出现 {len(occurrences)} 次赋值"
            f"（期望 1 次）:\n"
            + "\n".join(f"  {fp}:L{ln}: {txt}" for fp, ln, txt in occurrences)
        )


# ===========================================================================
# service-layer-refactor: Property 13 — 服务文件无裸 Exception 抛出
# ===========================================================================

# 匹配 raise Exception( 模式
_RAISE_EXCEPTION_RE = re.compile(r"raise\s+Exception\s*\(")


class TestServiceNoRaiseException:
    """
    # Feature: service-layer-refactor, Property 13: 服务文件无裸 Exception 抛出
    # Validates: Requirements 19.3

    对 src/services/ 下每个服务文件，验证其不包含 `raise Exception(` 模式。
    应使用 BusinessException 及其子类代替。
    """

    @given(service_file=st.sampled_from(service_files))
    @settings(max_examples=max(100, len(service_files) * 5))
    def test_property_13_service_no_raise_exception(self, service_file: Path):
        """
        **Validates: Requirements 19.3**

        属性: 任意服务文件不应包含 raise Exception( 裸异常抛出。
        """
        content = service_file.read_text(encoding="utf-8")
        violations: list[tuple[int, str]] = []

        for lineno, line in enumerate(content.splitlines(), start=1):
            stripped = line.strip()
            # 跳过注释行
            if stripped.startswith("#"):
                continue
            # 跳过字符串字面量行
            if stripped.startswith(("'", '"', "'''", '"""')):
                continue
            if _RAISE_EXCEPTION_RE.search(stripped):
                violations.append((lineno, stripped))

        assert violations == [], (
            f"{service_file.name} 包含裸 Exception 抛出:\n"
            + "\n".join(f"  L{ln}: {txt}" for ln, txt in violations)
            + "\n应使用 BusinessException 及其子类代替"
        )


# ===========================================================================
# service-layer-refactor: Property 14 — ListQuery Schema 继承 PaginationParams
# ===========================================================================

SCHEMAS_DIR = Path("src/schemas")

# 收集 src/schemas/ 下所有 .py 文件（排除 __init__.py 和 enums/ 子目录）
_schema_files: list[Path] = sorted(
    p for p in SCHEMAS_DIR.glob("*.py") if p.is_file() and p.name != "__init__.py"
)
assert len(_schema_files) > 0, f"未在 {SCHEMAS_DIR} 下找到任何 schema 文件"


def _find_list_query_classes(schema_files: list[Path]) -> list[tuple[Path, str]]:
    """扫描 schema 文件，找到所有类名以 ListQuery 或 ListParams 结尾的类。

    返回 (文件路径, 类名) 列表。
    """
    results: list[tuple[Path, str]] = []
    for fpath in schema_files:
        source = fpath.read_text(encoding="utf-8")
        try:
            tree = ast.parse(source, filename=str(fpath))
        except SyntaxError:
            continue
        for node in ast.iter_child_nodes(tree):
            if isinstance(node, ast.ClassDef):
                if node.name.endswith("ListQuery") or node.name.endswith("ListParams"):
                    results.append((fpath, node.name))
    return results


def _class_inherits_pagination_params(fpath: Path, class_name: str) -> bool:
    """检查指定文件中的类是否（直接或间接）继承自 PaginationParams。

    直接检查: 基类名称中包含 'PaginationParams'
    间接检查: 基类名称包含 'ListQuery' 或 'ListParams'（链式继承或别名导入）
    导入追踪: 检查 import 别名是否指向 PaginationParams 或 ListQuery 类
    """
    source = fpath.read_text(encoding="utf-8")
    tree = ast.parse(source, filename=str(fpath))

    # 构建导入别名映射: 本地名 → 原始名
    import_aliases: dict[str, str] = {}
    for node in ast.iter_child_nodes(tree):
        if isinstance(node, ast.ImportFrom):
            for alias in node.names:
                original = alias.name
                local = alias.asname if alias.asname else alias.name
                import_aliases[local] = original

    for node in ast.iter_child_nodes(tree):
        if isinstance(node, ast.ClassDef) and node.name == class_name:
            for base in node.bases:
                base_name = None
                if isinstance(base, ast.Name):
                    base_name = base.id
                elif isinstance(base, ast.Attribute):
                    base_name = base.attr
                if base_name:
                    # 直接继承 PaginationParams
                    if base_name == "PaginationParams":
                        return True
                    # 基类名称包含 ListQuery/ListParams（链式继承）
                    if "ListQuery" in base_name or "ListParams" in base_name:
                        return True
                    # 检查导入别名: 别名可能指向 PaginationParams 或 ListQuery 类
                    original_name = import_aliases.get(base_name, "")
                    if original_name == "PaginationParams":
                        return True
                    if "ListQuery" in original_name or "ListParams" in original_name:
                        return True
    return False


_list_query_classes = _find_list_query_classes(_schema_files)
# 如果没有找到任何 ListQuery/ListParams 类，跳过测试（不应发生）
if len(_list_query_classes) == 0:
    _list_query_classes = [(Path("src/schemas/base.py"), "_PlaceholderListQuery")]


class TestListQueryInheritsPaginationParams:
    """
    # Feature: service-layer-refactor, Property 14: ListQuery Schema 继承 PaginationParams
    # Validates: Requirements 18.2

    对 src/schemas/ 下每个类名以 ListQuery 或 ListParams 结尾的 Pydantic Schema，
    验证其直接或间接继承自 PaginationParams 基类。
    """

    @given(class_info=st.sampled_from(_list_query_classes))
    @settings(max_examples=max(100, len(_list_query_classes) * 5))
    def test_property_14_list_query_inherits_pagination_params(
        self, class_info: tuple[Path, str]
    ):
        """
        **Validates: Requirements 18.2**

        属性: 任意 *ListQuery/*ListParams Schema 应继承自 PaginationParams。
        """
        fpath, class_name = class_info
        # 跳过占位符
        if class_name == "_PlaceholderListQuery":
            return

        assert _class_inherits_pagination_params(fpath, class_name), (
            f"{fpath}::{class_name} 未继承自 PaginationParams 基类。"
            f"所有 *ListQuery/*ListParams Schema 应直接或间接继承 PaginationParams。"
        )


# ===========================================================================
# service-layer-refactor: Property 15 — Constants 与枚举值同步
# ===========================================================================

# 定义常量组与枚举类的对应关系
_CONSTANT_ENUM_PAIRS: list[tuple[str, str, str, str]] = [
    # (常量模块路径, 常量名, 枚举模块路径, 枚举类名)
    (
        "src.constants.definitions.asset",
        "MEDIA_TYPE_CONSTANTS",
        "src.schemas.enums.asset",
        "MediaType",
    ),
    (
        "src.constants.definitions.user",
        "LOCK_PERIOD_CONSTANTS",
        "src.schemas.enums.subscription",
        "LockPeriod",
    ),
    (
        "src.constants.definitions.kyc",
        "KYC_REJECT_REASON_CONSTANTS",
        "src.schemas.enums.kyc",
        "RejectReasonCode",
    ),
]


class TestConstantsEnumSync:
    """
    # Feature: service-layer-refactor, Property 15: Constants 与枚举值同步
    # Validates: Requirements 17.4

    对每组 Constants 常量与对应枚举类，验证其值集合一致。
    """

    @given(pair=st.sampled_from(_CONSTANT_ENUM_PAIRS))
    @settings(max_examples=max(100, len(_CONSTANT_ENUM_PAIRS) * 10))
    def test_property_15_constants_enum_sync(self, pair: tuple[str, str, str, str]):
        """
        **Validates: Requirements 17.4**

        属性: Constants 层常量组的值集合应与对应枚举类的成员值集合一致。
        """
        import importlib

        const_module_path, const_name, enum_module_path, enum_class_name = pair

        # 导入常量
        try:
            const_module = importlib.import_module(const_module_path)
            constants_list = getattr(const_module, const_name)
        except (ImportError, AttributeError) as e:
            raise AssertionError(f"无法导入常量 {const_module_path}.{const_name}: {e}")

        # 导入枚举
        try:
            enum_module = importlib.import_module(enum_module_path)
            enum_class = getattr(enum_module, enum_class_name)
        except (ImportError, AttributeError) as e:
            raise AssertionError(
                f"无法导入枚举 {enum_module_path}.{enum_class_name}: {e}"
            )

        # 提取常量值集合（ConstantItem.value 是 str 类型）
        constant_values = {item.value for item in constants_list}

        # 提取枚举值集合（转为 str 以统一比较）
        enum_values = {str(member.value) for member in enum_class}

        assert constant_values == enum_values, (
            f"{const_name} 与 {enum_class_name} 值集合不一致:\n"
            f"  常量有但枚举无: {constant_values - enum_values}\n"
            f"  枚举有但常量无: {enum_values - constant_values}"
        )


# ===========================================================================
# service-layer-refactor: Property 16 — 路由文件无业务常量和工具函数
# ===========================================================================

# 已知允许的模块级赋值目标名称（路由文件中的标准模式）
_ALLOWED_API_ASSIGNMENTS = {
    "router",  # router = APIRouter()
    "logger",  # logger = get_logger(...)
}

# 已知允许的模块级赋值模式（类型别名等）
_ALLOWED_ASSIGNMENT_PATTERNS = re.compile(
    r"^(router|logger|__all__|T|[A-Z]_?[a-z])"  # router, logger, __all__, 类型变量
)


def _is_route_decorated(node: ast.FunctionDef | ast.AsyncFunctionDef) -> bool:
    """判断函数是否被 @router.xxx 装饰（路由函数）。"""
    for dec in node.decorator_list:
        # @router.get(...), @router.post(...) 等
        if isinstance(dec, ast.Call) and isinstance(dec.func, ast.Attribute):
            if isinstance(dec.func.value, ast.Name) and dec.func.value.id == "router":
                return True
        # @router.get (无括号，不常见但可能)
        if isinstance(dec, ast.Attribute):
            if isinstance(dec.value, ast.Name) and dec.value.id == "router":
                return True
    return False


def _is_dependency_function(node: ast.FunctionDef | ast.AsyncFunctionDef) -> bool:
    """判断函数是否被 FastAPI 依赖注入装饰器装饰。"""
    for dec in node.decorator_list:
        if isinstance(dec, ast.Name) and dec.id in ("Depends",):
            return True
    return False


class TestApiNoBusinessConstants:
    """
    # Feature: service-layer-refactor, Property 16: 路由文件无业务常量和工具函数
    # Validates: Requirements 21.4

    对 src/api/ 下每个 .py 文件（排除 __init__.py），验证其不包含：
    1. 模块级常量赋值（如 ALLOWED_EXTENSIONS = ..., MAX_FILE_SIZE = ...）
    2. 模块级工具函数定义（非路由装饰的函数）

    允许的例外: router = APIRouter(), logger = get_logger(...)
    """

    @given(py_file=st.sampled_from(_api_files))
    @settings(max_examples=max(100, len(_api_files) * 5))
    def test_property_16_api_no_business_constants(self, py_file: Path):
        """
        **Validates: Requirements 21.4**

        属性: 任意 API 路由文件不应包含模块级业务常量或工具函数定义。
        """
        source = py_file.read_text(encoding="utf-8")
        tree = ast.parse(source, filename=str(py_file))

        violations: list[str] = []

        for node in ast.iter_child_nodes(tree):
            # 检查模块级赋值（常量定义）
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        name = target.id
                        # 跳过允许的赋值
                        if name in _ALLOWED_API_ASSIGNMENTS:
                            continue
                        # 跳过 _ 前缀的私有变量
                        if name.startswith("_"):
                            continue
                        # 全大写名称 = 业务常量，不允许
                        if name.isupper() and len(name) > 1:
                            violations.append(
                                f"L{node.lineno}: 模块级常量赋值 '{name}'"
                            )

            # 检查模块级带注解赋值
            if isinstance(node, ast.AnnAssign):
                if isinstance(node.target, ast.Name):
                    name = node.target.id
                    if name in _ALLOWED_API_ASSIGNMENTS:
                        continue
                    if name.isupper() and len(name) > 1:
                        violations.append(f"L{node.lineno}: 模块级常量赋值 '{name}'")

            # 检查模块级函数定义（非路由函数）
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                if not _is_route_decorated(node):
                    # 允许: _ 前缀的内部函数
                    if node.name.startswith("_"):
                        continue
                    # 允许: get_*_service() 依赖注入工厂函数（FastAPI Depends 模式）
                    if node.name.startswith("get_") and node.name.endswith("_service"):
                        continue
                    # 允许: require_* 依赖守卫函数（权限/环境检查）
                    if node.name.startswith("require_"):
                        continue
                    # 允许: 依赖注入装饰的函数
                    if _is_dependency_function(node):
                        continue
                    violations.append(f"L{node.lineno}: 模块级工具函数 '{node.name}()'")

        assert violations == [], (
            f"{py_file} 包含业务常量或工具函数定义:\n"
            + "\n".join(f"  {v}" for v in violations)
            + "\n业务常量应定义在 src/constants/，工具函数应定义在 src/common/ 或 src/services/"
        )


# ===========================================================================
# service-layer-refactor: Property 17 — 统一 total_pages 计算
# ===========================================================================

# 匹配手动 total_pages 计算模式
_MANUAL_TOTAL_PAGES_PATTERNS = [
    # (total + page_size - 1) // page_size 模式
    re.compile(r"\(\s*\w+\s*\+\s*\w+\s*-\s*1\s*\)\s*//\s*\w+"),
    # math.ceil(total / page_size) 模式
    re.compile(r"math\.ceil\s*\(\s*\w+\s*/\s*\w+\s*\)"),
]


class TestUnifiedTotalPagesCalculation:
    """
    # Feature: service-layer-refactor, Property 17: 统一 total_pages 计算
    # Validates: Requirements 23.2

    对 src/ 下每个 .py 文件，如果包含 total_pages 计算，
    应使用 calculate_total_pages() 函数而非手动计算。

    排除 calculate_total_pages 函数自身的定义文件。
    """

    @given(py_file=st.sampled_from(_all_src_files))
    @settings(max_examples=max(100, len(_all_src_files) * 5))
    def test_property_17_unified_total_pages_calculation(self, py_file: Path):
        """
        **Validates: Requirements 23.2**

        属性: 任意 src/ 文件中的 total_pages 计算应使用 calculate_total_pages() 函数。
        """
        # 排除 calculate_total_pages 定义所在文件
        if py_file.name == "utils.py" and "common" in str(py_file):
            return

        content = py_file.read_text(encoding="utf-8")
        violations: list[tuple[int, str]] = []

        for lineno, line in enumerate(content.splitlines(), start=1):
            stripped = line.strip()
            # 跳过注释行
            if stripped.startswith("#"):
                continue
            # 跳过字符串字面量行
            if stripped.startswith(("'", '"', "'''", '"""')):
                continue

            # 只检查包含 total_pages 的行
            if "total_pages" not in stripped:
                continue

            for pattern in _MANUAL_TOTAL_PAGES_PATTERNS:
                if pattern.search(stripped):
                    violations.append((lineno, stripped))
                    break

        assert violations == [], (
            f"{py_file} 包含手动 total_pages 计算:\n"
            + "\n".join(f"  L{ln}: {txt}" for ln, txt in violations)
            + "\n应使用 calculate_total_pages() 函数代替"
        )


# ===========================================================================
# service-layer-refactor: Property 18 — API summary 统一英文
# ===========================================================================

# 匹配中文字符的正则
_CHINESE_CHAR_RE = re.compile(r"[\u4e00-\u9fff]")

# 匹配路由装饰器中 summary= 参数值的正则（支持单引号和双引号）
_SUMMARY_VALUE_RE = re.compile(r"""summary\s*=\s*(['"])(.*?)\1""")


class TestApiSummaryEnglish:
    """
    # Feature: service-layer-refactor, Property 18: API summary 统一英文
    # Validates: Requirements 24.1

    对 src/api/ 下每个 .py 文件（排除 __init__.py），验证其路由装饰器中
    summary= 参数的值不包含中文字符。
    """

    @given(py_file=st.sampled_from(_api_files))
    @settings(max_examples=max(100, len(_api_files) * 5))
    def test_property_18_api_summary_english(self, py_file: Path):
        """
        **Validates: Requirements 24.1**

        属性: 任意路由装饰器中 summary= 的值不应包含中文字符。
        """
        content = py_file.read_text(encoding="utf-8")
        violations: list[tuple[int, str]] = []

        for lineno, line in enumerate(content.splitlines(), start=1):
            stripped = line.strip()
            # 跳过注释行
            if stripped.startswith("#"):
                continue

            for m in _SUMMARY_VALUE_RE.finditer(stripped):
                summary_value = m.group(2)
                if _CHINESE_CHAR_RE.search(summary_value):
                    violations.append((lineno, summary_value))

        assert violations == [], (
            f"{py_file} 包含中文 summary:\n"
            + "\n".join(f'  L{ln}: summary="{txt}"' for ln, txt in violations)
            + "\nAPI summary 应统一使用英文"
        )


# ===========================================================================
# service-layer-refactor: Property 19 — API 路径统一 kebab-case
# ===========================================================================

# 匹配路由装饰器第一个字符串参数（路径）的正则
# 支持 @router.get("/path") 和 @router.get(\n    "/path") 两种形式
_ROUTE_PATH_RE = re.compile(
    r"""@router\.(?:get|post|put|delete|patch)\(\s*(['"])(.*?)\1"""
)

# 匹配路径参数占位符 {xxx}
_PATH_PARAM_RE = re.compile(r"\{[^}]+\}")


class TestApiPathKebabCase:
    """
    # Feature: service-layer-refactor, Property 19: API 路径统一 kebab-case
    # Validates: Requirements 24.2

    对 src/api/ 下每个 .py 文件（排除 __init__.py），验证其路由装饰器中
    路径的静态段不包含下划线（应使用连字符）。
    路径参数（如 {wallet_address}）不受此限制。
    """

    @given(py_file=st.sampled_from(_api_files))
    @settings(max_examples=max(100, len(_api_files) * 5))
    def test_property_19_api_path_kebab_case(self, py_file: Path):
        """
        **Validates: Requirements 24.2**

        属性: 任意路由路径的静态段不应包含下划线，应使用 kebab-case。
        """
        content = py_file.read_text(encoding="utf-8")
        violations: list[tuple[int, str, str]] = []

        for lineno, line in enumerate(content.splitlines(), start=1):
            stripped = line.strip()
            if stripped.startswith("#"):
                continue

            for m in _ROUTE_PATH_RE.finditer(stripped):
                path = m.group(2)
                if not path:
                    continue

                # 将路径按 / 分割，检查每个静态段
                segments = path.split("/")
                for seg in segments:
                    if not seg:
                        continue
                    # 跳过路径参数 {xxx}
                    if _PATH_PARAM_RE.fullmatch(seg):
                        continue
                    # 静态段不应包含下划线
                    if "_" in seg:
                        violations.append((lineno, path, seg))

        assert violations == [], (
            f"{py_file} 包含非 kebab-case 路径:\n"
            + "\n".join(
                f'  L{ln}: path="{p}" segment="{s}" 包含下划线'
                for ln, p, s in violations
            )
            + "\n路径应使用 kebab-case（连字符），如 /bind-project"
        )


# ===========================================================================
# service-layer-refactor: Property 20 — 路由函数体大小限制
# ===========================================================================

_MAX_ROUTE_BODY_LINES = 30


class TestRouteBodySizeLimit:
    """
    # Feature: service-layer-refactor, Property 20: 路由函数体大小限制
    # Validates: Requirements 10.4

    对 src/api/ 下每个 .py 文件（排除 __init__.py），验证被 @router.xxx
    装饰的路由函数体不超过 30 行。
    """

    @given(py_file=st.sampled_from(_api_files))
    @settings(max_examples=max(100, len(_api_files) * 5))
    def test_property_20_route_body_size_limit(self, py_file: Path):
        """
        **Validates: Requirements 10.4**

        属性: 任意路由函数体行数不应超过 30 行。
        """
        source = py_file.read_text(encoding="utf-8")
        tree = ast.parse(source, filename=str(py_file))

        violations: list[tuple[str, int]] = []

        for node in ast.walk(tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            if not _is_route_decorated(node):
                continue
            if not node.body:
                continue

            # 函数体行数 = 最后一个语句的结束行 - 第一个语句的起始行 + 1
            body_start = node.body[0].lineno
            body_end = node.body[-1].end_lineno or node.body[-1].lineno
            body_lines = body_end - body_start + 1

            if body_lines > _MAX_ROUTE_BODY_LINES:
                violations.append((node.name, body_lines))

        assert violations == [], (
            f"{py_file} 包含超过 {_MAX_ROUTE_BODY_LINES} 行的路由函数体:\n"
            + "\n".join(f"  {name}(): {lines} 行" for name, lines in violations)
            + f"\n路由函数体应不超过 {_MAX_ROUTE_BODY_LINES} 行，业务逻辑应下沉到 Service 层"
        )


# ===========================================================================
# service-layer-refactor: Property 21 — 所有路由文件已注册
# ===========================================================================

# 收集 src/api/v1/ 子目录中的路由文件（排除 __init__.py 和非路由辅助文件）
_API_V1_DIR = Path("src/api/v1")

# 非路由辅助文件/目录名（不需要注册 router 的）
_NON_ROUTE_NAMES = {"deps.py", "schemas"}


def _collect_route_module_files() -> list[tuple[Path, Path]]:
    """
    收集 src/api/v1/ 子目录中定义了 router 的 .py 文件。

    返回 (route_file, parent_init_file) 元组列表。
    只检查直接子目录和嵌套子目录中的文件。
    """
    results: list[tuple[Path, Path]] = []
    for subdir in sorted(_API_V1_DIR.iterdir()):
        if not subdir.is_dir() or subdir.name.startswith(("_", ".")):
            continue
        # 递归查找子目录中的 .py 文件
        for py_file in sorted(subdir.rglob("*.py")):
            if py_file.name == "__init__.py":
                continue
            # 跳过已知的非路由文件
            if py_file.name in _NON_ROUTE_NAMES:
                continue
            # 跳过非路由目录（如 schemas/）
            if any(
                part in _NON_ROUTE_NAMES for part in py_file.relative_to(subdir).parts
            ):
                continue
            # 检查文件是否定义了 router
            content = py_file.read_text(encoding="utf-8")
            if (
                "router = APIRouter(" not in content
                and "router = APIRouter()" not in content
            ):
                continue
            # 找到父目录的 __init__.py
            parent_init = py_file.parent / "__init__.py"
            if parent_init.exists():
                results.append((py_file, parent_init))
    return results


_route_module_pairs = _collect_route_module_files()
assert len(_route_module_pairs) > 0, "未找到 src/api/v1/ 子目录中的路由模块文件"


class TestAllRouteFilesRegistered:
    """
    # Feature: service-layer-refactor, Property 21: 所有路由文件已注册
    # Validates: Requirements 13.3

    对 src/api/v1/ 子目录中每个定义了 router 的 .py 文件，
    验证其模块名出现在父目录 __init__.py 的 import 语句中。
    """

    @given(pair=st.sampled_from(_route_module_pairs))
    @settings(max_examples=max(100, len(_route_module_pairs) * 5))
    def test_property_21_all_route_files_registered(self, pair: tuple[Path, Path]):
        """
        **Validates: Requirements 13.3**

        属性: 任意定义了 router 的路由文件应被其父目录 __init__.py 导入注册。
        """
        route_file, parent_init = pair
        module_name = route_file.stem  # e.g. "crud", "media", "binding"

        init_content = parent_init.read_text(encoding="utf-8")

        # 检查模块名是否出现在 __init__.py 的 import 语句中
        # 支持多种 import 形式:
        #   from .module import router
        #   from src.api.v1.xxx import module
        #   from src.api.v1.xxx import kyc, tools
        #   import module
        registered = False
        for line in init_content.splitlines():
            stripped = line.strip()
            if stripped.startswith("#"):
                continue
            # 只检查包含 import 的行
            if "import" not in stripped:
                # 也检查多行 import 列表中的裸模块名
                if stripped == f"{module_name}," or stripped == module_name:
                    registered = True
                    break
                continue
            # from .module import ... 或 from . import module
            if f".{module_name}" in stripped:
                registered = True
                break
            # from src.api.v1.xxx.module import ...
            if f".{module_name} import" in stripped:
                registered = True
                break
            # from xxx import module (可能在逗号分隔列表中)
            # 匹配: import module, import module as x, import a, module, ...
            import_part = stripped.split("import", 1)[-1]
            # 提取所有导入的名称（处理逗号分隔和 as 别名）
            imported_names = [
                name.strip().split(" as ")[0].strip().split(".")[0].strip()
                for name in import_part.split(",")
            ]
            if module_name in imported_names:
                registered = True
                break

        assert registered, (
            f"{route_file} 定义了 router 但未在 {parent_init} 中注册\n"
            f"模块名: {module_name}\n"
            f"请在 {parent_init} 中添加 import 并使用 router.include_router() 注册"
        )


# ===========================================================================
# service-layer-refactor: Property 22 — models/__init__.py 不导出业务辅助函数
# ===========================================================================

# 已知的业务辅助函数名称（模块级 async def，应从 services 导入而非 models）
_KNOWN_BUSINESS_HELPER_NAMES = {
    "log_audit",
    "record_transaction",
    "query_audit_logs",
    "get_operator_audit_history",
    "get_target_audit_history",
    "get_failed_operations",
    "get_security_events",
    "update_transaction_status",
    "query_transactions",
    "sync_provider_registry",
    "check_project_ready",
}


class TestModelsInitNoBusinessHelpers:
    """
    # Feature: service-layer-refactor, Property 22: models/__init__.py 不导出业务辅助函数
    # Validates: Requirements 14.4

    验证 models/__init__.py 的 __all__ 列表和顶层 import 语句
    不包含模块级 async def 业务辅助函数（如 log_audit、record_transaction 等）。
    """

    def test_property_22_models_init_all_no_business_helpers(self):
        """
        **Validates: Requirements 14.4**

        属性: models/__init__.__all__ 不应包含已知的业务辅助函数名称。
        """
        init_file = MODELS_DIR / "__init__.py"
        source = init_file.read_text(encoding="utf-8")
        tree = ast.parse(source, filename=str(init_file))

        # 提取 __all__ 列表中的名称
        all_names: set[str] = set()
        for node in ast.iter_child_nodes(tree):
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and target.id == "__all__":
                        if isinstance(node.value, (ast.List, ast.Tuple)):
                            for elt in node.value.elts:
                                if isinstance(elt, ast.Constant) and isinstance(
                                    elt.value, str
                                ):
                                    all_names.add(elt.value)

        violations = all_names & _KNOWN_BUSINESS_HELPER_NAMES
        assert violations == set(), (
            f"models/__init__.__all__ 包含业务辅助函数: {sorted(violations)}，"
            f"应从 src.services 导入对应 Service 方法"
        )

    def test_property_22_models_init_imports_no_business_helpers(self):
        """
        **Validates: Requirements 14.4**

        属性: models/__init__.py 的顶层 import 语句不应导入业务辅助函数。
        """
        init_file = MODELS_DIR / "__init__.py"
        source = init_file.read_text(encoding="utf-8")
        tree = ast.parse(source, filename=str(init_file))

        imported_names: set[str] = set()
        for node in ast.iter_child_nodes(tree):
            if isinstance(node, ast.ImportFrom):
                for alias in node.names:
                    name = alias.asname if alias.asname else alias.name
                    imported_names.add(name)

        violations = imported_names & _KNOWN_BUSINESS_HELPER_NAMES
        assert violations == set(), (
            f"models/__init__.py 顶层 import 包含业务辅助函数: {sorted(violations)}，"
            f"应从 src.services 导入对应 Service 方法"
        )


# ===========================================================================
# service-layer-refactor: Property 23 — 模型文件无注释代码块
# ===========================================================================

_COMMENT_CODE_THRESHOLD = 10  # 连续注释行阈值

# 分割线模式（# ==== 或 # ---- 等）
_SEPARATOR_LINE_RE = re.compile(r"^#\s*[=\-]{4,}")


def _is_comment_code_line(line: str) -> bool:
    """判断一行是否为注释代码行（以 # 开头，排除分割线和空注释）。"""
    stripped = line.strip()
    if not stripped.startswith("#"):
        return False
    # 排除空注释 (只有 #)
    content_after_hash = stripped.lstrip("#").strip()
    if not content_after_hash:
        return False
    # 排除分割线
    if _SEPARATOR_LINE_RE.match(stripped):
        return False
    # 排除 type: ignore 等工具注释
    if content_after_hash.startswith(("type:", "noqa", "pragma", "pylint", "fmt:")):
        return False
    return True


class TestModelNoCommentedCodeBlocks:
    """
    # Feature: service-layer-refactor, Property 23: 模型文件无注释代码块
    # Validates: Requirements 16.1

    对 src/models/ 下每个 .py 文件，验证其不包含连续 10 行以上的
    注释代码块（以 # 开头的连续行，排除文档注释和分割线）。
    """

    @given(model_file=st.sampled_from(_model_files))
    @settings(max_examples=max(100, len(_model_files) * 5))
    def test_property_23_model_no_commented_code_blocks(self, model_file: Path):
        """
        **Validates: Requirements 16.1**

        属性: 任意模型文件不应包含连续 10+ 行的注释代码块。
        """
        content = model_file.read_text(encoding="utf-8")
        lines = content.splitlines()

        consecutive_count = 0
        block_start = 0
        violations: list[tuple[int, int]] = []

        # 跳过文件开头的模块 docstring 区域
        in_docstring = False
        docstring_end_line = 0
        for i, line in enumerate(lines):
            stripped = line.strip()
            if i == 0 and stripped.startswith(('"""', "'''")):
                in_docstring = True
                if stripped.count('"""') >= 2 or stripped.count("'''") >= 2:
                    docstring_end_line = i + 1
                    break
                continue
            if in_docstring:
                if '"""' in stripped or "'''" in stripped:
                    docstring_end_line = i + 1
                    break
                continue
            break

        for lineno, line in enumerate(lines, start=1):
            # 跳过 docstring 区域
            if lineno <= docstring_end_line:
                continue

            if _is_comment_code_line(line):
                if consecutive_count == 0:
                    block_start = lineno
                consecutive_count += 1
            else:
                if consecutive_count >= _COMMENT_CODE_THRESHOLD:
                    violations.append((block_start, consecutive_count))
                consecutive_count = 0

        # 检查文件末尾的连续注释块
        if consecutive_count >= _COMMENT_CODE_THRESHOLD:
            violations.append((block_start, consecutive_count))

        assert violations == [], (
            f"{model_file} 包含大段注释代码块:\n"
            + "\n".join(
                f"  L{start}: 连续 {count} 行注释代码" for start, count in violations
            )
            + f"\n连续注释代码不应超过 {_COMMENT_CODE_THRESHOLD} 行，请删除废弃代码"
        )


# ===========================================================================
# service-layer-refactor: Property 24 — TOKEN_URL 与实际端点一致
# ===========================================================================

_EXPECTED_TOKEN_URL = "api/v1/public/auth/token"


class TestTokenUrlCorrect:
    """
    # Feature: service-layer-refactor, Property 24: TOKEN_URL 与实际端点一致
    # Validates: Requirements 19.1

    验证 src/common/adapters.py 中 TOKEN_URL 赋值等于实际认证端点路径。
    """

    def test_property_24_token_url_matches_endpoint(self):
        """
        **Validates: Requirements 19.1**

        属性: TOKEN_URL 赋值应等于 "api/v1/public/auth/token"。
        """
        adapters_file = Path("src/common/adapters.py")
        source = adapters_file.read_text(encoding="utf-8")
        tree = ast.parse(source, filename=str(adapters_file))

        token_url_value = None
        for node in ast.iter_child_nodes(tree):
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and target.id == "TOKEN_URL":
                        if isinstance(node.value, ast.Constant):
                            token_url_value = node.value.value

        assert token_url_value is not None, (
            "src/common/adapters.py 中未找到 TOKEN_URL 赋值"
        )
        assert token_url_value == _EXPECTED_TOKEN_URL, (
            f"TOKEN_URL = {token_url_value!r}，期望 {_EXPECTED_TOKEN_URL!r}"
        )


# ===========================================================================
# service-layer-refactor: Property 25 — 存储层无同步阻塞调用
# ===========================================================================

# 需要被 asyncio.to_thread 包装的 minio 同步方法调用模式
_MINIO_SYNC_METHODS = {"list_objects", "stat_object", "remove_objects"}


class TestStorageNoSyncBlockingCalls:
    """
    # Feature: service-layer-refactor, Property 25: 存储层无同步阻塞调用
    # Validates: Requirements 19.2

    验证 src/services/storage_service.py 中对 minio client 同步方法的调用
    都被 asyncio.to_thread() 包装。
    """

    def test_property_25_storage_no_sync_blocking_calls(self):
        """
        **Validates: Requirements 19.2**

        属性: storage_service.py 中 minio.client.list_objects/stat_object 调用
        应被 asyncio.to_thread() 包装。
        """
        storage_file = Path("src/services/storage_service.py")
        source = storage_file.read_text(encoding="utf-8")
        lines = source.splitlines()

        violations: list[tuple[int, str, str]] = []

        for lineno, line in enumerate(lines, start=1):
            stripped = line.strip()
            # 跳过注释行
            if stripped.startswith("#"):
                continue

            for method_name in _MINIO_SYNC_METHODS:
                pattern = f".{method_name}("
                if pattern not in stripped:
                    continue

                # 检查该调用是否在 asyncio.to_thread 上下文中
                # 向上搜索最近的 asyncio.to_thread 或 await asyncio.to_thread
                found_wrapper = False
                # 检查当前行是否包含 asyncio.to_thread
                if "asyncio.to_thread" in stripped:
                    found_wrapper = True
                else:
                    # 向上搜索（lambda 包装模式中，to_thread 在前几行）
                    search_start = max(0, lineno - 6)
                    context_block = "\n".join(lines[search_start:lineno])
                    if "asyncio.to_thread" in context_block:
                        found_wrapper = True

                if not found_wrapper:
                    violations.append((lineno, method_name, stripped))

        assert violations == [], (
            "src/services/storage_service.py 包含未被 asyncio.to_thread() 包装的同步调用:\n"
            + "\n".join(
                f"  L{ln}: {method}() — {txt}" for ln, method, txt in violations
            )
            + "\n同步 minio 方法应使用 asyncio.to_thread() 包装以避免阻塞事件循环"
        )


# ===========================================================================
# service-layer-refactor: Property 26 — Security 层无冗余异常捕获
# ===========================================================================

SECURITY_DIR = Path("src/security")

# 收集 src/security/ 下所有 .py 文件（排除 __init__.py）
_security_files: list[Path] = sorted(
    p for p in SECURITY_DIR.glob("*.py") if p.is_file() and p.name != "__init__.py"
)
assert len(_security_files) > 0, f"未在 {SECURITY_DIR} 下找到任何 security 文件"


def _extract_except_handlers(tree: ast.Module) -> list[list[tuple[int, str]]]:
    """提取所有 try/except 块中的 except handler 列表。

    返回: 每个 try 块的 [(lineno, exception_name), ...] 列表的列表。
    """
    results: list[list[tuple[int, str]]] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Try):
            handlers: list[tuple[int, str]] = []
            for handler in node.handlers:
                if handler.type is None:
                    handlers.append((handler.lineno, "bare_except"))
                elif isinstance(handler.type, ast.Name):
                    handlers.append((handler.lineno, handler.type.id))
                elif isinstance(handler.type, ast.Attribute):
                    handlers.append((handler.lineno, handler.type.attr))
            if len(handlers) >= 2:
                results.append(handlers)
    return results


# JWT 异常继承关系: InvalidTokenError -> PyJWTError (parent)
# 如果先 except InvalidTokenError 再 except PyJWTError，后者是冗余的
# 因为 InvalidTokenError 已经被前面捕获了
_JWT_EXCEPTION_HIERARCHY = {
    # child -> parent 映射
    "InvalidTokenError": "PyJWTError",
    "ExpiredSignatureError": "PyJWTError",
    "DecodeError": "PyJWTError",
    "InvalidSignatureError": "InvalidTokenError",
    "InvalidAlgorithmError": "InvalidTokenError",
    "MissingRequiredClaimError": "InvalidTokenError",
    "InvalidClaimError": "InvalidTokenError",
}


def _is_parent_of(parent_name: str, child_name: str) -> bool:
    """检查 parent_name 是否是 child_name 的父类异常。"""
    current = child_name
    visited: set[str] = set()
    while current in _JWT_EXCEPTION_HIERARCHY:
        if current in visited:
            break
        visited.add(current)
        ancestor = _JWT_EXCEPTION_HIERARCHY[current]
        if ancestor == parent_name:
            return True
        current = ancestor
    return False


class TestSecurityNoRedundantExceptCatch:
    """
    # Feature: service-layer-refactor, Property 26: Security 层无冗余异常捕获
    # Validates: Requirements 20.3

    对 src/security/ 下每个 .py 文件，验证不存在先捕获子类异常
    再捕获父类异常的冗余 except 分支。
    """

    @given(security_file=st.sampled_from(_security_files))
    @settings(max_examples=max(100, len(_security_files) * 5))
    def test_property_26_security_no_redundant_except(self, security_file: Path):
        """
        **Validates: Requirements 20.3**

        属性: 任意 security/ 文件不应存在冗余的 except 分支
        （先捕获子类再捕获父类）。
        """
        source = security_file.read_text(encoding="utf-8")
        tree = ast.parse(source, filename=str(security_file))

        try_blocks = _extract_except_handlers(tree)
        violations: list[str] = []

        for handlers in try_blocks:
            # 检查每对 (earlier, later) handler
            for i, (ln_i, name_i) in enumerate(handlers):
                for j, (ln_j, name_j) in enumerate(handlers):
                    if j <= i:
                        continue
                    # 如果 later handler (name_j) 是 earlier handler (name_i) 的父类
                    # 且 earlier 已经捕获了子类，则 later 的父类捕获是冗余的
                    # 但这不是我们要检测的 — 我们检测的是：
                    # earlier 捕获子类，later 捕获父类 → later 是冗余的
                    if _is_parent_of(name_j, name_i):
                        violations.append(
                            f"L{ln_i}: except {name_i} 后跟 "
                            f"L{ln_j}: except {name_j} — "
                            f"{name_j} 是 {name_i} 的父类，后者冗余"
                        )

        assert violations == [], (
            f"{security_file} 包含冗余异常捕获:\n"
            + "\n".join(f"  {v}" for v in violations)
            + "\n应移除冗余的父类 except 分支"
        )


# ===========================================================================
# service-layer-refactor: Property 27 — 硬编码常量不重复
# ===========================================================================


class TestJwtAlgorithmConstant:
    """
    # Feature: service-layer-refactor, Property 27: 硬编码常量不重复
    # Validates: Requirements 20.3

    验证 src/security/jwt.py 中字符串字面量 "HS256" 只出现一次
    （作为 JWT_ALGORITHM 常量定义），其他位置引用该常量。
    """

    def test_property_27_hs256_only_once(self):
        """
        **Validates: Requirements 20.3**

        属性: "HS256" 字符串字面量在 jwt.py 中应只出现一次（常量定义处）。
        """
        jwt_file = Path("src/security/jwt.py")
        source = jwt_file.read_text(encoding="utf-8")

        # 匹配 "HS256" 或 'HS256' 字面量（排除注释行）
        hs256_pattern = re.compile(r"""(['"])HS256\1""")
        occurrences: list[tuple[int, str]] = []

        for lineno, line in enumerate(source.splitlines(), start=1):
            stripped = line.strip()
            # 跳过注释行
            if stripped.startswith("#"):
                continue
            for m in hs256_pattern.finditer(stripped):
                occurrences.append((lineno, stripped))

        assert len(occurrences) == 1, (
            f"src/security/jwt.py 中 'HS256' 字面量出现 {len(occurrences)} 次"
            f"（期望 1 次，作为 JWT_ALGORITHM 常量定义）:\n"
            + "\n".join(f"  L{ln}: {txt}" for ln, txt in occurrences)
            + "\n其他位置应引用 JWT_ALGORITHM 常量"
        )

    def test_property_27_jwt_algorithm_constant_exists(self):
        """
        **Validates: Requirements 20.3**

        属性: jwt.py 应定义 JWT_ALGORITHM 常量。
        """
        jwt_file = Path("src/security/jwt.py")
        source = jwt_file.read_text(encoding="utf-8")
        tree = ast.parse(source, filename=str(jwt_file))

        found = False
        for node in ast.iter_child_nodes(tree):
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and target.id == "JWT_ALGORITHM":
                        found = True

        assert found, "src/security/jwt.py 未定义 JWT_ALGORITHM 常量"

    def test_property_27_jwt_algorithm_used_in_encode_decode(self):
        """
        **Validates: Requirements 20.3**

        属性: jwt.encode/jwt.decode 调用应使用 JWT_ALGORITHM 常量而非硬编码字符串。
        """
        jwt_file = Path("src/security/jwt.py")
        source = jwt_file.read_text(encoding="utf-8")

        # 检查 jwt.encode 和 jwt.decode 调用中是否使用 JWT_ALGORITHM
        encode_decode_lines: list[tuple[int, str]] = []
        for lineno, line in enumerate(source.splitlines(), start=1):
            stripped = line.strip()
            if stripped.startswith("#"):
                continue
            if "jwt.encode(" in stripped or "jwt.decode(" in stripped:
                encode_decode_lines.append((lineno, stripped))
            # 也检查 algorithm= 或 algorithms= 参数行
            if "algorithm=" in stripped or "algorithms=" in stripped:
                encode_decode_lines.append((lineno, stripped))

        # 在这些行中，不应出现 "HS256" 字面量
        violations: list[tuple[int, str]] = []
        hs256_pattern = re.compile(r"""(['"])HS256\1""")
        for lineno, line in encode_decode_lines:
            if hs256_pattern.search(line):
                violations.append((lineno, line))

        assert violations == [], (
            "jwt.encode/jwt.decode 调用中使用了硬编码 'HS256':\n"
            + "\n".join(f"  L{ln}: {txt}" for ln, txt in violations)
            + "\n应使用 JWT_ALGORITHM 常量"
        )


# ===========================================================================
# service-layer-refactor: Property 28 — API tag 无重叠
# ===========================================================================


class TestApiTagNoOverlap:
    """
    # Feature: service-layer-refactor, Property 28: API tag 无重叠
    # Validates: Requirements 24.3

    验证 src/api/ 中的路由文件不会同时在 APIRouter() 定义和
    include_router() 中设置 tags，导致端点拥有多个 tag。

    检查两个层面:
    1. 路由文件的 APIRouter() 不应带 tags= 参数（tags 由 include_router 统一设置）
    2. 路由装饰器 @router.xxx() 不应带 tags= 参数（避免与 include_router 的 tags 重叠）
    """

    @given(py_file=st.sampled_from(_api_files))
    @settings(max_examples=max(100, len(_api_files) * 5))
    def test_property_28_api_tag_no_overlap(self, py_file: Path):
        """
        **Validates: Requirements 24.3**

        属性: 任意 API 路由文件中，端点不应同时从 APIRouter 和装饰器获得 tags。
        """
        source = py_file.read_text(encoding="utf-8")
        tree = ast.parse(source, filename=str(py_file))

        violations: list[str] = []

        # 检查 1: APIRouter() 是否带 tags= 参数
        router_has_tags = False
        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                func = node.func
                func_name = None
                if isinstance(func, ast.Name):
                    func_name = func.id
                elif isinstance(func, ast.Attribute):
                    func_name = func.attr
                if func_name == "APIRouter":
                    for kw in node.keywords:
                        if kw.arg == "tags":
                            router_has_tags = True
                            violations.append(
                                f"L{node.lineno}: APIRouter(tags=...) — "
                                f"tags 应由 include_router() 统一设置"
                            )

        # 检查 2: @router.xxx() 装饰器是否带 tags= 参数
        for node in ast.walk(tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            for dec in node.decorator_list:
                if not isinstance(dec, ast.Call):
                    continue
                func = dec.func
                if not isinstance(func, ast.Attribute):
                    continue
                if not (isinstance(func.value, ast.Name) and func.value.id == "router"):
                    continue
                if func.attr not in ("get", "post", "put", "delete", "patch"):
                    continue
                # 检查装饰器是否有 tags= 参数
                for kw in dec.keywords:
                    if kw.arg == "tags":
                        violations.append(
                            f"L{dec.lineno}: @router.{func.attr}(tags=...) "
                            f"on {node.name}() — "
                            f"端点级 tags 会与 include_router 的 tags 重叠"
                        )

        assert violations == [], (
            f"{py_file} 存在 tag 重叠风险:\n"
            + "\n".join(f"  {v}" for v in violations)
            + "\ntags 应仅在 include_router() 中统一设置，"
            + "避免 APIRouter(tags=...) 或 @router.xxx(tags=...) 导致重叠"
        )
