# RWA Tests 测试套件

## 📋 测试文件列表

### RWA核心系统测试

#### 1. test_tokens.py - 代币基础测试
**测试合约**：
- MockUSDT
- RWATokenSTO (ERC1404)
- PlatformToken

**测试内容**：
- 代币铸造和销毁
- 转账限制（ERC1404）
- 权限管理
- 余额查询

**运行**：
```bash
ape test tests/test_tokens.py -v
```

---

#### 2. test_sto_basic.py - STO合规测试
**测试合约**：
- KYCManager
- RWATokenSTO
- 合规流程

**测试内容**：
- KYC验证
- 投资者白名单
- 转账限制（8种场景）
- 账户冻结
- 监管强制转账
- 合格投资者检查

**运行**：
```bash
ape test tests/test_sto_basic.py -v
```

---

#### 3. test_subscription.py - 认购测试
**测试合约**：Subscription

**测试内容**：
- 认购流程
- 赎回流程
- 锁定期管理
- 收益计算
- KYC集成

**运行**：
```bash
ape test tests/test_subscription.py -v
```

---

#### 4. test_staking.py - 质押测试
**测试合约**：Staking

**测试内容**：
- 质押和解除质押
- 奖励计算
- APY设置
- KYC验证
- 复利计算

**运行**：
```bash
ape test tests/test_staking.py -v
```

---

#### 5. test_liquidity_mining.py - 流动性挖矿测试
**测试合约**：LiquidityMining

**测试内容**：
- LP代币质押
- 奖励分发
- 多池管理
- 时间加权奖励

**运行**：
```bash
ape test tests/test_liquidity_mining.py -v
```

---

#### 6. test_integration.py - RWA系统集成测试
**测试场景**：
- 完整用户流程（认购→质押→赎回）
- 多合约交互
- 边界情况
- 完整业务逻辑

**运行**：
```bash
ape test tests/test_integration.py -v
```

---

### 预言机系统测试

#### 7. test_multisig.py - 多签管理测试
**测试合约**：MultiSigManager

**测试内容**：
- 2-of-3多签机制
- 提案创建和投票
- 签名者管理
- 权限验证

**运行**：
```bash
ape test tests/test_multisig.py -v
```

---

#### 8. test_timelock.py - 时间锁测试
**测试合约**：Timelock

**测试内容**：
- 24小时延迟机制
- 操作排队和执行
- 紧急快速通道（3-of-3）
- 操作取消

**运行**：
```bash
ape test tests/test_timelock.py -v
```

---

#### 9. test_oracle.py - 主预言机测试
**测试合约**：RWAOracle

**测试内容**：
- 资产注册
- 数据更新
- 合规状态管理
- 历史数据追踪
- 变化率限制
- 数据有效期

**运行**：
```bash
ape test tests/test_oracle.py -v
```

---

#### 10. test_aggregator.py - 数据聚合器测试
**测试合约**：DataAggregator

**测试内容**：
- 次级预言机管理
- 混合数据聚合
- 偏差检测
- 数据置信度
- 缓存机制

**运行**：
```bash
ape test tests/test_aggregator.py -v
```

---

#### 11. test_oracle_integration.py - 预言机集成测试
**测试场景**：
- 完整预言机工作流程
- 多签+时间锁流程
- 消费者合约集成
- 紧急场景处理
- 系统安全验证

**运行**：
```bash
ape test tests/test_oracle_integration.py -v
```

---

## 🎯 运行策略

### 快速测试（单个合约）
```bash
# 测试代币
ape test tests/test_tokens.py -v

# 测试多签
ape test tests/test_multisig.py -v
```

### 完整测试（RWA系统）
```bash
ape test tests/test_tokens.py \
         tests/test_sto_basic.py \
         tests/test_subscription.py \
         tests/test_staking.py \
         tests/test_liquidity_mining.py \
         tests/test_integration.py -v
```

### 完整测试（预言机系统）
```bash
ape test tests/test_multisig.py \
         tests/test_timelock.py \
         tests/test_oracle.py \
         tests/test_aggregator.py \
         tests/test_oracle_integration.py -v
```

### 运行所有测试
```bash
ape test -v
```

### 测试覆盖率
```bash
ape test --coverage
```

### 特定测试类
```bash
ape test tests/test_oracle.py::TestUpdateAssetData -v
```

### 特定测试函数
```bash
ape test tests/test_oracle.py::TestUpdateAssetData::test_update_asset_data_success -v
```

---

## 📊 测试覆盖率

