"""
合约命名规范属性测试

验证智能合约前缀重构后，所有旧的 camelCase 函数名不再作为 @external 函数定义存在。

测试框架: pytest + hypothesis
工作目录: app/backend
运行命令: PYTHONPATH=. python -m pytest test/test_contract_naming_properties.py -v
"""

import re
from pathlib import Path
from typing import List, Tuple

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

# ============ 合约目录 ============

CONTRACTS_DIR = Path(__file__).resolve().parent.parent / "contracts"

# ============ 旧函数名列表 ============

OLD_FUNCTION_NAMES: List[str] = [
    # KYC.vy 旧名称
    "setVerifier",
    "setTransferAgent",
    "setMaxInvestors",
    "setKYCExpiryPeriod",
    "setBlockedCountry",
    "addInvestor",
    "updateInvestorVerification",
    "removeInvestor",
    "freezeInvestor",
    "transferOwnership",
    "isVerified",
    "isAccredited",
    "isFrozen",
    "getInvestorInfo",
    "canInvest",
    "isCountryAllowed",
    "getRemainingSlots",
    # VankeRWAToken.vy 旧名称
    "setAddressProvider",
    "setMinter",
    "setBurner",
    "detectTransferRestriction",
    "messageForTransferRestriction",
    "forceTransfer",
    "forceBurn",
    "canTransfer",
    # VankePlatformToken.vy 旧名称
    "maxSupply",
    # VankeSubscription.vy 旧名称
    "set_require_accredited",
    # MultiSigManager.vy 旧名称
    "batch_add_initial_signers",
    "add_signer",
    "remove_signer",
    "set_required_signatures",
    # Timelock.vy 旧名称
    "set_delay",
    # AddressProvider.vy 旧名称
    "set_address",
    "batch_set_addresses",
    "transfer_ownership",
    "accept_ownership",
    "renounce_ownership",
    # 多个合约共有的旧名称
    "pause",
    "unpause",
    "migrate",
    "emergency_withdraw",
    "finish_issuance",
    "set_transfer_agent",
    "set_oracle",
    "set_document",
    "set_apy",
    "set_min_investment",
    "set_max_investment",
    "set_staking_apy",
    "set_daily_emission",
    "set_require_kyc",
    "set_lp_token",
]


# ============ 解析工具函数 ============


def collect_vy_files() -> List[Path]:
    """收集重构范围内的 .vy 合约文件。

    仅包含设计文档中明确列出的 12 个合约，排除：
    - interfaces/ 目录下的纯接口文件
    - oracle/ 子目录下的预言机合约（不在本次重构范围内）
    """
    if not CONTRACTS_DIR.exists():
        return []

    # 重构范围内的合约文件（与 design.md 一致）
    IN_SCOPE_FILES = {
        # Phase 1: 无依赖合约
        "stablecoins/USDT.vy",
        "stablecoins/USDC.vy",
        "projects/vanke/VankePlatformToken.vy",
        # Phase 2: 公共合约
        "common/KYC.vy",
        "common/AddressProvider.vy",
        "common/oracle/MultiSigManager.vy",
        "common/oracle/Timelock.vy",
        # Phase 3: 业务合约
        "projects/vanke/VankeRWAToken.vy",
        "projects/vanke/VankeSubscription.vy",
        "projects/vanke/VankeStaking.vy",
        "projects/vanke/VankeLiquidityMining.vy",
    }

    all_files = sorted(CONTRACTS_DIR.rglob("*.vy"))
    result = []
    for f in all_files:
        rel = str(f.relative_to(CONTRACTS_DIR))
        if rel in IN_SCOPE_FILES:
            result.append(f)
    return result


