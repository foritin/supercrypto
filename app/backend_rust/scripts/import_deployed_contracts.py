#!/usr/bin/env python3
"""
将原 Python 后端已经部署到 Hardhat 的合约地址导入到 Rust 后端 SQLite 数据库。
使用场景：Hardhat 已在外部启动并部署了合约，本脚本只做数据库注册。
"""
import json
import sqlite3
from pathlib import Path

DB_PATH = Path("E:/cryptoplatform-data/app.sqlite")
OUTPUT_DIR = Path(__file__).parent.parent.parent / "backend" / "output"

NETWORK = "hardhat"
CHAIN_ID = 31337
DEPLOYER = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199"

# 部署步骤文件 -> 默认项目归属
STEP_PROJECT = {
    "deployed_1_mocks": "common",
    "deployed_2_sto_base": "vanke",
    "deployed_3_sto_business": "vanke",
}

# scope 映射
STEP_SCOPE = {
    "deployed_1_mocks": "common",
    "deployed_2_sto_base": "project",
    "deployed_3_sto_business": "project",
}

CONTRACT_TYPE_MAP = {
    "MockUSDT": "stablecoin",
    "MockUSDC": "stablecoin",
    "KYCManager": "kyc",
    "RWATokenSTO": "rwa_token",
    "PlatformToken": "platform_token",
    "Subscription": "subscription",
    "Staking": "staking",
    "LiquidityMining": "liquidity_mining",
}


def ensure_default_asset(conn: sqlite3.Connection) -> int:
    cur = conn.execute(
        "SELECT id FROM asset WHERE symbol = ? AND environment = ?",
        ("VANKE", "hardhat"),
    )
    row = cur.fetchone()
    if row:
        return row[0]

    cur = conn.execute(
        """
        INSERT INTO asset (
            name, symbol, description, asset_type, total_supply, min_subscription,
            apy_3m, apy_6m, apy_12m, subscription_mode, status, environment
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "Vanke RWA",
            "VANKE",
            "Vanke real estate asset token",
            "real_estate",
            "1000000",
            "100",
            "0.05",
            "0.07",
            "0.10",
            "project",
            "active",
            "hardhat",
        ),
    )
    conn.commit()
    return cur.lastrowid


def import_contracts():
    if not DB_PATH.exists():
        raise FileNotFoundError(f"数据库不存在: {DB_PATH}")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    asset_id = ensure_default_asset(conn)

    for step_file, project in STEP_PROJECT.items():
        path = OUTPUT_DIR / f"{step_file}.json"
        if not path.exists():
            print(f"  跳过: {path.name} 不存在")
            continue

        data = json.loads(path.read_text(encoding="utf-8"))
        scope = STEP_SCOPE[step_file]
        contracts = data.get("contracts", {})
        deployer = data.get("deployer", DEPLOYER)

        print(f"\n导入 {path.name} ({len(contracts)} 个合约):")
        for name, address in contracts.items():
            contract_type = CONTRACT_TYPE_MAP.get(name, "other")

            # 1) 写入 contract_deployment
            # 1) 写入 contract_deployment（先删除旧记录，再插入）
            conn.execute(
                "DELETE FROM contract_deployment WHERE name = ? AND network = ? AND project_name = ?",
                (name, NETWORK, project),
            )
            conn.execute(
                """
                INSERT INTO contract_deployment (
                    name, address, deployer_address, network, chain_id, scope,
                    contract_type, project_name, tx_hash, status, abi_path
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    name,
                    address,
                    deployer,
                    NETWORK,
                    CHAIN_ID,
                    scope,
                    contract_type,
                    project,
                    "0x" + "0" * 64,
                    "active",
                    None,
                ),
            )

            # 2) 绑定到默认资产（RWA / Platform / Subscription / Staking / LiquidityMining）
            if contract_type in ("rwa_token", "platform_token", "subscription", "staking", "liquidity_mining"):
                conn.execute(
                    """
                    INSERT INTO asset_contract_binding (
                        asset_id, contract_name, contract_address, contract_type, is_primary
                    ) VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT(asset_id, contract_name) DO UPDATE SET
                        contract_address = excluded.contract_address,
                        contract_type = excluded.contract_type,
                        is_primary = excluded.is_primary,
                        updated_at = CURRENT_TIMESTAMP
                    """,
                    (asset_id, name, address, contract_type, 1 if contract_type == "rwa_token" else 0),
                )
            print(f"  [OK] {name} -> {address}")

    conn.commit()
    conn.close()
    print("\n[Done] 合约地址导入完成")


if __name__ == "__main__":
    import_contracts()
