# RWA 预言机系统合约

## 📋 合约列表

| 合约 | 功能 | 依赖 |
|-----|------|------|
| **MultiSigManager.vy** | 2-of-3多签管理 | - |
| **Timelock.vy** | 24小时时间锁 | MultiSigManager |
| **RWAOracle.vy** | 主预言机 | MultiSigManager, Timelock |
| **DataAggregator.vy** | 数据聚合器 | RWAOracle |
| **OracleConsumer.vy** | 消费者示例 | DataAggregator, RWAOracle |

## 🚀 快速开始

### 1. 编译合约

```bash
cd /home/rex/project/mix/SuperCrypto/dapp/RWA
ape compile
```

### 2. 部署系统

```bash
# 部署到本地测试网
ape run deploy_oracle_system --network ethereum:local

# 部署到测试网
ape run deploy_oracle_system --network ethereum:sepolia
```

### 3. 运行示例

```bash
# 完整使用示例
ape run oracle_usage_example --network ethereum:local
```

## 📚 合约说明

### MultiSigManager.vy

**2-of-3 多签验证合约**

核心功能：
- `create_proposal()` - 创建提案
- `sign_proposal()` - 签名提案
- `verify_proposal()` - 验证提案
- `is_proposal_approved()` - 检查是否通过

使用场景：
- 所有预言机数据更新需要2个签名者批准
- 添加/移除签名者需要多签批准
- 修改系统参数需要多签批准

### Timelock.vy

**24小时延迟保护合约**

核心功能：
- `queue_operation()` - 加入队列
- `execute_operation()` - 执行操作
- `cancel_operation()` - 取消操作
- `emergency_execute()` - 紧急执行（需3-of-3）

使用场景：
- 防止恶意快速更新数据
- 给社区24小时检查时间
- 紧急情况可用3-of-3快速通道

### RWAOracle.vy

**主预言机合约**

核心功能：
- `register_asset()` - 注册资产
- `update_asset_data()` - 更新数据
- `update_compliance_status()` - 更新合规状态
- `get_apy()` / `get_valuation()` - 查询数据

数据字段：
- APY（年化收益率）
- 估值（USD）
- 入住率/使用率
- 月度收入
- 合规状态
- 审计报告哈希

### DataAggregator.vy

**混合数据聚合器**

核心功能：
- `add_secondary_oracle()` - 添加次级预言机
- `submit_secondary_data()` - 提交次级数据
- `aggregate_data()` - 聚合数据
- `get_aggregated_apy()` - 获取聚合APY

聚合策略：
- 优先使用主预言机（可信源）
- 收集次级预言机数据并计算中位数
- 偏差 < 10%：加权平均（主70% + 次30%）
- 偏差 ≥ 10%：切换到次级数据源

### OracleConsumer.vy

**消费者示例合约**

核心功能：
- `calculate_token_price()` - 计算代币价格
- `calculate_subscription_amount()` - 计算认购数量
- `validate_investment()` - 验证投资
- `get_expected_returns()` - 计算预期收益

使用场景：
- 与Subscription合约集成
- 基于APY的动态定价
- 投资验证和风险控制

## 🔒 安全特性

### 多重验证

```
数据更新请求
    ↓
[1] 数据提供者白名单
    ↓
[2] 2-of-3 多签批准
    ↓
[3] 24小时时间锁
    ↓
[4] 变化率限制（5%）
    ↓
执行更新
```

### 紧急响应

紧急情况可使用3-of-3快速通道：
- 所有3个签名者必须签名
- 跳过24小时等待
- 立即执行操作

### 权限分离

| 角色 | 权限 |
|-----|------|
| Owner | 合约管理、暂停、配置 |
| Signer | 多签投票（3个地址）|
| Data Provider | 提交数据 |
| Public | 读取数据 |

## 📖 使用流程

### 标准数据更新流程