def extract_external_function_names(file_path: Path) -> List[Tuple[str, int]]:
    """从 .vy 文件中提取 @external 函数定义的函数名。

    只提取合约主体中的 @external 函数定义，
    跳过 interface 块内部的函数声明。

    Returns:
        [(函数名, 行号), ...]
    """
    content = file_path.read_text(encoding="utf-8")
    lines = content.split("\n")

    results: List[Tuple[str, int]] = []
    in_interface_block = False
    found_external = False

    for i, line in enumerate(lines):
        stripped = line.strip()

        # 检测 interface 块的开始（Vyper 语法: interface IName:）
        if re.match(r"^interface\s+\w+:", stripped):
            in_interface_block = True
            continue

        # interface 块结束：遇到非缩进、非空行
        if in_interface_block:
            if stripped == "":
                continue
            if not line.startswith(" ") and not line.startswith("\t"):
                in_interface_block = False
            else:
                continue

        if in_interface_block:
            continue

        # 检测 @external 装饰器
        if stripped == "@external":
            found_external = True
            continue

        # @view 等装饰器可以出现在 @external 之后
        if found_external and stripped.startswith("@"):
            continue

        # 检测函数定义
        if found_external and stripped.startswith("def "):
            match = re.match(r"def\s+(\w+)\s*\(", stripped)
            if match:
                func_name = match.group(1)
                results.append((func_name, i + 1))
            found_external = False
            continue

        # 如果遇到非装饰器、非空行，重置 @external 标记
        if found_external and stripped != "":
            found_external = False

    return results


# 预加载合约文件和函数名（避免每次 hypothesis 迭代都重新解析）
_VY_FILES = collect_vy_files()
_EXTERNAL_FUNCTIONS: List[Tuple[str, str, int]] = []  # (函数名, 文件路径, 行号)

for _f in _VY_FILES:
    for _name, _line in extract_external_function_names(_f):
        _EXTERNAL_FUNCTIONS.append((_name, str(_f.relative_to(CONTRACTS_DIR)), _line))

# 构建函数名集合用于快速查找
_EXTERNAL_FUNC_NAMES = {name for name, _, _ in _EXTERNAL_FUNCTIONS}


def extract_function_body(file_path: Path, func_name: str) -> str:
    """提取指定函数的函数体内容（从 def 行到下一个同级定义之前）。

    Returns:
        函数体文本（包含 def 行）
    """
    content = file_path.read_text(encoding="utf-8")
    lines = content.split("\n")
    body_lines: List[str] = []
    capturing = False

    for line in lines:
        stripped = line.strip()
        if not capturing:
            # 匹配目标函数定义
            if re.match(rf"^def\s+{re.escape(func_name)}\s*\(", stripped):
                capturing = True
                body_lines.append(line)
        else:
            # 遇到下一个顶级定义（非缩进的 def、@、# ====、或顶级变量）则停止
            if stripped and not line.startswith(" ") and not line.startswith("\t"):
                break
            body_lines.append(line)

    return "\n".join(body_lines)


def extract_owner_functions() -> List[Tuple[str, Path]]:
    """收集所有 owner_ 前缀的 @external 函数及其所在文件。

    Returns:
        [(函数名, 文件路径), ...]
    """
    result: List[Tuple[str, Path]] = []
    for f in _VY_FILES:
        for name, _ in extract_external_function_names(f):
            if name.startswith("owner_"):
                result.append((name, f))
    return result


def extract_internal_function_names(file_path: Path) -> List[Tuple[str, int]]:
    """从 .vy 文件中提取 @internal 函数定义的函数名。

    Returns:
        [(函数名, 行号), ...]
    """
    content = file_path.read_text(encoding="utf-8")
    lines = content.split("\n")

    results: List[Tuple[str, int]] = []
    found_internal = False

    for i, line in enumerate(lines):
        stripped = line.strip()

        if stripped == "@internal":
            found_internal = True
            continue

        # 其他装饰器可以出现在 @internal 之后
        if found_internal and stripped.startswith("@"):
            continue

        if found_internal and stripped.startswith("def "):
            match = re.match(r"def\s+(\w+)\s*\(", stripped)
            if match:
                results.append((match.group(1), i + 1))
            found_internal = False
            continue

        if found_internal and stripped != "":
            found_internal = False

    return results


