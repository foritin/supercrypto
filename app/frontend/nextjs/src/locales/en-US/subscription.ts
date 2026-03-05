const subscription = {
  subscription: {
    // Basic
    title: "Subscribe to Asset",
    confirm: "Confirm Subscription",
    cancel: "Cancel",
    back: "Back",
    next: "Next",
    done: "Done",
    
    // Steps
    stepConfigure: "Configure",
    stepReview: "Review",
    stepConfirm: "Confirm",
    
    // States
    signing: "Signing...",
    pending: "Processing...",
    confirming: "Confirming...",
    broadcasting: "Broadcasting...",
    monitoring: "Monitoring...",
    validating: "Validating...",
    creatingOrder: "Creating Order...",
    settlement: "Settlement...",
    success: "Success!",
    failed: "Failed",
    
    // Product Types
    productType: "Product Type",
    currentProduct: "Current",
    fixedProduct: "Fixed Term",
    currentDescription: "Flexible access to your funds",
    fixedDescription: "Higher returns with lock-up period",
    
    // Lock Period
    lockPeriod: "Lock Period",
    months3: "3 Months",
    months6: "6 Months",
    months12: "12 Months",
    lockWarning: "Funds will be locked until {{date}}",
    earlyRedemptionFee: "Early redemption may incur fees",
    
    // Amount
    amount: "Subscription Amount",
    balance: "Balance",
    minAmount: "Minimum",
    max: "Max",
    enterAmount: "Enter amount",
    
    // Tokens
    tokenType: "Payment Token",
    usdt: "USDT",
    usdc: "USDC",
    
    // Preview
    preview: "Investment Preview",
    apy: "Annual Percentage Yield",
    expectedInterest: "Expected Interest",
    totalReturn: "Total Return at Maturity",
    maturityDate: "Maturity Date",
    rwaTokens: "RWA Tokens to Receive",
    youWillReceive: "You will receive",
    principal: "Principal",
    interest: "Interest",
    enterAmountToPreview: "Enter an amount to see your investment preview",
    
    // Risk Notice
    riskNotice: "Investment Risk Notice",
    variableApy: "APY is variable and subject to change",
    
    // Results
    createSuccess: "Subscription created successfully!",
    successTitle: "Subscription Confirmed!",
    successDescription: "Your investment has been successfully processed",
    
    // Errors
    insufficientBalance: "Insufficient balance",
    kycRequired: "Please complete KYC verification first",
    connectWalletFirst: "Please connect your wallet to subscribe.",
    
    // Transaction States
    transactionProgress: "Transaction Progress",
    validation: "Validation",
    validationDesc: "Checking prerequisites",
    createOrder: "Create Order",
    createOrderDesc: "Creating pending order",
    signature: "Signature",
    signatureDesc: "Waiting for wallet signature",
    broadcast: "Broadcast",
    broadcastDesc: "Sending to network",
    confirmation: "Confirmation",
    confirmationDesc: "Waiting for confirmations",
    settlementStep: "Settlement",
    settlementDesc: "Finalizing on backend",
    
    // Error Types
    errorNetworkMismatch: "Network Mismatch",
    errorNetworkMismatchDesc: "Please switch to the correct network to complete this transaction",
    errorJwtExpired: "Session Expired",
    errorJwtExpiredDesc: "Your session has expired, please sign in again",
    errorKycRejected: "KYC Verification Required",
    errorKycRejectedDesc: "KYC verification is required before investing",
    errorInsufficientBalance: "Insufficient Balance",
    errorInsufficientBalanceDesc: "Your wallet balance is insufficient to complete this investment",
    errorReceiptTimeout: "Transaction Timeout",
    errorReceiptTimeoutDesc: "Unable to confirm transaction within expected time, network may be congested",
    errorChainRejected: "Transaction Rejected",
    errorChainRejectedDesc: "The blockchain rejected your transaction, possibly due to gas price fluctuations",
    errorChainFailed: "Transaction Failed",
    errorChainFailedDesc: "Transaction failed on-chain, no funds were deducted",
    errorBackendFailed: "Confirmation Failed",
    errorBackendFailedDesc: "On-chain transaction succeeded but system confirmation failed, we have been notified",
    errorApprovalFailed: "Approval Failed",
    errorApprovalFailedDesc: "Unable to approve token transfer, please check gas fees",
    errorUserRejected: "Transaction Cancelled",
    errorUserRejectedDesc: "You cancelled the transaction in your wallet, no funds were deducted",
    errorUnknown: "Something Went Wrong",
    errorUnknownDesc: "An unknown error occurred, please retry or contact support",
    
    // Actions
    retry: "Retry",
    retryTransaction: "Retry Transaction",
    switchNetwork: "Switch Network",
    contactSupport: "Contact Support",
    checkAgain: "Check Again",
    goToLogin: "Go to Login",
    startKyc: "Start KYC",
    
    // Transaction Details
    transactionHash: "Transaction Hash",
    blockNumber: "Block Number",
    gasUsed: "Gas Used",
    viewOnExplorer: "View on Explorer",
    copyHash: "Copy Hash",
    copied: "Copied",
    
    // Help
    needHelp: "Need help?",
    visitFaq: "Visit our FAQ",
    
    // Retry
    maxRetriesReached: "Maximum retry attempts reached",
    attemptCount: "Attempt {{current}} of {{max}}",
    
    // Processing Status Messages
    waitingWallet: "Waiting for wallet confirmation...",
    broadcastingTx: "Broadcasting transaction...",
    monitoringBlockchain: "Monitoring blockchain...",
    waitingBackend: "Waiting for backend confirmation...",
  },
}

export default subscription
