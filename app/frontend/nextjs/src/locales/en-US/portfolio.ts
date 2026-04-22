const portfolio = {
  portfolio: {
    title: "My Portfolio",
    subtitle: "Manage your RWA investments and track your earnings",
    connectWallet: "Connect Wallet to View Portfolio",
    connectWalletDescription: "Please connect your wallet to view your investment portfolio.",
    investments: "My Investments",
    noInvestments: "You have no investments yet",
    noTransactions: "No transactions yet",
    matured: "Matured",
    
    // Tabs
    tabs: {
      investments: "Investments",
      history: "Transaction History",
    },
    
    // Stats cards
    stats: {
      totalInvested: "Total Invested",
      totalValue: "Current Value",
      totalEarnings: "Total Earnings",
      activeInvestments: "Active Investments",
    },
    
    // Investment table columns
    table: {
      asset: "Asset",
      amount: "Amount",
      apy: "APY",
      period: "Lock Period",
      status: "Status",
      actions: "Actions",
      recentTransactions: "Recent Transactions",
      assetType: "Asset/Type",
      txId: "TxID",
      date: "Date",
      viewDetails: "View Details",
    },
    
    // Transaction history table columns
    txTable: {
      time: "Time",
      type: "Type",
      amount: "Amount",
      status: "Status",
      txHash: "Tx Hash",
    },
    
    // Status
    status: {
      active: "Active",
      matured: "Matured",
      redeemed: "Redeemed",
      pending: "Pending",
      redeeming: "Redeeming",
      locked: "Locked",
      redeemable: "Redeemable",
      expired: "Expired",
    },
    
    // Detail modal
    subscriptionDetail: "Investment Details",
    detail: {
      assetInfo: "Asset Information",
      assetName: "Asset Name",
      symbol: "Symbol",
      investmentInfo: "Investment Information",
      amount: "Investment Amount",
      tokenType: "Payment Token",
      lockPeriod: "Lock Period",
      apy: "APY",
      earningsInfo: "Earnings Information",
      expectedInterest: "Expected Interest",
      totalReturn: "Total at Maturity",
      timeInfo: "Time Information",
      startDate: "Start Date",
      endDate: "End Date",
      daysRemaining: "Days Remaining",
    },
    
    // Redeem
    redeem: "Redeem",
    redeemSuccess: "Redemption successful!",
    redeemFailed: "Redemption failed",
    redeemModal: {
      title: "Confirm Redemption",
      description: "After confirmation, principal and rewards will be transferred to your wallet.",
    },
    
    // Export
    export: "Export",
    exporting: "Exporting...",
    exportSuccess: "Export successful",
    exportFailed: "Export failed",
    filterByType: "Filter by type",
    
    // Page header
    myPortfolio: "My Portfolio",
    
    // Stat card titles
    totalInvestedLabel: "Total Invested",
    currentValueLabel: "Current Value",
    totalEarningsLabel: "Total Earnings",
    activeInvestmentsLabel: "Active Investments",
    
    // Tab labels
    myInvestments: "My Investments",
    transactionHistory: "Transaction History",
    
    // Empty states
    noInvestmentsYet: "No investments yet. Start exploring RWA assets!",
    noTransactionsYet: "No transactions yet",

    // Dev mode
    mockDataBanner: "Dev Mode - Using Mock Data",
    
    // Filter
    filterByTypeLabel: "Filter by type",
    allTypes: "All Types",
    subscribe: "Subscribe",
    redeemType: "Redeem",
    claimRewards: "Claim Rewards",
    exportLabel: "Export",
    
    // Table cell labels
    daysLeftLabel: "{{days}} days left",
    monthsLabel: "{{months}} months",
    detailsButton: "Details",
    
    // Detail modal
    investmentDetails: "Investment Details",
    investedAmount: "Invested Amount",
    expectedReturnLabel: "Expected Return",
    lockProgress: "Lock Progress",
    daysRemaining: "{{days}} days remaining",
    closeButton: "Close",
    redeemNow: "Redeem Now",

    // Transaction types
    txTypes: {
      subscribe: "Subscribe",
      redeem: "Redeem",
      stake: "Stake",
      unstake: "Unstake",
      claim: "Claim",
    },
    
    // Investment card
    card: {
      invested: "Invested",
      expectedReturn: "Expected Return",
      totalAtMaturity: "Total at Maturity",
      daysLeft: "{{days}} days left",
      inProgress: "In Progress",
      completed: "Completed",
      matured: "Matured",
      pending: "Pending",
      redeem: "Redeem",
      details: "Details",
      lockPeriod: "Lock Period",
      redeemCompleted: "Redeem Completed",
    },
    
    // Dev mode
    dev: {
      mockData: "Mock Data",
      demo: "Demo",
    },
    
    // View options
    view: {
      cards: "Cards",
      table: "Table",
    },

    // Filters
    filters: {
      allAssets: "All Assets",
    },

    // Action buttons
    cta: {
      newInvestment: "New Investment",
    },

    // Groups
    groups: {
      activeInvestments: "Active Investments",
      maturedPositions: "Matured Positions",
      otherPositions: "Other Positions",
      assetsCount: "{{count}} assets",
      ofPortfolio: "{{percent}}% of portfolio",
    },

    // Net worth card
    netWorth: {
      title: "Net Worth",
      change24h: "24h",
      earnings: "Earnings:",
      invested: "Invested",
      current: "Current",
    },

    // Chart
    chart: {
      performance: "Performance",
      portfolioValueOverTime: "Portfolio value over time",
      portfolioValue: "Portfolio Value",
      totalInvested: "Total Invested",
      benchmark: "Benchmark",
      return: "Return",
      current: "Current",
      change: "Change",
    },

    // Stream
    stream: {
      title: "Transaction Stream",
      subtitle: "Recent activity log",
      live: "Live",
      items: "{{count}} items",
      viewAll: "View all {{count}} transactions",
      types: {
        subscribe: "Subscribe",
        redeem: "Redeem",
        claim: "Claim",
        distribute: "Distribute",
      },
      status: {
        confirmed: "Confirmed",
        pending: "Pending",
        failed: "Failed",
      },
    },

    // Cyber Header
    cyberHeader: {
      title: "PORTFOLIO",
      terminal: "TERMINAL",
      subtitle: "RWA INVESTMENT MONITORING SYSTEM",
    },

    // Footer
    footer: {
      terminal: "PORTFOLIO_TERMINAL",
      secureConnection: "SECURE_CONNECTION",
      copyright: "© {{year}} SUPERCRYPTO",
    },

    // Modal
    modal: {
      status: "Status",
      profit: "+{{percent}}% profit",
      progressComplete: "{{percent}}% complete",
      maturedReady: "Matured and ready. Redemption can be requested.",
      redeemingInProgress: "Redemption in progress. Check timeline below.",
      redemptionTimeline: "Redemption Timeline",
      noTimelineYet: "Not matured yet. Redemption can be requested after maturity.",
      timeline: {
        requestCreated: "Request Created",
        proposalCreated: "Proposal Created",
        signatureSubmitted: "Signature Submitted",
        thresholdReached: "Threshold Reached",
        executed: "Executed",
        rejected: "Rejected",
        eventRecorded: "Event recorded",
      },
      timelineStatus: {
        pending: "Pending",
        signing: "Signing",
        executed: "Executed",
        rejected: "Rejected",
        recorded: "Recorded",
      },
    },

    // Empty states
    empty: {
      noAssetsInCategory: "No assets in this category",
      noPerformanceData: "No performance data",
      performanceDataWillAppear: "Data will appear as your portfolio grows",
      noTransactions: "No transactions",
      pulseWillAppear: "Pulse will appear here",
    },

    unknownAsset: "Unknown Asset",
    subscriptionWithId: "Subscription #{{id}}",
    
    // Dashboard portfolio card
    totalAssets: "{{count}} assets",
    totalReturn: "Total Return",

    // Legacy flat structure (keep for compatibility)
    totalInvested: "Total Invested",
    totalValue: "Current Value",
    totalEarnings: "Total Earnings",
    activeSubscriptions: "Active Investments",
    subscriptions: "My Investments",
    noSubscriptions: "You have no investments yet",
    asset: "Asset",
    amount: "Amount",
    lockPeriod: "Lock Period",
    months: "months",
    expectedReturn: "Expected Return",
    maturityDate: "Maturity Date",
    actions: "Actions",
    redeemed: "Redeemed",
    locked: "Locked",
    redeemConfirm: "Confirm Redemption",
    confirmRedeem: "Redeem Now",
    principal: "Principal",
    interest: "Interest Earned",
    totalToReceive: "Total Amount to Receive",
    willReceive: "You will receive {{token}}",
  },
}

export default portfolio
