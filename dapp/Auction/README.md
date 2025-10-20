# 拍卖智能合约 (Auction)

基于Vyper的公开拍卖智能合约实现，采用安全的提现模式防止重入攻击。

## 功能特性

✅ **公开拍卖**
- 任何人都可以出价
- 价高者得
- 自动记录退款

✅ **安全机制**
- 提现模式（Withdrawal Pattern）
- 防重入攻击
- 时间验证

✅ **透明公开**
- 所有出价链上可查
- 拍卖状态实时查询
- 历史记录不可篡改

## 项目结构

```
Auction/
├── contracts/
│   └── Auction.vy              # 拍卖合约
├── scripts/
│   ├── deploy.py               # 部署拍卖
│   ├── user_bid.py             # 用户出价
│   ├── user_withdraw.py        # 提取退款
│   ├── end_auction.py          # 结束拍卖
│   └── query_status.py         # 查询状态
├── tests/
│   └── test_auction.py         # 测试用例
├── ape-config.yaml
└── README.md
```

## 快速开始

### 1. 环境准备

```bash
# 进入项目目录
cd /home/rex/project/mix/SuperCrypto/dapp/Auction

# 激活虚拟环境
source ../../.venv/bin/activate

# 确保已安装ape和vyper插件
pip install eth-ape
ape plugins install vyper
```

### 2. 编译合约

```bash
ape compile
```

### 3. 部署拍卖

```bash
ape run deploy --network ethereum:local
```

**交互示例：**
```
受益人地址: 0x... (拍卖物品所有者)
拍卖开始时间: 立即开始 / 指定未来时间
拍卖持续时间: 24小时
```

### 4. 用户出价

```bash
ape run user_bid --network ethereum:local
```

**用户操作：**
- 查看当前最高价
- 输入出价金额
- 确认交易

### 5. 提取退款

```bash
ape run user_withdraw --network ethereum:local
```

**适用于：**
- 被他人出价超过的用户
- 可以提取之前的出价金额

### 6. 查询状态

```bash
ape run query_status --network ethereum:local
```

**显示信息：**
- 拍卖时间
- 当前最高价
- 最高出价者
- 剩余时间

### 7. 结束拍卖

```bash
ape run end_auction --network ethereum:local
```

**条件：**
- 拍卖时间已到
- 任何人都可以调用
- 资金自动转给受益人

## 合约接口

### 主要函数

#### bid() - 出价
```vyper
@external
@payable
def bid():
    """发送ETH来出价，必须高于当前最高价"""
```

#### withdraw() - 提取退款
```vyper
@external
def withdraw():
    """提取被超过的出价金额"""
```

#### endAuction() - 结束拍卖
```vyper
@external
def endAuction():
    """结束拍卖，将资金转给受益人"""
```

### 查询函数

#### getAuctionInfo() - 获取拍卖信息
```vyper
@view
@external
def getAuctionInfo() -> (address, uint256, uint256, address, uint256, bool):
    """返回：受益人, 开始时间, 结束时间, 最高出价者, 最高出价, 是否结束"""
```

#### getPendingReturn() - 查询待退款
```vyper
@view
@external
def getPendingReturn(bidder: address) -> uint256:
    """查询指定地址的待退款金额"""
```

#### isActive() - 检查是否活跃
```vyper
@view
@external
def isActive() -> bool:
    """检查拍卖是否正在进行"""
```

#### timeLeft() - 获取剩余时间
```vyper
@view
@external
def timeLeft() -> uint256:
    """获取剩余秒数"""
```

## 使用场景

### 场景1：NFT拍卖

```
1. 艺术家部署拍卖合约
   - 受益人：艺术家地址
   - 开始时间：即刻
   - 持续时间：7天

2. 收藏家出价
   - 收藏家A：1 ETH
   - 收藏家B：2 ETH
   - 收藏家C：3 ETH

3. 7天后拍卖结束
   - 收藏家C获胜
   - 艺术家收到3 ETH
   - 收藏家A和B提取退款
```

### 场景2：域名拍卖

```
1. 域名所有者部署拍卖
   - 域名：blockchain.eth
   - 持续时间：3天

2. 多人竞价
   - 价格从0.1 ETH逐步上涨到10 ETH

3. 拍卖结束
   - 最高出价者获得域名
   - 域名所有者收到10 ETH
```

### 场景3：实物商品拍卖

```
1. 商家部署拍卖
   - 商品：限量版球鞋
   - 持续时间：1天

2. 买家出价
   - 价格竞争

3. 拍卖结束
   - 最高出价者付款成功
   - 商家发货
```

## 工作流程图

