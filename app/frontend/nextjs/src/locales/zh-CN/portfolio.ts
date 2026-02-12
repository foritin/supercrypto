const portfolio = {
  portfolio: {
    title: "我的投资组合",
    subtitle: "管理您的 RWA 投资并追踪收益",
    connectWallet: "连接钱包查看投资组合",
    connectWalletDescription: "请连接您的钱包以查看投资组合。",
    investments: "我的投资",
    noInvestments: "您还没有投资记录",
    noTransactions: "暂无交易记录",
    matured: "已到期",
    
    // Tabs
    tabs: {
      investments: "投资记录",
      history: "交易历史",
    },
    
    // 统计卡片
    stats: {
      totalInvested: "总投资额",
      totalValue: "当前价值",
      totalEarnings: "累计收益",
      activeInvestments: "活跃投资",
    },
    
    // 投资表格列
    table: {
      asset: "资产",
      amount: "金额",
      apy: "年化收益率",
      period: "锁定期",
      status: "状态",
      actions: "操作",
    },
    
    // 交易历史表格列
    txTable: {
      time: "时间",
      type: "类型",
      amount: "金额",
      status: "状态",
      txHash: "交易哈希",
    },
    
    // 状态
    status: {
      active: "进行中",
      matured: "已到期",
      redeemed: "已赎回",
      pending: "待确认",
      locked: "锁定中",
      redeemable: "可赎回",
      expired: "已过期",
    },
    
    // 详情弹窗
    subscriptionDetail: "投资详情",
    detail: {
      assetInfo: "资产信息",
      assetName: "资产名称",
      symbol: "代币符号",
      investmentInfo: "投资信息",
      amount: "投资金额",
      tokenType: "支付代币",
      lockPeriod: "锁定期",
      apy: "年化收益率",
      earningsInfo: "收益信息",
      expectedInterest: "预期利息",
      totalReturn: "到期总额",
      timeInfo: "时间信息",
      startDate: "开始日期",
      endDate: "到期日期",
      daysRemaining: "剩余天数",
    },
    
    // 赎回
    redeem: "赎回",
    redeemSuccess: "赎回成功！",
    redeemFailed: "赎回失败",
    redeemModal: {
      title: "确认赎回",
      description: "确认赎回后，本金和收益将转入您的钱包。",
    },
    
    // 导出
    export: "导出",
    exporting: "正在导出...",
    exportSuccess: "导出成功",
    exportFailed: "导出失败",
    filterByType: "按类型筛选",
    
    // 页面头部
    myPortfolio: "我的投资组合",
    
    // 统计卡片标题
    totalInvestedLabel: "总投资额",
    currentValueLabel: "当前价值",
    totalEarningsLabel: "累计收益",
    activeInvestmentsLabel: "活跃投资",
    
    // 标签页
    myInvestments: "我的投资",
    transactionHistory: "交易历史",
    
    // 空状态
    noInvestmentsYet: "暂无投资记录，开始探索 RWA 资产吧！",
    noTransactionsYet: "暂无交易记录",

    // 开发模式
    mockDataBanner: "开发模式 - 使用模拟数据",
    
    // 筛选
    filterByTypeLabel: "按类型筛选",
    allTypes: "全部类型",
    subscribe: "认购",
    redeemType: "赎回",
    claimRewards: "领取奖励",
    exportLabel: "导出",
    
    // 表格单元格标签
    daysLeftLabel: "剩余 {{days}} 天",
    monthsLabel: "{{months}} 个月",
    detailsButton: "详情",
    
    // 详情弹窗
    investmentDetails: "投资详情",
    investedAmount: "投资金额",
    expectedReturnLabel: "预期收益",
    lockProgress: "锁定进度",
    daysRemaining: "剩余 {{days}} 天",
    closeButton: "关闭",
    redeemNow: "立即赎回",

    // 交易类型
    txTypes: {
      subscribe: "认购",
      redeem: "赎回",
      stake: "质押",
      unstake: "解质押",
      claim: "领取",
    },

    // 旧的扁平结构（保留兼容）
    totalInvested: "总投资额",
    totalValue: "当前价值",
    totalEarnings: "总收益",
    activeSubscriptions: "活跃投资",
    subscriptions: "我的投资",
    noSubscriptions: "您还没有投资记录",
    asset: "资产",
    amount: "金额",
    lockPeriod: "锁定期",
    months: "个月",
    expectedReturn: "预期收益",
    maturityDate: "到期日期",
    actions: "操作",
    redeemed: "已赎回",
    locked: "锁定中",
    redeemConfirm: "确认赎回",
    confirmRedeem: "立即赎回",
    principal: "本金",
    interest: "利息收益",
    totalToReceive: "总计到账",
    willReceive: "您将收到 {{token}}",
  },
}

export default portfolio
