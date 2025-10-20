# SuperCrypto - RWA双币模型系统

<div align="center">

![Vyper](https://img.shields.io/badge/Vyper-0.3.9-blue)
![Ape](https://img.shields.io/badge/Ape-Latest-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

**基于现实固定资产的双币模型DeFi系统**

[功能特性](#-功能特性) • [快速开始](#-快速开始) • [架构设计](#-架构设计) • [使用指南](#-使用指南)

</div>

---

## 🌟 项目概述

SuperCrypto是一个创新的RWA（Real World Assets）双币模型系统，将现实世界的固定资产（如房地产、债券、基础设施等）代币化，并通过智能合约实现：

- **权益代币（RWA Asset Token）**：代表固定资产所有权，与资产收益率挂钩
- **平台代币（Platform Token）**：用于生态治理、手续费折扣、质押挖矿

## ✨ 功能特性

### 🏦 核心功能

#### 1. RWA资产代币化
- ✅ 固定资产映射为ERC20代币
- ✅ 资产估值管理与更新
- ✅ IPFS文档存储（法律文件、审计报告）
- ✅ KYC合规验证
- ✅ 锁定期管理

#### 2. 认购系统
- ✅ 多档位认购（不同锁定期对应不同收益率）
- ✅ 灵活支付方式（ETH/USDT/USDC）
- ✅ 自动收益分配
- ✅ 提前赎回机制（支付罚金）
- ✅ 平台代币奖励

#### 3. 平台代币生态
- ✅ 质押挖矿（灵活锁定期）
- ✅ DAO治理投票
- ✅ 手续费折扣体系
- ✅ 通缩机制（回购销毁）

## 🏗️ 架构设计

```
┌─────────────────────────────────────────────────┐
│                  前端应用层                        │
│   用户界面 | 资产展示 | 认购面板 | 个人中心        │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│              智能合约层（Vyper）                    │
│                                                   │
│  ┌─────────────────┐  ┌──────────────────┐       │
│  │ RWAAssetToken   │  │ PlatformToken    │       │
│  │ - 资产代币       │  │ - 平台治理代币     │       │
│  │ - KYC验证        │  │ - 质押挖矿        │       │
│  │ - 锁定期管理     │  │ - DAO治理         │       │
│  └─────────────────┘  └──────────────────┘       │
│              ↓                 ↓                  │
│       ┌──────────────────────────────┐           │
│       │   SubscriptionManager        │           │
│       │   - 认购管理                  │           │
│       │   - 收益分配                  │           │
│       │   - 提前赎回                  │           │
│       └──────────────────────────────┘           │
└─────────────────────────────────────────────────┘
```

### 合约说明

| 合约 | 功能 | 文件 |
|------|------|------|
| **RWAAssetToken** | 权益代币合约 | `contracts/RWAAssetToken.vy` |
| **PlatformToken** | 平台治理代币 | `contracts/PlatformToken.vy` |
| **SubscriptionManager** | 认购管理合约 | `contracts/SubscriptionManager.vy` |

## 🚀 快速开始

### 环境要求

- **Python**: 3.11+
- **Node.js**: 16+
- **Ape Framework**: Latest

### 安装依赖

```bash
# 1. 克隆项目
git clone <your-repo-url>
cd SuperCrypto

# 2. 安装Python依赖
pip install eth-ape
ape plugins install vyper hardhat

# 3. 编译合约
ape compile
```

### 部署合约

#### 本地开发环境

```bash
# 1. 启动本地节点
ape run deploy_rwa_system --network ethereum:local:test

# 或使用Hardhat节点
npx hardhat node  # 在另一个终端
ape run deploy_rwa_system --network ethereum:local:hardhat
```

#### 测试网部署

```bash
# 设置环境变量
export WEB3_INFURA_PROJECT_ID="your-infura-id"

# 部署到Sepolia测试网
ape run deploy_rwa_system --network ethereum:sepolia
```

## 📊 认购档位示例

系统默认创建三个认购档位：

| 档位 | 锁定期 | 年化收益率 | 平台代币奖励 | 提前赎回罚金 |
|------|--------|-----------|-------------|-------------|
| **Tier 1** | 3个月 | 6% | 1% | 2% |
| **Tier 2** | 6个月 | 9% | 1.5% | 3% |
| **Tier 3** | 12个月 | 12% | 2% | 5% |

## 💡 使用指南

### 1. 用户认购流程

```python
from ape import accounts, project

# 加载合约
subscription_manager = project.SubscriptionManager.at("0x...")
rwa_token = project.RWAAssetToken.at("0x...")

# 1. 确保通过KYC验证
# （由管理员设置）

# 2. 选择认购档位并认购
user = accounts.load("my_account")
tier_id = 0  # 选择3个月档位
amount = 10_000 * 10**18  # 认购10,000 USD

# 使用ETH认购
subscription_manager.subscribe(
    tier_id,
    amount,
    sender=user,
    value=amount
)

# 3. 获得RWA代币 + 平台代币奖励
print(f"RWA代币余额: {rwa_token.balanceOf(user.address)}")
```

### 2. 领取收益

```python
# 查询可领取收益
subscription_id = 0
claimable = subscription_manager.get_claimable_yield(subscription_id)

# 领取收益
if claimable > 0:
    subscription_manager.claim_yield(subscription_id, sender=user)
```

### 3. 到期赎回

```python
# 查询认购信息
info = subscription_manager.get_subscription_info(subscription_id)
unlock_time = info[3]

# 到期后赎回本金+收益
if block.timestamp >= unlock_time:
    subscription_manager.redeem(subscription_id, sender=user)
```

### 4. 提前赎回（支付罚金）

```python
# 在锁定期内提前赎回
subscription_manager.early_redeem(subscription_id, sender=user)
# 将扣除罚金（根据档位设置，如2%-5%）
```

## 🧪 运行测试

```bash
# 运行所有测试
ape test tests/test_rwa_system.py -v

# 运行特定测试
ape test tests/test_rwa_system.py::test_subscribe -v

# 查看测试覆盖率
ape test --coverage
```

## 📈 收益计算公式

### 简单利息计算

```
预期收益 = 本金 × 年化收益率 × (锁定天数 / 365)
```

### 示例

用户认购 **$10,000**，选择 **6个月档位**（9% APY）:

```
预期收益 = 10,000 × 9% × (180 / 365) = $443.84
```

### 按时间比例领取

用户可以按时间比例提前领取已产生的收益：

```
已产生收益 = 预期收益 × (已过天数 / 总锁定天数)
```

## 🔒 安全特性

- ✅ **重入攻击防护**：所有外部调用后更新状态
- ✅ **访问控制**：基于角色的权限管理
- ✅ **暂停机制**：紧急情况下可暂停合约
- ✅ **KYC合规**：强制KYC验证才能交易
- ✅ **锁定期保护**：防止未到期转账

## 📁 项目结构

```
SuperCrypto/
├── contracts/              # 智能合约
│   ├── RWAAssetToken.vy
│   ├── PlatformToken.vy
│   └── SubscriptionManager.vy
├── scripts/                # 部署脚本
│   └── deploy_rwa_system.py
├── tests/                  # 测试文件
│   └── test_rwa_system.py
├── deploy/                 # 部署配置
│   ├── setup_accounts.py
│   └── rwa_deployment.json
├── ape-config.yaml         # Ape配置
└── README.md
```

## 🛠️ 可用命令

```bash
# 编译合约
ape compile

# 部署系统
ape run deploy_rwa_system --network <network>

# 运行测试
ape test -v

# 查看网络
ape networks list

# 账户管理
ape accounts list
ape accounts import <alias>
```

## 🔍 合约交互示例

### 创建资产（管理员）

```python
rwa_token.create_asset(
    "Manhattan Luxury Apartment",  # 资产名称
    "Real Estate",                 # 资产类型
    5_000_000 * 10**18,           # 总价值
    5_000_000 * 10**18,           # 代币数量
    800,                          # 8% APY
    "QmIPFSHash...",              # IPFS文档
    sender=admin
)
```

### 创建认购档位（管理员）

```python
subscription_manager.create_tier(
    365,                    # 12个月锁定
    1200,                   # 12% APY
    5000 * 10**18,         # 最小认购5000 USD
    500_000 * 10**18,      # 最大认购50万 USD
    5_000_000 * 10**18,    # 总额度500万 USD
    200,                    # 2% 平台代币奖励
    500,                    # 5% 提前赎回罚金
    sender=admin
)
```

### 查询用户认购

```python
# 获取用户所有认购ID
subscription_ids = subscription_manager.get_user_subscriptions(user.address)

# 查询每个认购详情
for sub_id in subscription_ids:
    info = subscription_manager.get_subscription_info(sub_id)
    print(f"认购ID: {sub_id}")
    print(f"本金: {info[2] / 10**18}")
    print(f"解锁时间: {info[3]}")
```

## 📊 统计数据查询

```python
stats = subscription_manager.get_statistics()
print(f"总认购金额: ${stats[0] / 10**18:,.2f}")
print(f"总支付收益: ${stats[1] / 10**18:,.2f}")
print(f"平台代币奖励: {stats[2] / 10**18:,.2f}")
print(f"认购总数: {stats[3]}")
```

## 🤝 贡献指南

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## ⚠️ 免责声明

**本项目仅供学习和开发用途。主网部署前请进行完整的安全审计！**

涉及真实资产的代币化需要遵守相关法律法规，请咨询专业法律顾问。

## 🔗 相关链接

- [Vyper 文档](https://docs.vyperlang.org/)
- [Ape Framework](https://docs.apeworx.io/)
- [RWA资产代币化最佳实践](https://ethereum.org/en/developers/)

---

<div align="center">

**Made with ❤️ by SuperCrypto Team**

⭐ 如果觉得有用，请给个星标！

</div>
