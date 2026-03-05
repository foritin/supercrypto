const subscription = {
  subscription: {
    // 基础
    title: "认购资产",
    confirm: "确认认购",
    cancel: "取消",
    back: "返回",
    next: "下一步",
    done: "完成",
    
    // 步骤
    stepConfigure: "配置参数",
    stepReview: "确认详情",
    stepConfirm: "处理交易",
    
    // 状态
    signing: "签名中...",
    pending: "处理中...",
    confirming: "确认中...",
    broadcasting: "广播中...",
    monitoring: "监控中...",
    validating: "验证中...",
    creatingOrder: "创建订单...",
    settlement: "结算中...",
    success: "成功！",
    failed: "失败",
    
    // 产品类型
    productType: "产品类型",
    currentProduct: "活期",
    fixedProduct: "定期",
    currentDescription: "灵活存取，随时赎回",
    fixedDescription: "更高收益，锁定周期",
    
    // 锁定期
    lockPeriod: "锁定期",
    months3: "3个月",
    months6: "6个月",
    months12: "12个月",
    lockWarning: "资金将锁定至 {{date}}",
    earlyRedemptionFee: "提前赎回可能产生费用",
    
    // 金额
    amount: "认购金额",
    balance: "余额",
    minAmount: "最低",
    max: "最大",
    enterAmount: "输入金额",
    
    // 代币
    tokenType: "支付代币",
    usdt: "USDT",
    usdc: "USDC",
    
    // 预览
    preview: "投资预览",
    apy: "年化收益率",
    expectedInterest: "预期利息",
    totalReturn: "到期总收益",
    maturityDate: "到期日期",
    rwaTokens: "获得 RWA 代币",
    youWillReceive: "您将收到",
    principal: "本金",
    interest: "利息",
    enterAmountToPreview: "输入金额查看投资预览",
    
    // 风险提示
    riskNotice: "投资风险提示",
    variableApy: "年化收益率可能变动",
    
    // 结果
    createSuccess: "认购成功！",
    successTitle: "认购确认成功！",
    successDescription: "您的投资已成功处理",
    
    // 错误
    insufficientBalance: "余额不足",
    kycRequired: "请先完成 KYC 认证",
    connectWalletFirst: "请先连接钱包以进行认购。",
    
    // 交易状态
    transactionProgress: "交易进度",
    validation: "验证",
    validationDesc: "检查前置条件",
    createOrder: "创建订单",
    createOrderDesc: "创建待处理订单",
    signature: "签名",
    signatureDesc: "等待钱包签名",
    broadcast: "广播",
    broadcastDesc: "发送到网络",
    confirmation: "确认",
    confirmationDesc: "等待链上确认",
    settlementStep: "结算",
    settlementDesc: "后端最终确认",
    
    // 错误类型
    errorNetworkMismatch: "网络不匹配",
    errorNetworkMismatchDesc: "请切换到正确的网络以完成此交易",
    errorJwtExpired: "会话已过期",
    errorJwtExpiredDesc: "您的会话已过期，请重新登录",
    errorKycRejected: "需要 KYC 认证",
    errorKycRejectedDesc: "投资前需要完成 KYC 认证",
    errorInsufficientBalance: "余额不足",
    errorInsufficientBalanceDesc: "钱包余额不足以完成此投资",
    errorReceiptTimeout: "交易超时",
    errorReceiptTimeoutDesc: "未能在预期时间内确认交易，网络可能拥堵",
    errorChainRejected: "交易被拒绝",
    errorChainRejectedDesc: "区块链拒绝了您的交易，可能是 Gas 价格波动或网络拥堵",
    errorChainFailed: "交易失败",
    errorChainFailedDesc: "交易在链上失败，资金未扣除",
    errorBackendFailed: "确认失败",
    errorBackendFailedDesc: "链上交易成功，但系统确认失败，我们已收到通知",
    errorApprovalFailed: "授权失败",
    errorApprovalFailedDesc: "无法授权代币转账，请检查 Gas 费",
    errorUserRejected: "交易已取消",
    errorUserRejectedDesc: "您在钱包中取消了交易，资金未扣除",
    errorUnknown: "发生错误",
    errorUnknownDesc: "发生未知错误，请重试或联系客服",
    
    // 操作
    retry: "重试",
    retryTransaction: "重试交易",
    switchNetwork: "切换网络",
    contactSupport: "联系客服",
    checkAgain: "再次检查",
    goToLogin: "去登录",
    startKyc: "开始 KYC",
    
    // 交易详情
    transactionHash: "交易哈希",
    blockNumber: "区块高度",
    gasUsed: "Gas 消耗",
    viewOnExplorer: "在浏览器查看",
    copyHash: "复制哈希",
    copied: "已复制",
    
    // 帮助
    needHelp: "需要帮助？",
    visitFaq: "访问常见问题",
    
    // 重试
    maxRetriesReached: "已达到最大重试次数",
    attemptCount: "第 {{current}} 次尝试，共 {{max}} 次",
    
    // 处理状态提示
    waitingWallet: "等待钱包确认...",
    broadcastingTx: "广播交易中...",
    monitoringBlockchain: "监控区块链...",
    waitingBackend: "等待后端确认...",
  },
}

export default subscription