def parse_section_comments(file_path: Path) -> List[Tuple[str, int]]:
    """解析 .vy 文件中的段落注释。

    段落注释格式: # ============ 段落名称 ============

    Returns:
        [(段落名称, 行号), ...]
    """
    content = file_path.read_text(encoding="utf-8")
    lines = content.split("\n")
    results: List[Tuple[str, int]] = []

    for i, line in enumerate(lines):
        match = re.match(r"^#\s*={3,}\s*(.+?)\s*={3,}\s*$", line.strip())
        if match:
            results.append((match.group(1).strip(), i + 1))

    return results


def get_section_range(
    sections: List[Tuple[str, int]], section_name: str
) -> Tuple[int, int]:
    """获取指定段落的行号范围 [start, end)。

    Args:
        sections: parse_section_comments 的返回值
        section_name: 段落名称（部分匹配）

    Returns:
        (起始行号, 结束行号)，未找到返回 (0, 0)
    """
    for idx, (name, line_no) in enumerate(sections):
        if section_name in name:
            start = line_no
            end = sections[idx + 1][1] if idx + 1 < len(sections) else 999999
            return (start, end)
    return (0, 0)


def parse_interface_blocks(file_path: Path) -> dict:
    """解析 .vy 文件中的 interface 定义块。

    Returns:
        {接口名: [函数名列表]}
    """
    content = file_path.read_text(encoding="utf-8")
    lines = content.split("\n")
    interfaces: dict = {}
    current_interface: str | None = None

    for line in lines:
        stripped = line.strip()

        # 检测 interface 块开始
        match = re.match(r"^interface\s+(\w+)\s*:", stripped)
        if match:
            current_interface = match.group(1)
            interfaces[current_interface] = []
            continue

        # interface 块内部：缩进的 def 行
        if current_interface is not None:
            if stripped == "":
                continue
            if not line.startswith(" ") and not line.startswith("\t"):
                current_interface = None
                continue
            # 提取函数名
            func_match = re.match(r"def\s+(\w+)\s*\(", stripped)
            if func_match:
                interfaces[current_interface].append(func_match.group(1))

    return interfaces


# 预加载 owner 函数列表
_OWNER_FUNCTIONS = extract_owner_functions()

# 预加载 internal 函数列表
_INTERNAL_FUNCTIONS: List[Tuple[str, str, int]] = []  # (函数名, 文件路径, 行号)
for _f in _VY_FILES:
    for _name, _line in extract_internal_function_names(_f):
        _INTERNAL_FUNCTIONS.append((_name, str(_f.relative_to(CONTRACTS_DIR)), _line))


# ============ 属性测试 ============


class TestOldFunctionNamesNotExist:
    """
    Property 1: 旧 camelCase 函数名不再存在

    **Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5**

    验证所有已知的旧函数名不作为 @external 函数定义出现在任何合约文件中。
    """

    @given(func_name=st.sampled_from(OLD_FUNCTION_NAMES))
    @settings(max_examples=200)
    def test_old_function_name_not_in_external_definitions(self, func_name: str):
        """
        **Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5**

        属性: 对于任意旧函数名，该名称不应作为 @external 函数定义出现在任何合约文件中。
        """
        # 查找所有匹配的 @external 函数定义
        matches = [
            (file_path, line_no)
            for name, file_path, line_no in _EXTERNAL_FUNCTIONS
            if name == func_name
        ]

        assert len(matches) == 0, (
            f"旧函数名 '{func_name}' 仍然作为 @external 函数定义存在:\n"
            + "\n".join(f"  - {fp}:{ln}" for fp, ln in matches)
        )

    def test_no_old_function_names_in_any_contract(self):
        """
        单元测试: 完整扫描所有合约，确认没有任何旧函数名存在。

        这是对属性测试的补充，确保 100% 覆盖所有旧函数名。
        """
        found_old_names: List[Tuple[str, str, int]] = []

        old_names_set = set(OLD_FUNCTION_NAMES)
        for name, file_path, line_no in _EXTERNAL_FUNCTIONS:
            if name in old_names_set:
                found_old_names.append((name, file_path, line_no))

        assert len(found_old_names) == 0, (
            f"发现 {len(found_old_names)} 个旧函数名仍然存在:\n"
            + "\n".join(f"  - {name} @ {fp}:{ln}" for name, fp, ln in found_old_names)
        )

    def test_contracts_directory_exists(self):
        """前置条件: 合约目录存在且包含 .vy 文件"""
        assert CONTRACTS_DIR.exists(), f"合约目录不存在: {CONTRACTS_DIR}"
        assert len(_VY_FILES) > 0, "未找到任何 .vy 合约文件"

    def test_external_functions_found(self):
        """前置条件: 能够正确解析出 @external 函数定义"""
        assert len(_EXTERNAL_FUNCTIONS) > 0, "未解析出任何 @external 函数定义"


