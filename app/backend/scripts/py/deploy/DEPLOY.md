# 🚀 合约部署指南

本文档介绍如何将 RWA STO 系统和预言机系统部署到不同网络。

## 📋 目录

- [部署脚本概览](#部署脚本概览)
- [前置准备](#前置准备)
- [本地网络部署](#本地网络部署)
- [测试网部署 (Sepolia)](#测试网部署-sepolia)
- [主网部署](#主网部署)
- [部署后验证](#部署后验证)
- [常见问题](#常见问题)

---

## 部署脚本概览

| 脚本 | 功能 | 部署合约 |
|------|------|----------|
| `1_deploy_mocks.py` | Mock 代币 | MockUSDT, MockUSDC |
| `2_deploy_sto_base.py` | STO 基础合约 | KYCManager, RWATokenSTO, PlatformToken |
| `3_deploy_sto_business.py` | STO 业务合约 | Subscription, Staking, LiquidityMining |
| `4_deploy_oracle.py` | 预言机系统 | MultiSigManager, Timelock, RWAOracle, DataAggregator, OracleConsumer |

**部署顺序很重要**：必须按 1 → 2 → 3 → 4 的顺序执行，因为后续脚本依赖前置脚本的输出。

---

## 前置准备

### 1. 安装依赖

```bash
cd dapp/RWA
pip install eth-ape
ape plugins install vyper
ape plugins install alchemy  # 测试网/主网需要
```

### 2. 编译合约

```bash
ape compile
```

### 3. 配置部署账户

编辑 `scripts/deploy_config.yaml`：

```yaml
# 部署账户地址（用于验证私钥是否正确）
address: "0xYourAddress..."

# 部署账户私钥（64位十六进制）
# ⚠️ 警告：不要把真实私钥提交到代码仓库！
private_key: "your_private_key_here"
```

> ⚠️ **安全提示**：`deploy_config.yaml` 已加入 `.gitignore`，不会被提交到 Git。

---

## 本地网络部署

### 1. 启动本地节点

使用 Hardhat 或 Anvil 启动本地节点：

```bash
# Hardhat
npx hardhat node

# 或者 Anvil (Foundry)
anvil
```

默认 RPC 地址：`http://127.0.0.1:8545`

### 2. 配置本地账户

对于本地测试，可以使用 Hardhat/Anvil 提供的测试账户：

```yaml
# deploy_config.yaml
# Hardhat 默认第一个测试账户
address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
private_key: "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
```

### 3. 执行部署

```bash
# 进入 RWA 目录
cd dapp/RWA

# 按顺序部署
ape run 1_deploy_mocks --network ethereum:local
ape run 2_deploy_sto_base --network ethereum:local
ape run 3_deploy_sto_business --network ethereum:local
ape run 4_deploy_oracle --network ethereum:local
```

### 4. 查看部署结果

部署完成后会生成以下 JSON 文件：

```
dapp/RWA/
├── deployed_1_mocks.json
├── deployed_2_sto_base.json
├── deployed_3_sto_business.json
└── deployed_4_oracle.json
```

---

## 测试网部署 (Sepolia)

### 1. 获取测试 ETH

访问 Sepolia 水龙头获取测试 ETH：
- https://sepoliafaucet.com/
- https://www.alchemy.com/faucets/ethereum-sepolia

### 2. 配置 Alchemy API

在 Alchemy 创建项目并获取 API Key：https://www.alchemy.com/

设置环境变量：

```bash
export WEB3_ALCHEMY_API_KEY="your_alchemy_api_key"
```

或者在 `~/.ape/alchemy.yaml` 中配置：

```yaml
ethereum:
  sepolia:
    api_key: your_alchemy_api_key
```

### 3. 配置部署账户

```yaml
# deploy_config.yaml
address: "0xYourSepoliaAddress..."
private_key: "your_sepolia_private_key"
```

### 4. 执行部署

```bash
# 按顺序部署到 Sepolia
ape run 1_deploy_mocks --network ethereum:sepolia
ape run 2_deploy_sto_base --network ethereum:sepolia
ape run 3_deploy_sto_business --network ethereum:sepolia
ape run 4_deploy_oracle --network ethereum:sepolia
```

### 5. 验证合约 (可选)

在 Etherscan 上验证合约源码：

```bash
ape verify <contract_address> --network ethereum:sepolia
```

---

## 主网部署

> ⚠️ **重要警告**：主网部署涉及真实资金，请确保：
> 1. 合约已通过完整审计
> 2. 在测试网充分测试
> 3. 准备足够的 ETH 支付 Gas
> 4. 私钥安全存储

### 1. 准备工作清单

- [ ] 合约代码已审计
- [ ] 测试网部署并测试通过
- [ ] 准备主网部署账户（有足够 ETH）
- [ ] 配置 Alchemy 主网 API Key
- [ ] 备份所有部署信息

### 2. 配置 Alchemy 主网

```bash
export WEB3_ALCHEMY_API_KEY="your_mainnet_alchemy_api_key"
```

### 3. 配置部署账户

```yaml
# deploy_config.yaml
address: "0xYourMainnetAddress..."
private_key: "your_mainnet_private_key"
```

### 4. 执行部署

```bash
# 主网部署 - 请谨慎操作！
ape run 1_deploy_mocks --network ethereum:mainnet
ape run 2_deploy_sto_base --network ethereum:mainnet
ape run 3_deploy_sto_business --network ethereum:mainnet
ape run 4_deploy_oracle --network ethereum:mainnet
```

> 💡 **提示**：主网部署建议逐个脚本执行，确认每步成功后再继续。

### 5. 验证合约

```bash
ape verify <contract_address> --network ethereum:mainnet
```

---

## 部署后验证

### 1. 检查合约部署

```python
from ape import project, networks

# 连接到网络
with networks.ethereum.local.use_provider("node"):
    # 加载已部署的合约
    kyc = project.KYCManager.at("0x...")
    
    # 验证基本功能
    print(f"Owner: {kyc.owner()}")
    print(f"Max Investors: {kyc.maxInvestors()}")
```

### 2. 验证权限设置

```python
# 检查 RWATokenSTO 的 minter 权限
rwa_token = project.RWATokenSTO.at("0x...")
subscription_addr = "0x..."

print(f"Subscription is minter: {rwa_token.isMinter(subscription_addr)}")
print(f"Subscription is burner: {rwa_token.isBurner(subscription_addr)}")
```

### 3. 测试基本交易

```python
# 在测试网上执行小额测试
from ape import accounts

deployer = accounts.from_key("your_private_key")

# 添加测试投资者
kyc.addInvestor(
    "0xTestInvestor...",
    "US",
    True,  # isAccredited
    sender=deployer
)
```

---

## 常见问题

### Q: 部署失败，提示 "insufficient funds"

**A**: 账户 ETH 不足以支付 Gas。请确保账户有足够余额：
- 本地网络：测试账户默认有 10000 ETH
- Sepolia：从水龙头获取测试 ETH
- 主网：需要购买真实 ETH

### Q: 脚本 3 报错 "请先运行 1_deploy_mocks.py"

**A**: 部署脚本有依赖关系，必须按顺序执行。请先执行脚本 1 和 2。

### Q: 地址与私钥不匹配

**A**: 检查 `deploy_config.yaml` 中的地址和私钥是否对应。可以用以下代码验证：

```python
from eth_account import Account

private_key = "0x..."
account = Account.from_key(private_key)
print(f"Address: {account.address}")
```

### Q: 如何更换部署账户？

**A**: 修改 `scripts/deploy_config.yaml` 中的 `address` 和 `private_key` 即可。

### Q: 如何连接自定义 RPC 节点？

**A**: 修改 `ape-config.yaml` 中的节点配置：

```yaml
node:
  ethereum:
    local:
      uri: http://your-node-ip:8545
```

---

## 📁 输出文件说明

| 文件 | 内容 |
|------|------|
| `deployed_1_mocks.json` | MockUSDT, MockUSDC 地址 |
| `deployed_2_sto_base.json` | KYCManager, RWATokenSTO, PlatformToken 地址 |
| `deployed_3_sto_business.json` | Subscription, Staking, LiquidityMining 地址 |
| `deployed_4_oracle.json` | 预言机系统所有合约地址 + 多签签名者列表 |

---

## 🔗 相关资源

- [Ape Framework 文档](https://docs.apeworx.io/)
- [Vyper 文档](https://docs.vyperlang.org/)
- [Sepolia Etherscan](https://sepolia.etherscan.io/)
- [Alchemy Dashboard](https://dashboard.alchemy.com/)

