const invest = {
  invest: {
    // 通用
    noData: "No investment data found",
    startNew: "Start New Investment",
    connectWallet: "Connect Your Wallet",
    connectWalletDesc: "Please connect your wallet to start investing",

    // 投资步骤 - 资产选择
    selectAsset: "Select Asset",
    daysLock: "{{days}} days lock",
    minInvestment: "Min: {{min}} ETH",

    // 投资步骤 - 金额输入
    enterAmount: "Enter Investment Amount",
    amount: "Amount",
    balance: "Balance",

    // 投资步骤 - 收益预览
    expectedYield: "Expected Yield",

    // 投资步骤 - 确认
    confirmDetails: "Confirm Investment Details",
    riskWarning:
      "Investing in RWA involves risks including potential loss of capital. " +
      "Your funds will be locked for {{days}} days. Please ensure you understand the risks before proceeding.",
    agreeToTerms:
      "I have read and agree to the Terms of Service and Risk Disclosure associated with this investment.",
    termsOfService: "Terms of Service",
    riskDisclosure: "Risk Disclosure",
    secureTransaction: "This transaction will be securely signed by your wallet",
    confirmAndSign: "Confirm & Sign",

    // 投资步骤 - 提交
    signInWallet: "Sign in Wallet",
    signPrompt: "Please confirm the transaction in your wallet to proceed with the investment",
    submitted: "Transaction Submitted",
    submittedDesc: "Your transaction has been submitted to the network and is being confirmed",
    transactionSubmitted: "Transaction submitted successfully",
    transactionFailed: "Transaction failed",
    retry: "Retry",

    // 投资步骤 - 完成
    success: {
      title: "Investment Successful!",
      desc: "Your investment has been confirmed on the blockchain",
    },
    failed: {
      title: "Transaction Failed",
      desc: "The transaction failed to complete",
    },
    confirming: {
      title: "Confirming Transaction...",
      desc: "Waiting for blockchain confirmation...",
    },
    investMore: "Invest More",
    viewPortfolio: "View Portfolio",

    // 交易详情标签
    detail: {
      asset: "Asset",
      amountInvested: "Amount Invested",
      expectedReturn: "Expected Return",
      unlockDate: "Unlock Date",
      txHash: "Transaction Hash",
      investmentAmount: "Investment Amount",
      apy: "APY",
      lockPeriod: "Lock Period",
      daysUnit: "{{days}} days",
    },

    // 资产信息
    assetInfo: {
      minInvestment: "Minimum investment: {{min}} ETH",
      maxInvestment: "Maximum investment: {{max}} ETH",
      lockNotice: "Your investment will be locked for {{days}} days",
    },

    // 错误
    error: {
      title: "Transaction Failed",
      desc: "The transaction could not be completed. Please check your wallet and try again.",
      selectAsset: "Please select an asset first",
      invalidAmount: "Please enter a valid amount",
      minAmount: "Minimum investment is {{min}} ETH",
      maxAmount: "Maximum investment is {{max}} ETH",
      insufficientBalance: "Insufficient balance",
      missingData: "Missing required transaction data",
    },

    // 交易描述
    txDescription: "Invest {{amount}} ETH in {{name}}",
  },
}

export default invest
