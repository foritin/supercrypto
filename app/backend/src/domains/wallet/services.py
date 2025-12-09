"""
Wallet领域 - Service业务逻辑层
"""
from typing import Optional, List, Tuple
from decimal import Decimal

from src.domains.wallet.repositories import WalletRepository
from src.domains.wallet.schemas import (
    WalletCreate,
    WalletImport,
    WalletUpdate,
    WalletResponse,
    TransferRequest,
    TransferResponse,
    BalanceResponse
)
from src.domains.wallet.blockchain import get_blockchain_adapter, EthereumAdapter
from src.models.wallet import Wallet
from src.shared.exceptions import (
    ConflictException,
    ValidationException,
    InsufficientBalanceException
)
# from src.cores.security import encrypt_private_key, decrypt_private_key
from src.shared.utils import calculate_total_pages


class WalletService:
    """
    钱包服务
    
    负责钱包相关的业务逻辑处理
    """
    pass
    # def __init__(
    #     self,
    #     repository: Optional[WalletRepository] = None,
    #     encryption_password: str = "default_password"  # TODO: 从配置读取
    # ):
    #     """初始化服务"""
    #     self.repo = repository or WalletRepository()
    #     self.encryption_password = encryption_password
    
    # async def create_wallet(self, data: WalletCreate) -> WalletResponse:
    #     """
    #     创建新钱包
        
    #     业务流程：
    #     1. 调用区块链适配器生成钱包
    #     2. 加密私钥
    #     3. 保存到数据库
    #     4. 返回响应
    #     """
    #     # 1. 获取区块链适配器
    #     adapter = get_blockchain_adapter(data.network)
        
    #     # 2. 生成钱包
    #     address, private_key = await adapter.generate_wallet()
        
    #     # 3. 检查地址是否已存在
    #     if await self.repo.exists_by_address(address):
    #         raise ConflictException(
    #             f"Wallet with address {address} already exists"
    #         )
        
    #     # 4. 加密私钥
    #     encrypted_key = encrypt_private_key(private_key, self.encryption_password)
        
    #     # 5. 创建钱包记录
    #     wallet = await self.repo.create(
    #         address=address,
    #         encrypted_private_key=encrypted_key,
    #         network=data.network,
    #         tag=data.tag,
    #         account_id=data.account_id
    #     )
        
    #     # 6. 返回响应
    #     return await self._to_response(wallet, adapter)
    
    # async def import_wallet(self, data: WalletImport) -> WalletResponse:
    #     """
    #     导入现有钱包
        
    #     业务流程：
    #     1. 验证私钥并获取地址
    #     2. 检查地址是否已存在
    #     3. 加密私钥并保存
    #     """
    #     # 1. 获取区块链适配器
    #     adapter = get_blockchain_adapter(data.network)
        
    #     # 2. 从私钥导入钱包
    #     address = adapter.import_wallet(data.private_key)
        
    #     # 3. 检查地址是否已存在
    #     if await self.repo.exists_by_address(address):
    #         raise ConflictException(
    #             f"Wallet with address {address} already exists"
    #         )
        
    #     # 4. 加密私钥
    #     encrypted_key = encrypt_private_key(data.private_key, self.encryption_password)
        
    #     # 5. 创建钱包记录
    #     wallet = await self.repo.create(
    #         address=address,
    #         encrypted_private_key=encrypted_key,
    #         network=data.network,
    #         tag=data.tag,
    #         account_id=data.account_id
    #     )
        
    #     # 6. 返回响应
    #     return await self._to_response(wallet, adapter)
    
    # async def get_wallet(self, wallet_id: int) -> WalletResponse:
    #     """获取钱包详情"""
    #     wallet = await self.repo.get_by_id_or_raise(wallet_id)
    #     adapter = get_blockchain_adapter(wallet.network)
    #     return await self._to_response(wallet, adapter)
    
    # async def get_balance(self, wallet_id: int) -> BalanceResponse:
    #     """
    #     查询钱包余额
        
    #     从区块链实时查询余额并更新数据库
    #     """
    #     # 1. 获取钱包
    #     wallet = await self.repo.get_by_id_or_raise(wallet_id)
        
    #     # 2. 从区块链查询余额
    #     adapter = get_blockchain_adapter(wallet.network)
    #     balance_ether = await adapter.get_balance(wallet.address)
    #     balance_wei = await adapter.get_balance_wei(wallet.address)
        
    #     # 3. 更新数据库余额
    #     await self.repo.update_balance(
    #         wallet_id,
    #         Decimal(balance_wei) / Decimal(10**18)
    #     )
        
    #     # 4. 返回响应
    #     return BalanceResponse(
    #         address=wallet.address,
    #         balance=str(balance_ether),
    #         balance_wei=str(balance_wei),
    #         network=wallet.network
    #     )
    
    # async def transfer(
    #     self,
    #     wallet_id: int,
    #     data: TransferRequest
    # ) -> TransferResponse:
    #     """
    #     转账
        
    #     业务流程：
    #     1. 获取钱包并解密私钥
    #     2. 查询余额，检查是否足够
    #     3. 调用区块链适配器发送交易
    #     4. 返回交易哈希
    #     """
    #     # 1. 获取钱包
    #     wallet = await self.repo.get_by_id_or_raise(wallet_id)
        
    #     if not wallet.is_active:
    #         raise ValidationException("Wallet is not active")
        
    #     # 2. 解密私钥
    #     private_key = decrypt_private_key(
    #         wallet.encrypted_private_key,
    #         self.encryption_password
    #     )
        
    #     # 3. 获取区块链适配器
    #     adapter = get_blockchain_adapter(wallet.network)
        
    #     # 4. 查询余额
    #     balance = await adapter.get_balance(wallet.address)
    #     amount = Decimal(data.amount)
        
    #     # 5. 检查余额（简化，未考虑gas费）
    #     if balance < amount:
    #         raise InsufficientBalanceException(
    #             f"Insufficient balance. Have: {balance}, Need: {amount}",
    #             detail={
    #                 "balance": str(balance),
    #                 "amount": str(amount)
    #             }
    #         )
        
    #     # 6. 发送交易
    #     gas_price = int(Decimal(data.gas_price) * Decimal(10**9)) if data.gas_price else None
        
    #     tx_hash = await adapter.send_transaction(
    #         from_address=wallet.address,
    #         to_address=data.to_address,
    #         amount=amount,
    #         private_key=private_key,
    #         gas_price=gas_price,
    #         gas_limit=data.gas_limit
    #     )
        
    #     # 7. 返回响应
    #     return TransferResponse(
    #         tx_hash=tx_hash,
    #         from_address=wallet.address,
    #         to_address=data.to_address,
    #         amount=data.amount,
    #         status="pending"
    #     )
    
    # async def sync_balance(self, wallet_id: int) -> WalletResponse:
    #     """
    #     同步余额
        
    #     从区块链查询余额并更新数据库
    #     """
    #     # 1. 获取钱包
    #     wallet = await self.repo.get_by_id_or_raise(wallet_id)
        
    #     # 2. 查询余额
    #     adapter = get_blockchain_adapter(wallet.network)
    #     balance_wei = await adapter.get_balance_wei(wallet.address)
        
    #     # 3. 更新数据库
    #     wallet = await self.repo.update_balance(
    #         wallet_id,
    #         Decimal(balance_wei) / Decimal(10**18)
    #     )
        
    #     # 4. 返回响应
    #     return await self._to_response(wallet, adapter)
    
    # async def update_wallet(
    #     self,
    #     wallet_id: int,
    #     data: WalletUpdate
    # ) -> WalletResponse:
    #     """更新钱包"""
    #     update_data = {}
    #     if data.tag is not None:
    #         update_data['tag'] = data.tag
    #     if data.is_active is not None:
    #         update_data['is_active'] = data.is_active
        
    #     if not update_data:
    #         raise ValidationException("No fields to update")
        
    #     wallet = await self.repo.update(wallet_id, **update_data)
    #     adapter = get_blockchain_adapter(wallet.network)
    #     return await self._to_response(wallet, adapter)
    
    # async def list_wallets(
    #     self,
    #     page: int = 1,
    #     page_size: int = 10,
    #     account_id: Optional[int] = None,
    #     network: Optional[str] = None
    # ) -> Tuple[List[WalletResponse], int, int]:
    #     """查询钱包列表"""
    #     offset = (page - 1) * page_size
        
    #     if account_id:
    #         wallets, total = await self.repo.list_by_account(
    #             account_id, offset, page_size
    #         )
    #     elif network:
    #         wallets, total = await self.repo.list_by_network(
    #             network, offset, page_size
    #         )
    #     else:
    #         wallets, total = await self.repo.list_all(offset, page_size)
        
    #     total_pages = calculate_total_pages(total, page_size)
        
    #     # 转换响应（不实时查询余额，使用数据库缓存值）
    #     responses = []
    #     for wallet in wallets:
    #         responses.append(WalletResponse(
    #             id=wallet.id,
    #             address=wallet.address,
    #             network=wallet.network,
    #             balance=str(wallet.balance),
    #             tag=wallet.tag,
    #             is_active=wallet.is_active,
    #             account_id=wallet.account_id,
    #             created_at=wallet.created_at,
    #             updated_at=wallet.updated_at
    #         ))
        
    #     return responses, total, total_pages
    
    # async def delete_wallet(self, wallet_id: int) -> bool:
    #     """删除钱包"""
    #     return await self.repo.delete(wallet_id)
    
    # async def _to_response(
    #     self,
    #     wallet: Wallet,
    #     adapter: EthereumAdapter
    # ) -> WalletResponse:
    #     """
    #     将ORM模型转换为响应Schema
        
    #     使用数据库缓存的余额，不实时查询
    #     """
    #     return WalletResponse(
    #         id=wallet.id,
    #         address=wallet.address,
    #         network=wallet.network,
    #         balance=str(wallet.balance),
    #         tag=wallet.tag,
    #         is_active=wallet.is_active,
    #         account_id=wallet.account_id,
    #         created_at=wallet.created_at,
    #         updated_at=wallet.updated_at
    #     )