```python
# 1. 创建多签提案
proposal_id = multisig.create_proposal(
    target=oracle.address,
    data_hash=data_hash,
    sender=signer1
)

# 2. 第二个签名者签名（达到2-of-3）
multisig.sign_proposal(proposal_id, sender=signer2)

# 3. 加入时间锁队列
operation_id = timelock.queue_operation(
    target=oracle.address,
    data_hash=data_hash,
    proposal_id=proposal_id,
    sender=executor
)

# 4. 等待24小时...

# 5. 执行时间锁操作
timelock.execute_operation(operation_id, sender=anyone)

# 6. 更新预言机数据
oracle.update_asset_data(
    asset_id=asset_id,
    new_apy=new_apy,
    new_valuation=new_valuation,
    new_occupancy_rate=new_occupancy_rate,
    new_monthly_revenue=new_monthly_revenue,
    operation_id=operation_id,
    sender=data_provider
)
```

### 紧急快速流程

```python
# 1. 所有签名者紧急签名
for signer in [signer1, signer2, signer3]:
    timelock.emergency_sign(operation_id, sender=signer)

# 2. 立即执行（跳过24小时）
timelock.emergency_execute(operation_id, sender=anyone)

# 3. 更新数据
oracle.update_asset_data(..., sender=data_provider)
```

## 🔌 集成示例

### 与 Subscription 集成

```python
# 方案1：直接查询APY
interface IDataAggregator:
    def get_aggregated_apy(asset_id: bytes32) -> uint256: view

aggregator: public(IDataAggregator)
asset_id: public(bytes32)

@external
def subscribe(amount: uint256, duration: uint256):
    # 获取当前APY
    current_apy = self.aggregator.get_aggregated_apy(self.asset_id)
    
    # 计算预期收益
    expected_returns = amount * current_apy * duration / (10000 * 365)
    
    # ... 其他认购逻辑
```

### 使用 OracleConsumer

```python
# 计算价格
price = consumer.calculate_token_price(asset_id)

# 计算认购数量
tokens = consumer.calculate_subscription_amount(asset_id, usdt_amount)

# 验证投资
assert consumer.validate_investment(asset_id, amount)

# 执行认购
subscription.subscribe(tokens, duration, sender=investor)
```

## 📊 Gas 成本估算

| 操作 | Gas | 成本 (20 gwei) |
|-----|-----|---------------|
| 注册资产 | ~200,000 | ~$8 |
| 更新数据 | ~150,000 | ~$6 |
| 创建提案 | ~100,000 | ~$4 |
| 签名提案 | ~50,000 | ~$2 |
| 时间锁排队 | ~80,000 | ~$3.2 |
| 执行操作 | ~100,000 | ~$4 |
| **完整流程** | **~680,000** | **~$27** |

## 📚 完整文档

详细文档请查看：`docs/02-智能合约/RWA-预言机系统.md`

包含：
- 系统架构图
- 完整操作流程
- 安全特性详解
- 集成指南
- 最佳实践
- 紧急情况处理
- 常见问题解答

## ⚠️ 注意事项

### 部署前检查

- [ ] 确认签名者地址正确
- [ ] 测试多签流程
- [ ] 验证时间锁延迟
- [ ] 配置数据提供者白名单
- [ ] 设置合理的变化率限制
- [ ] 完成安全审计

### 生产环境

- ✅ 使用冷钱包管理签名者私钥
- ✅ 签名者分布在不同地理位置
- ✅ 设置监控和告警系统
- ✅ 准备紧急响应预案
- ✅ 购买智能合约保险
- ✅ 定期审查和更新

## 🐛 故障排查

### 问题：提案未通过

检查：
- 是否有足够的签名（2-of-3）
- 提案是否被取消
- 数据哈希是否正确

### 问题：时间锁操作失败

检查：
- 是否等待了24小时
- 提案是否仍然有效
- 操作是否已被取消

### 问题：数据更新被拒绝

检查：
- 变化率是否超过5%
- 数据是否在合理范围内
- 是否使用了正确的operation_id

## 📞 技术支持

遇到问题？
1. 查看事件日志
2. 检查合约状态
3. 阅读完整文档
4. 运行测试脚本

---

**版本**: v1.0  
**最后更新**: 2025-10-26  
**许可证**: MIT

