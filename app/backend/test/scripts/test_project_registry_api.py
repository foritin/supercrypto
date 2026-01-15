"""
项目注册表 API 测试脚本

测试 Story 10.5 和 10.6 的 API Endpoints
"""

import asyncio
import sys

sys.path.insert(0, "/home/rex/project/mix/SuperCrypto/app/backend")


async def run_tests():
    """运行 API 测试"""
    from httpx import ASGITransport, AsyncClient
    from tortoise import Tortoise

    # 初始化数据库（内存模式）
    await Tortoise.init(
        db_url="sqlite://:memory:",
        modules={"models": ["src.models"]},
    )
    await Tortoise.generate_schemas()

    # 导入 app
    from src.api.v1.dev.project_registry import router
    from fastapi import FastAPI

    app = FastAPI()
    app.include_router(router, prefix="/api/v1/dev")

    # 创建测试客户端
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        print("\n" + "=" * 60)
        print("项目注册表 API 测试")
        print("=" * 60)

        # 1. 列出项目
        print("\n1. GET /projects")
        resp = await client.get("/api/v1/dev/projects")
        print(f"   Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            projects = [p["name"] for p in data.get("projects", [])]
            print(f"   Projects: {projects}")

        # 2. 同步项目配置到数据库
        print("\n2. POST /projects/vanke/sync")
        resp = await client.post("/api/v1/dev/projects/vanke/sync")
        print(f"   Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            stats = data.get("stats", {})
            print(f"   Synced: {stats.get('created', 0)} contracts")

        # 3. 获取项目状态
        print("\n3. GET /projects/vanke/status")
        resp = await client.get("/api/v1/dev/projects/vanke/status")
        print(f"   Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            print(f"   Readiness: {data.get('readiness')}")
            print(f"   Total contracts: {data.get('statistics', {}).get('total_contracts', 0)}")

        # 4. 获取部署顺序
        print("\n4. GET /projects/vanke/deployment-order")
        resp = await client.get("/api/v1/dev/projects/vanke/deployment-order")
        print(f"   Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            print(f"   Phases: {list(data.get('phases', {}).keys())}")
            print(f"   Flat order: {data.get('flat_order', [])[:5]}...")

        # 5. 更新合约部署状态
        print("\n5. PUT /projects/vanke/contracts/KYC/deployment")
        resp = await client.put(
            "/api/v1/dev/projects/vanke/contracts/KYC/deployment",
            json={"address": "0x1234567890123456789012345678901234567890", "status": "deployed"},
        )
        print(f"   Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            print(f"   Success: {data.get('success')}")
            print(f"   Status changed: {data.get('status_changed')}")

        # 6. 获取合约绑定状态
        print("\n6. GET /projects/vanke/contracts/KYC/bindings")
        resp = await client.get("/api/v1/dev/projects/vanke/contracts/KYC/bindings")
        print(f"   Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            print(f"   Contract: {data.get('contract_name')}")
            print(f"   Address: {data.get('address')}")
            print(f"   Status: {data.get('status')}")

        # 7. 更新合约绑定
        print("\n7. PUT /projects/vanke/contracts/VankeRWAToken/bindings")
        # 先部署 VankeRWAToken
        await client.put(
            "/api/v1/dev/projects/vanke/contracts/VankeRWAToken/deployment",
            json={"address": "0x2222222222222222222222222222222222222222", "status": "deployed"},
        )
        resp = await client.put(
            "/api/v1/dev/projects/vanke/contracts/VankeRWAToken/bindings",
            json={"bindings": {"kyc": "0x1234567890123456789012345678901234567890"}},
        )
        print(f"   Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            print(f"   Success: {data.get('success')}")
            print(f"   Bindings updated: {data.get('bindings_updated')}")
            print(f"   Status changed: {data.get('status_changed')}")
            if data.get("status_changed"):
                print(f"   New status: {data.get('new_status')}")

        # 8. 验证绑定状态更新
        print("\n8. GET /projects/vanke/contracts/VankeRWAToken/bindings (验证)")
        resp = await client.get("/api/v1/dev/projects/vanke/contracts/VankeRWAToken/bindings")
        print(f"   Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            print(f"   Contract status: {data.get('status')}")
            bindings = data.get("bindings", {})
            for name, info in bindings.items():
                print(f"   Binding [{name}]: {info.get('address')} (bound: {info.get('is_bound')})")

        # 9. 同步项目绑定（从链上）
        print("\n9. POST /projects/vanke/sync-bindings")
        resp = await client.post("/api/v1/dev/projects/vanke/sync-bindings")
        print(f"   Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            print(f"   Total: {data.get('total_contracts')}")
            print(f"   Synced: {data.get('synced_count')}")
            print(f"   Failed: {data.get('failed_count')} (expected - Web3 未配置)")

        print("\n" + "=" * 60)
        print("测试完成!")
        print("=" * 60)

    # 清理
    await Tortoise.close_connections()


if __name__ == "__main__":
    asyncio.run(run_tests())