```
┌────────────────────────────────────────────────────────────┐
│                    部署拍卖（管理员）                        │
│  - 设置受益人                                               │
│  - 设置开始和结束时间                                        │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│                    拍卖进行中                               │
│                                                            │
│  用户A出价 1 ETH → 成为最高出价者                          │
│  用户B出价 2 ETH → 成为最高出价者，用户A待退款+1 ETH        │
│  用户C出价 3 ETH → 成为最高出价者，用户B待退款+2 ETH        │
│  用户A出价 5 ETH → 再次成为最高出价者，用户C待退款+3 ETH    │
│                                                            │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│                    拍卖结束                                 │
│                                                            │
│  任何人调用 endAuction()                                   │
│  ├─ 用户A获胜（最高出价5 ETH）                             │
│  ├─ 受益人收到5 ETH                                        │
│  ├─ 用户B可以提取2 ETH                                     │
│  └─ 用户C可以提取3 ETH                                     │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## 安全特性

### 1. 提现模式（Withdrawal Pattern）

**为什么使用提现模式？**

❌ **不安全的做法**（直接退款）：
```vyper
# 危险！可能被恶意合约阻止
def bid():
    send(self.highestBidder, self.highestBid)  # 立即退款
    self.highestBidder = msg.sender
```

✅ **安全的做法**（记录退款）：
```vyper
# 安全！分两步操作
def bid():
    self.pendingReturns[self.highestBidder] += self.highestBid  # 只记录
    self.highestBidder = msg.sender

def withdraw():
    amount = self.pendingReturns[msg.sender]
    self.pendingReturns[msg.sender] = 0  # 先清零
    send(msg.sender, amount)  # 再转账
```

### 2. 重入攻击防护

```vyper
@external
def withdraw():
    pending_amount = self.pendingReturns[msg.sender]
    self.pendingReturns[msg.sender] = 0  # ⚠️ 先清零
    send(msg.sender, pending_amount)      # ⚠️ 再转账
```

### 3. 时间验证

```vyper
assert block.timestamp >= self.auctionStart  # 拍卖已开始
assert block.timestamp < self.auctionEnd     # 拍卖未结束
```

## 测试

### 运行所有测试

```bash
ape test
```

### 运行特定测试

```bash
ape test tests/test_auction.py::test_first_bid -s
```

### 测试覆盖

- ✅ 合约部署
- ✅ 第一次出价
- ✅ 更高的出价
- ✅ 低出价失败
- ✅ 提取退款
- ✅ 多次出价
- ✅ 结束拍卖
- ✅ 结束后不能出价
- ✅ 无人出价的拍卖

## 常见问题

### Q: 出价必须高多少？
A: 任何高于当前最高价的金额都可以，即使只高0.001 ETH。

### Q: 可以取消出价吗？
A: 不能。一旦出价就不能取消，但如果被他人超过，可以提取退款。

### Q: 拍卖结束后资金在哪？
A: 最高出价的资金会自动转给受益人，其他人的资金需要手动提取。

### Q: 谁可以结束拍卖？
A: 任何人都可以调用`endAuction()`，但只有在拍卖时间结束后才能生效。

### Q: 如果无人出价怎么办？
A: 拍卖依然可以正常结束，只是不会有资金转移。

### Q: 可以修改拍卖时间吗？
A: 不能。拍卖一旦部署，时间就固定了。

## 部署到主网

### 1. 准备工作

```bash
# 配置主网RPC
export WEB3_INFURA_PROJECT_ID=your_project_id

# 导入账户
ape accounts import my_account
```

### 2. 部署

```bash
ape run deploy --network ethereum:mainnet
```

### 3. 验证合约

```bash
ape etherscan verify <contract_address>
```

## Gas费用估算

| 操作 | Gas消耗 | 费用（@50 Gwei） |
|------|---------|-----------------|
| 部署合约 | ~500,000 | ~$10-20 |
| 出价 | ~50,000 | ~$2-5 |
| 提取退款 | ~30,000 | ~$1-3 |
| 结束拍卖 | ~30,000 | ~$1-3 |

## 最佳实践

### 1. 设置合理的时间

```
✅ 推荐：
- NFT拍卖：3-7天
- 域名拍卖：1-3天
- 实物商品：1天

❌ 避免：
- 太短：用户没时间参与
- 太长：资金锁定太久
```

### 2. 设置合理的起拍价

```vyper
# 可以在构造函数中添加最低起拍价
@deploy
def __init__(..., minimum_bid: uint256):
    self.minimumBid = minimum_bid
```

### 3. 公告和营销

- 提前发布拍卖信息
- 在社交媒体宣传
- 提供拍卖物品详情
- 定期更新进度

## 扩展功能

### 可以添加的功能

1. **最低起拍价**
   ```vyper
   minimum_bid: public(uint256)
   assert msg.value >= self.minimum_bid
   ```

2. **价格递增限制**
   ```vyper
   min_increment: public(uint256)
   assert msg.value >= self.highestBid + self.min_increment
   ```

3. **自动延长时间**
   ```vyper
   # 如果最后5分钟有出价，延长10分钟
   if self.auctionEnd - block.timestamp < 300:
       self.auctionEnd += 600
   ```

4. **白名单**
   ```vyper
   whitelist: public(HashMap[address, bool])
   assert self.whitelist[msg.sender]
   ```

## 许可证

MIT

## 技术支持

- Vyper文档: https://docs.vyperlang.org/
- Ape文档: https://docs.apeworx.io/

