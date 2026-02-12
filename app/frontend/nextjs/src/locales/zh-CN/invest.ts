const invest = {
  invest: {
    // 通用
    noData: "未找到投资数据",
    startNew: "开始新投资",
    connectWallet: "连接钱包",
    connectWalletDesc: "请连接您的钱包以开始投资",

    // 投资步骤 - 资产选择
    selectAsset: "选择资产",
    daysLock: "{{days}} 天锁定",
    minInvestment: "最低: {{min}} ETH",

    // 投资步骤 - 金额输入
    enterAmount: "输入投资金额",
    amount: "金额",
    balance: "余额",

    // 投资步骤 - 收益预览
    expectedYield: "预期收益",

    // 投资步骤 - 确认
    confirmDetails: "确认投资详情",
    riskWarning:
      "投资 RWA 存在风险，包括可能的本金损失。" +
      "您的资金将被锁定 {{days}} 天。请在继续之前确保您了解相关风险。",
    agreeToTerms:
      "我已阅读并同意与本次投资相关的服务条款和风险披露。",
    termsOfService: "服务条款",
    riskDisclosure: "风险披露",
    secureTransaction: "此交易将由您的钱包安全签名",
    confirmAndSign: "确认并签名",

    // 投资步骤 - 提交
    signInWallet: "在钱包中签名",
    signPrompt: "请在您的钱包中确认交易以继续投资",
    submitted: "交易已提交",
    submittedDesc: "您的交易已提交到网络，正在确认中",
    transactionSubmitted: "交易提交成功",
    transactionFailed: "交易失败",
    retry: "重试",

    // 投资步骤 - 完成
    success: {
      title: "投资成功！",
      desc: "您的投资已在区块链上确认",
    },
    failed: {
      title: "交易失败",
      desc: "交易未能完成",
    },
    confirming: {
      title: "确认交易中...",
      desc: "等待区块链确认...",
    },
    investMore: "继续投资",
    viewPortfolio: "查看投资组合",

    // 交易详情标签
    detail: {
      asset: "资产",
      amountInvested: "投资金额",
      expectedReturn: "预期收益",
      unlockDate: "解锁日期",
      txHash: "交易哈希",
      investmentAmount: "投资金额",
      apy: "年化收益率",
      lockPeriod: "锁定期",
      daysUnit: "{{days}} 天",
    },

    // 资产信息
    assetInfo: {
      minInvestment: "最低投资: {{min}} ETH",
      maxInvestment: "最高投资: {{max}} ETH",
      lockNotice: "您的投资将被锁定 {{days}} 天",
    },

    // 错误
    error: {
      title: "交易失败",
      desc: "交易无法完成。请检查您的钱包并重试。",
      selectAsset: "请先选择资产",
      invalidAmount: "请输入有效金额",
      minAmount: "最低投资金额为 {{min}} ETH",
      maxAmount: "最高投资金额为 {{max}} ETH",
      insufficientBalance: "余额不足",
      missingData: "缺少必要的交易数据",
    },

    // 交易描述
    txDescription: "投资 {{amount}} ETH 到 {{name}}",
  },
}

export default invest
