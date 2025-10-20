# RWA 权益代币系统 - STO 合规版本

> **⚠️ 重要：本项目已升级为符合证券法的 STO 系统**
> 
> 发行前必须：聘请证券律师 | 完成安全审计 | 获得监管批准 | 集成真实KYC服务

---

## 📋 目录

- [升级总结](#升级总结)
- [快速开始](#快速开始)
- [核心合约](#核心合约)
- [主要功能](#主要功能)
- [部署指南](#部署指南)
- [测试](#测试)
- [成本估算](#成本估算)
- [常见问题](#常见问题)

详细合规指南请查看：**[STO_COMPLIANCE_GUIDE.md](./STO_COMPLIANCE_GUIDE.md)**

---

## 🎉 升级总结

### ✅ 已完成的工作

**新增合约：**
- ✅ `KYCManager.vy` - KYC/AML管理系统
- ✅ `RWATokenSTO.vy` - 符合ERC1404的证券型代币
- ❌ ~~`RWAToken.vy`~~ - 已删除（不合规）

**升级合约：**
- 📝 `Subscription.vy` - 添加KYC检查、投资限制
- 📝 `Staking.vy` - 添加KYC验证
- 📝 `LiquidityMining.vy` - 添加可选KYC验证

**新增功能：**
- ERC1404 转账限制
- KYC/AML 验证系统
- 投资者白名单管理
- 账户冻结功能
- 监管强制转账
- 法律文档关联
- 投资额限制

### 对比：旧版 vs STO版

| 功能 | 旧版 | STO版 |
|-----|------|-------|
| 代币标准 | ERC20 | ERC1404 (Security Token) |
| KYC要求 | ❌ 无 | ✅ 必需 |
| 转账限制 | ❌ 无 | ✅ 8种检查 |
| 投资者上限 | ❌ 无 | ✅ 500人（Reg D） |
| 最小投资额 | ❌ 无 | ✅ $1,000 |
| 监管功能 | ❌ 无 | ✅ 强制转账/冻结 |
| 法律风险 | 🚨 极高 | ✅ 合规 |
| 首年成本 | < $10万 | $30万 - $120万 |

---

## 🚀 快速开始

### 前置要求
- Python 3.8+
- Node.js 16+
- Git

### 1. 安装（首次使用）

```bash
# 进入项目目录
cd /home/rex/project/mix/SuperCrypto/dapp/RWA

# 创建虚拟环境（推荐）
python3 -m venv venv
source venv/bin/activate

# 安装Ape框架
pip install --upgrade pip
pip install eth-ape

# 安装Vyper插件
ape plugins install vyper

# 验证安装
ape --version
```

### 2. 启动Hardhat节点

```bash
# 在新终端启动
cd /home/rex/project/mix/SuperCrypto/hardhat
./hardhat-node.sh

# 保持此终端运行
# 节点地址：http://localhost:8545
```

### 3. 编译合约

```bash
# 返回RWA目录
cd /home/rex/project/mix/SuperCrypto/dapp/RWA

# 编译所有合约
ape compile
```

### 4. 部署STO合约

```bash
# 部署所有STO合约
ape run deploy_all_sto --network ethereum:local

# 地址保存在 deployed_addresses_sto.json
```

### 5. 运行测试

```bash
# 运行STO测试
ape test tests/test_sto_basic.py -v

# 运行所有测试
ape test -v
```

### 故障排查

**问题：Command 'ape' not found**
```bash
# 激活虚拟环境
source venv/bin/activate
```

**问题：Network connection failed**
```bash
# 确保Hardhat节点正在运行
curl http://localhost:8545
```

**问题：编译失败**
```bash
# 重新安装Vyper插件
ape plugins install vyper --upgrade
```

---

## 配置和使用

### 配置KYC系统

```python
from ape import accounts, project

# 连接合约
kyc = project.KYCManager.at("YOUR_ADDRESS")
owner = accounts.test_accounts[0]

# 添加投资者
investor = accounts.test_accounts[1]
kyc.addInvestor(
    investor.address,
    "US",  # 国家代码
    True,  # 是否为合格投资者
    sender=owner
)

# 验证KYC状态
assert kyc.isVerified(investor.address)
```

### 4. 用户认购流程

```python
# 确保用户已通过KYC
usdt = project.MockUSDT.at("YOUR_ADDRESS")
subscription = project.Subscription.at("YOUR_ADDRESS")

# 铸造USDT
usdt.mint(investor.address, 10_000 * 10**6, sender=owner)

# 认购
usdt.approve(subscription.address, 10_000 * 10**6, sender=investor)
subscription.subscribe(
    10_000 * 10**6,  # $10,000
    90 * 24 * 3600,  # 3个月
    sender=investor
)
```

---

## 🔐 核心合约

### 1. KYCManager.vy

**KYC/AML管理合约**

核心功能：
- `addInvestor()` - 添加KYC认证投资者
- `isVerified()` - 检查KYC状态
- `isAccredited()` - 检查合格投资者
- `freezeInvestor()` - 冻结账户
- `setBlockedCountry()` - 设置国家黑名单
- `setMaxInvestors()` - 设置投资者上限

默认配置：
- 投资者上限：500人（Reg D）
- KYC有效期：12个月
- 已阻止国家：KP（朝鲜）、IR（伊朗）、SY（叙利亚）

### 2. RWATokenSTO.vy

**符合ERC1404的证券型代币**

核心功能：
- `detectTransferRestriction()` - 检测转账限制（ERC1404）
- `messageForTransferRestriction()` - 获取限制说明
- `forceTransfer()` - 监管强制转账
- `forceBurn()` - 监管强制销毁
- `setDocument()` - 关联法律文档
- `canTransfer()` - 检查是否可转账

转账限制代码：
```
0 = 允许转账
1 = 发送方未通过KYC
2 = 接收方未通过KYC
3 = 发送方账户冻结
4 = 接收方账户冻结
5 = 超过投资者上限
6 = 转账金额为零
7 = 余额不足
```

### 3. Subscription.vy（STO版）

**认购和赎回合约**

新增功能：
- KYC验证（必须）
- 合格投资者检查（可选）
- 最小投资额限制（$1,000）
- 最大投资额限制（可选）

新增参数：
```python
minInvestment: 1000 * 10**6  # $1,000
maxInvestment: 0  # 0表示无上限
requireAccredited: False  # 是否要求合格投资者
```

### 4. Staking.vy（STO版）

所有操作需KYC验证：
- `stake()` - 质押
- `unstake()` - 解除质押
- `claimReward()` - 领取奖励

### 5. LiquidityMining.vy（STO版）

可选KYC验证（默认关闭）：
```python
requireKYC: False  # 管理员可动态开启
```

---

## 💡 主要功能

### ERC1404 转账限制

所有转账都经过合规检查：

```python
# 检查是否可以转账
restriction = rwa_token.detectTransferRestriction(
    from_address,
    to_address,
    amount
)

if restriction != 0:
    message = rwa_token.messageForTransferRestriction(restriction)
    print(f"转账被限制: {message}")
    # 例如："Sender not KYC verified"
```

### KYC管理

```python
# 添加投资者（需KYC验证者权限）
kyc.addInvestor(investor, "US", True, sender=verifier)

# 检查状态
kyc.isVerified(investor)  # KYC是否有效
kyc.isAccredited(investor)  # 是否合格投资者
kyc.isFrozen(investor)  # 是否冻结

# 冻结账户（监管功能）
kyc.freezeInvestor(investor, True, "Investigation", sender=owner)
```

### 监管功能

仅转让代理（Transfer Agent）可执行：

```python
# 强制转账（法院命令等）
rwa_token.forceTransfer(
    from_addr,
    to_addr,
    amount,
    "Court Order #12345",
    sender=transfer_agent
)

# 强制销毁（监管要求）
rwa_token.forceBurn(
    investor,
    amount,
    "Regulatory compliance",
    sender=transfer_agent
)
```

### 法律文档管理

```python
# 关联招股说明书
rwa_token.setDocument(
    "Prospectus 2024",
    "ipfs://Qm...",  # IPFS URI
    document_hash,  # SHA256哈希
    sender=owner
)

# 查询文档
uri, hash = rwa_token.getDocument("Prospectus 2024")
```

---

## 📦 部署指南

### 完整部署流程

```python
# 1. 部署KYC管理合约
kyc_manager = project.KYCManager.deploy(sender=deployer)

# 2. 部署代币
usdt = project.MockUSDT.deploy(sender=deployer)
rwa_token = project.RWATokenSTO.deploy(kyc_manager.address, sender=deployer)
platform_token = project.PlatformToken.deploy(sender=deployer)

# 3. 部署业务合约
subscription = project.Subscription.deploy(
    usdt.address,
    rwa_token.address,
    kyc_manager.address,
    sender=deployer
)

staking = project.Staking.deploy(
    rwa_token.address,
    platform_token.address,
    subscription.address,
    kyc_manager.address,
    sender=deployer
)

# 4. 设置权限
rwa_token.setMinter(subscription.address, True, sender=deployer)
rwa_token.setBurner(subscription.address, True, sender=deployer)
platform_token.setMinter(staking.address, True, sender=deployer)

# 5. 添加示例投资者
kyc_manager.addInvestor(investor.address, "US", True, sender=deployer)

# 6. 设置法律文档
rwa_token.setDocument(
    "Prospectus",
    "ipfs://Qm...",
    document_hash,
    sender=deployer
)
```

### 使用部署脚本

```bash
# 自动化部署
ape run deploy_all_sto --network ethereum:local

# 查看部署地址
cat deployed_addresses_sto.json
```

---

## 🧪 测试

### 运行测试

```bash
# 运行STO测试
ape test tests/test_sto_basic.py -v

# 运行所有测试
ape test -v

# 测试覆盖率
ape test --coverage
```

### 测试场景

- ✅ KYC验证流程
- ✅ 转账限制检查（8种场景）
- ✅ 投资者上限控制
- ✅ 账户冻结功能
- ✅ 监管强制转账
- ✅ 认购合规检查
- ✅ 最小/最大投资额
- ✅ 合格投资者要求
- ✅ 国家黑名单
- ✅ 完整STO流程

---

## 💰 成本估算

### 首年成本

| 项目 | 成本（USD） | 说明 |
|-----|-----------|------|
| 证券律师 | $50,000 - $200,000 | 法律意见书、文档准备 |
| 智能合约审计 | $30,000 - $100,000 | OpenZeppelin/CertiK等 |
| KYC/AML系统 | $10,000 - $30,000 | Civic/Jumio集成 |
| SEC注册/豁免 | $10,000 - $100,000 | Form D、蓝天法 |
| 技术开发 | ✅ 已完成 | 本项目 |
| 公司设立 | $5,000 - $10,000 | Delaware C-Corp等 |
| 保险（D&O） | $15,000 - $50,000 | 董事责任险 |
| **总计** | **$120,000 - $490,000** | 不含开发 |

### 年度运营成本

| 项目 | 成本（USD） |
|-----|-----------|
| 法律合规 | $50,000 - $150,000 |
| 审计和报告 | $30,000 - $100,000 |
| KYC/AML服务 | $10,000 - $30,000 |
| 转让代理 | $10,000 - $50,000 |
| 保险续期 | $15,000 - $30,000 |
| **总计** | **$115,000 - $360,000** |

---

## 🌍 监管框架

### 美国市场（SEC）

| 框架 | 适用场景 | 投资者限制 | 成本 | 时间 |
|-----|---------|----------|------|------|
| **Reg D 506(b)** | 私募，现有关系 | ≤35非合格 | $50k-$150k | 1-2月 |
| **Reg D 506(c)** | 私募，可广告 | 仅合格 | $75k-$200k | 1-2月 |
| **Reg A+ Tier 2** | 小额公募 | $75M/年 | $200k-$500k | 3-6月 |
| **Reg S** | 海外投资者 | 非美国 | $50k-$100k | 1-2月 |

### 推荐选择

- **小型私募**（< $5M）：Reg D 506(b) + Reg S
- **中型私募**（$5M - $50M）：Reg D 506(c)
- **公开发行**（> $50M）：Reg A+ Tier 2

### 新加坡市场（MAS）

- 小额豁免：≤$5M，≤50投资者
- 机构豁免：仅机构投资者
- 需要CMS牌照（或与持牌机构合作）

---

## ❓ 常见问题

### Q1: 必须使用STO合规版本吗？

**A:** 如果你的代币：
- 代表真实资产权益 ✅
- 承诺固定回报（8%-15% APY）✅
- 用户期待投资回报 ✅

那么**必须使用STO合规版本**，这是法律要求！

### Q2: PlatformToken也需要STO合规吗？

**A:** 通常不需要。PLT是治理/功能型代币，不代表资产权益。但建议咨询律师确认。

### Q3: 最小投资额为什么是$1,000？

**A:** 这是Reg D常见要求。可通过 `subscription.setMinInvestment()` 调整。

### Q4: 审计费用多少？

**A:** $30,000 - $100,000，取决于：
- 审计公司（OpenZeppelin > CertiK > 其他）
- 代码复杂度
- 审计深度
- 时间要求

### Q5: 如何集成真实的KYC服务？

**A:** 推荐服务商：
- **Civic** - 区块链专用，$0.50-$2/次
- **Jumio** - 企业级，按量计费
- **Onfido** - AI驱动，$1-$3/次
- **Sumsub** - 全球覆盖，$0.50-$2/次

集成方式：API对接，KYC通过后调用 `kyc_manager.addInvestor()`

### Q6: 需要多长时间才能上线？

**A:** 
- 技术准备：✅ 已完成
- 法律合规：3-6个月
- SEC审批（Reg A+）：3-6个月
- 总计：**最快3个月，通常6-12个月**

### Q7: 可以跳过KYC吗？

**A:** **绝对不可以！** 这是STO的核心合规要求，跳过KYC = 违法发行证券。

---

## ⚠️ 重要提醒

### ✅ 技术已完成

- [x] KYC管理系统
- [x] ERC1404代币
- [x] 转账限制
- [x] 监管功能
- [x] 业务合约升级

### 🚨 法律合规必须完成

**在生产环境使用前，必须：**

1. **聘请证券律师**（$50k-$200k）
2. **完成安全审计**（$30k-$100k）
3. **SEC注册/豁免**（$10k-$100k）
4. **集成真实KYC服务**（$10k-$30k/年）
5. **设置多签钱包**（Gnosis Safe 3-of-5）
6. **购买D&O保险**（$15k-$50k/年）

**不要在未完成法律合规的情况下发行代币！**

---

## 📚 资源和文档

### 本项目文档

- **[STO_COMPLIANCE_GUIDE.md](./STO_COMPLIANCE_GUIDE.md)** - 完整合规指南 ⭐⭐⭐

### 监管资源

- [SEC官方指南](https://www.sec.gov/)
- [FINRA规则](https://www.finra.org/)
- [MAS指南](https://www.mas.gov.sg/)（新加坡）

### 技术资源

- [ERC1404标准](https://erc1404.org/)
- [Vyper文档](https://docs.vyperlang.org/)
- [Ape框架](https://docs.apeworx.io/)

### 推荐服务商

- **KYC**: Civic, Jumio, Onfido, Sumsub
- **审计**: OpenZeppelin, CertiK, Trail of Bits
- **STO平台**: Securitize, Polymath, TokenSoft

---

## 📞 获取帮助

### 法律问题
联系专业证券律师（必须有STO经验）

### 技术问题
- 查看 `STO_COMPLIANCE_GUIDE.md`
- 运行测试：`ape test tests/test_sto_basic.py -v`
- Vyper社区

### 合规问题
- KYC服务商客户支持
- 审计公司咨询

---

## 🚫 免责声明

**本项目仅供参考，不构成法律建议。**

- 证券法复杂且因司法管辖区而异
- 在发行任何证券型代币前，必须咨询专业证券律师
- 智能合约必须经过专业审计
- 不遵守证券法可能导致严重的民事和刑事后果
- 作者不对使用本代码造成的任何损失负责

---

## 📝 许可证

MIT License

---

**版本**: STO-v1.0  
**最后更新**: 2025-10-13  
**状态**: ✅ 技术实现完成，等待法律合规