# ============ Property 2: Owner 函数包含权限检查 ============


class TestOwnerFunctionPermissionCheck:
    """
    Property 2: Owner 函数包含权限检查

    **Validates: Requirements 1.7**

    验证所有 owner_ 前缀的 @external 函数体内包含
    `msg.sender == self.owner` 或 `_only_owner()` 权限检查。
    """

    @pytest.fixture(autouse=True)
    def _skip_if_no_owner_functions(self):
        if not _OWNER_FUNCTIONS:
            pytest.skip("未找到 owner_ 前缀函数")

    @given(data=st.data())
    @settings(max_examples=200)
    def test_owner_function_contains_permission_check(self, data):
        """
        **Validates: Requirements 1.7**

        属性: 对于任意 owner_ 前缀的 @external 函数，
        其函数体应包含 `msg.sender == self.owner` 或 `_only_owner` 权限检查。
        """
        func_name, file_path = data.draw(st.sampled_from(_OWNER_FUNCTIONS))
        body = extract_function_body(file_path, func_name)

        has_direct_check = "msg.sender == self.owner" in body
        has_helper_check = "_only_owner" in body
        # owner_accept_ownership 使用 pending_owner 检查（两步所有权转移模式）
        has_pending_owner_check = "msg.sender == self.pending_owner" in body

        assert has_direct_check or has_helper_check or has_pending_owner_check, (
            f"owner_ 函数 '{func_name}' 在 {file_path.relative_to(CONTRACTS_DIR)} "
            f"中缺少权限检查 (msg.sender == self.owner / _only_owner / msg.sender == self.pending_owner)"
        )

    def test_all_owner_functions_have_permission_check(self):
        """
        单元测试: 完整扫描所有 owner_ 函数，确认都包含权限检查。
        """
        missing: List[Tuple[str, str]] = []

        for func_name, file_path in _OWNER_FUNCTIONS:
            body = extract_function_body(file_path, func_name)
            has_direct = "msg.sender == self.owner" in body
            has_helper = "_only_owner" in body
            has_pending = "msg.sender == self.pending_owner" in body
            if not has_direct and not has_helper and not has_pending:
                missing.append((func_name, str(file_path.relative_to(CONTRACTS_DIR))))

        assert len(missing) == 0, "以下 owner_ 函数缺少权限检查:\n" + "\n".join(
            f"  - {name} @ {fp}" for name, fp in missing
        )


# ============ Property 3: 内部函数命名不变 ============


