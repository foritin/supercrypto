"""
Wallet领域 - 区块链适配器
封装Web3交互逻辑
"""
from typing import Tuple, Optional
from decimal import Decimal
from web3 import AsyncWeb3, AsyncHTTPProvider
from eth_account import Account

from src.shared.exceptions import ValidationException


class EthereumAdapter:
    """
    以太坊区块链适配器
    
    封装Web3.py交互，提供钱包操作接口
    """
    
    def __init__(self, rpc_url: str = "https://eth.llamarpc.com"):
        """
        初始化适配器
        
        Args:
            rpc_url: RPC节点URL
        """
        self.w3 = AsyncWeb3(AsyncHTTPProvider(rpc_url))
        self.network = "ethereum"
    
    async def is_connected(self) -> bool:
        """检查连接状态"""
        try:
            return await self.w3.is_connected()
        except Exception:
            return False
    
    async def generate_wallet(self) -> Tuple[str, str]:
        """
        生成新钱包
        
        Returns:
            Tuple[str, str]: (地址, 私钥)
        """
        account = Account.create()
        return account.address, account.key.hex()
    
    def import_wallet(self, private_key: str) -> str:
        """
        从私钥导入钱包
        
        Args:
            private_key: 私钥
            
        Returns:
            str: 钱包地址
            
        Raises:
            ValidationException: 私钥格式无效
        """
        try:
            account = Account.from_key(private_key)
            return account.address
        except Exception as e:
            raise ValidationException(
                f"Invalid private key: {str(e)}",
                detail={"error": str(e)}
            )
    
    async def get_balance(self, address: str) -> Decimal:
        """
        查询余额
        
        Args:
            address: 钱包地址
            
        Returns:
            Decimal: 余额（Ether单位）
        """
        try:
            balance_wei = await self.w3.eth.get_balance(address)
            return Decimal(balance_wei) / Decimal(10**18)
        except Exception as e:
            raise ValidationException(
                f"Failed to get balance: {str(e)}",
                detail={"address": address}
            )
    
    async def get_balance_wei(self, address: str) -> int:
        """
        查询余额（Wei单位）
        
        Args:
            address: 钱包地址
            
        Returns:
            int: 余额（Wei）
        """
        try:
            return await self.w3.eth.get_balance(address)
        except Exception as e:
            raise ValidationException(
                f"Failed to get balance: {str(e)}",
                detail={"address": address}
            )
    
    async def send_transaction(
        self,
        from_address: str,
        to_address: str,
        amount: Decimal,
        private_key: str,
        gas_price: Optional[int] = None,
        gas_limit: Optional[int] = None
    ) -> str:
        """
        发送交易
        
        Args:
            from_address: 发送地址
            to_address: 接收地址
            amount: 金额（Ether）
            private_key: 私钥
            gas_price: Gas价格（Wei），可选
            gas_limit: Gas限制，可选
            
        Returns:
            str: 交易哈希
        """
        try:
            # 获取nonce
            nonce = await self.w3.eth.get_transaction_count(from_address, 'pending')
            
            # 获取gas price
            if gas_price is None:
                gas_price = await self.w3.eth.gas_price
            
            # 获取chain id
            chain_id = await self.w3.eth.chain_id
            
            # 构建交易
            tx = {
                'from': from_address,
                'to': to_address,
                'value': int(amount * Decimal(10**18)),
                'nonce': nonce,
                'gas': gas_limit or 21000,
                'gasPrice': gas_price,
                'chainId': chain_id
            }
            
            # 签名交易
            signed_tx = self.w3.eth.account.sign_transaction(tx, private_key)
            
            # 发送交易
            tx_hash = await self.w3.eth.send_raw_transaction(
                signed_tx.rawTransaction
            )
            
            return tx_hash.hex()
            
        except Exception as e:
            raise ValidationException(
                f"Failed to send transaction: {str(e)}",
                detail={
                    "from_address": from_address,
                    "to_address": to_address,
                    "amount": str(amount)
                }
            )
    
    async def get_transaction(self, tx_hash: str) -> dict:
        """
        查询交易详情
        
        Args:
            tx_hash: 交易哈希
            
        Returns:
            dict: 交易详情
        """
        try:
            tx = await self.w3.eth.get_transaction(tx_hash)
            return dict(tx) if tx else {}
        except Exception as e:
            raise ValidationException(
                f"Failed to get transaction: {str(e)}",
                detail={"tx_hash": tx_hash}
            )
    
    async def get_transaction_receipt(self, tx_hash: str) -> dict:
        """
        查询交易收据
        
        Args:
            tx_hash: 交易哈希
            
        Returns:
            dict: 交易收据
        """
        try:
            receipt = await self.w3.eth.get_transaction_receipt(tx_hash)
            return dict(receipt) if receipt else {}
        except Exception as e:
            raise ValidationException(
                f"Failed to get transaction receipt: {str(e)}",
                detail={"tx_hash": tx_hash}
            )
    
    @staticmethod
    def wei_to_ether(wei: int) -> Decimal:
        """Wei转Ether"""
        return Decimal(wei) / Decimal(10**18)
    
    @staticmethod
    def ether_to_wei(ether: Decimal) -> int:
        """Ether转Wei"""
        return int(ether * Decimal(10**18))


def get_blockchain_adapter(network: str = "ethereum") -> EthereumAdapter:
    """
    获取区块链适配器
    
    Args:
        network: 网络类型
        
    Returns:
        EthereumAdapter: 区块链适配器
        
    Note:
        目前只实现了Ethereum，其他网络可以扩展
    """
    # TODO: 根据network返回不同的适配器
    # 目前所有网络都使用EthereumAdapter（兼容EVM）
    rpc_urls = {
        "ethereum": "https://eth.llamarpc.com",
        "bsc": "https://bsc-dataseed.binance.org",
        "polygon": "https://polygon-rpc.com",
        "arbitrum": "https://arb1.arbitrum.io/rpc",
        "optimism": "https://mainnet.optimism.io"
    }
    
    rpc_url = rpc_urls.get(network, rpc_urls["ethereum"])
    return EthereumAdapter(rpc_url=rpc_url)