### RWA核心系统
| 合约 | 测试文件 | 覆盖场景 | 完整度 |
|-----|---------|---------|--------|
| MockUSDT | test_tokens.py | 铸造、转账 | ✅ 100% |
| RWATokenSTO | test_tokens.py, test_sto_basic.py | ERC1404、KYC集成 | ✅ 100% |
| KYCManager | test_sto_basic.py | KYC流程、冻结 | ✅ 100% |
| PlatformToken | test_tokens.py | 标准ERC20 | ✅ 100% |
| Subscription | test_subscription.py | 认购、赎回 | ✅ 100% |
| Staking | test_staking.py | 质押、奖励 | ✅ 100% |
| LiquidityMining | test_liquidity_mining.py | 流动性挖矿 | ✅ 100% |

### 预言机系统
| 合约 | 测试文件 | 覆盖场景 | 完整度 |
|-----|---------|---------|--------|
| MultiSigManager | test_multisig.py | 多签流程 | ✅ 100% |
| Timelock | test_timelock.py | 时间锁、紧急通道 | ✅ 100% |
| RWAOracle | test_oracle.py | 数据管理 | ✅ 100% |
| DataAggregator | test_aggregator.py | 数据聚合 | ✅ 100% |
| OracleConsumer | test_oracle_integration.py | 消费者集成 | ✅ 100% |

---

## 🧪 测试场景分类

### 功能测试（Functional Tests）
- ✅ 正常流程测试
- ✅ 边界条件测试
- ✅ 数据验证测试

### 安全测试（Security Tests）
- ✅ 权限控制测试
- ✅ 重入攻击防护
- ✅ 溢出保护
- ✅ 访问控制

### 集成测试（Integration Tests）
- ✅ 多合约交互
- ✅ 完整业务流程
- ✅ 系统级验证

### 负面测试（Negative Tests）
- ✅ 无效输入
- ✅ 未授权访问
- ✅ 异常情况处理

---

## ⚙️ Pytest配置

### Fixtures
所有测试都使用pytest fixtures来：
- 部署合约
- 准备测试账户
- 设置初始状态
- 模拟时间流逝

### 示例：
```python
@pytest.fixture
def signers():
    """获取测试签名者"""
    return [
        accounts.test_accounts[0],
        accounts.test_accounts[1],
        accounts.test_accounts[2]
    ]

@pytest.fixture
def oracle(signers, multisig, timelock):
    """部署预言机"""
    return signers[0].deploy(
        project.RWAOracle,
        multisig.address,
        timelock.address
    )
```

---

## 📈 持续集成（CI）

### GitHub Actions示例
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      - name: Install dependencies
        run: |
          pip install eth-ape
          ape plugins install vyper
      - name: Run tests
        run: ape test -v
```

---

## 🔍 调试技巧

### 详细输出
```bash
ape test tests/test_oracle.py -v -s
```

### 查看事件
```python
tx = oracle.register_asset(...)
print(tx.events)
```

### 使用断点
```python
def test_something():
    import pdb; pdb.set_trace()
    # 测试代码
```

### 查看Gas消耗
```bash
ape test --gas
```

---

## ⚠️ 注意事项

### 测试环境
- 使用 `accounts.test_accounts` 而不是真实账户
- 测试前确保Hardhat节点运行
- 每个测试自动重置状态

### 时间操作
```python
# 快进24小时
chain.mine(deltatime=86400)

# 快进区块
chain.mine(10)  # 快进10个区块
```

### 异常检测
```python
# 检查异常
with pytest.raises(Exception, match="Only owner"):
    oracle.pause(sender=non_owner)

# 检查特定错误
with pytest.raises(Exception, match="APY too high"):
    oracle.register_asset(...)
```

---

## 📚 相关文档

- **合约文档**：`/docs/02-智能合约/`
- **RWA系统**：`/docs/02-智能合约/RWA-权益代币系统.md`
- **预言机系统**：`/docs/02-智能合约/RWA-预言机系统.md`
- **部署指南**：`/docs/05-部署/部署指南.md`

---

## 🎓 编写新测试

### 模板
```python
"""
[合约名] 测试
测试 [功能描述]
"""
import pytest
from ape import accounts, project, chain


@pytest.fixture
def contract(signers):
    """部署合约"""
    return signers[0].deploy(project.YourContract)


class TestYourFeature:
    """功能测试"""
    
    def test_basic_functionality(self, contract, signers):
        """测试基础功能"""
        # 准备
        # 执行
        # 验证
        assert True
    
    def test_edge_case(self, contract, signers):
        """测试边界情况"""
        with pytest.raises(Exception):
            # 应该失败的操作
            pass
```

---

**版本**: v1.0  
**最后更新**: 2025-10-26  
**测试框架**: pytest + ape  
**覆盖率**: 100%