class TestInternalFunctionNaming:
    """
    Property 3: 内部函数命名不变

    **Validates: Requirements 3.6**

    验证所有 @internal 函数以 `_` 开头且不带 `owner_` 或 `admin_` 前缀。
    """

    @pytest.fixture(autouse=True)
    def _skip_if_no_internal_functions(self):
        if not _INTERNAL_FUNCTIONS:
            pytest.skip("未找到 @internal 函数")

    @given(data=st.data())
    @settings(max_examples=200)
    def test_internal_function_starts_with_underscore(self, data):
        """
        **Validates: Requirements 3.6**

        属性: 对于任意 @internal 函数，其名称应以 `_` 开头，
        且不应以 `_owner_` 或 `_admin_` 开头。
        """
        func_name, file_path, line_no = data.draw(st.sampled_from(_INTERNAL_FUNCTIONS))

        assert func_name.startswith("_"), (
            f"@internal 函数 '{func_name}' 在 {file_path}:{line_no} 未以 '_' 开头"
        )
        assert not func_name.startswith("_owner_"), (
            f"@internal 函数 '{func_name}' 在 {file_path}:{line_no} "
            f"不应以 '_owner_' 开头"
        )
        assert not func_name.startswith("_admin_"), (
            f"@internal 函数 '{func_name}' 在 {file_path}:{line_no} "
            f"不应以 '_admin_' 开头"
        )

    def test_all_internal_functions_naming(self):
        """
        单元测试: 完整扫描所有 @internal 函数命名。
        """
        violations: List[Tuple[str, str, int, str]] = []

        for func_name, file_path, line_no in _INTERNAL_FUNCTIONS:
            if not func_name.startswith("_"):
                violations.append((func_name, file_path, line_no, "未以 '_' 开头"))
            elif func_name.startswith("_owner_"):
                violations.append(
                    (func_name, file_path, line_no, "不应以 '_owner_' 开头")
                )
            elif func_name.startswith("_admin_"):
                violations.append(
                    (func_name, file_path, line_no, "不应以 '_admin_' 开头")
                )

        assert len(violations) == 0, (
            "以下 @internal 函数命名不符合规范:\n"
            + "\n".join(
                f"  - {name} @ {fp}:{ln} ({reason})"
                for name, fp, ln, reason in violations
            )
        )


# ============ Property 4: 段落注释完整性 ============


# 预加载：收集包含 owner_/admin_ 函数的合约文件（排除接口文件）
_FILES_WITH_OWNER: List[Path] = []
_FILES_WITH_ADMIN: List[Path] = []

for _f in _VY_FILES:
    # 排除接口文件
    if "IAddressProvider" in _f.name:
        continue
    _ext_names = [n for n, _ in extract_external_function_names(_f)]
    if any(n.startswith("owner_") for n in _ext_names):
        _FILES_WITH_OWNER.append(_f)
    if any(n.startswith("admin_") for n in _ext_names):
        _FILES_WITH_ADMIN.append(_f)

# 合并去重，用于 Property 4 的 sampled_from
_FILES_NEEDING_SECTIONS: List[Tuple[Path, bool, bool]] = []
_seen_files: set = set()
for _f in _FILES_WITH_OWNER:
    has_admin = _f in _FILES_WITH_ADMIN
    _FILES_NEEDING_SECTIONS.append((_f, True, has_admin))
    _seen_files.add(_f)
for _f in _FILES_WITH_ADMIN:
    if _f not in _seen_files:
        _FILES_NEEDING_SECTIONS.append((_f, False, True))


class TestSectionCommentCompleteness:
    """
    Property 4: 段落注释完整性

    **Validates: Requirements 4.1, 4.2, 4.3, 4.6**

    验证包含 owner_/admin_ 函数的合约有对应的段落注释。
    """

    @pytest.fixture(autouse=True)
    def _skip_if_no_files(self):
        if not _FILES_NEEDING_SECTIONS:
            pytest.skip("未找到需要段落注释的合约")

    @given(data=st.data())
    @settings(max_examples=200)
    def test_section_comments_present(self, data):
        """
        **Validates: Requirements 4.1, 4.2, 4.3, 4.6**

        属性: 如果合约包含 owner_ 函数，则应有 Owner 函数段落注释；
        如果包含 admin_ 函数，则应有 Admin 函数段落注释。
        """
        file_path, has_owner, has_admin = data.draw(
            st.sampled_from(_FILES_NEEDING_SECTIONS)
        )
        sections = parse_section_comments(file_path)
        section_names = [name for name, _ in sections]
        rel_path = str(file_path.relative_to(CONTRACTS_DIR))

        if has_owner:
            assert any("Owner 函数" in name for name in section_names), (
                f"合约 {rel_path} 包含 owner_ 函数但缺少 "
                f"'# ============ Owner 函数 ============' 段落注释"
            )

        if has_admin:
            assert any("Admin 函数" in name for name in section_names), (
                f"合约 {rel_path} 包含 admin_ 函数但缺少 "
                f"'# ============ Admin 函数 ============' 段落注释"
            )

    def test_all_contracts_section_completeness(self):
        """
        单元测试: 完整扫描所有合约的段落注释完整性。
        """
        missing: List[Tuple[str, str]] = []

        for file_path, has_owner, has_admin in _FILES_NEEDING_SECTIONS:
            sections = parse_section_comments(file_path)
            section_names = [name for name, _ in sections]
            rel_path = str(file_path.relative_to(CONTRACTS_DIR))

            if has_owner and not any("Owner 函数" in n for n in section_names):
                missing.append((rel_path, "Owner 函数"))
            if has_admin and not any("Admin 函数" in n for n in section_names):
                missing.append((rel_path, "Admin 函数"))

        assert len(missing) == 0, "以下合约缺少段落注释:\n" + "\n".join(
            f"  - {fp}: 缺少 '{sec}' 段落" for fp, sec in missing
        )


