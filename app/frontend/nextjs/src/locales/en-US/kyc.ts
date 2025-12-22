const kyc = {
  kyc: {
    title: "KYC Verification",
    connectWalletFirst: "Connect Wallet First",
    connectWalletDescription: "Please connect your wallet to view and manage your KYC status.",
    accreditedInvestor: "Accredited Investor",
    status: {
      notStarted: "Not Started",
      pending: "Under Review",
      approved: "Verified",
      rejected: "Rejected",
    },
    notStarted: {
      title: "KYC Verification Required",
      description: "To participate in RWA investments, you need to complete KYC verification.",
      requirements: "Required Documents:",
      req1: "Valid government-issued ID",
      req2: "Proof of address (utility bill, bank statement)",
      req3: "Selfie holding your ID",
      startButton: "Start Verification",
    },
    pending: {
      title: "Verification In Progress",
      description: "Your KYC application is being reviewed. This usually takes 24-48 hours.",
      submitted: "Submitted on {{date}}",
      refresh: "Check Status",
    },
    approved: {
      title: "Verification Complete",
      description: "Your identity has been verified. You can now participate in RWA investments.",
      date: "Verified on {{date}}",
    },
    rejected: {
      title: "Verification Failed",
      description: "Unfortunately, your KYC application was not approved.",
      reason: "Rejection Reason:",
      reapply: "Reapply",
    },
    error: {
      loadFailed: "Failed to load KYC status",
      applyFailed: "Failed to submit KYC application",
    },
    guard: {
      title: "KYC Verification Required",
      description: "You need to complete KYC verification before accessing this feature.",
      startButton: "Start KYC Verification",
    },
  },
}

export default kyc

