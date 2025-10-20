# STO 合规完整指南

> **本文档包含：迁移指南 + 合规检查清单 + 详细配置步骤**

---

## 📋 目录

**第一部分：迁移指南**
- [从非STO升级](#第一部分迁移指南)
- [核心变更说明](#核心变更)
- [部署步骤](#部署步骤)
- [配置KYC系统](#配置kyc系统)
- [集成KYC服务商](#集成kyc服务商)

**第二部分：合规检查清单**
- [法律基础](#第二部分合规检查清单)
- [监管注册](#监管注册豁免)
- [KYC/AML合规](#kycaml合规)
- [技术合规](#技术合规)
- [上线前检查](#上线前最终检查)

---

# 第一部分：迁移指南

## 核心变更

### 合约变更对比

| 原合约 | 新合约 | 状态 | 说明 |
|-------|-------|------|------|
| `RWAToken.vy` | `RWATokenSTO.vy` | ✅ 已替换 | 符合ERC1404标准 |
| `Subscription.vy` | `Subscription.vy` | 📝 已更新 | 添加KYC和投资限制 |
| `Staking.vy` | `Staking.vy` | 📝 已更新 | 添加KYC验证 |
| `LiquidityMining.vy` | `LiquidityMining.vy` | 📝 已更新 | 添加可选KYC |
| - | `KYCManager.vy` | ✅ 新增 | KYC/AML管理 |
| `PlatformToken.vy` | `PlatformToken.vy` | ⚪ 无变化 | 治理代币 |

### 新增功能

#### RWATokenSTO（ERC1404）
```vyper
detectTransferRestriction()  # 检测转账限制
messageForTransferRestriction()  # 获取限制说明
forceTransfer()  # 监管强制转账
forceBurn()  # 监管强制销毁
setDocument()  # 关联法律文档
canTransfer()  # 检查可转账性
```

#### KYCManager
```vyper
addInvestor()  # 添加KYC认证投资者
isVerified()  # 检查KYC状态
isAccredited()  # 检查合格投资者
freezeInvestor()  # 冻结账户
setBlockedCountry()  # 设置国家黑名单
setMaxInvestors()  # 设置投资者上限
```

---

## 部署步骤

### 步骤1：准备环境

```bash
cd /home/rex/project/mix/SuperCrypto/dapp/RWA

# 确保Hardhat节点运行
# cd ../../hardhat && ./hardhat-node.sh
```

### 步骤2：部署STO合约

```bash
# 使用自动化脚本部署
ape run deploy_all_sto --network ethereum:local

# 部署地址保存在
cat deployed_addresses_sto.json
```

### 步骤3：手动部署（可选）

```python
from ape import accounts, project

deployer = accounts.test_accounts[0]

# 1. 部署KYC管理合约
kyc_manager = project.KYCManager.deploy(sender=deployer)
print(f"KYCManager: {kyc_manager.address}")

# 2. 部署代币
usdt = project.MockUSDT.deploy(sender=deployer)
rwa_token = project.RWATokenSTO.deploy(
    kyc_manager.address,
    sender=deployer
)
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

liquidity_mining = project.LiquidityMining.deploy(
    "0x0000000000000000000000000000000000000000",  # LP Token稍后设置
    platform_token.address,
    kyc_manager.address,
    sender=deployer
)

# 4. 设置权限
rwa_token.setMinter(subscription.address, True, sender=deployer)
rwa_token.setBurner(subscription.address, True, sender=deployer)
platform_token.setMinter(staking.address, True, sender=deployer)
platform_token.setMinter(liquidity_mining.address, True, sender=deployer)
```

---

## 配置KYC系统

### 设置投资者上限

```python
# 根据监管框架设置
# Reg D Rule 506(b): 35个非合格 + 无限合格
# Reg D Rule 506(c): 无限（仅合格）
# Reg A+: 最多2000人

kyc_manager.setMaxInvestors(500, sender=owner)
```

### 添加KYC验证者

```python
# 如果有第三方KYC服务
kyc_manager.setVerifier(kyc_service_address, True, sender=owner)
```

### 设置国家黑名单

```python
# OFAC制裁国家（默认已包含KP、IR、SY）
kyc_manager.setBlockedCountry("CU", True, sender=owner)  # 古巴
kyc_manager.setBlockedCountry("SD", True, sender=owner)  # 苏丹
```

### 添加认证投资者

```python
# 添加单个投资者
kyc_manager.addInvestor(
    investor_address,
    "US",  # 国家代码（ISO 3166-1 alpha-2）
    True,  # 是否为合格投资者
    sender=verifier
)

# 批量添加
investors = [
    (addr1, "US", True),
    (addr2, "SG", False),
    (addr3, "GB", True),
]

for addr, country, accredited in investors:
    kyc_manager.addInvestor(addr, country, accredited, sender=verifier)
```

---

## 配置认购参数

### 设置投资限额

```python
subscription = project.Subscription.at("YOUR_ADDRESS")

# 最小投资额（符合Reg D要求）
subscription.setMinInvestment(1000 * 10**6, sender=owner)  # $1,000

# 最大单次投资额（可选）
subscription.setMaxInvestment(100_000 * 10**6, sender=owner)  # $100,000
```

### 设置合格投资者要求

```python
# Reg D 506(b): 可接受非合格投资者（最多35人）
subscription.setRequireAccredited(False, sender=owner)

# Reg D 506(c): 仅合格投资者
subscription.setRequireAccredited(True, sender=owner)
```

### 调整APY（如需要）

```python
# 3个月期设为10%
subscription.setAPY(90 * 24 * 3600, 1000, sender=owner)  # 1000 = 10%
```

---

## 设置法律文档

### 上传文档到IPFS

```bash
# 使用IPFS上传招股说明书
ipfs add prospectus.pdf
# 输出：added QmXxXxXxXx... prospectus.pdf

# 计算SHA256哈希
sha256sum prospectus.pdf
# 输出：abc123def456... prospectus.pdf
```

### 关联文档到代币

```python
rwa_token = project.RWATokenSTO.at("YOUR_ADDRESS")

# 转换哈希为bytes32
import hashlib
doc_hash = hashlib.sha256(open("prospectus.pdf", "rb").read()).digest()

# 设置文档
rwa_token.setDocument(
    "Prospectus 2024",
    "ipfs://QmXxXxXxXx...",
    doc_hash,
    sender=owner
)

# 其他必需文档
documents = [
    ("Risk Disclosure", "ipfs://Qm..."),
    ("Subscription Agreement", "ipfs://Qm..."),
    ("Annual Report 2024", "ipfs://Qm..."),
]

for name, uri in documents:
    # 计算对应文件的哈希
    rwa_token.setDocument(name, uri, doc_hash, sender=owner)
```

---

## 集成KYC服务商

### 推荐服务商

| 服务商 | 优势 | 费用 | 网站 |
|-------|------|------|------|
| **Civic** | 区块链专用 | $0.50-$2/次 | civic.com |
| **Jumio** | 企业级 | 按量计费 | jumio.com |
| **Onfido** | AI驱动 | $1-$3/次 | onfido.com |
| **Sumsub** | 全球覆盖 | $0.50-$2/次 | sumsub.com |

### 集成示例（伪代码）

```python
# Civic集成示例
from civic_sdk import CivicClient

civic = CivicClient(api_key="YOUR_API_KEY")

# 用户完成KYC后的回调
def on_kyc_completed(user_address, civic_token):
    # 验证Civic令牌
    kyc_data = civic.verify_token(civic_token)
    
    if kyc_data.verified:
        # 检查合格投资者状态
        accredited = check_accredited_investor(kyc_data)
        
        # 添加到区块链白名单
        tx = kyc_manager.addInvestor(
            user_address,
            kyc_data.country_code,
            accredited,
            sender=kyc_verifier
        )
        
        print(f"✅ KYC完成: {user_address}")
        return tx.txn_hash
    else:
        print(f"❌ KYC失败: {kyc_data.reason}")
        return None
```

---

## 数据迁移（如有旧系统）

### 导出旧数据

```python
# 导出认购记录
old_subscription = project.Subscription.at("OLD_ADDRESS")

subscriptions = []
for user in all_users:
    count = old_subscription.subscriptionCount(user)
    for i in range(count):
        sub = old_subscription.getSubscription(user, i)
        subscriptions.append({
            'user': user,
            'principal': sub.principal,
            'lockPeriod': sub.lockPeriod,
            'subscribeTime': sub.subscribeTime,
            'redeemTime': sub.redeemTime,
            'apy': sub.apy,
            'redeemed': sub.redeemed
        })

# 保存
import json
with open('old_subscriptions.json', 'w') as f:
    json.dump(subscriptions, f, indent=2)
```

### 迁移策略

**推荐：暂停旧合约 + 快照重建**

1. 暂停旧合约所有操作
2. 记录所有余额和状态
3. 要求所有用户完成KYC
4. 在新合约中重建状态
5. 逐步淘汰旧合约

---

# 第二部分：合规检查清单

## 🚨 关键提醒

**在发行证券型代币前，必须完成以下所有项目！**

未完成可能导致：
- 民事罚款（数百万美元）
- 刑事指控
- 强制退还所有投资
- 项目永久关闭

---

## ✅ 第一阶段：法律基础

### 法律咨询

- [ ] **聘请专业证券律师**
  - 费用：$50,000 - $200,000+
  - 必须：有STO/数字证券经验
  - 推荐：Ask.fm, Cooley, Fenwick & West
  
- [ ] **确定监管框架**
  - [ ] 选择发行管辖区
    - 美国：Reg D 506(b)/506(c), Reg A+, Reg S
    - 新加坡：MAS豁免
    - 瑞士：FINMA许可
  - [ ] 获得法律意见书
  
- [ ] **Howey Test分析**
  - [ ] 确认代币为证券
  - [ ] 书面法律意见
  
- [ ] **准备法律文档**
  - [ ] 私募备忘录（PPM）
  - [ ] 认购协议
  - [ ] 风险披露
  - [ ] 服务条款
  - [ ] 隐私政策（符合GDPR）
  - [ ] AML/CFT政策
  - [ ] 投资者资格表

---

## ✅ 第二阶段：监管注册/豁免

### 美国市场

#### Reg D Rule 506(b)
- [ ] 不超过35个非合格投资者
- [ ] 所有投资者有购买力
- [ ] 禁止一般性广告
- [ ] 与投资者有实质性关系
- [ ] **Form D提交**（发行后15天内）
- [ ] 州级蓝天法通知

#### Reg D Rule 506(c)
- [ ] 仅合格投资者
- [ ] 允许一般性广告
- [ ] **验证投资者资格**（第三方）
- [ ] **Form D提交**

#### Reg A+ (Tier 2)
- [ ] **SEC审核和批准**（3-6个月）
- [ ] 12个月最多$75M
- [ ] 审计财务报表
- [ ] 持续披露义务
- [ ] 非合格投资者限制（10%年收入）
- [ ] Form 1-A提交

#### Reg S（海外）
- [ ] 仅向美国境外投资者发行
- [ ] 锁定期（6-12个月）
- [ ] 禁止定向销售回美国

### 新加坡市场

- [ ] 获得CMS牌照（或与持牌机构合作）
- [ ] 提交招股书给MAS
- [ ] AML/CFT合规
- [ ] 仅向机构/符合小额豁免

---

## ✅ 第三阶段：KYC/AML合规

### KYC服务商集成

- [ ] **选择KYC/AML服务商**
  - [ ] Civic / Jumio / Onfido / Sumsub
  - 费用：$0.50 - $3 per verification
  
- [ ] **集成KYC系统**
  - [ ] API集成到KYCManager合约
  - [ ] 自动化验证流程
  - [ ] 身份文件收集
  - [ ] 活体检测
  - [ ] 地址验证
  
- [ ] **制定KYC政策**
  - [ ] KYC有效期（12个月）
  - [ ] 重新验证流程
  - [ ] 拒绝条件
  - [ ] 数据保留（符合GDPR）

### 合格投资者验证

- [ ] **验证标准**（美国）
  - [ ] 年收入>$200k（个人）或$300k（夫妻）连续2年
  - [ ] 净资产>$1M（不含主要住宅）
  - [ ] 持有Series 7, 65, 82牌照
  - [ ] 实体资产>$5M
  
- [ ] **验证方法**
  - [ ] 税务文件（W-2, 1099）
  - [ ] 银行/经纪对账单
  - [ ] 第三方验证（VerifyInvestor）
  - [ ] CPA/律师信函

### AML/CFT

- [ ] **AML计划**
  - [ ] 风险评估
  - [ ] 客户尽调（CDD）
  - [ ] 增强尽调（EDD）
  - [ ] 持续监控
  - [ ] 可疑活动报告（SAR）
  
- [ ] **制裁筛查**
  - [ ] OFAC SDN清单
  - [ ] EU制裁清单
  - [ ] UN制裁清单
  
- [ ] **指定AML官员**
  - [ ] 合规官员
  - [ ] 培训和认证
  - [ ] 年度审查

---

## ✅ 第四阶段：技术合规

### 智能合约

- [ ] **ERC1404实现** ✅
  - [x] detectTransferRestriction()
  - [x] messageForTransferRestriction()
  
- [ ] **KYC集成** ✅
  - [x] 转账需KYC验证
  - [x] 铸造/销毁需KYC
  - [x] 冻结功能
  
- [ ] **监管功能** ✅
  - [x] 强制转账
  - [x] 强制销毁
  - [x] 转让代理角色
  
- [ ] **文档管理** ✅
  - [x] 招股书关联
  - [x] 文档哈希验证
  
- [ ] **投资者限制** ✅
  - [x] 投资者人数上限
  - [x] 最小/最大投资额
  - [x] 国家黑名单

### 安全审计

- [ ] **选择审计公司**
  - [ ] OpenZeppelin ($50k-$100k+)
  - [ ] CertiK ($30k-$80k)
  - [ ] Trail of Bits ($80k-$150k)
  
- [ ] **审计范围**
  - [ ] 所有智能合约
  - [ ] 权限和访问控制
  - [ ] 经济模型
  - [ ] 集成测试
  
- [ ] **修复所有问题**
  - [ ] 高危问题必须修复
  - [ ] 中危问题必须修复
  - [ ] 低危问题建议修复
  
- [ ] **发布审计报告**（公开）

### 多签钱包

- [ ] **设置Gnosis Safe**
  - [ ] 至少3-of-5多签
  - [ ] 包含独立董事
  - [ ] 明确签名政策
  
- [ ] **转移合约所有权**
  - [ ] 所有合约owner
  - [ ] transferAgent权限
  - [ ] 升级权限（如有）

---

## ✅ 第五阶段：持续合规

### 信息披露

- [ ] **初始披露**
  - [ ] 完整招股说明书
  - [ ] 风险因素
  - [ ] 使用资金
  - [ ] 管理团队背景
  - [ ] 财务状况
  
- [ ] **持续披露**（Reg A+）
  - [ ] 半年度报告（6-K）
  - [ ] 年度报告（1-K）
  - [ ] 重大事件（8-K）
  - [ ] 审计财务报表

### 投资者关系

- [ ] 设置投资者门户
- [ ] 股东沟通计划
- [ ] 股东大会安排
- [ ] 投票权实施
- [ ] 客服支持

### 税务合规

- [ ] 咨询税务律师
- [ ] 发行方税务处理
- [ ] 投资者税务指导
- [ ] 1099表格（如需）
- [ ] FATCA合规

### 转让代理

- [ ] **指定转让代理**（美国要求）
  - SEC注册的转让代理
  - 或内部转让代理功能
  
- [ ] **职责**
  - [ ] 股东名册维护
  - [ ] 转账记录
  - [ ] 分红分配（如有）

---

## ✅ 第六阶段：运营准备

### 公司结构

- [ ] **设立实体**
  - [ ] Delaware C-Corp（美国）
  - [ ] Singapore Pte Ltd（新加坡）
  - [ ] Cayman/BVI（离岸）
  
- [ ] **公司治理**
  - [ ] 董事会（含独立董事）
  - [ ] 审计委员会
  - [ ] 合规委员会

### 银行账户

- [ ] 开设企业账户
  - 加密货币友好银行
  - Circle（USDC）
  - Paxos

### 保险

- [ ] **D&O保险**（$10k-$50k/年）
- [ ] **网络安全保险**（$5k-$20k/年）
- [ ] **E&O保险**

### 监控系统

- [ ] 链上交易监控
- [ ] 异常检测
- [ ] 合规监控
  - [ ] KYC过期提醒
  - [ ] 投资者上限监控
  - [ ] SAR触发条件

---

## ✅ 上线前最终检查

### 技术检查

- [ ] 所有合约已部署
- [ ] 地址已验证（Etherscan）
- [ ] 权限已正确设置
- [ ] 多签已配置
- [ ] 完整用户流程测试
- [ ] 负载测试

### 法律检查

- [ ] 所有文档已完成
- [ ] Form D已提交（如适用）
- [ ] 州级通知已发送
- [ ] 招股书已上传
- [ ] 律师最终批准

### 营销检查

- [ ] 营销材料合规
- [ ] 不含夸大陈述
- [ ] 包含风险披露
- [ ] 律师已审查

---

## 💰 完整成本总结

### 最低成本（小型私募）

| 项目 | 成本 |
|-----|------|
| 证券律师 | $50,000 - $100,000 |
| 智能合约审计 | $30,000 - $50,000 |
| KYC/AML系统 | $10,000 - $20,000 |
| Form D注册 | $5,000 - $10,000 |
| 公司设立 | $5,000 - $10,000 |
| 保险 | $15,000 - $30,000 |
| **首年总计** | **$115,000 - $220,000** |

### 持续成本（年度）

| 项目 | 成本 |
|-----|------|
| 法律合规 | $50,000 - $150,000 |
| 审计和报告 | $30,000 - $100,000 |
| KYC/AML服务 | $10,000 - $30,000 |
| 转让代理 | $10,000 - $50,000 |
| 保险续期 | $15,000 - $30,000 |
| **年度总计** | **$115,000 - $360,000** |

---

## 🚫 常见错误（避免！）

1. ❌ **跳过律师咨询** → 违法发行，可能入狱
2. ❌ **未经审计部署** → 黑客攻击，资金损失
3. ❌ **KYC流程不严** → 洗钱风险，监管处罚
4. ❌ **承诺固定回报** → 庞氏骗局认定
5. ❌ **公开广告（506b）** → 失去豁免资格

---

## 📞 关键联系人准备

### 法律团队
- [ ] 证券律师（主）
- [ ] 证券律师（备）
- [ ] 税务律师

### 技术团队
- [ ] 审计公司
- [ ] 安全顾问

### 合规团队
- [ ] AML官员
- [ ] 合规顾问
- [ ] KYC服务商

### 财务团队
- [ ] CPA会计师
- [ ] 审计师
- [ ] CFO

---

## ✅ 最终确认

**在发行前，确认所有项：**

- [ ] ✅ 所有法律文档已完成并由律师审查
- [ ] ✅ 监管注册/豁免已提交并获批
- [ ] ✅ 智能合约已完成专业审计
- [ ] ✅ KYC/AML系统已集成并测试
- [ ] ✅ 多签钱包已设置并转移所有权
- [ ] ✅ 所有团队成员已接受合规培训
- [ ] ✅ 保险已购买
- [ ] ✅ 应急响应计划已准备
- [ ] ✅ 完整的用户流程已测试
- [ ] ✅ 律师给予最终批准

**如果有任何一项未完成，请不要上线！**

---

## ⚖️ 免责声明

本指南仅供参考，不构成法律建议。

- 证券法复杂且因管辖区而异
- 本清单可能不完整或过时
- 必须咨询专业证券律师
- 遵守法律是发行方的责任

**记住：合规不是可选的，是必需的！**

---

**版本**: v1.0  
**最后更新**: 2025-10-13