# ============ Property 5: 函数段落归属正确 ============


# 预加载：收集 owner_/admin_ 函数及其行号，用于段落归属检查
_OWNER_FUNC_LOCATIONS: List[Tuple[str, Path, int]] = []  # (函数名, 文件, 行号)
_ADMIN_FUNC_LOCATIONS: List[Tuple[str, Path, int]] = []

for _f in _VY_FILES:
    for _name, _line in extract_external_function_names(_f):
        if _name.startswith("owner_"):
            _OWNER_FUNC_LOCATIONS.append((_name, _f, _line))
        elif _name.startswith("admin_"):
            _ADMIN_FUNC_LOCATIONS.append((_name, _f, _line))


class TestFunctionSectionPlacement:
    """
    Property 5: 函数段落归属正确

    **Validates: Requirements 4.2, 4.3, 4.4, 4.5**

    验证 owner_ 函数在 Owner 函数段落中，admin_ 函数在 Admin 函数段落中。
    注意: owner_migrate 在 "合约迁移功能" 段落中是允许的例外。
    """

    @pytest.fixture(autouse=True)
    def _skip_if_no_functions(self):
        all_funcs = _OWNER_FUNC_LOCATIONS + _ADMIN_FUNC_LOCATIONS
        if not all_funcs:
            pytest.skip("未找到 owner_/admin_ 函数")

    @given(data=st.data())
    @settings(max_examples=200)
    def test_function_in_correct_section(self, data):
        """
        **Validates: Requirements 4.2, 4.3, 4.4, 4.5**

        属性: owner_ 函数应在 Owner 函数段落或合约迁移功能段落中；
        admin_ 函数应在 Admin 函数段落中。
        """
        all_funcs = _OWNER_FUNC_LOCATIONS + _ADMIN_FUNC_LOCATIONS
        func_name, file_path, line_no = data.draw(st.sampled_from(all_funcs))
        sections = parse_section_comments(file_path)
        rel_path = str(file_path.relative_to(CONTRACTS_DIR))

        if func_name.startswith("owner_"):
            # owner_migrate 允许在迁移段落中
            owner_range = get_section_range(sections, "Owner 函数")
            migration_range = get_section_range(sections, "合约迁移功能")

            in_owner = owner_range[0] < line_no < owner_range[1]
            in_migration = migration_range[0] < line_no < migration_range[1]

            assert in_owner or in_migration, (
                f"owner_ 函数 '{func_name}' (行 {line_no}) 在 {rel_path} "
                f"不在 Owner 函数段落 ({owner_range}) 或合约迁移功能段落 ({migration_range}) 中"
            )
        elif func_name.startswith("admin_"):
            admin_range = get_section_range(sections, "Admin 函数")

            assert admin_range[0] < line_no < admin_range[1], (
                f"admin_ 函数 '{func_name}' (行 {line_no}) 在 {rel_path} "
                f"不在 Admin 函数段落 ({admin_range}) 中"
            )

    def test_all_functions_in_correct_sections(self):
        """
        单元测试: 完整扫描所有 owner_/admin_ 函数的段落归属。
        """
        misplaced: List[Tuple[str, str, int, str]] = []

        for func_name, file_path, line_no in _OWNER_FUNC_LOCATIONS:
            sections = parse_section_comments(file_path)
            rel_path = str(file_path.relative_to(CONTRACTS_DIR))
            owner_range = get_section_range(sections, "Owner 函数")
            migration_range = get_section_range(sections, "合约迁移功能")

            in_owner = owner_range[0] < line_no < owner_range[1]
            in_migration = migration_range[0] < line_no < migration_range[1]

            if not in_owner and not in_migration:
                misplaced.append(
                    (func_name, rel_path, line_no, "应在 Owner 或迁移段落")
                )

        for func_name, file_path, line_no in _ADMIN_FUNC_LOCATIONS:
            sections = parse_section_comments(file_path)
            rel_path = str(file_path.relative_to(CONTRACTS_DIR))
            admin_range = get_section_range(sections, "Admin 函数")

            if not (admin_range[0] < line_no < admin_range[1]):
                misplaced.append((func_name, rel_path, line_no, "应在 Admin 段落"))

        assert len(misplaced) == 0, "以下函数不在正确的段落中:\n" + "\n".join(
            f"  - {name} @ {fp}:{ln} ({reason})" for name, fp, ln, reason in misplaced
        )


