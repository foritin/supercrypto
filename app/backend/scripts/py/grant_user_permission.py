import asyncio
from falib.adapter.postgresql import get_postgresql_adapter
from src.models import AccountPermission, Account, RoutePermission
from tortoise.expressions import Q  # 正确的导入路径

pg_adapter = get_postgresql_adapter()


async def grant_user_permission(account_address, module=None):
    if not module:
        sql_filter = Q(is_active=True)
    else:
        sql_filter = Q(module=module) & Q(is_active=True)
    async with pg_adapter as _:
        route_permissions = await RoutePermission.filter(sql_filter).all()
        account = await Account.get(address=account_address)
        
        # 检查并创建权限，避免重复
        for permission in route_permissions:
            # 使用 account_id_id 和 permission_id_id 传递整数 ID
            # 因为字段定义为 account_id，数据库字段会是 account_id_id
            _, created = await AccountPermission.get_or_create(
                account_id_id=account.id,
                permission_id_id=permission.id,
                defaults={"is_active": True}
            )
            if created:
                print(f"✅ 创建权限: account={account.id}, permission={permission.id}")
            else:
                print(f"⏭️  权限已存在，跳过: account={account.id}, permission={permission.id}")
    return route_permissions


if __name__ == "__main__":
    asyncio.run(grant_user_permission("0x70997970C51812dc3A010C7d01b50e0d17dc79C8"))