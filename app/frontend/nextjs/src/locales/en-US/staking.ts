const staking = {
  // Page title
  title: 'Staking Mining',
  subtitle: 'Stake your RWA tokens to earn PLT rewards',
  
  // Stats cards
  stats: {
    totalStaked: 'Total Staked',
    activeStakes: 'Active Stakes',
    totalRewards: 'Total Rewards',
    pendingRewards: 'Pending Rewards',
    currentApy: 'Current APY',
  },
  
  // Staking limit
  limit: {
    title: 'Today\'s Limit',
    base: 'Base Limit',
    carried: 'Carried Limit',
    total: 'Total Limit',
    used: 'Used',
    remaining: 'Remaining',
    exhausted: 'Today\'s limit exhausted',
    exhaustedDesc: 'Please come back tomorrow',
  },
  
  // Staking operation
  stake: {
    title: 'New Stake',
    selectSubscription: 'Select Subscription',
    noSubscription: 'No available subscriptions',
    noSubscriptionDesc: 'Please subscribe to RWA assets first',
    goToAssets: 'Browse Assets',
    amount: 'Stake Amount',
    amountPlaceholder: 'Enter stake amount',
    available: 'Available Balance',
    period: 'Staking Period',
    periodDays: '{days} Days',
    multiplier: 'Reward Multiplier',
    expectedRewards: 'Expected Rewards',
    dailyRewards: 'Daily Rewards',
    endDate: 'End Date',
    confirm: 'Confirm Stake',
    processing: 'Staking...',
    success: 'Stake successful',
    failed: 'Stake failed',
    minAmount: 'Minimum stake: {amount}',
    maxAmount: 'Maximum stake: {amount}',
    exceedsLimit: 'Exceeds daily limit',
    exceedsBalance: 'Exceeds available balance',
  },
  
  // Staking list
  list: {
    title: 'My Stakes',
    empty: 'No staking records',
    emptyDesc: 'Stake your RWA tokens to start earning',
    all: 'All',
    active: 'Active',
    matured: 'Matured',
    unstaked: 'Unstaked',
  },
  
  // Staking detail
  detail: {
    title: 'Staking Details',
    stakingId: 'Staking ID',
    asset: 'Asset',
    amount: 'Staked Amount',
    period: 'Staking Period',
    startDate: 'Start Date',
    endDate: 'End Date',
    daysRemaining: 'Days Remaining',
    progress: 'Progress',
    multiplier: 'Reward Multiplier',
    expectedRewards: 'Expected Rewards',
    currentRewards: 'Current Rewards',
    claimedRewards: 'Claimed',
    pendingRewards: 'Pending',
    status: 'Status',
    txHash: 'Transaction Hash',
    unstakeTxHash: 'Unstake Transaction',
  },
  
  // Status
  status: {
    active: 'Active',
    matured: 'Matured',
    unstaked: 'Unstaked',
    cancelled: 'Cancelled',
  },
  
  // Unstaking
  unstake: {
    title: 'Unstake',
    confirm: 'Confirm Unstake',
    warning: 'Early unstaking will result in penalty',
    warningEarly: 'Your stake has not matured. Early unstaking will only receive {percent}% of rewards',
    warningMatured: 'Your stake has matured. You can safely unstake',
    processing: 'Unstaking...',
    success: 'Unstake successful',
    failed: 'Unstake failed',
    totalReturn: 'Total Return',
    principal: 'Principal',
    rewards: 'Rewards',
    penalty: 'Penalty',
  },
  
  // Claim rewards
  claim: {
    title: 'Claim Rewards',
    amount: 'Claimable Amount',
    confirm: 'Confirm Claim',
    processing: 'Claiming...',
    success: 'Claim successful',
    failed: 'Claim failed',
    noRewards: 'No rewards to claim',
    claimAll: 'Claim All',
  },
  
  // Period selection
  period: {
    days15: '15 Days',
    days30: '30 Days',
    days45: '45 Days',
    days60: '60 Days',
    multiplier: '{x}x Rewards',
    recommended: 'Recommended',
  },
  
  // Information tips
  info: {
    howItWorks: 'How Staking Works',
    step1: 'Select your RWA tokens to stake',
    step2: 'Choose staking period - longer periods earn higher rewards',
    step3: 'Confirm stake to start earning rewards',
    step4: 'Unstake after maturity and claim PLT rewards',
    rewards: 'PLT rewards are calculated daily and can be claimed after maturity',
    earlyUnstake: 'Early unstaking will result in partial reward loss',
    dailyLimit: 'Daily staking limit is {amount}, unused quota carries over to next day',
  },
  
  // Error messages
  error: {
    loadFailed: 'Load failed',
    stakeFailed: 'Stake failed',
    unstakeFailed: 'Unstake failed',
    claimFailed: 'Claim failed',
    walletNotConnected: 'Please connect wallet first',
    insufficientBalance: 'Insufficient balance',
    exceedsLimit: 'Exceeds limit',
    invalidAmount: 'Please enter a valid amount',
    selectSubscription: 'Please select a subscription',
    selectPeriod: 'Please select a staking period',
  },
  
  // PLT Token Info
  plt: {
    title: 'PLT Token Info',
    subtitle: 'Learn about PLT token distribution and staking rewards',
    tokenInfo: 'Token Info',
    totalSupply: 'Total Supply',
    circulatingSupply: 'Circulating Supply',
    currentPrice: 'Current Price',
    marketCap: 'Market Cap',
    stakingPool: 'Staking Rewards Pool',
    poolTotal: 'Pool Total',
    poolDistributed: 'Distributed',
    poolRemaining: 'Remaining',
    totalStakedValue: 'Total Staked Value',
    averageApy: 'Average APY',
    distribution: 'Distribution',
    distributionTitle: 'PLT Token Distribution',
    allocationName: 'Allocation',
    allocationAmount: 'Amount',
    allocationPercentage: 'Percentage',
    allocationDescription: 'Description',
  },
}

export default staking