# ============ Property 6: 跨合约接口引用一致性 ============


# 旧的 IKYCManager camelCase 函数名
_OLD_KYC_INTERFACE_NAMES = {"isVerified", "isAccredited", "isFrozen", "canInvest"}

# 预加载：收集所有包含 IKYCManager 接口定义的文件
_FILES_WITH_KYC_INTERFACE: List[Tuple[Path, List[str]]] = []
for _f in _VY_FILES:
    _ifaces = parse_interface_blocks(_f)
    if "IKYCManager" in _ifaces:
        _FILES_WITH_KYC_INTERFACE.append((_f, _ifaces["IKYCManager"]))


class TestInterfaceReferenceConsistency:
    """
    Property 6: 跨合约接口引用一致性

    **Validates: Requirements 5.2, 5.3, 5.4**

    验证所有合约中 IKYCManager 接口定义使用新的 snake_case 函数名，
    不包含旧的 camelCase 名称。
    """

    @pytest.fixture(autouse=True)
    def _skip_if_no_kyc_interfaces(self):
        if not _FILES_WITH_KYC_INTERFACE:
            pytest.skip("未找到 IKYCManager 接口定义")

    @given(data=st.data())
    @settings(max_examples=200)
    def test_kyc_interface_uses_new_names(self, data):
        """
        **Validates: Requirements 5.2, 5.3, 5.4**

        属性: 对于任意包含 IKYCManager 接口定义的合约，
        接口中的函数名不应包含旧的 camelCase 名称。
        """
        file_path, func_names = data.draw(st.sampled_from(_FILES_WITH_KYC_INTERFACE))
        rel_path = str(file_path.relative_to(CONTRACTS_DIR))

        old_names_found = [n for n in func_names if n in _OLD_KYC_INTERFACE_NAMES]

        assert len(old_names_found) == 0, (
            f"合约 {rel_path} 的 IKYCManager 接口中仍使用旧函数名: {old_names_found}"
        )

    def test_all_kyc_interfaces_use_new_names(self):
        """
        单元测试: 完整扫描所有 IKYCManager 接口定义。
        """
        violations: List[Tuple[str, List[str]]] = []

        for file_path, func_names in _FILES_WITH_KYC_INTERFACE:
            rel_path = str(file_path.relative_to(CONTRACTS_DIR))
            old_found = [n for n in func_names if n in _OLD_KYC_INTERFACE_NAMES]
            if old_found:
                violations.append((rel_path, old_found))

        assert len(violations) == 0, (
            "以下合约的 IKYCManager 接口仍使用旧函数名:\n"
            + "\n".join(f"  - {fp}: {names}" for fp, names in violations)
        )
