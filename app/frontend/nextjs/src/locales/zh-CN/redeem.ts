const redeem = {
  redeem: {
    // 步骤
    steps: {
      amount: "金额",
      amountDesc: "输入赎回金额",
      preview: "预览",
      previewDesc: "查看详情",
      confirm: "确认",
      confirmDesc: "提交交易",
    },

    // 导航
    backToAsset: "返回资产",

    // 风险标签
    risk: {
      low: "低风险",
      medium: "中风险",
      high: "高风险",
    },

    // 资产头部
    matured: "已到期",
    currentValue: "当前价值",

    // 步骤 1: 输入金额
    redemptionAmount: "赎回金额",
    available: "可用: ${{amount}}",
    redemptionInfo: "赎回信息",
    redemptionInfoDesc:
      "此投资已到期。您可以赎回全部本金和累计收益。赎回手续费为 0.1%。",

    // 步骤 2: 预览
    redemptionPreview: "赎回预览",
    principalPortion: "本金部分",
    yieldPortion: "收益部分",
    redemptionFee: "赎回手续费 (0.1%)",
    youWillReceive: "您将收到",
    totalYield: "总收益",
    lockPeriodLabel: "锁定期",
    monthsUnit: "{{months}} 个月",
    confirmRedemption: "确认赎回",

    // 步骤 3: 确认交易
    confirmTransaction: "确认交易",
    confirmTransactionDesc: "请查看并确认您的赎回交易",
    redeemLabel: "赎回",
    receiveLabel: "收到",
    receiveToken: "USDC",
    networkFee: "网络费用",
    estimatedNetworkFee: "~$2.50",
    submitTransaction: "提交交易",

    // 处理中
    processingRedemption: "处理赎回中",
    processingDesc: "请稍候，您的交易正在处理中...",

    // 成功
    redemptionSuccessful: "赎回成功！",
    redemptionSuccessDesc:
      "您的 <highlight>${{amount}}</highlight> 赎回已成功处理。",
    received: "已收到",
    txHash: "交易哈希",
    status: "状态",
    confirmed: "已确认",
    viewPortfolio: "查看投资组合",
    exploreAssets: "浏览资产",

    // 安全提示
    securityNote: "由区块链技术保障安全。所有交易不可逆。",
  },
}

export default redeem
