# RWA Scripts 目录

## 📋 脚本列表

### 核心部署脚本

#### 1. deploy_all.py ⭐⭐⭐ 一键部署完整系统
**用途**：一键部署完整的SuperCrypto系统（RWA + 预言机）

**包含的系统**：
- **RWA STO系统**：MockUSDT、KYCManager、RWATokenSTO、PlatformToken、Subscription、Staking、LiquidityMining
- **预言机系统**：MultiSigManager、Timelock、RWAOracle、DataAggregator、OracleConsumer

**使用方法**：
```bash
# 本地测试网
ape run deploy_all --network ethereum:local

# 测试网
ape run deploy_all --network ethereum:sepolia
```

**输出**：`deployed_addresses_all.json`

**推荐场景**：首次部署、完整测试、演示

---

#### 2. deploy_sto.py ⭐⭐ RWA STO系统部署
**用途**：单独部署RWA STO合规系统

**包含的合约**：
- MockUSDT（测试用）
- KYCManager（KYC管理）
- RWATokenSTO（ERC1404证券型代币）
- PlatformToken（平台治理代币）
- Subscription（认购管理）
- Staking（质押挖矿）
- LiquidityMining（流动性挖矿）

**使用方法**：
```bash
# 本地测试网
ape run deploy_sto --network ethereum:local

# 测试网
ape run deploy_sto --network ethereum:sepolia

# 主网（谨慎！）
ape run deploy_sto --network ethereum:mainnet
```

**输出**：`deployed_addresses_sto.json`

**推荐场景**：只需要RWA系统时

---

#### 3. deploy_oracle_system.py ⭐⭐ 预言机系统部署
**用途**：单独部署RWA预言机系统

**包含的合约**：
- MultiSigManager（2-of-3多签）
- Timelock（24小时时间锁）
- RWAOracle（主预言机）
- DataAggregator（数据聚合器）
- OracleConsumer（消费者示例）

**使用方法**：
```bash
ape run deploy_oracle_system --network ethereum:local
```

**输出**：`deployed_oracle_addresses.json`

**推荐场景**：只需要预言机系统时

---

### 使用示例脚本

#### 4. example_usage.py 📚 RWA系统使用示例
**用途**：演示RWA系统的完整使用流程

**包含场景**：
- Alice认购权益代币并质押挖矿
- Bob参与流动性挖矿
- 赎回和提取流程

**使用方法**：
```bash
# 确保已部署RWA系统
ape run example_usage --network ethereum:local
```

**前置条件**：需要先运行 `deploy_sto.py` 或 `deploy_all.py`

---

#### 5. oracle_usage_example.py 📚 预言机使用示例
**用途**：演示预言机系统的完整工作流程

**包含场景**：
- 注册新资产（带多签+时间锁）
- 查询资产数据
- 更新资产数据
- 使用消费者合约计算价格和收益
- 数据聚合器使用

**使用方法**：
```bash
# 确保已部署预言机系统
ape run oracle_usage_example --network ethereum:local
```

**前置条件**：需要先运行 `deploy_oracle_system.py` 或 `deploy_all.py`

---

### Uniswap相关脚本

#### 6. setup_uniswap_liquidity.py 🦄 流动性设置
**用途**：为PlatformToken/USDT交易对注入初始流动性

**前置条件**：
- 已部署RWA系统
- Uniswap V2已部署（或使用Fork）

**使用方法**：
```bash
ape run setup_uniswap_liquidity --network ethereum:local
```

---

#### 7. deploy_uniswap.py 🦄 创建交易对
**用途**：在已有的Uniswap V2上创建PlatformToken/USDT交易对

**前置条件**：Uniswap V2 Factory和Router已部署

**使用方法**：
```bash
ape run deploy_uniswap --network ethereum:local
```

---

## 🎯 推荐使用流程

### 场景1：完整系统开发（推荐新手）⭐

```bash
# 1. 一键部署完整系统
ape run deploy_all --network ethereum:local

# 2. 运行RWA示例
ape run example_usage --network ethereum:local

# 3. 运行预言机示例
ape run oracle_usage_example --network ethereum:local

# 4. 运行完整测试
ape test -v
```

### 场景2：仅RWA系统

