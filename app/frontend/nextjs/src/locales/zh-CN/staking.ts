export default {
  // 页面标题
  title: '质押挖矿',
  subtitle: '质押您的 RWA 代币赚取 PLT 奖励',
  
  // 统计卡片
  stats: {
    totalStaked: '总质押量',
    activeStakes: '活跃质押',
    totalRewards: '累计奖励',
    pendingRewards: '待领取奖励',
    currentApy: '当前年化',
  },
  
  // 质押限额
  limit: {
    title: '今日限额',
    base: '基础限额',
    carried: '累计限额',
    total: '总限额',
    used: '已使用',
    remaining: '剩余',
    exhausted: '今日限额已用尽',
    exhaustedDesc: '请明天再来',
  },
  
  // 质押操作
  stake: {
    title: '新建质押',
    selectSubscription: '选择认购',
    noSubscription: '暂无可质押的认购',
    noSubscriptionDesc: '请先认购 RWA 资产',
    goToAssets: '去认购',
    amount: '质押数量',
    amountPlaceholder: '输入质押数量',
    available: '可用余额',
    period: '质押周期',
    periodDays: '{days} 天',
    multiplier: '收益倍数',
    expectedRewards: '预计收益',
    dailyRewards: '日收益',
    endDate: '到期日期',
    confirm: '确认质押',
    processing: '质押中...',
    success: '质押成功',
    failed: '质押失败',
    minAmount: '最小质押数量: {amount}',
    maxAmount: '最大质押数量: {amount}',
    exceedsLimit: '超出今日限额',
    exceedsBalance: '超出可用余额',
  },
  
  // 质押列表
  list: {
    title: '我的质押',
    empty: '暂无质押记录',
    emptyDesc: '质押您的 RWA 代币开始赚取收益',
    all: '全部',
    active: '进行中',
    matured: '已到期',
    unstaked: '已解除',
  },
  
  // 质押详情
  detail: {
    title: '质押详情',
    stakingId: '质押编号',
    asset: '资产',
    amount: '质押数量',
    period: '质押周期',
    startDate: '开始日期',
    endDate: '到期日期',
    daysRemaining: '剩余天数',
    progress: '进度',
    multiplier: '收益倍数',
    expectedRewards: '预计总收益',
    currentRewards: '当前收益',
    claimedRewards: '已领取',
    pendingRewards: '待领取',
    status: '状态',
    txHash: '交易哈希',
    unstakeTxHash: '解除交易哈希',
  },
  
  // 状态
  status: {
    active: '进行中',
    matured: '已到期',
    unstaked: '已解除',
    cancelled: '已取消',
  },
  
  // 解除质押
  unstake: {
    title: '解除质押',
    confirm: '确认解除',
    warning: '提前解除将损失部分收益',
    warningEarly: '您的质押尚未到期，提前解除将只能获得 {percent}% 的收益',
    warningMatured: '您的质押已到期，可以安全解除',
    processing: '解除中...',
    success: '解除成功',
    failed: '解除失败',
    totalReturn: '总返还',
    principal: '本金',
    rewards: '收益',
    penalty: '罚金',
  },
  
  // 领取奖励
  claim: {
    title: '领取奖励',
    amount: '可领取数量',
    confirm: '确认领取',
    processing: '领取中...',
    success: '领取成功',
    failed: '领取失败',
    noRewards: '暂无可领取奖励',
    claimAll: '一键领取全部',
  },
  
  // 周期选择
  period: {
    days15: '15 天',
    days30: '30 天',
    days45: '45 天',
    days60: '60 天',
    multiplier: '{x}x 收益',
    recommended: '推荐',
  },
  
  // 信息提示
  info: {
    howItWorks: '质押挖矿说明',
    step1: '选择您持有的 RWA 代币进行质押',
    step2: '选择质押周期，周期越长收益越高',
    step3: '确认质押后开始计算收益',
    step4: '到期后可解除质押并领取 PLT 奖励',
    rewards: 'PLT 奖励每日计算，到期后可一次性领取',
    earlyUnstake: '提前解除质押将损失部分收益',
    dailyLimit: '每日质押限额为 {amount}，未使用额度可累计至次日',
  },
  
  // 错误信息
  error: {
    loadFailed: '加载失败',
    stakeFailed: '质押失败',
    unstakeFailed: '解除失败',
    claimFailed: '领取失败',
    walletNotConnected: '请先连接钱包',
    insufficientBalance: '余额不足',
    exceedsLimit: '超出限额',
    invalidAmount: '请输入有效金额',
    selectSubscription: '请选择认购',
    selectPeriod: '请选择质押周期',
  },
  
  // PLT 代币信息
  plt: {
    title: 'PLT 代币信息',
    subtitle: '了解 PLT 代币的分配与质押奖励',
    tokenInfo: '代币信息',
    totalSupply: '总发行量',
    circulatingSupply: '流通量',
    currentPrice: '当前价格',
    marketCap: '市值',
    stakingPool: '质押奖励池',
    poolTotal: '奖励池总量',
    poolDistributed: '已分发',
    poolRemaining: '剩余可用',
    totalStakedValue: '总质押价值',
    averageApy: '平均年化收益',
    distribution: '代币分配',
    distributionTitle: 'PLT 代币分配',
    allocationName: '分配项',
    allocationAmount: '数量',
    allocationPercentage: '占比',
    allocationDescription: '描述',
  },
}

