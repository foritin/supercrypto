const redeem = {
  redeem: {
    // 步骤
    steps: {
      amount: "Amount",
      amountDesc: "Enter redeem amount",
      preview: "Preview",
      previewDesc: "Review details",
      confirm: "Confirm",
      confirmDesc: "Submit transaction",
    },

    // 导航
    backToAsset: "Back to Asset",

    // 风险标签
    risk: {
      low: "Low Risk",
      medium: "Medium Risk",
      high: "High Risk",
    },

    // 资产头部
    matured: "Matured",
    currentValue: "Current Value",

    // 步骤 1: 输入金额
    redemptionAmount: "Redemption Amount",
    available: "Available: ${{amount}}",
    redemptionInfo: "Redemption Info",
    redemptionInfoDesc:
      "This investment has matured. You can redeem your full principal plus accrued yield. A 0.1% redemption fee applies.",

    // 步骤 2: 预览
    redemptionPreview: "Redemption Preview",
    principalPortion: "Principal Portion",
    yieldPortion: "Yield Portion",
    redemptionFee: "Redemption Fee (0.1%)",
    youWillReceive: "You Will Receive",
    totalYield: "Total Yield",
    lockPeriodLabel: "Lock Period",
    monthsUnit: "{{months}} months",
    confirmRedemption: "Confirm Redemption",

    // 步骤 3: 确认交易
    confirmTransaction: "Confirm Transaction",
    confirmTransactionDesc: "Please review and confirm your redemption transaction",
    redeemLabel: "Redeem",
    receiveLabel: "Receive",
    receiveToken: "USDC",
    networkFee: "Network Fee",
    estimatedNetworkFee: "~$2.50",
    submitTransaction: "Submit Transaction",

    // 处理中
    processingRedemption: "Processing Redemption",
    processingDesc: "Please wait while your transaction is being processed...",

    // 成功
    redemptionSuccessful: "Redemption Successful!",
    redemptionSuccessDesc:
      "Your redemption of <highlight>${{amount}}</highlight> has been processed successfully.",
    received: "Received",
    txHash: "Transaction Hash",
    status: "Status",
    confirmed: "Confirmed",
    viewPortfolio: "View Portfolio",
    exploreAssets: "Explore Assets",

    // 安全提示
    securityNote: "Secured by blockchain technology. All transactions are irreversible.",
  },
}

export default redeem