```bash
# 1. 部署RWA系统
ape run deploy_sto --network ethereum:local

# 2. 运行使用示例
ape run example_usage --network ethereum:local

# 3. 运行RWA测试
ape test tests/test_tokens.py tests/test_sto_basic.py tests/test_subscription.py -v
```

### 场景3：仅预言机系统

```bash
# 1. 部署预言机系统
ape run deploy_oracle_system --network ethereum:local

# 2. 运行预言机示例
ape run oracle_usage_example --network ethereum:local

# 3. 运行预言机测试
ape test tests/test_multisig.py tests/test_timelock.py tests/test_oracle.py -v
```

### 场景4：生产环境部署（谨慎！）

```bash
# 1. 部署到测试网先验证
ape run deploy_all --network ethereum:sepolia

# 2. 完整测试
ape test -v

# 3. 安全审计（必须！）
# 请第三方审计公司审计

# 4. 部署到主网
ape run deploy_all --network ethereum:mainnet
```

---

## 📚 相关文档

- **合约文档**：`/docs/02-智能合约/`
- **部署指南**：`/docs/05-部署/部署指南.md`
- **RWA系统**：`/docs/02-智能合约/RWA-权益代币系统.md`
- **预言机系统**：`/docs/02-智能合约/RWA-预言机系统.md`
- **项目架构**：`/docs/01-架构设计/DApp架构与前后端分工.md`

---

## 🔍 脚本对比

| 脚本 | 用途 | 部署时间 | 包含系统 | 推荐度 |
|-----|------|---------|---------|--------|
| deploy_all.py | 完整系统 | ~3分钟 | RWA + 预言机 | ⭐⭐⭐⭐⭐ |
| deploy_sto.py | RWA系统 | ~2分钟 | 仅RWA | ⭐⭐⭐⭐ |
| deploy_oracle_system.py | 预言机系统 | ~1分钟 | 仅预言机 | ⭐⭐⭐⭐ |
| example_usage.py | RWA示例 | ~30秒 | - | ⭐⭐⭐⭐ |
| oracle_usage_example.py | 预言机示例 | ~30秒 | - | ⭐⭐⭐⭐ |
| setup_uniswap_liquidity.py | 流动性设置 | ~1分钟 | - | ⭐⭐⭐ |
| deploy_uniswap.py | 创建交易对 | ~30秒 | - | ⭐⭐ |

---

## 🐛 故障排查

### 问题1：找不到deployed_addresses文件
**解决**：先运行对应的部署脚本
```bash
# 完整系统
ape run deploy_all --network ethereum:local

# 或单独系统
ape run deploy_sto --network ethereum:local
ape run deploy_oracle_system --network ethereum:local
```

### 问题2：网络连接失败
**解决**：检查Hardhat节点是否运行
```bash
# 在hardhat目录下
./hardhat-node.sh
```

### 问题3：Gas不足
**解决**：测试账户应该有足够余额，如果是测试网，从水龙头获取ETH

### 问题4：合约地址无效
**解决**：确保部署顺序正确，先部署依赖的合约

### 问题5：文件名改变后找不到
**解决**：使用新的文件名
```bash
# 旧名称（已废弃）
# ape run deploy_all_sto

# 新名称
ape run deploy_sto
```

---

## ⚠️ 注意事项

### 本地测试网（Hardhat）
- 使用 `accounts.test_accounts` 作为测试账户
- 数据不持久化（重启节点后清空）
- 可以使用 `chain.mine()` 快进时间

### 测试网（Sepolia/Goerli）
- 需要真实的ETH（从水龙头获取）
- 交易需要确认时间
- 数据持久化

### 主网
- ⚠️ **谨慎操作**
- 需要真实ETH（Gas费用）
- 不可逆转
- **必须先完成安全审计和法律合规**

---

## 📦 输出文件说明

| 文件 | 包含内容 | 生成脚本 |
|-----|---------|---------|
| `deployed_addresses_all.json` | RWA + 预言机完整地址 | deploy_all.py |
| `deployed_addresses_sto.json` | RWA系统地址 | deploy_sto.py |
| `deployed_oracle_addresses.json` | 预言机系统地址 | deploy_oracle_system.py |

---

**版本**: v2.0  
**最后更新**: 2025-10-26  
**维护者**: SuperCrypto Team

**变更日志**：
- v2.0: 新增 deploy_all.py，将 deploy_all_sto.py 重命名为 deploy_sto.py
- v1.0: 初始版本
